const routeConfigTemplate = (name) => {
  const kebabCase = (str) => str.toLowerCase().replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  
  // Smart pluralization - handle common cases
  const getPluralForm = (word) => {
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    } else if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('f')) {
      return word.slice(0, -1) + 'ves';
    } else if (word.endsWith('fe')) {
      return word.slice(0, -2) + 'ves';
    } else {
      return word + 's';
    }
  };
  
  const pluralName = getPluralForm(name);
  
  return `// Route configuration for the ${name} module
module.exports = {
  // Custom route path - change this to customize your routes
  path: '/api/${pluralName}', // Smart plural form. Change to '/api/${name}' for singular
  
  // Enable or disable this module
  enabled: true,
  
  // Optional: Add middleware specific to this module
  // middleware: [
  //   require('../../middleware/auth'),
  //   // Add other middleware as needed
  // ],
  
  // Optional: Route description for documentation
  description: '${name.charAt(0).toUpperCase() + name.slice(1)} management endpoints',
  
  // Optional: API version
  version: 'v1',
  
  // Optional: Rate limiting specific to this module
  // rateLimit: {
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 50 // limit each IP to 50 requests per windowMs for this module
  // }
};

/*
 * ROUTE CUSTOMIZATION EXAMPLES:
 * 
 * 1. Change route path:
 *    path: '/api/custom-${kebabCase(name)}'
 * 
 * 2. Disable module temporarily:
 *    enabled: false
 * 
 * 3. Add authentication to all routes in this module:
 *    middleware: [require('../../middleware/auth')]
 * 
 * 4. Version your API:
 *    path: '/api/v2/${name}s'
 * 
 * 5. Custom rate limiting:
 *    rateLimit: { windowMs: 60000, max: 10 }
 */`;
};

module.exports = routeConfigTemplate;