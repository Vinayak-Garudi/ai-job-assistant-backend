const vesselsService = require('./vessels.service');
const asyncHandler = require('../../utils/asyncHandler');

class VesselsController {
  // Get all vesselss
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

    const result = await vesselsService.getAll(options);

    res.status(200).json({
      success: true,
      message: 'Vesselss retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get vessels by ID
  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const populate = req.query.populate || '';
    
    const vessels = await vesselsService.getById(id, populate);

    res.status(200).json({
      success: true,
      message: 'Vessels retrieved successfully',
      data: vessels,
    });
  });

  // Create new vessels
  create = asyncHandler(async (req, res) => {
    const vessels = await vesselsService.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Vessels created successfully',
      data: vessels,
    });
  });

  // Update vessels
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const vessels = await vesselsService.update(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Vessels updated successfully',
      data: vessels,
    });
  });

  // Delete vessels
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await vesselsService.delete(id);

    res.status(200).json({
      success: true,
      message: 'Vessels deleted successfully',
    });
  });

  // Deactivate vessels (soft delete)
  deactivate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const vessels = await vesselsService.deactivate(id);

    res.status(200).json({
      success: true,
      message: 'Vessels deactivated successfully',
      data: vessels,
    });
  });

  // Search vesselss
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

    const result = await vesselsService.search(searchTerm, options);

    res.status(200).json({
      success: true,
      message: 'Vesselss search results',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get vessels statistics
  getStats = asyncHandler(async (req, res) => {
    const stats = await vesselsService.getStats();

    res.status(200).json({
      success: true,
      message: 'Vessels statistics retrieved successfully',
      data: stats,
    });
  });
}

module.exports = new VesselsController();