const mongoose = require('mongoose');

const vesselsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // TODO: Add your custom fields here
    // Example:
    // email: {
    //   type: String,
    //   required: true,
    //   unique: true,
    //   lowercase: true,
    //   match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    // },
    // price: {
    //   type: Number,
    //   required: true,
    //   min: [0, 'Price must be positive'],
    // },
    // category: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Category',
    //   required: true,
    // },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
vesselsSchema.index({ name: 1 });
vesselsSchema.index({ isActive: 1 });
vesselsSchema.index({ createdAt: -1 });

// Virtual fields
// Example: Full name virtual field
// vesselsSchema.virtual('fullInfo').get(function() {
//   return `${this.name} - ${this.description}`;
// });

// Pre-save middleware
vesselsSchema.pre('save', function(next) {
  // Add any pre-save logic here
  next();
});

// Static methods
vesselsSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Instance methods
vesselsSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Vessels', vesselsSchema);