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

// Create vessels validation schema
const createSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be more than 100 characters long',
      'any.required': 'Name is required',
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot be more than 500 characters long',
    }),
  isActive: Joi.boolean()
    .default(true),
  
  // TODO: Add your custom validation rules here
  // Example:
  // email: Joi.string()
  //   .email()
  //   .required()
  //   .messages({
  //     'string.email': 'Please provide a valid email',
  //     'any.required': 'Email is required',
  //   }),
  // price: Joi.number()
  //   .min(0)
  //   .required()
  //   .messages({
  //     'number.min': 'Price must be positive',
  //     'any.required': 'Price is required',
  //   }),
  // category: Joi.string()
  //   .regex(/^[0-9a-fA-F]{24}$/)
  //   .required()
  //   .messages({
  //     'string.pattern.base': 'Category must be a valid ObjectId',
  //     'any.required': 'Category is required',
  //   }),
});

// Update vessels validation schema (all fields optional)
const updateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be more than 100 characters long',
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot be more than 500 characters long',
    }),
  isActive: Joi.boolean(),
  
  // TODO: Add your custom validation rules here (optional versions)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
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
  isActive: Joi.boolean(),
  populate: Joi.string().allow(''),
  q: Joi.string().allow(''), // for search
});

module.exports = {
  validateCreate: validate(createSchema),
  validateUpdate: validate(updateSchema),
  validateId: validate(idSchema),
  validateQuery: validate(querySchema),
};