const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // Job Details
    jobTitle: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, 'Job title cannot be more than 200 characters'],
    },
    company: {
      type: String,
      trim: true,
      default: 'Not specified',
      maxlength: [200, 'Company name cannot be more than 200 characters'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot be more than 200 characters'],
    },
    jobDescription: {
      type: String,
      required: false,
      trim: true,
    },
    jobUrl: {
      type: String,
      trim: true,
    },
    // AI Analysis Results
    analysis: {
      matchingPercentage: {
        type: Number,
        min: [0, 'Matching percentage cannot be negative'],
        max: [100, 'Matching percentage cannot exceed 100'],
      },
      strengths: [
        {
          type: String,
          trim: true,
        },
      ],
      areasToImprove: [
        {
          type: String,
          trim: true,
        },
      ],
      detailedAnalysis: {
        type: String,
        trim: true,
      },
      analyzedAt: {
        type: Date,
        default: Date.now,
      },
    },
    // Metadata
    status: {
      type: String,
      enum: ['pending', 'analyzed', 'error'],
      default: 'pending',
    },
    error: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
jobMatchSchema.index({ userId: 1, createdAt: -1 });
jobMatchSchema.index({ status: 1 });
jobMatchSchema.index({ 'analysis.matchingPercentage': -1 });

// Virtual field for display
jobMatchSchema.virtual('shortDescription').get(function () {
  if (!this.jobDescription) return '';
  return this.jobDescription.length > 150
    ? `${this.jobDescription.substring(0, 150)}...`
    : this.jobDescription;
});

// Static method to find user's job matches
jobMatchSchema.statics.findByUserId = function (userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-__v');
};

// Static method to find high-match jobs
jobMatchSchema.statics.findHighMatches = function (userId, minPercentage = 70) {
  return this.find({
    userId,
    'analysis.matchingPercentage': { $gte: minPercentage },
  })
    .sort({ 'analysis.matchingPercentage': -1 })
    .select('-__v');
};

module.exports = mongoose.model('JobMatch', jobMatchSchema);
