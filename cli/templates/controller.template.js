const controllerTemplate = (controllerName, name) => {
  return `const ${name}Service = require('./${name}.service');
const asyncHandler = require('../../utils/asyncHandler');

class ${controllerName}Controller {
  // Get all ${name}s
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

    const result = await ${name}Service.getAll(options);

    res.status(200).json({
      success: true,
      message: '${controllerName}s retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get ${name} by ID
  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const populate = req.query.populate || '';
    
    const ${name} = await ${name}Service.getById(id, populate);

    res.status(200).json({
      success: true,
      message: '${controllerName} retrieved successfully',
      data: ${name},
    });
  });

  // Create new ${name}
  create = asyncHandler(async (req, res) => {
    const ${name} = await ${name}Service.create(req.body);

    res.status(201).json({
      success: true,
      message: '${controllerName} created successfully',
      data: ${name},
    });
  });

  // Update ${name}
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ${name} = await ${name}Service.update(id, req.body);

    res.status(200).json({
      success: true,
      message: '${controllerName} updated successfully',
      data: ${name},
    });
  });

  // Delete ${name}
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await ${name}Service.delete(id);

    res.status(200).json({
      success: true,
      message: '${controllerName} deleted successfully',
    });
  });

  // Deactivate ${name} (soft delete)
  deactivate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ${name} = await ${name}Service.deactivate(id);

    res.status(200).json({
      success: true,
      message: '${controllerName} deactivated successfully',
      data: ${name},
    });
  });

  // Search ${name}s
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

    const result = await ${name}Service.search(searchTerm, options);

    res.status(200).json({
      success: true,
      message: '${controllerName}s search results',
      data: result.items,
      pagination: result.pagination,
    });
  });

  // Get ${name} statistics
  getStats = asyncHandler(async (req, res) => {
    const stats = await ${name}Service.getStats();

    res.status(200).json({
      success: true,
      message: '${controllerName} statistics retrieved successfully',
      data: stats,
    });
  });
}

module.exports = new ${controllerName}Controller();`;
};

module.exports = controllerTemplate;