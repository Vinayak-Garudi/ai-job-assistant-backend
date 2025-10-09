#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

// Templates
const templates = {
  model: require('./templates/model.template'),
  service: require('./templates/service.template'),
  controller: require('./templates/controller.template'),
  routes: require('./templates/routes.template'),
  validation: require('./templates/validation.template'),
  routeConfig: require('./templates/routeConfig.template'),
};

// Utility functions
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const kebabCase = (str) => str.toLowerCase().replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const camelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

// Ensure directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Write file with content
const writeFile = (filePath, content) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Created: ${filePath}`);
};

// Generate model file
const generateModel = (name, modulePath) => {
  const modelName = capitalize(name);
  const content = templates.model(modelName, name);
  const filePath = path.join(modulePath, `${name}.model.js`);
  writeFile(filePath, content);
};

// Generate service file
const generateService = (name, modulePath) => {
  const serviceName = capitalize(name);
  const content = templates.service(serviceName, name);
  const filePath = path.join(modulePath, `${name}.service.js`);
  writeFile(filePath, content);
};

// Generate controller file
const generateController = (name, modulePath) => {
  const controllerName = capitalize(name);
  const content = templates.controller(controllerName, name);
  const filePath = path.join(modulePath, `${name}.controller.js`);
  writeFile(filePath, content);
};

// Generate routes file
const generateRoutes = (name, modulePath) => {
  const content = templates.routes(name);
  const filePath = path.join(modulePath, `${name}.routes.js`);
  writeFile(filePath, content);
};

// Generate route configuration file
const generateRouteConfig = (name, modulePath) => {
  const content = templates.routeConfig(name);
  const filePath = path.join(modulePath, 'route.config.js');
  writeFile(filePath, content);
};

// Generate validation file
const generateValidation = (name, modulePath) => {
  const content = templates.validation(name);
  const filePath = path.join(modulePath, `${name}.validation.js`);
  writeFile(filePath, content);
};

// Generate complete module
const generateModule = async (name) => {
  const modulePath = path.join(process.cwd(), 'src', 'modules', name);
  
  console.log(`🚀 Generating module: ${name}`);
  console.log(`📁 Module path: ${modulePath}`);
  
  // Generate all files
  generateModel(name, modulePath);
  generateService(name, modulePath);
  generateController(name, modulePath);
  generateRoutes(name, modulePath);
  generateValidation(name, modulePath);
  generateRouteConfig(name, modulePath);
  
  console.log(`\n✨ Module "${name}" generated successfully!`);
  console.log(`\n📝 Next steps:`);
  console.log(`1. Routes are automatically loaded! No need to register manually.`);
  console.log(`2. Customize route path in: src/modules/${name}/route.config.js`);
  console.log(`3. Update the model schema in: src/modules/${name}/${name}.model.js`);
  console.log(`4. Implement business logic in: src/modules/${name}/${name}.service.js`);
  console.log(`\n🔧 Route customization:`);
  console.log(`   Default route: /api/${name}`);
  console.log(`   Edit route.config.js to change to /api/${name}s or any custom path`);
};

// CLI Commands
program
  .name('generator')
  .description('Code generator for Node.js Express MongoDB template')
  .version('1.0.0');

program
  .command('module <name>')
  .description('Generate a complete module with model, service, controller, routes, and validation')
  .action(async (name) => {
    await generateModule(name);
  });

program
  .command('model <name>')
  .description('Generate only a model file')
  .action(async (name) => {
    const modulePath = path.join(process.cwd(), 'src', 'modules', name);
    generateModel(name, modulePath);
    console.log(`✨ Model "${name}" generated successfully!`);
  });

program
  .command('service <name>')
  .description('Generate only a service file')
  .action(async (name) => {
    const modulePath = path.join(process.cwd(), 'src', 'modules', name);
    generateService(name, modulePath);
    console.log(`✨ Service "${name}" generated successfully!`);
  });

program
  .command('controller <name>')
  .description('Generate only a controller file')
  .action(async (name) => {
    const modulePath = path.join(process.cwd(), 'src', 'modules', name);
    generateController(name, modulePath);
    console.log(`✨ Controller "${name}" generated successfully!`);
  });

program
  .command('interactive')
  .description('Interactive generator')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'What would you like to generate?',
        choices: [
          { name: 'Complete Module (recommended)', value: 'module' },
          { name: 'Model only', value: 'model' },
          { name: 'Service only', value: 'service' },
          { name: 'Controller only', value: 'controller' },
        ],
      },
      {
        type: 'input',
        name: 'name',
        message: 'Enter the name (e.g., user, product, order):',
        validate: (input) => {
          if (!input.trim()) {
            return 'Name is required';
          }
          if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'Name must start with a letter and contain only letters and numbers';
          }
          return true;
        },
      },
    ]);

    const { type, name } = answers;

    switch (type) {
      case 'module':
        await generateModule(name.toLowerCase());
        break;
      case 'model':
        const modelPath = path.join(process.cwd(), 'src', 'modules', name.toLowerCase());
        generateModel(name.toLowerCase(), modelPath);
        break;
      case 'service':
        const servicePath = path.join(process.cwd(), 'src', 'modules', name.toLowerCase());
        generateService(name.toLowerCase(), servicePath);
        break;
      case 'controller':
        const controllerPath = path.join(process.cwd(), 'src', 'modules', name.toLowerCase());
        generateController(name.toLowerCase(), controllerPath);
        break;
    }
  });

// Handle no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse();