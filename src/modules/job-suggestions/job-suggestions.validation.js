const Joi = require('joi');

const validate = (schema, source) => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source] || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    next();
  };
};

// Neither endpoint takes input — the search is built from the stored profile.
const emptySchema = Joi.object({}).messages({
  'object.unknown': '{{#label}} is not allowed',
});

module.exports = {
  validateGetSuggestions: validate(emptySchema, 'query'),
  validateRefresh: validate(emptySchema, 'body'),
};
