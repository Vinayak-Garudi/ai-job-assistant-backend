const productService = require('./product.service');
const asyncHandler = require('../../utils/asyncHandler');

class ProductController {
  // Get all products
  getAll = asyncHandler(async (req, res) => {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      populate: req.query.populate,
      filter: {},
    };

    // Add filter conditions based on query parameters
    if (req.query.isActive !== undefined) {
      options.filter.isActive = req.query.isActive === 'true';
    }

    const result = await productService.getAll(options);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get product by ID
  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const populate = req.query.populate || '';
    
    const product = await productService.getById(id, populate);

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  });

  // Create new product
  create = asyncHandler(async (req, res) => {
    const product = await productService.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  });

  // Update product
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await productService.update(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  });

  // Delete product
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.delete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  // Deactivate product (soft delete)
  deactivate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await productService.deactivate(id);

    res.status(200).json({
      success: true,
      message: 'Product deactivated successfully',
      data: product,
    });
  });

  // Search products
  search = asyncHandler(async (req, res) => {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required',
      });
    }

    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      populate: req.query.populate,
      filter: {},
    };

    const result = await productService.search(searchTerm, options);

    res.status(200).json({
      success: true,
      message: 'Products search results',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get product statistics
  getStats = asyncHandler(async (req, res) => {
    const stats = await productService.getStats();

    res.status(200).json({
      success: true,
      message: 'Product statistics retrieved successfully',
      data: stats,
    });
  });
}

module.exports = new ProductController();