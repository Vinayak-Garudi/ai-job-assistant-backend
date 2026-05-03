const User = require('./user.model');
const Session = require('./session.model');
const { generateToken } = require('../../config/jwt');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');
const OpenAI = require('openai');
const openaiConfig = require('../../config/openai');
const { retryWithBackoff } = require('../../utils/retryWithBackoff');
const axios = require('axios');
const pdfParse = require('pdf-parse');

class AuthService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
    });
  }

  // Fetch resume text from URL
  async _fetchResumeText(url) {
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
        return text ? text.substring(0, 6000) : null;
      }

      const text = buffer.toString('utf-8').trim();
      return text ? text.substring(0, 6000) : null;
    } catch (error) {
      console.warn('Failed to fetch/parse resume:', error.message);
      return null;
    }
  }

  // Generate ideal LinkedIn profile in background using AI
  _generateIdealLinkedInProfileInBackground(userId) {
    (async () => {
      try {
        const user = await User.findById(userId);
        if (!user) return;

        // Fetch and parse resume if available
        let resumeText = null;
        if (user.documents?.resume?.url) {
          resumeText = await this._fetchResumeText(user.documents.resume.url);
        }

        const profileSummary = this._buildProfileSummaryForLinkedIn(
          user,
          resumeText
        );
        if (!profileSummary) return;

        const completion = await retryWithBackoff(
          async () => {
            return await this.openai.chat.completions.create({
              model: openaiConfig.model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert LinkedIn profile consultant. Based on the user profile provided, generate an ideal LinkedIn profile. Respond ONLY with valid JSON (no markdown, no code fences). The JSON must have this exact structure: {"intro": "string", "about": "string", "experience": [{"title": "string", "companyOrOrganization": "string", "description": "string"}], "projects": [{"title": "string", "description": "string"}], "additionalSections": []}. IMPORTANT RULES: 1) The resume content (if provided) is the PRIMARY source of truth — always prioritize it over other profile fields. 2) Only populate the "projects" array if projects are explicitly mentioned in the resume. If no projects are found in the resume, set "projects" to an empty array []. 3) Make the intro a compelling headline. 4) Make the about section professional and detailed (2-3 paragraphs with bullet points using •). 5) For experience, craft impactful bullet-point descriptions using • that highlight achievements and impact. 6) If no resume is provided, generate based on available profile data and set "projects" to an empty array [].',
                },
                {
                  role: 'user',
                  content: profileSummary,
                },
              ],
            });
          },
          { maxRetries: 2, baseDelay: 2000, maxDelay: 15000 }
        );

        const content = completion.choices[0].message.content;
        const idealProfile = JSON.parse(content);

        await User.findByIdAndUpdate(userId, {
          idealLinkedInProfile: idealProfile,
        });
      } catch (error) {
        console.error(
          `Failed to generate ideal LinkedIn profile for user ${userId}:`,
          error.message
        );
      }
    })();
  }

  // Generate salary estimate in background using AI
  _generateSalaryEstimateInBackground(userId) {
    (async () => {
      try {
        const user = await User.findById(userId);
        if (!user) return;

        const profileSummary = this._buildProfileSummaryForSalary(user);
        if (!profileSummary) return;

        const completion = await retryWithBackoff(
          async () => {
            return await this.openai.chat.completions.create({
              model: openaiConfig.model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert compensation analyst with deep knowledge of current job market conditions and salary benchmarks across industries. Based on the user profile provided, estimate a realistic salary range they could command in the current market. Consider their skills, experience, title, industry, location, education, desired roles, and current compensation. Respond ONLY with valid JSON (no markdown, no code fences). The JSON must have this exact structure: {"minSalary": number, "maxSalary": number, "currency": "INR" or "USD", "rationale": "string (2-3 sentences explaining the estimate)", "marketInsights": "string (1-2 sentences about current market conditions relevant to this profile)"}. Use the same currency as their current CTC if provided, otherwise default to INR for India-based profiles and USD otherwise. Salary values must be annual figures as plain numbers (no commas or symbols).',
                },
                {
                  role: 'user',
                  content: profileSummary,
                },
              ],
            });
          },
          { maxRetries: 2, baseDelay: 2000, maxDelay: 15000 }
        );

        const content = completion.choices[0].message.content;
        const estimate = JSON.parse(content);

        await User.findByIdAndUpdate(userId, {
          salaryEstimate: {
            minSalary: estimate.minSalary,
            maxSalary: estimate.maxSalary,
            currency: estimate.currency,
            rationale: estimate.rationale,
            marketInsights: estimate.marketInsights,
            generatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(
          `Failed to generate salary estimate for user ${userId}:`,
          error.message
        );
      }
    })();
  }

  // Generate ATS-optimised ideal resume in background using AI
  _generateIdealResumeInBackground(userId) {
    (async () => {
      try {
        const user = await User.findById(userId);
        if (!user) return;

        let resumeText = null;
        if (user.documents?.resume?.url) {
          resumeText = await this._fetchResumeText(user.documents.resume.url);
        }

        const profileSummary = this._buildProfileSummaryForLinkedIn(
          user,
          resumeText
        );
        if (!profileSummary) return;

        const completion = await retryWithBackoff(
          async () => {
            return await this.openai.chat.completions.create({
              model: openaiConfig.model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert resume writer specialising in ATS-optimised resumes. Based on the user profile provided, generate an ideal resume that passes Applicant Tracking Systems. Respond ONLY with valid JSON (no markdown, no code fences). The JSON must have this exact structure: {"professionalSummary": "string (3-4 sentences, keyword-rich, tailored to target role)", "skills": {"technical": ["string"], "soft": ["string"], "tools": ["string"]}, "experience": [{"title": "string", "company": "string", "location": "string", "startDate": "string (MMM YYYY or Present)", "endDate": "string (MMM YYYY or Present)", "bullets": ["string"]}], "education": [{"degree": "string", "institution": "string", "location": "string", "graduationYear": "string", "details": "string"}], "projects": [{"title": "string", "technologies": ["string"], "description": "string", "bullets": ["string"]}], "freelanceProjects": [{"title": "string", "client": "string (use Confidential if unknown)", "technologies": ["string"], "description": "string", "bullets": ["string"]}], "certifications": ["string"]}. ATS RULES: 1) Resume content (if provided) is PRIMARY — always prioritise it over other profile fields. 2) Use strong action verbs and quantify achievements with metrics wherever possible (e.g. "Reduced latency by 40%"). 3) Embed relevant keywords naturally from the job domain. 4) Keep bullet points concise (one line each). 5) Use plain text only — no tables, columns, graphics, or special characters that confuse ATS parsers. 6) List experience and education in reverse chronological order. 7) Only populate "projects" if explicitly mentioned in the profile/resume; otherwise set to []. 8) Only populate "freelanceProjects" if freelance/consulting work is mentioned; otherwise set to []. 9) "certifications" should be plain strings like "AWS Certified Solutions Architect – Associate (2023)".',
                },
                {
                  role: 'user',
                  content: profileSummary,
                },
              ],
            });
          },
          { maxRetries: 2, baseDelay: 2000, maxDelay: 15000 }
        );

        const content = completion.choices[0].message.content;
        const resume = JSON.parse(content);

        await User.findByIdAndUpdate(userId, {
          idealResume: {
            ...resume,
            generatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(
          `Failed to generate ideal resume for user ${userId}:`,
          error.message
        );
      }
    })();
  }

  // Build profile summary for salary estimation AI prompt
  _buildProfileSummaryForSalary(user) {
    const parts = [];

    if (user.basicInfo) {
      if (user.basicInfo.username)
        parts.push(`Name: ${user.basicInfo.username}`);
      if (user.basicInfo.location)
        parts.push(`Location: ${user.basicInfo.location}`);
    }

    if (user.professionalInfo) {
      if (user.professionalInfo.currentTitle)
        parts.push(`Current Title: ${user.professionalInfo.currentTitle}`);
      if (user.professionalInfo.currentCompany)
        parts.push(`Current Company: ${user.professionalInfo.currentCompany}`);
      const expYears = user.professionalInfo.experienceYears ?? 0;
      const expMonths = user.professionalInfo.experienceMonths ?? 0;
      parts.push(`Total Experience: ${expYears} years and ${expMonths} months`);
      if (user.professionalInfo.industry)
        parts.push(`Industry: ${user.professionalInfo.industry}`);

      // Resolve current CTC — decrypt if encrypted
      const rawCtc = user.professionalInfo.currentCTCPerAnum;
      if (rawCtc != null) {
        let ctcValue = rawCtc;
        if (isEncrypted(String(rawCtc))) {
          try {
            ctcValue = decrypt(String(rawCtc));
          } catch {
            ctcValue = null;
          }
        }
        if (ctcValue != null) {
          const currency = user.professionalInfo.salaryCurrency || 'INR';
          parts.push(`Current CTC: ${ctcValue} ${currency} per annum`);
        }
      }

      if (user.professionalInfo.salaryCurrency)
        parts.push(`Preferred Currency: ${user.professionalInfo.salaryCurrency}`);
    }

    if (user.otherInfo) {
      if (user.otherInfo.skills?.length)
        parts.push(`Technical Skills: ${user.otherInfo.skills.join(', ')}`);
      if (user.otherInfo.softSkills?.length)
        parts.push(`Soft Skills: ${user.otherInfo.softSkills.join(', ')}`);
    }

    if (user.education) {
      if (user.education.degree) parts.push(`Degree: ${user.education.degree}`);
      if (user.education.university)
        parts.push(`University: ${user.education.university}`);
      if (user.education.graduationYear)
        parts.push(`Graduation Year: ${user.education.graduationYear}`);
      if (user.education.certifications?.length)
        parts.push(
          `Certifications: ${user.education.certifications.join(', ')}`
        );
    }

    if (user.jobPreferences) {
      if (user.jobPreferences.desiredRoles?.length)
        parts.push(
          `Target Roles: ${user.jobPreferences.desiredRoles.join(', ')}`
        );
      if (user.jobPreferences.preferredLocations?.length)
        parts.push(
          `Preferred Locations: ${user.jobPreferences.preferredLocations.join(', ')}`
        );
      if (user.jobPreferences.workModes?.length)
        parts.push(`Work Mode Preference: ${user.jobPreferences.workModes.join(', ')}`);
      if (user.jobPreferences.jobTypes?.length)
        parts.push(`Job Types: ${user.jobPreferences.jobTypes.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }

  // Build profile summary for LinkedIn AI prompt
  _buildProfileSummaryForLinkedIn(user, resumeText = null) {
    const parts = [];

    // Resume gets highest priority
    if (resumeText) {
      parts.push('**Resume Content (PRIMARY SOURCE — prioritize this):**');
      parts.push(resumeText);
      parts.push('');
      parts.push('**Additional Profile Data:**');
    }

    if (user.basicInfo) {
      if (user.basicInfo.username)
        parts.push(`Name: ${user.basicInfo.username}`);
      if (user.basicInfo.location)
        parts.push(`Location: ${user.basicInfo.location}`);
    }

    if (user.professionalInfo) {
      if (user.professionalInfo.currentTitle)
        parts.push(`Current Title: ${user.professionalInfo.currentTitle}`);
      if (user.professionalInfo.currentCompany)
        parts.push(`Current Company: ${user.professionalInfo.currentCompany}`);
      if (user.professionalInfo.experienceYears !== undefined)
        parts.push(
          `Experience: ${user.professionalInfo.experienceYears} years and ${user.professionalInfo.experienceMonths ?? 0} months`
        );
      if (user.professionalInfo.industry)
        parts.push(`Industry: ${user.professionalInfo.industry}`);
    }

    if (user.otherInfo) {
      if (user.otherInfo.skills?.length)
        parts.push(`Skills: ${user.otherInfo.skills.join(', ')}`);
      if (user.otherInfo.softSkills?.length)
        parts.push(`Soft Skills: ${user.otherInfo.softSkills.join(', ')}`);
      if (user.otherInfo.hobbiesAndInterests?.length)
        parts.push(
          `Hobbies & Interests: ${user.otherInfo.hobbiesAndInterests.join(', ')}`
        );
    }

    if (user.education) {
      if (user.education.degree) parts.push(`Degree: ${user.education.degree}`);
      if (user.education.university)
        parts.push(`University: ${user.education.university}`);
      if (user.education.graduationYear)
        parts.push(`Graduation Year: ${user.education.graduationYear}`);
      if (user.education.certifications?.length)
        parts.push(
          `Certifications: ${user.education.certifications.join(', ')}`
        );
    }

    if (user.jobPreferences) {
      if (user.jobPreferences.desiredRoles?.length)
        parts.push(
          `Desired Roles: ${user.jobPreferences.desiredRoles.join(', ')}`
        );
      if (user.jobPreferences.jobTypes?.length)
        parts.push(`Job Types: ${user.jobPreferences.jobTypes.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }

  // Register a new user
  async register(userData, ipAddress, userAgent) {
    const { username, email, password } = userData;

    // Check if user already exists with email
    const existingUserByEmail = await User.findOne({
      'basicInfo.email': email,
    });
    if (existingUserByEmail) {
      throw new Error('User already exists with this email');
    }

    // Encrypt CTC if provided
    if (
      userData.professionalInfo?.currentCTCPerAnum != null &&
      !isEncrypted(userData.professionalInfo.currentCTCPerAnum)
    ) {
      userData.professionalInfo.currentCTCPerAnum = encrypt(
        Number(userData.professionalInfo.currentCTCPerAnum)
      );
    }

    // Create user with default role 'user'
    const user = await User.create({
      basicInfo: {
        username,
        email,
      },
      password,
      role: 'user',
    });

    // Generate token
    const token = generateToken({ id: user._id });

    // Create session
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    await Session.createSession(
      user._id,
      token,
      expiresIn,
      ipAddress,
      userAgent
    );

    // Generate ideal LinkedIn profile in background (fire-and-forget)
    this._generateIdealLinkedInProfileInBackground(user._id);

    return {
      user,
      token,
    };
  }

  // Login user
  async login(email, password, ipAddress, userAgent) {
    // Check if user exists and get password
    const user = await User.findOne({ 'basicInfo.email': email }).select(
      '+password'
    );
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({ id: user._id });

    // Create session
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    await Session.createSession(
      user._id,
      token,
      expiresIn,
      ipAddress,
      userAgent
    );

    return {
      user,
      token,
    };
  }

  // Logout user
  async logout(token) {
    // Deactivate session
    const session = await Session.deactivateSession(token);
    if (!session) {
      throw new Error('Session not found');
    }

    return { message: 'Logged out successfully' };
  }

  // Logout from all devices
  async logoutAll(userId) {
    await Session.deactivateAllUserSessions(userId);
    return { message: 'Logged out from all devices successfully' };
  }

  // Get active sessions
  async getActiveSessions(userId) {
    const sessions = await Session.getUserActiveSessions(userId);
    return sessions;
  }

  // Validate session
  async validateSession(token) {
    const session = await Session.validateSession(token);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Update last activity
    await Session.updateActivity(token);

    return session;
  }

  // Get user ID from token
  async getUserIdFromToken(token) {
    const session = await Session.findOne({ token, isActive: true });
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    return session.userId;
  }

  // Get user profile by token
  async getProfileByToken(token) {
    const userId = await this.getUserIdFromToken(token);
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Decrypt CTC — toJSON() handles it; return plain object
    const userObj = user.toJSON();
    if (
      userObj.professionalInfo?.currentCTCPerAnum != null &&
      isEncrypted(String(userObj.professionalInfo.currentCTCPerAnum))
    ) {
      try {
        userObj.professionalInfo.currentCTCPerAnum = decrypt(
          String(userObj.professionalInfo.currentCTCPerAnum)
        );
      } catch {
        // leave as-is if decryption fails
      }
    }
    return userObj;
  }

  // Get user profile by userId (legacy support)
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Decrypt CTC for the caller (toJSON also handles this on serialization)
    const userObj = user.toJSON();
    if (
      userObj.professionalInfo?.currentCTCPerAnum != null &&
      isEncrypted(String(userObj.professionalInfo.currentCTCPerAnum))
    ) {
      try {
        userObj.professionalInfo.currentCTCPerAnum = decrypt(
          String(userObj.professionalInfo.currentCTCPerAnum)
        );
      } catch {
        // leave as-is if decryption fails
      }
    }

    return userObj;
  }

  // Update user profile by token
  async updateProfileByToken(token, updateData) {
    const userId = await this.getUserIdFromToken(token);
    return this.updateProfile(userId, updateData);
  }

  // Update user profile by userId
  async updateProfile(userId, updateData) {
    const allowedFields = [
      'basicInfo',
      'professionalInfo',
      'otherInfo',
      'education',
      'documents',
      'jobPreferences',
    ];
    const filteredData = {};

    // Filter allowed fields
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Check if email is being updated and if it already exists
    if (filteredData.basicInfo && filteredData.basicInfo.email) {
      const existingUser = await User.findOne({
        'basicInfo.email': filteredData.basicInfo.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new Error('Email already in use by another user');
      }
    }

    // Encrypt CTC before update (findByIdAndUpdate bypasses pre-save hooks)
    if (
      filteredData.professionalInfo?.currentCTCPerAnum != null &&
      !isEncrypted(filteredData.professionalInfo.currentCTCPerAnum)
    ) {
      filteredData.professionalInfo.currentCTCPerAnum = encrypt(
        Number(filteredData.professionalInfo.currentCTCPerAnum)
      );
    }

    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Regenerate ideal LinkedIn profile, salary estimate, and resume in background (fire-and-forget)
    this._generateIdealLinkedInProfileInBackground(userId);
    this._generateSalaryEstimateInBackground(userId);
    this._generateIdealResumeInBackground(userId);

    return user;
  }

  // Change password by token
  async changePasswordByToken(token, currentPassword, newPassword) {
    const userId = await this.getUserIdFromToken(token);
    return this.changePassword(userId, currentPassword, newPassword);
  }

  // Change password by userId
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Check current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  // Logout from all devices by token
  async logoutAllByToken(token) {
    const userId = await this.getUserIdFromToken(token);
    return this.logoutAll(userId);
  }

  // Get active sessions by token
  async getActiveSessionsByToken(token) {
    const userId = await this.getUserIdFromToken(token);
    return this.getActiveSessions(userId);
  }
}

module.exports = new AuthService();
