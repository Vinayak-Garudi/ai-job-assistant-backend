const loadEnvConfig = require('./config/env');
loadEnvConfig();

const app = require('./app');
const connectDB = require('./config/database');
const { connectPostgres } = require('./config/postgres');
const { startSessionCleanup } = require('./utils/sessionCleanup');

const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();
connectPostgres();

// Start session cleanup scheduler (runs every hour)
startSessionCleanup();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Access the API at: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});
