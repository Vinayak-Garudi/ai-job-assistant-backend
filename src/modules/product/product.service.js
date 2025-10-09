const Product = require('./product.model');

class ProductService {
  // Get all products with pagination
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
    let query = Product.find(filter);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    // Execute query with pagination
    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(filter),
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

  // Get product by ID
  async getById(id, populate = '') {
    let query = Product.findById(id);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    const item = await query;
    if (!item) {
      throw new Error('Product not found');
    }
    
    return item;
  }

  // Create new product
  async create(data) {
    const item = await Product.create(data);
    return item;
  }

  // Update product
  async update(id, data) {
    const item = await Product.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      throw new Error('Product not found');
    }
    
    return item;
  }

  // Delete product
  async delete(id) {
    const item = await Product.findByIdAndDelete(id);
    
    if (!item) {
      throw new Error('Product not found');
    }
    
    return item;
  }

  // Soft delete (deactivate)
  async deactivate(id) {
    const item = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!item) {
      throw new Error('Product not found');
    }
    
    return item;
  }

  // Get active products only
  async getActive(options = {}) {
    const filter = { ...options.filter, isActive: true };
    return this.getAll({ ...options, filter });
  }

  // Search products
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

  // Get product statistics
  async getStats() {
    const [total, active, inactive] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
    ]);

    return {
      total,
      active,
      inactive,
      recentlyCreated: await Product
        .countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
    };
  }
}

module.exports = new ProductService();