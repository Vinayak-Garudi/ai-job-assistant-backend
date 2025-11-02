const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const chalk = require('chalk');

/**
 * Automatically discover and load routes from modules
 * @param {Express} app - Express application instance
 */
const autoLoadRoutes = (app) => {
  const modulesDir = path.join(__dirname, '../modules');

  if (!fs.existsSync(modulesDir)) {
    console.log('📁 No modules directory found');
    return;
  }

  const moduleNames = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  console.log(`🔍 Discovering modules: ${moduleNames.join(', ')}`);

  const loadedRoutes = [];

  moduleNames.forEach((moduleName) => {
    try {
      const modulePath = path.join(modulesDir, moduleName);

      // Check for route configuration file
      const configPath = path.join(modulePath, 'route.config.js');
      const routesPath = path.join(modulePath, `${moduleName}.routes.js`);

      if (!fs.existsSync(routesPath)) {
        console.log(`⚠️  No routes file found for module: ${moduleName}`);
        return;
      }

      let routeConfig = {
        path: `/api/${moduleName}`, // default path
        enabled: true,
        description: `${moduleName} module routes`,
      };

      // Load custom route configuration if exists
      if (fs.existsSync(configPath)) {
        const customConfig = require(configPath);
        routeConfig = { ...routeConfig, ...customConfig };
      }

      if (!routeConfig.enabled) {
        console.log(`🚫 Module ${moduleName} is disabled`);
        return;
      }

      // Load routes
      const routes = require(routesPath);

      // Apply module-specific rate limiting if configured
      if (routeConfig.rateLimit) {
        const moduleRateLimit = rateLimit({
          windowMs: routeConfig.rateLimit.windowMs || 15 * 60 * 1000,
          max: routeConfig.rateLimit.max || 100,
          message:
            routeConfig.rateLimit.message ||
            `Too many requests to ${moduleName} API`,
        });
        app.use(routeConfig.path, moduleRateLimit);
        console.log(
          `🛡️  Rate limiting applied to ${moduleName}: ${routeConfig.rateLimit.max} requests per ${routeConfig.rateLimit.windowMs / 1000 / 60} minutes`
        );
      }

      // Apply module-specific middleware if configured
      if (routeConfig.middleware && Array.isArray(routeConfig.middleware)) {
        routeConfig.middleware.forEach((middleware) => {
          app.use(routeConfig.path, middleware);
        });
        console.log(
          `🔒 Applied ${routeConfig.middleware.length} middleware(s) to ${moduleName}`
        );
      }

      // Register routes
      app.use(routeConfig.path, routes);

      loadedRoutes.push({
        module: moduleName,
        path: routeConfig.path,
        description: routeConfig.description,
        version: routeConfig.version || 'v1',
      });

      console.log(
        `✅ Loaded module: ${moduleName} -> \x1b[32m${routeConfig.path}\x1b[0m`
      );
    } catch (error) {
      console.error(
        chalk.red(`❌ Error loading module ${moduleName}: ${error.message}`)
      );
    }
  });

  // Log summary in tabular format
  if (loadedRoutes.length > 0) {
    console.log(`\n📋 Loaded Modules:`);
    console.log(
      '\x1b[36m┌─────────────────┬────────────────────────────┬─────────────────────────────────────┬─────────┐\x1b[0m'
    );
    console.log(
      '\x1b[36m│\x1b[0m \x1b[1mModule\x1b[0m          \x1b[36m│\x1b[0m \x1b[1mRoute\x1b[0m                      \x1b[36m│\x1b[0m \x1b[1mDescription\x1b[0m                         \x1b[36m│\x1b[0m \x1b[1mVersion\x1b[0m \x1b[36m│\x1b[0m'
    );
    console.log(
      '\x1b[36m├─────────────────┼────────────────────────────┼─────────────────────────────────────┼─────────┤\x1b[0m'
    );

    loadedRoutes.forEach((route, index) => {
      const module = route.module.padEnd(15);
      const path = route.path.padEnd(26);
      const description =
        route.description.length > 35
          ? route.description.substring(0, 32) + '...'
          : route.description.padEnd(35);
      const version = route.version.padEnd(7);

      console.log(
        `\x1b[36m│\x1b[0m ${module} \x1b[36m│\x1b[0m \x1b[32m${path}\x1b[0m \x1b[36m│\x1b[0m ${description} \x1b[36m│\x1b[0m ${version} \x1b[36m│\x1b[0m`
      );
    });

    console.log(
      '\x1b[36m└─────────────────┴────────────────────────────┴─────────────────────────────────────┴─────────┘\x1b[0m'
    );
  }
};

/**
 * Get information about all loaded modules
 * @returns {Array} Array of module information
 */
const getModuleInfo = () => {
  const modulesDir = path.join(__dirname, '../modules');

  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const moduleNames = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return moduleNames
    .map((moduleName) => {
      const configPath = path.join(modulesDir, moduleName, 'route.config.js');
      let config = {
        path: `/api/${moduleName}`,
        enabled: true,
        description: `${moduleName} module routes`,
        version: 'v1',
      };

      if (fs.existsSync(configPath)) {
        try {
          const customConfig = require(configPath);
          config = { ...config, ...customConfig };
        } catch (error) {
          // Use default config if there's an error reading the custom config
        }
      }

      return {
        module: moduleName,
        ...config,
      };
    })
    .filter((info) => info.enabled);
};

module.exports = { autoLoadRoutes, getModuleInfo };
