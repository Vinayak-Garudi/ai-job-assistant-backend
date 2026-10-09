const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    url: { type: String, required: true, trim: true },
    source: {
      name: { type: String, trim: true, default: '' },
      domain: { type: String, trim: true, default: '' },
    },
    snippet: { type: String, trim: true, default: '' },
    workMode: { type: String, trim: true, default: '' },
    employmentType: { type: String, trim: true, default: '' },
    postedDate: { type: String, trim: true, default: '' },
    matchScore: { type: Number, min: 0, max: 100, default: null },
    matchReason: { type: String, trim: true, default: '' },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

// One cached result set per user; regenerated on expiry, profile change or
// an explicit refresh.
const jobSuggestionSetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profileHash: { type: String, required: true },
    queries: [{ type: String, trim: true }],
    suggestions: [suggestionSchema],
    rankedByAI: { type: Boolean, default: true },
    generatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobSuggestionSet', jobSuggestionSetSchema);
