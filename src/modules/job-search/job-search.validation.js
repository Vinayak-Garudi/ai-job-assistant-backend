const Joi = require('joi');

const VALID_JOB_TYPES = ['Full Time', 'Part Time', 'Contract', 'Internship'];
const VALID_WORK_MODES = ['Remote', 'On-site', 'Hybrid'];
const VALID_DATE_POSTED = ['all', 'today', '3days', 'week', 'month'];

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join('; '),
    });
  }
  req.query = value;
  next();
};

const searchSchema = Joi.object({
  query: Joi.string().max(200).allow('').optional(),
  location: Joi.string().max(200).allow('').optional(),
  jobTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid(...VALID_JOB_TYPES)),
      Joi.string().valid(...VALID_JOB_TYPES)
    )
    .optional(),
  workModes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid(...VALID_WORK_MODES)),
      Joi.string().valid(...VALID_WORK_MODES)
    )
    .optional(),
  datePosted: Joi.string()
    .valid(...VALID_DATE_POSTED)
    .default('month'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(20).default(10),
});

const recommendedSchema = Joi.object({
  datePosted: Joi.string()
    .valid(...VALID_DATE_POSTED)
    .default('week'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(20).default(10),
});

module.exports = {
  validateSearch: validateQuery(searchSchema),
  validateRecommended: validateQuery(recommendedSchema),
};
