const routesTemplate = (name) => {
  return `const express = require('express');
const ${name}Controller = require('./${name}.controller');
const ${name}Validation = require('./${name}.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

// Public routes (if any)
router.get('/search', ${name}Controller.search);
router.get('/stats', ${name}Controller.getStats);

// Protected routes - require authentication
router.use(auth);

// CRUD operations
router
  .route('/')
  .get(${name}Controller.getAll)
  .post(${name}Validation.validateCreate, ${name}Controller.create);

router
  .route('/:id')
  .get(${name}Controller.getById)
  .put(${name}Validation.validateUpdate, ${name}Controller.update)
  .delete(${name}Controller.delete);

// Additional routes
router.patch('/:id/deactivate', ${name}Controller.deactivate);

module.exports = router;`;
};

module.exports = routesTemplate;