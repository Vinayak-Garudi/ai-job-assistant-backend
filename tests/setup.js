// Test setup file
const mongoose = require('mongoose');

// Setup test database connection
beforeAll(async () => {
  const mongoUrl = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/node-template-test';
  await mongoose.connect(mongoUrl);
});

// Cleanup after tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Clean up database before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});