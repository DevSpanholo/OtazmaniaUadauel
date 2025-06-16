// Lead Simulation Tool
const { program } = require('commander');
const { startSimulation } = require('./src/simulation');
const { loadConfig } = require('./src/config');
const chalk = require('chalk');

program
  .option('-c, --config <path>', 'path to config file', './config.json')
  .option('-d, --debug', 'enable debug mode', false)
  .option('-n, --num <number>', 'number of simulations to run')
  .option('-cc, --concurrency <number>', 'number of concurrent simulations', '3')
  .option('-ua, --useragent <type>', 'user agent type (mobile, desktop, random)', 'random')
  .option('-l, --log <level>', 'log level (info, debug, error)', 'info')
  .parse(process.argv);

const options = program.opts();

// Display banner
console.log(chalk.cyan('='.repeat(70)));
console.log(chalk.cyan.bold('                Lead Simulation Tool v1.0.0'));
console.log(chalk.cyan('='.repeat(70)));

async function run() {
  try {
    // Load configuration
    const config = await loadConfig(options.config);
    
    // Override config with command line options
    config.debug = options.debug || config.debug;
    config.totalSimulations = options.num ? parseInt(options.num) : config.totalSimulations;
    config.concurrency = parseInt(options.concurrency) || config.concurrency;
    config.userAgentType = options.useragent || config.userAgentType;
    config.logLevel = options.log || config.logLevel;
    
    console.log(chalk.yellow('Starting simulation with the following settings:'));
    console.log(chalk.yellow(`  Target URL: ${config.targetUrl}`));
    console.log(chalk.yellow(`  Total Simulations: ${config.totalSimulations}`));
    console.log(chalk.yellow(`  Concurrency: ${config.concurrency}`));
    console.log(chalk.yellow(`  Debug Mode: ${config.debug ? 'Enabled' : 'Disabled'}`));
    console.log(chalk.yellow(`  User Agent Type: ${config.userAgentType}`));
    console.log(chalk.cyan('='.repeat(70)));
    
    // Start simulation
    await startSimulation(config);
    
  } catch (error) {
    console.error(chalk.red('Error during initialization:'), error.message);
    process.exit(1);
  }
}

run();