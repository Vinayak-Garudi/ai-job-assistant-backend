const categoryService = require('./category.service');
const asyncHandler = require('../../utils/asyncHandler');

class CategoryController {
  // Get all categorys
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

    const result = await categoryService.getAll(options);

    res.status(200).json({
      success: true,
      message: 'Categorys retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get category by ID
  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const populate = req.query.populate || '';
    
    const category = await categoryService.getById(id, populate);

    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    });
  });

  // Create new category
  create = asyncHandler(async (req, res) => {
    const category = await categoryService.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  });

  // Update category
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await categoryService.update(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  });

  // Delete category
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await categoryService.delete(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  });

  // Deactivate category (soft delete)
  deactivate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await categoryService.deactivate(id);

    res.status(200).json({
      success: true,
      message: 'Category deactivated successfully',
      data: category,
    });
  });

  // Search categorys
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

    const result = await categoryService.search(searchTerm, options);

    res.status(200).json({
      success: true,
      message: 'Categorys search results',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get category statistics
  getStats = asyncHandler(async (req, res) => {
    const stats = await categoryService.getStats();

    res.status(200).json({
      success: true,
      message: 'Category statistics retrieved successfully',
      data: stats,
    });
  });
}

module.exports = new CategoryController();