const serviceTemplate = (serviceName, name) => {
  return `const model = require('./${name}.model');

class ${serviceName}Service {
  // Get all ${name}s with pagination
  async getAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      filter = {},
      populate = '',
    } = options;

    const skip = (page - 1) * limit;
    
    // Build query
    let query = model.find(filter);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    // Execute query with pagination
    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(parseInt(limit)),
      model.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get ${name} by ID
  async getById(id, populate = '') {
    let query = model.findById(id);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    const item = await query;
    if (!item) {
      throw new Error('${serviceName} not found');
    }
    
    return item;
  }

  // Create new ${name}
  async create(data) {
    const item = await model.create(data);
    return item;
  }

  // Update ${name}
  async update(id, data) {
    const item = await model.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      throw new Error('${serviceName} not found');
    }
    
    return item;
  }

  // Delete ${name}
  async delete(id) {
    const item = await model.findByIdAndDelete(id);
    
    if (!item) {
      throw new Error('${serviceName} not found');
    }
    
    return item;
  }

  // Soft delete (deactivate)
  async deactivate(id) {
    const item = await model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!item) {
      throw new Error('${serviceName} not found');
    }
    
    return item;
  }

  // Get active ${name}s only
  async getActive(options = {}) {
    const filter = { ...options.filter, isActive: true };
    return this.getAll({ ...options, filter });
  }

  // Search ${name}s
  async search(searchTerm, options = {}) {
    const searchFilter = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ],
      ...options.filter,
    };

    return this.getAll({ ...options, filter: searchFilter });
  }

  // Get ${name} statistics
  async getStats() {
    const [total, active, inactive] = await Promise.all([
      model.countDocuments(),
      model.countDocuments({ isActive: true }),
      model.countDocuments({ isActive: false }),
    ]);

    return {
      total,
      active,
      inactive,
      recentlyCreated: await model
        .countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
    };
  }
}

module.exports = new ${serviceName}Service();`;
};

module.exports = serviceTemplate;
