const express = require('express');
const vesselsController = require('./vessels.controller');
const vesselsValidation = require('./vessels.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

// Public routes (if any)
router.get('/search', vesselsController.search);
router.get('/stats', vesselsController.getStats);

// Protected routes - require authentication
router.use(auth);

// CRUD operations
router
  .route('/')
  .get(vesselsController.getAll)
  .post(vesselsValidation.validateCreate, vesselsController.create);

router
  .route('/:id')
  .get(vesselsController.getById)
  .put(vesselsValidation.validateUpdate, vesselsController.update)
  .delete(vesselsController.delete);

// Additional routes
router.patch('/:id/deactivate', vesselsController.deactivate);

module.exports = router;