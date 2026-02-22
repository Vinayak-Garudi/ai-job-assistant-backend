module.exports = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
};
