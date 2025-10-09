// Route configuration for the product module
module.exports = {
  // Custom route path - change this to customize your routes
  path: '/api/products', // This will override the default /api/product
  
  // Enable or disable this module
  enabled: true,
  
  // Optional: Add middleware specific to this module
  // middleware: [
  //   require('../../middleware/auth'),
  //   require('../../middleware/roleCheck')('admin')
  // ],
  
  // Optional: Route description for documentation
  description: 'Product management endpoints',
  
  // Optional: API version
  version: 'v1',
};