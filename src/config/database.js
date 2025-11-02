const mongoose = require('mongoose');
const chalk = require('chalk');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(chalk.green('📊 MongoDB Connected'));
  } catch (error) {
    console.error(chalk.red(`❌ MongoDB Connection Error: ${error.message}`));
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('📊 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('📊 MongoDB reconnected');
});

module.exports = connectDB;
