const mongoose = require('mongoose');

const modelTemplate = (modelName, name) => {
  return `const mongoose = require('mongoose');

const ${name}Schema = new mongoose.Schema(
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
    //   match: [/^\\w+([.-]?\\w+)*@\\w+([.-]?\\w+)*(\\.\\w{2,3})+$/, 'Please provide a valid email'],
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
${name}Schema.index({ name: 1 });
${name}Schema.index({ isActive: 1 });
${name}Schema.index({ createdAt: -1 });

// Virtual fields
// Example: Full name virtual field
// ${name}Schema.virtual('fullInfo').get(function() {
//   return \`\${this.name} - \${this.description}\`;
// });

// Pre-save middleware
${name}Schema.pre('save', function(next) {
  // Add any pre-save logic here
  next();
});

// Static methods
${name}Schema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Instance methods
${name}Schema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('${modelName}', ${name}Schema);`;
};

module.exports = modelTemplate;