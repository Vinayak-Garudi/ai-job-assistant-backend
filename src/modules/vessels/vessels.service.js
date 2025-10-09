const Vessels = require('./vessels.model');

class VesselsService {
  // Get all vesselss with pagination
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
    let query = Vessels.find(filter);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    // Execute query with pagination
    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(parseInt(limit)),
      Vessels.countDocuments(filter),
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

  // Get vessels by ID
  async getById(id, populate = '') {
    let query = Vessels.findById(id);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    const item = await query;
    if (!item) {
      throw new Error('Vessels not found');
    }
    
    return item;
  }

  // Create new vessels
  async create(data) {
    const item = await Vessels.create(data);
    return item;
  }

  // Update vessels
  async update(id, data) {
    const item = await Vessels.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      throw new Error('Vessels not found');
    }
    
    return item;
  }

  // Delete vessels
  async delete(id) {
    const item = await Vessels.findByIdAndDelete(id);
    
    if (!item) {
      throw new Error('Vessels not found');
    }
    
    return item;
  }

  // Soft delete (deactivate)
  async deactivate(id) {
    const item = await Vessels.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!item) {
      throw new Error('Vessels not found');
    }
    
    return item;
  }

  // Get active vesselss only
  async getActive(options = {}) {
    const filter = { ...options.filter, isActive: true };
    return this.getAll({ ...options, filter });
  }

  // Search vesselss
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

  // Get vessels statistics
  async getStats() {
    const [total, active, inactive] = await Promise.all([
      Vessels.countDocuments(),
      Vessels.countDocuments({ isActive: true }),
      Vessels.countDocuments({ isActive: false }),
    ]);

    return {
      total,
      active,
      inactive,
      recentlyCreated: await Vessels
        .countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
    };
  }
}

module.exports = new VesselsService();