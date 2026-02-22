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

// Analyze from URL validation schema
const analyzeUrlSchema = Joi.object({
  jobUrl: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid URL',
    'any.required': 'Job URL is required',
  }),
});

// Analyze from manual entry validation schema
const analyzeManualSchema = Joi.object({
  jobTitle: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Job title must be at least 2 characters long',
    'string.max': 'Job title cannot be more than 200 characters long',
    'any.required': 'Job title is required',
  }),
  company: Joi.string().max(200).allow('').messages({
    'string.max': 'Company name cannot be more than 200 characters long',
  }),
  location: Joi.string().max(200).allow('').messages({
    'string.max': 'Location cannot be more than 200 characters long',
  }),
  jobDescription: Joi.string().min(50).required().messages({
    'string.min': 'Job description must be at least 50 characters long',
    'any.required': 'Job description is required',
  }),
});

// ID parameter validation
const idSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required',
    }),
});

// Query validation for listing
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  status: Joi.string().valid('pending', 'analyzed', 'error').allow(''),
  minPercentage: Joi.number().integer().min(0).max(100).default(70),
});

module.exports = {
  validateAnalyzeUrl: validate(analyzeUrlSchema),
  validateAnalyzeManual: validate(analyzeManualSchema),
  validateId: validate(idSchema),
  validateQuery: validate(querySchema),
};
