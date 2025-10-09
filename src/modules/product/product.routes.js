const express = require('express');
const productController = require('./product.controller');
const productValidation = require('./product.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

// Public routes (if any)
router.get('/search', productController.search);
router.get('/stats', productController.getStats);

// Protected routes - require authentication
router.use(auth);

// CRUD operations
router
  .route('/')
  .get(productController.getAll)
  .post(productValidation.validateCreate, productController.create);

router
  .route('/:id')
  .get(productController.getById)
  .put(productValidation.validateUpdate, productController.update)
  .delete(productController.delete);

// Additional routes
router.patch('/:id/deactivate', productController.deactivate);

module.exports = router;