const OpenAI = require('openai');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const openaiConfig = require('../../config/openai');
const { retryWithBackoff } = require('../../utils/retryWithBackoff');
const apiMonitor = require('../../utils/apiMonitor');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
    });
  }

  /**
   * Analyze job match between user profile and job posting
   * @param {Object} userProfile - User's complete profile
   * @param {Object} jobDetails - Job posting details
   * @returns {Promise<Object>} - Analysis results with matching percentage, strengths, and areas to improve
   */
  async analyzeJobMatch(userProfile, jobDetails) {
    // Validate job URL if provided
    if (jobDetails.jobUrl && !this.isValidJobURL(jobDetails.jobUrl)) {
      return {
        matchingPercentage: 0,
        strengths: [],
        areasToImprove: [],
        detailedAnalysis: 'Invalid Job URL entered.',
        invalidURL: true,
      };
    }

    try {
      apiMonitor.recordCall();

      // Fetch and parse resume if URL is available
      let resumeText = null;
      if (userProfile?.documents?.resume?.url) {
        resumeText = await this.fetchResumeText(
          userProfile.documents.resume.url
        );
      }

      // Build the user profile summary
      const userProfileSummary = this.buildUserProfileSummary(
        userProfile,
        resumeText
      );

      // Build the job posting summary
      const jobPostingSummary = this.buildJobPostingSummary(jobDetails);

      // Create the prompt for OpenAI
      const prompt = this.buildAnalysisPrompt(
        userProfileSummary,
        jobPostingSummary
      );

      // Call OpenAI API with retry logic
      const completion = await retryWithBackoff(
        async () => {
          return await this.openai.chat.completions.create({
            model: openaiConfig.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert career advisor and HR professional with deep knowledge of job matching and candidate assessment. Analyze the job-candidate fit objectively and provide actionable insights.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            // temperature: openaiConfig.temperature,
            // max_tokens: openaiConfig.maxTokens,
          });
        },
        {
          maxRetries: 3,
          baseDelay: 2000, // Start with 2 seconds
          maxDelay: 30000, // Max 30 seconds between retries
          shouldRetry: (error) => {
            // Track retry attempts
            apiMonitor.recordRetry();
            // Use default retry logic
            return (
              error?.response?.status === 429 ||
              error?.status === 429 ||
              error?.code === 'ECONNRESET' ||
              error?.code === 'ETIMEDOUT' ||
              error?.message?.includes('429') ||
              error?.message?.includes('quota') ||
              error?.message?.includes('rate limit')
            );
          },
        }
      );

      const analysis = completion.choices[0].message.content;

      // Parse the AI response
      const parsedAnalysis = this.parseAIResponse(analysis);

      apiMonitor.recordSuccess();

      return parsedAnalysis;
    } catch (error) {
      apiMonitor.recordFailure(error);

      // Enhanced error handling for different error types
      if (error instanceof OpenAI.APIError) {
        // Handle rate limit errors (429)
        if (error.status === 429 || error.code === 'rate_limit_exceeded') {
          throw new Error(
            `OpenAI API error: 429 You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.`
          );
        }

        // Handle insufficient quota
        if (error.code === 'insufficient_quota') {
          throw new Error(
            'OpenAI API quota exceeded. Please check your billing settings or try again later.'
          );
        }

        // Handle authentication errors
        if (error.status === 401) {
          throw new Error(
            'OpenAI API authentication failed. Please check your API key.'
          );
        }

        // Handle invalid request errors
        if (error.status === 400) {
          throw new Error(
            `OpenAI API error: Invalid request - ${error.message}`
          );
        }

        // Generic OpenAI API error
        throw new Error(
          `OpenAI API error: ${error.status} ${error.message || 'Failed to analyze job match'}`
        );
      }

      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(
          'Unable to connect to OpenAI API. Please check your internet connection.'
        );
      }

      // Generic error
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Fetch a resume from a URL and extract its text content.
   * Supports PDF files; falls back to plain text for other formats.
   * @param {string} url - URL of the resume file
   * @returns {Promise<string|null>}
   */
  async fetchResumeText(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { Accept: '*/*' },
      });

      const buffer = Buffer.from(response.data);
      const contentType = (
        response.headers['content-type'] || ''
      ).toLowerCase();
      const isPdf =
        contentType.includes('pdf') ||
        url.toLowerCase().includes('.pdf') ||
        buffer.slice(0, 4).toString() === '%PDF';

      if (isPdf) {
        const parsed = await pdfParse(buffer);
        const text = parsed.text?.trim();
        // Limit to ~6000 chars to stay within token budget
        return text ? text.substring(0, 6000) : null;
      }

      // Plain text / other readable formats
      const text = buffer.toString('utf-8').trim();
      return text ? text.substring(0, 6000) : null;
    } catch (error) {
      console.warn('Failed to fetch/parse resume:', error.message);
      return null;
    }
  }

  /**
   * Build a comprehensive user profile summary
   */
  buildUserProfileSummary(user, resumeText = null) {
    const parts = [];

    // Basic Info
    if (user.basicInfo) {
      parts.push('**Personal Information:**');
      if (user.basicInfo.username)
        parts.push(`- Name: ${user.basicInfo.username}`);
      if (user.basicInfo.age) parts.push(`- Age: ${user.basicInfo.age}`);
      if (user.basicInfo.location)
        parts.push(`- Location: ${user.basicInfo.location}`);
      if (user.basicInfo.email) parts.push(`- Email: ${user.basicInfo.email}`);
    }

    // Professional Info
    if (user.professionalInfo) {
      parts.push('\n**Professional Background:**');
      if (user.professionalInfo.currentTitle)
        parts.push(`- Current Title: ${user.professionalInfo.currentTitle}`);
      if (user.professionalInfo.currentCompany)
        parts.push(
          `- Current Company: ${user.professionalInfo.currentCompany}`
        );
      if (user.professionalInfo.experienceYears !== undefined)
        parts.push(
          `- Experience: ${user.professionalInfo.experienceYears} years and ${user.professionalInfo.experienceMonths ?? 0} months`
        );
      if (user.professionalInfo.industry)
        parts.push(`- Industry: ${user.professionalInfo.industry}`);
    }

    // Skills
    if (user.otherInfo) {
      if (user.otherInfo.skills && user.otherInfo.skills.length > 0) {
        parts.push('\n**Technical Skills:**');
        parts.push(`- ${user.otherInfo.skills.join(', ')}`);
      }
      if (user.otherInfo.softSkills && user.otherInfo.softSkills.length > 0) {
        parts.push('\n**Soft Skills:**');
        parts.push(`- ${user.otherInfo.softSkills.join(', ')}`);
      }
      if (
        user.otherInfo.hobbiesAndInterests &&
        user.otherInfo.hobbiesAndInterests.length > 0
      ) {
        parts.push('\n**Hobbies & Interests:**');
        parts.push(`- ${user.otherInfo.hobbiesAndInterests.join(', ')}`);
      }
    }

    // Education
    if (user.education) {
      parts.push('\n**Education:**');
      if (user.education.degree)
        parts.push(`- Degree: ${user.education.degree}`);
      if (user.education.university)
        parts.push(`- University: ${user.education.university}`);
      if (user.education.graduationYear)
        parts.push(`- Graduation Year: ${user.education.graduationYear}`);
      if (
        user.education.certifications &&
        user.education.certifications.length > 0
      ) {
        parts.push(
          `- Certifications: ${user.education.certifications.join(', ')}`
        );
      }
    }

    if (resumeText) {
      parts.push(`\n**Resume Content:**`);
      parts.push(resumeText);
    } else if (user?.documents?.resume?.url) {
      parts.push(`\n**Resume URL:** ${user.documents.resume.url}`);
    }

    // Job Preferences
    if (user.jobPreferences) {
      parts.push('\n**Job Preferences:**');
      if (
        user.jobPreferences.jobTypes &&
        user.jobPreferences.jobTypes.length > 0
      )
        parts.push(`- Job Types: ${user.jobPreferences.jobTypes.join(', ')}`);
      if (
        user.jobPreferences.workModes &&
        user.jobPreferences.workModes.length > 0
      )
        parts.push(`- Work Modes: ${user.jobPreferences.workModes.join(', ')}`);
      if (
        user.jobPreferences.preferredLocations &&
        user.jobPreferences.preferredLocations.length > 0
      )
        parts.push(
          `- Preferred Locations: ${user.jobPreferences.preferredLocations.join(', ')}`
        );
      if (
        user.jobPreferences.desiredRoles &&
        user.jobPreferences.desiredRoles.length > 0
      )
        parts.push(
          `- Desired Roles: ${user.jobPreferences.desiredRoles.join(', ')}`
        );
    }

    return parts.join('\n');
  }

  /**
   * Build a job posting summary
   */
  buildJobPostingSummary(jobDetails) {
    const parts = [];

    parts.push('**Job Posting Details:**');
    if (jobDetails.jobTitle) parts.push(`- Job Title: ${jobDetails.jobTitle}`);
    if (jobDetails.company) parts.push(`- Company: ${jobDetails.company}`);
    if (jobDetails.location) parts.push(`- Location: ${jobDetails.location}`);
    if (jobDetails.jobDescription) {
      parts.push(`\n**Job Description:**`);
      parts.push(jobDetails.jobDescription);
    }
    if (jobDetails.jobUrl) parts.push(`\n**Job URL:** ${jobDetails.jobUrl}`);

    return parts.join('\n');
  }

  /**
   * Build the analysis prompt for OpenAI
   */
  buildAnalysisPrompt(userProfileSummary, jobPostingSummary) {
    return `
I need you to analyze the fit between a candidate's profile and a job posting. Please provide a comprehensive analysis.

${userProfileSummary}

${jobPostingSummary}

Please analyze the match and provide a response in the following EXACT format:

MATCHING_PERCENTAGE: [number between 0-100]

STRENGTHS:
- [strength 1]
- [strength 2]
- [strength 3]
(list 3-5 key strengths that make this candidate a good fit)

AREAS_TO_IMPROVE:
- [area 1]
- [area 2]
- [area 3]
(list 3-5 areas where the candidate could improve to better fit this role)

RESUME_FEEDBACK:
- [feedback 1]
- [feedback 2]
- [feedback 3]
(list 3-5 feedbacks where the candidate could improve their resume to better align with most job postings in their field)

DETAILED_ANALYSIS:
[Provide a comprehensive paragraph (150-250 words) explaining:
1. Overall fit assessment
2. Why the matching percentage was assigned
3. Key alignment points between the candidate and role
4. Critical gaps or concerns
5. Recommendations for the candidate]

Important:
- Be specific and actionable in your feedback
- Consider technical skills, experience level, cultural fit, and career trajectory
- Base the matching percentage on: skills match (40%), experience relevance (30%), education/certifications (15%), and soft skills/preferences (15%)
- Keep STRENGTHS and AREAS_TO_IMPROVE concise (one line each)
- Make DETAILED_ANALYSIS comprehensive but focused
`;
  }

  /**
   * Parse the AI response into structured data
   */
  parseAIResponse(response) {
    try {
      // Extract matching percentage
      const matchingPercentageMatch = response.match(
        /MATCHING_PERCENTAGE:\s*(\d+)/i
      );
      const matchingPercentage = matchingPercentageMatch
        ? parseInt(matchingPercentageMatch[1], 10)
        : 50;

      // Extract strengths
      const strengthsMatch = response.match(
        /STRENGTHS:(.*?)(?=AREAS_TO_IMPROVE:|$)/is
      );
      const strengths = strengthsMatch
        ? this.extractListItems(strengthsMatch[1])
        : [];

      // Extract areas to improve
      const areasMatch = response.match(
        /AREAS_TO_IMPROVE:(.*?)(?=DETAILED_ANALYSIS:|$)/is
      );
      const areasToImprove = areasMatch
        ? this.extractListItems(areasMatch[1])
        : [];

      // Extract resume feedback
      const resumeFeedbackMatch = response.match(
        /RESUME_FEEDBACK:(.*?)(?=DETAILED_ANALYSIS:|$)/is
      );
      const resumeFeedback = resumeFeedbackMatch
        ? this.extractListItems(resumeFeedbackMatch[1])
        : [];

      // Extract detailed analysis
      const detailedMatch = response.match(/DETAILED_ANALYSIS:(.*?)$/is);
      const detailedAnalysis = detailedMatch
        ? detailedMatch[1].trim()
        : response;

      return {
        matchingPercentage: Math.min(100, Math.max(0, matchingPercentage)),
        strengths: strengths.slice(0, 5),
        areasToImprove: areasToImprove.slice(0, 5),
        resumeFeedback: resumeFeedback.slice(0, 5),
        detailedAnalysis: detailedAnalysis.substring(0, 2000),
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Return a fallback response
      return {
        matchingPercentage: 50,
        strengths: ['Unable to parse specific strengths'],
        areasToImprove: ['Unable to parse specific areas to improve'],
        detailedAnalysis: response.substring(0, 2000),
      };
    }
  }

  /**
   * Extract list items from text (items starting with -, *, or numbers)
   */
  extractListItems(text) {
    if (!text) return [];

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const items = lines
      .filter((line) => /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line))
      .map((line) =>
        line
          .replace(/^[-*•]\s/, '')
          .replace(/^\d+\.\s/, '')
          .trim()
      )
      .filter((item) => item.length > 0);

    return items;
  }

  /**
   * Validate whether a URL is a legitimate job posting URL.
   * Returns false for non-job sites (e.g. youtube.com) and malformed URLs.
   */
  isValidJobURL(url) {
    try {
      const parsed = new URL(url);

      // Only allow http/https URLs
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

      // Known job board / ATS domains
      const knownJobSites = [
        'linkedin.com',
        'indeed.com',
        'glassdoor.com',
        'monster.com',
        'ziprecruiter.com',
        'dice.com',
        'simplyhired.com',
        'careerbuilder.com',
        'lever.co',
        'greenhouse.io',
        'workday.com',
        'icims.com',
        'taleo.net',
        'smartrecruiters.com',
        'jobvite.com',
        'workable.com',
        'bamboohr.com',
        'breezy.hr',
        'recruitee.com',
        'ashbyhq.com',
        'angel.co',
        'wellfound.com',
        'remoteok.com',
        'weworkremotely.com',
        'naukri.com',
        'shine.com',
        'foundit.in',
        'internshala.com',
        'hackerearth.com',
        'builtin.com',
        'idealist.org',
        'flexjobs.com',
        'twitter.com', // job postings sometimes shared here
      ];

      if (
        knownJobSites.some(
          (site) => hostname === site || hostname.endsWith('.' + site)
        )
      ) {
        return true;
      }

      // Check URL path for common job-related segments
      const path = parsed.pathname.toLowerCase();
      const jobPathPatterns = [
        '/job/',
        '/jobs/',
        '/career/',
        '/careers/',
        '/position/',
        '/positions/',
        '/opening/',
        '/openings/',
        '/vacancy/',
        '/vacancies/',
        '/join-us/',
        '/join/',
        '/work-with-us/',
        '/opportunities/',
        '/apply/',
        '/job-detail/',
        '/jobdetail/',
      ];

      if (jobPathPatterns.some((pattern) => path.includes(pattern))) {
        return true;
      }

      return false;
    } catch {
      // URL constructor threw — not a valid URL at all
      return false;
    }
  }

  /**
   * Quick validation to check if OpenAI is configured
   */
  isConfigured() {
    return !!openaiConfig.apiKey;
  }
}

module.exports = new AIService();
