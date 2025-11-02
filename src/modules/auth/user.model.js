const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic Details
    username: {
      type: String,
      required: [true, 'User name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'User name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    age: {
      type: Number,
      min: [13, 'Age must be at least 13'],
      max: [120, 'Age must be less than 120'],
    },
    location: {
      type: String,
      trim: true,
    },
    profilePic: {
      type: String,
      trim: true,
    },

    // Professional Information
    currentTitle: {
      type: String,
      trim: true,
    },
    currentCompany: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
    },
    industry: {
      type: String,
      trim: true,
    },

    // Other Information
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    hobbiesAndInterests: [
      {
        type: String,
        trim: true,
      },
    ],
    softSkills: [
      {
        type: String,
        trim: true,
      },
    ],

    // Education Information
    education: {
      degree: {
        type: String,
        trim: true,
      },
      graduationYear: {
        type: Number,
        min: [1950, 'Graduation year must be after 1950'],
        max: [
          new Date().getFullYear() + 10,
          'Graduation year cannot be too far in the future',
        ],
      },
      certifications: [
        {
          type: String,
          trim: true,
        },
      ],
      university: {
        type: String,
        trim: true,
      },
    },

    // Documents
    resume: {
      type: String,
      trim: true,
    },

    // Job Preferences
    jobPreferences: {
      employmentType: [
        {
          type: String,
          enum: ['full-time', 'part-time', 'internship', 'contract'],
        },
      ],
      workMode: [
        {
          type: String,
          enum: ['on-site', 'remote', 'hybrid'],
        },
      ],
      preferredLocations: [
        {
          type: String,
          trim: true,
        },
      ],
      desiredRoles: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // Role
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
