const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// Default configuration
const DEFAULT_CONFIG = {
 "targetUrl": "https://link.cifraads.com/MVwINT?utm_source=vinicius357&utm_term=357",
  totalSimulations: 100,
  concurrency: 3,
  debug: false,
  logLevel: "info",
  userAgentType: "random"
};

/**
 * Load configuration from file or use defaults
 * @param {string} configPath - Path to configuration file
 * @returns {Object} - Configuration object
 */
async function loadConfig(configPath) {
  try {
    console.log(chalk.blue(`🔧 Loading config from: ${configPath}`));
    const configFile = await fs.readFile(path.resolve(configPath), 'utf8');
    const userConfig = JSON.parse(configFile);

    console.log(chalk.blue(`📋 Config loaded - Concurrency: ${userConfig.concurrency}, UserAgent: ${userConfig.userAgentType}`));

    // Corrige targetUrl quebrada automaticamente se detectar "utm7"
    if (userConfig.targetUrl && userConfig.targetUrl.includes('utm7')) {
      console.warn(chalk.yellow('⚠️  targetUrl está corrompida no JSON (contém "utm7"). Substituindo pela URL padrão.'));
      userConfig.targetUrl = DEFAULT_CONFIG.targetUrl;
    }

    // Merge com defaults
    const config = { ...DEFAULT_CONFIG, ...userConfig };

    console.log(chalk.green(`✅ Final config - Concurrency: ${config.concurrency}, UserAgent: ${config.userAgentType}`));

    // Verifica se há targetUrl
    if (!config.targetUrl) {
      throw new Error('Target URL is required in configuration');
    }

    // Log para verificação
    console.log(chalk.magenta('Final loaded URL:'));
    console.log(chalk.magenta(config.targetUrl));

    // Validação de parâmetros obrigatórios
    try {
      const urlParams = new URL(config.targetUrl).searchParams;
      const requiredParams = ['utm_source', 'utm_term'];


      for (const param of requiredParams) {
        if (!urlParams.has(param)) {
          throw new Error(`Missing required URL parameter: ${param}`);
        }
      }

    } catch (err) {
      throw new Error(`Malformed target URL: ${config.targetUrl}`);
    }

    return config;

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(chalk.yellow(`Configuration file not found at ${configPath}, using defaults`));
      return DEFAULT_CONFIG;
    }

    if (error instanceof SyntaxError) {
      console.error(chalk.red(`Invalid JSON in configuration file: ${error.message}`));
      process.exit(1);
    }

    console.error(chalk.red(`Error loading configuration: ${error.message}`));
    return DEFAULT_CONFIG;
  }
}

module.exports = {
  loadConfig
};
