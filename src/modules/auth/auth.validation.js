const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details[0].message;
      return res.status(400).json({
        success: false,
        message,
      });
    }
    next();
  };
};

const registerSchema = Joi.object({
  username: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Username must be at least 2 characters long',
    'string.max': 'Username cannot be more than 50 characters long',
    'any.required': 'Username is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const updateProfileSchema = Joi.object({
  // Basic Details
  username: Joi.string().min(2).max(50).messages({
    'string.min': 'Username must be at least 2 characters long',
    'string.max': 'Username cannot be more than 50 characters long',
  }),
  age: Joi.number().min(13).max(120).messages({
    'number.min': 'Age must be at least 13',
    'number.max': 'Age must be less than 120',
  }),
  location: Joi.string().max(100).messages({
    'string.max': 'Location cannot be more than 100 characters',
  }),
  email: Joi.string().email().messages({
    'string.email': 'Please provide a valid email',
  }),
  profilePic: Joi.string().uri().messages({
    'string.uri': 'Please provide a valid URL for profile picture',
  }),

  // Professional Information
  currentTitle: Joi.string().max(100).messages({
    'string.max': 'Current title cannot be more than 100 characters',
  }),
  currentCompany: Joi.string().max(100).messages({
    'string.max': 'Current company cannot be more than 100 characters',
  }),
  experienceYears: Joi.number().min(0).max(70).messages({
    'number.min': 'Experience years cannot be negative',
    'number.max': 'Experience years seems unrealistic',
  }),
  industry: Joi.string().max(100).messages({
    'string.max': 'Industry cannot be more than 100 characters',
  }),

  // Other Information
  skills: Joi.array().items(Joi.string().max(50)).messages({
    'array.base': 'Skills must be an array',
  }),
  hobbiesAndInterests: Joi.array().items(Joi.string().max(50)).messages({
    'array.base': 'Hobbies and interests must be an array',
  }),
  softSkills: Joi.array().items(Joi.string().max(50)).messages({
    'array.base': 'Soft skills must be an array',
  }),

  // Education Information
  education: Joi.object({
    degree: Joi.string().max(100),
    graduationYear: Joi.number()
      .min(1950)
      .max(new Date().getFullYear() + 10),
    certifications: Joi.array().items(Joi.string().max(100)),
    university: Joi.string().max(200),
  }),

  // Documents
  resume: Joi.string().uri().messages({
    'string.uri': 'Please provide a valid URL for resume',
  }),

  // Job Preferences
  jobPreferences: Joi.object({
    employmentType: Joi.array().items(
      Joi.string().valid('full-time', 'part-time', 'internship', 'contract')
    ),
    workMode: Joi.array().items(
      Joi.string().valid('on-site', 'remote', 'hybrid')
    ),
    preferredLocations: Joi.array().items(Joi.string().max(100)),
    desiredRoles: Joi.array().items(Joi.string().max(100)),
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'any.required': 'New password is required',
  }),
});

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateChangePassword: validate(changePasswordSchema),
};
