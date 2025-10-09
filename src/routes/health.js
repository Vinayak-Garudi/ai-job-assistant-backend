const express = require('express');
const mongoose = require('mongoose');
const { getModuleInfo } = require('../utils/routeLoader');

const router = express.Router();

router.get('/', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name || 'unknown',
    },
    memory: process.memoryUsage(),
    modules: getModuleInfo(),
  };

  try {
    res.status(200).json({
      success: true,
      data: healthCheck,
    });
  } catch (error) {
    healthCheck.message = 'Server is experiencing issues';
    res.status(503).json({
      success: false,
      data: healthCheck,
    });
  }
});

module.exports = router;