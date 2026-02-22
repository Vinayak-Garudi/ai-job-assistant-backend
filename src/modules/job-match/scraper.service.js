const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class ScraperService {
  /**
   * Extract job details from a URL using cheerio (for static content)
   * @param {string} url - The job posting URL
   * @returns {Promise<Object>} - Extracted job details
   */
  async scrapeWithCheerio(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const html = response.data;

      // Try to extract common job posting elements
      const jobDetails = {
        jobTitle: this.extractJobTitle($, html),
        company: this.extractCompany($, html),
        location: this.extractLocation($, html),
        jobDescription: this.extractDescription($, html),
      };

      return jobDetails;
    } catch (error) {
      throw new Error(`Cheerio scraping failed: ${error.message}`);
    }
  }

  /**
   * Extract job details using Puppeteer (for dynamic content)
   * @param {string} url - The job posting URL
   * @returns {Promise<Object>} - Extracted job details
   */
  async scrapeWithPuppeteer(url) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);

      const jobDetails = await page.evaluate(() => {
        // Helper function to get text content
        const getText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : '';
        };

        // Helper function to get text from multiple selectors
        const getTextMultiple = (selectors) => {
          for (const selector of selectors) {
            const text = getText(selector);
            if (text) return text;
          }
          return '';
        };

        return {
          jobTitle: getTextMultiple([
            'h1.job-title',
            'h1.jobsearch-JobInfoHeader-title',
            '[data-testid="jobTitle"]',
            'h1[class*="title"]',
            'h1[class*="job"]',
            'h1',
          ]),
          company: getTextMultiple([
            '[data-testid="company-name"]',
            '.company-name',
            '[class*="company"]',
            'a[data-tn-element="companyName"]',
          ]),
          location: getTextMultiple([
            '[data-testid="job-location"]',
            '.location',
            '[class*="location"]',
            '[data-tn-element="jobLocation"]',
          ]),
          jobDescription: getTextMultiple([
            '#jobDescriptionText',
            '.job-description',
            '[data-testid="jobDescription"]',
            '[class*="description"]',
            'div[id*="description"]',
          ]),
        };
      });

      return jobDetails;
    } catch (error) {
      throw new Error(`Puppeteer scraping failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Main scraping method that tries cheerio first, then puppeteer if needed
   * @param {string} url - The job posting URL
   * @returns {Promise<Object>} - Extracted job details
   */
  async scrapeJobPosting(url) {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }

      // Try cheerio first (faster)
      let jobDetails = await this.scrapeWithCheerio(url);

      // If cheerio didn't get enough data, try puppeteer
      if (
        !jobDetails.jobTitle ||
        !jobDetails.jobDescription ||
        jobDetails.jobDescription.length < 50
      ) {
        console.log('Cheerio scraping incomplete, trying Puppeteer...');
        jobDetails = await this.scrapeWithPuppeteer(url);
      }

      // Validate extracted data
      if (!jobDetails.jobTitle || !jobDetails.jobDescription) {
        throw new Error(
          'Could not extract essential job details from the URL. Please enter job details manually.'
        );
      }

      // Clean up the data
      jobDetails = this.cleanJobDetails(jobDetails);

      return jobDetails;
    } catch (error) {
      throw new Error(`Failed to scrape job posting: ${error.message}`);
    }
  }

  /**
   * Extract job title from HTML
   */
  extractJobTitle($, html) {
    const selectors = [
      'h1.job-title',
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobTitle"]',
      'h1[class*="title"]',
      'h1[class*="job"]',
      '.job-title',
      'h1',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0 && text.length < 200) {
        return text;
      }
    }

    // Try to find in meta tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return ogTitle;

    return '';
  }

  /**
   * Extract company name from HTML
   */
  extractCompany($, html) {
    const selectors = [
      '[data-testid="company-name"]',
      '.company-name',
      '[class*="company"]',
      'a[data-tn-element="companyName"]',
      '[data-company]',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0 && text.length < 200) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract location from HTML
   */
  extractLocation($, html) {
    const selectors = [
      '[data-testid="job-location"]',
      '.location',
      '[class*="location"]',
      '[data-tn-element="jobLocation"]',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0 && text.length < 200) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract job description from HTML
   */
  extractDescription($, html) {
    const selectors = [
      '#jobDescriptionText',
      '.job-description',
      '[data-testid="jobDescription"]',
      '[class*="description"]',
      'div[id*="description"]',
      '[data-testid="job-description"]',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 50) {
        return text;
      }
    }

    // If no description found, try to get all paragraph text
    const paragraphs = $('p')
      .map((i, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 50)
      .join('\n\n');

    return paragraphs || '';
  }

  /**
   * Clean and normalize extracted job details
   */
  cleanJobDetails(jobDetails) {
    return {
      jobTitle: this.cleanText(jobDetails.jobTitle),
      company: this.cleanText(jobDetails.company) || 'Not specified',
      location: this.cleanText(jobDetails.location) || 'Not specified',
      jobDescription: this.cleanText(jobDetails.jobDescription, 10000),
    };
  }

  /**
   * Clean text by removing extra whitespace and limiting length
   */
  cleanText(text, maxLength = 500) {
    if (!text) return '';

    // Remove extra whitespace and newlines
    let cleaned = text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();

    // Limit length if specified
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
    }

    return cleaned;
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }
}

module.exports = new ScraperService();
