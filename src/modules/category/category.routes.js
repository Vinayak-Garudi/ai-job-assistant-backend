const express = require('express');
const categoryController = require('./category.controller');
const categoryValidation = require('./category.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

// Public routes (if any)
router.get('/search', categoryController.search);
router.get('/stats', categoryController.getStats);

// Protected routes - require authentication
router.use(auth);

// CRUD operations
router
  .route('/')
  .get(categoryController.getAll)
  .post(categoryValidation.validateCreate, categoryController.create);

router
  .route('/:id')
  .get(categoryController.getById)
  .put(categoryValidation.validateUpdate, categoryController.update)
  .delete(categoryController.delete);

// Additional routes
router.patch('/:id/deactivate', categoryController.deactivate);

module.exports = router;