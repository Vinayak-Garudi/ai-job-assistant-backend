const Category = require('./category.model');

class CategoryService {
  // Get all categorys with pagination
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
    let query = Category.find(filter);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    // Execute query with pagination
    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(parseInt(limit)),
      Category.countDocuments(filter),
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

  // Get category by ID
  async getById(id, populate = '') {
    let query = Category.findById(id);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    const item = await query;
    if (!item) {
      throw new Error('Category not found');
    }
    
    return item;
  }

  // Create new category
  async create(data) {
    const item = await Category.create(data);
    return item;
  }

  // Update category
  async update(id, data) {
    const item = await Category.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      throw new Error('Category not found');
    }
    
    return item;
  }

  // Delete category
  async delete(id) {
    const item = await Category.findByIdAndDelete(id);
    
    if (!item) {
      throw new Error('Category not found');
    }
    
    return item;
  }

  // Soft delete (deactivate)
  async deactivate(id) {
    const item = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!item) {
      throw new Error('Category not found');
    }
    
    return item;
  }

  // Get active categorys only
  async getActive(options = {}) {
    const filter = { ...options.filter, isActive: true };
    return this.getAll({ ...options, filter });
  }

  // Search categorys
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

  // Get category statistics
  async getStats() {
    const [total, active, inactive] = await Promise.all([
      Category.countDocuments(),
      Category.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: false }),
    ]);

    return {
      total,
      active,
      inactive,
      recentlyCreated: await Category
        .countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
    };
  }
}

module.exports = new CategoryService();