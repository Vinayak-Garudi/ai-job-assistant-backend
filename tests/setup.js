// Test setup file
const mongoose = require('mongoose');

// Setup test database connection.
// Pure unit tests (e.g. error-mapping helpers) do not need MongoDB, so a
// failed connection is reported as a warning rather than crashing the whole
// run. Suites that actually touch the DB will still fail loudly on their own
// queries when the connection is unavailable.
beforeAll(async () => {
  const mongoUrl =
    process.env.MONGODB_URI_TEST ||
    'mongodb://localhost:27017/node-template-test';
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 3000 });
  } catch (error) {
    console.warn(
      `⚠️  MongoDB unavailable at ${mongoUrl} — DB-backed tests will fail. (${error.message})`
    );
  }
}, 15000);

// Cleanup after tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Clean up database before each test
beforeEach(async () => {
  // readyState 1 === connected
  if (mongoose.connection.readyState !== 1) return;

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
