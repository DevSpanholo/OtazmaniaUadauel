const { chromium } = require('playwright');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const { getRandomUserInfo } = require('./user-data');
const { getRandomUserAgent } = require('./user-agent');
const { setupTrackingBypass } = require('./tracking-bypass');
const { simulateHumanBehavior } = require('./human-behavior');
const { simulateUltraHumanBehavior } = require('./enhanced-human-behavior');
const { DataConsumptionMonitor, DataAggregator } = require('./data-monitor');

/**
 * Start the simulation with the given configuration
 * @param {Object} config - Configuration object
 */
async function startSimulation(config) {
  const { totalSimulations, concurrency } = config;
  let completedSimulations = 0;
  let successfulSimulations = 0;
  
  // Inicializa agregador de dados
  const dataAggregator = new DataAggregator();
  
  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: chalk.cyan('Progress: [{bar}] {percentage}% | {value}/{total} | Success: {successCount} | ETA: {eta}s'),
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  
  progressBar.start(totalSimulations, 0, {
    successCount: 0
  });
  
  // Process simulations in batches based on concurrency
  for (let i = 0; i < totalSimulations; i += concurrency) {
    const batch = [];
    const batchSize = Math.min(concurrency, totalSimulations - i);
    
    for (let j = 0; j < batchSize; j++) {
      batch.push(runSimulation(config, i + j + 1)
        .then(success => {
          completedSimulations++;
          if (success) successfulSimulations++;
          
          // Adiciona dados de consumo se disponível
          if (success.dataReport) {
            dataAggregator.addReport(success.dataReport);
          }
          
          progressBar.update(completedSimulations, {
            successCount: successfulSimulations
          });
          return success.success || success;
        })
        .catch(error => {
          completedSimulations++;
          progressBar.update(completedSimulations, {
            successCount: successfulSimulations
          });
          if (config.debug) {
            console.error(chalk.red(`\nError in simulation ${i + j + 1}:`), error.message);
          }
          return false;
        })
      );
    }
    
    // Wait for all simulations in the batch to complete
    const results = await Promise.all(batch);
    
    // Add a small delay between batches to avoid overwhelming the target
    if (i + batchSize < totalSimulations) {
      await new Promise(r => setTimeout(r, Math.random() * 5000 + 2000));
    }
  }
  
  progressBar.stop();
  
  // Display results
  console.log(chalk.cyan('='.repeat(70)));
  console.log(chalk.green.bold(`Simulation completed: ${successfulSimulations}/${totalSimulations} successful`));
  
  // Exibe relatório de consumo de dados
  dataAggregator.displayFinalReport();
  
  console.log(chalk.cyan('='.repeat(70)));
}

/**
 * Run a single simulation
 * @param {Object} config - Configuration object
 * @param {number} index - Simulation index
 * @returns {Promise<boolean>} - Success status
 */
async function runSimulation(config, index) {
  const userAgent = getRandomUserAgent(config.userAgentType);
  const userInfo = getRandomUserInfo();
  
  // Inicializa monitor de dados
  const dataMonitor = new DataConsumptionMonitor();
  
  // Seleciona um proxy aleatório se habilitado
  let proxy = null;
  if (config.dataOptions?.enableProxies === true && config.dataOptions?.proxyList?.length > 0) {
    // Rotaciona proxy a cada X simulações para economizar dados
    const rotationInterval = config.dataOptions?.proxyRotationInterval || 50;
    const proxyIndex = Math.floor(index / rotationInterval) % config.dataOptions.proxyList.length;
    const rawProxy = config.dataOptions.proxyList[proxyIndex];
    
    // Ex: http://user:pass@host:port
    const parsed = new URL(rawProxy);
    proxy = {
      server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
      username: parsed.username,
      password: parsed.password
    };
  }

  if (config.debug) {
    console.log(chalk.blue(`\n🔄 Running simulation #${index} as ${userInfo.name} (${userInfo.email})`));
    if (proxy) {
      console.log(chalk.gray(`🔒 Using proxy: ${proxy.server}`));
    } else {
      console.log(chalk.gray(`🌐 Using direct connection (no proxy)`));
    }
  }

  // Setup browser
  const browserOptions = {
    headless: config.browserOptions?.headless ?? true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    slowMo: config.browserOptions?.slowMo
  };

  // Only add proxy if it exists and is properly configured
  if (proxy) {
    browserOptions.proxy = proxy;
  }

  const launchArgs = {
  headless: browserOptions.headless,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    ...(proxy ? [`--proxy-server=${proxy.server}`] : [])
  ],
  proxy: proxy || undefined
};

const browser = await chromium.launch(launchArgs);

  // Configuração do contexto com proxy
  const contextOptions = {
    userAgent,
    locale: config.browserOptions?.locale || 'pt-BR',
    timezoneId: config.browserOptions?.timezoneId || 'America/Sao_Paulo',
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    isMobile: config.userAgentType === 'mobile',
    hasTouch: true,
    geolocation: { 
      longitude: -46.6333 + (Math.random() * 0.1 - 0.05), 
      latitude: -23.5505 + (Math.random() * 0.1 - 0.05)
    },
    permissions: ['geolocation']
  };

  // Criar o contexto do navegador
  const context = await browser.newContext(contextOptions);
  if (proxy?.username && proxy?.password) {
  await context.setHTTPCredentials({
    username: proxy.username,
    password: proxy.password
  });
}

  
  // Emular conexão 4G
  if (config.browserOptions?.network) {
    const page = await context.newPage();
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: config.browserOptions.network.latency,
      downloadThroughput: config.browserOptions.network.downloadThroughput,
      uploadThroughput: config.browserOptions.network.uploadThroughput
    });
    await page.close();
  }

  // Add tracking bypass
  await setupTrackingBypass(context, config);
  
  const page = await context.newPage();
  
  // Configura monitoramento de dados
  await dataMonitor.setupMonitoring(page, config);
  
  try {
    // Step 1: Navigate to the initial page
    if (config.debug) {
      console.log(chalk.gray(`🌐 Debug - Full URL before navigation:`));
      console.log(chalk.gray(`   ${config.targetUrl}`));
    }
    
    await page.goto(config.targetUrl, {
      waitUntil: 'load',
      timeout: config.simulationSteps?.pageLoadTimeout || 180000,
      referer: 'https://l.facebook.com/'
    }).catch(async (error) => {
      if (config.debug) {
        console.log(chalk.red(`❌ Error navigating to page: ${error.message}`));
      }
      throw error;
    });

    if (config.debug) {
      try {
        const ipCheck = await page.evaluate(async () => {
          try {
            const res = await fetch('https://ipinfo.io/json', { timeout: 5000 });
            return await res.json();
          } catch (err) {
            return { ip: 'unknown', city: 'unknown', region: 'unknown', org: 'unknown' };
          }
        });

        console.log(chalk.magenta(`🌍 IP Atual: ${ipCheck.ip} | ${ipCheck.city}, ${ipCheck.region} - ${ipCheck.org}`));
      } catch (err) {
        console.log(chalk.yellow('⚠️ Não foi possível obter o IP do navegador.'));
      }
    }

    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      if (config.debug) {
        console.log(chalk.yellow('⚠️ Load state timeout — continuando mesmo assim'));
      }
    });

    // Espera extra para garantir carregamento mínimo, mesmo com timeout
    await page.waitForTimeout(getRandomInt(
      config.simulationSteps?.initialWait?.[0] || 3000,
      config.simulationSteps?.initialWait?.[1] || 5000
    ));
    
    // Step 2: Simulate human behavior
    // Use enhanced human behavior for higher quality
    await simulateUltraHumanBehavior(page, config);
    await page.waitForTimeout(getRandomInt(
      config.simulationSteps?.humanInteractionInterval?.[0] || 2000,
      config.simulationSteps?.humanInteractionInterval?.[1] || 4000
    ));
    
    // Additional reading time simulation
    if (config.simulationSteps?.readingTime) {
      const readingTime = getRandomInt(
        config.simulationSteps.readingTime[0],
        config.simulationSteps.readingTime[1]
      );
      if (config.debug) console.log(chalk.gray(`📖 Simulating reading for ${readingTime}ms`));
      await page.waitForTimeout(readingTime);
    }
    
    // Step 3: Look for and click on ads
    const adClicked = await tryClickOnAd(page, config);
    if (adClicked && config.debug) {
      if (Math.random() < config.simulationSteps?.adClickProbability || 0.7) {
        console.log(chalk.green('🖱️ Successfully clicked on an ad'));
        await page.waitForTimeout(getRandomInt(2000, 3000));
      }
    }
    
    // 🚨 Fechar overlays de ads ANTES de procurar botões
    await closeAdOverlays(page, config);
    
    // Step 4: Find and click the intermediate button
    // Procura por múltiplos seletores possíveis
    let intermediateBtn = null;
    const intermediateBtnSelectors = [
      'a[href*="descubra-como-participar-da-campanha"]',
      'a[href*="transforme-seus-sonhos"]',
      'a:has-text("VER COMO PARTICIPAR")',
      'a.wp-block-button__link',
      '.wp-block-button a',
      '#post-8441 .wp-block-button a'
    ];
    
    for (const selector of intermediateBtnSelectors) {
      intermediateBtn = await page.$(selector).catch(() => null);
      
      if (intermediateBtn) {
        const isVisible = await intermediateBtn.isVisible().catch(() => false);
        if (isVisible) {
          if (config.debug) console.log(chalk.gray(`🔍 Found intermediate button with selector: ${selector}`));
          break;
        }
        intermediateBtn = null;
      }
    }
    
    if (!intermediateBtn) {
      if (config.debug) console.log(chalk.yellow('⚠️ Intermediate button not found'));
      await browser.close();
      return false;
    } else {
      await intermediateBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await simulateUltraHumanBehavior(page, config);
      await page.waitForTimeout(getRandomInt(2000, 3000));
      
      if (config.debug) console.log(chalk.gray('🖱️ Clicking intermediate button'));
      
      try {
        // Estratégia de clique mais robusta
        await intermediateBtn.click({ force: true });
        await page.waitForTimeout(3000);
        
        // Aguarda navegação ou timeout
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
          if (config.debug) console.log(chalk.yellow('⚠️ Network idle timeout, continuing...'));
        });
      } catch (navError) {
        if (config.debug) console.log(chalk.yellow('⚠️ Navigation timeout, continuing...'));
      }
    }
    
    // More human-like behavior
    await simulateUltraHumanBehavior(page, config);
    await tryClickOnAd(page, config);
    
    // 🚨 Fechar overlays novamente após clicar em ads
    await closeAdOverlays(page, config);
    
    // Aguarda mais tempo para a página estabilizar
    await page.waitForTimeout(3000);
    
    // Step 5: Find and click the green button
    // Procura por múltiplos seletores para o botão verde
    let greenButton = null;
    const greenBtnSelectors = [
      // Seletores mais específicos para o botão verde
      'a.wp-block-button__link[style*="background-color:#00942a"]',
      'a.wp-block-button__link[style*="#00942a"]',
      'a[style*="background-color:#00942a"]',
      'a[href*="participe.cifradobem.com"]',
      'a[href*="cifradobem"]',
      'a:has-text("INSCREVA-SE")',
      'a:has-text("PARTICIPAR")',
      'a:has-text("QUERO PARTICIPAR")',
      'a:has-text("PARTICIPAR DO SORTEIO")',
      '.wp-block-button a[style*="#00942a"]',
      '#post-8439 .wp-block-button a',
      '.wp-block-button a',
      // Seletores mais genéricos como fallback
      'a.wp-block-button__link:last-of-type',
      '.wp-block-buttons a:last-child'
    ];
    
    // Tenta múltiplas vezes com diferentes estratégias
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        if (config.debug) console.log(chalk.yellow(`🔄 Attempt ${attempt + 1} to find green button...`));
        await closeAdOverlays(page, config);
        await page.waitForTimeout(2000);
      }
      
      for (const selector of greenBtnSelectors) {
        greenButton = await page.waitForSelector(selector, { timeout: 8000 }).catch(() => null);
        
        if (greenButton) {
          const isVisible = await greenButton.isVisible().catch(() => false);
          const href = await greenButton.getAttribute('href').catch(() => '');
          
          if (isVisible && href) {
            if (config.debug) console.log(chalk.gray(`🔍 Found green button with selector: ${selector}`));
            if (config.debug) console.log(chalk.gray(`🔗 Button href: ${href}`));
            
            // Prioriza botões que vão para cifradobem
            if (href.includes('cifradobem')) {
              break;
            }
          }
          greenButton = null;
        }
      }
      
      if (greenButton) break;
    }
    
    if (!greenButton) {
      // Última tentativa: qualquer botão visível
      const allButtons = await page.$$('a.wp-block-button__link, .wp-block-button a, a[class*="button"]');
      for (const btn of allButtons) {
        const isVisible = await btn.isVisible().catch(() => false);
        const href = await btn.getAttribute('href').catch(() => '');
        const text = await btn.textContent().catch(() => '');
        
        if (isVisible && href && (href.includes('cifradobem') || text.toLowerCase().includes('participar'))) {
          greenButton = btn;
          if (config.debug) console.log(chalk.gray(`🔍 Using fallback button with href: ${href} | text: ${text}`));
          break;
        }
      }
    }
    
    if (!greenButton) {
      if (config.debug) console.log(chalk.yellow('⚠️ Green button not found'));
      await browser.close();
      return false;
    }
    
    // Fecha overlays uma última vez antes de clicar
    await closeAdOverlays(page, config);
    
    await greenButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await simulateUltraHumanBehavior(page, config);
    await page.waitForTimeout(getRandomInt(2000, 3000));
    
    if (config.debug) console.log(chalk.gray('🖱️ Clicking green button'));
    
    try {
      // Estratégia de clique mais robusta
      await greenButton.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(3000);
      
      // Aguarda navegação ou timeout
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        if (config.debug) console.log(chalk.yellow('⚠️ Network idle timeout after green button, continuing...'));
      });
    } catch (clickError) {
      if (config.debug) console.log(chalk.yellow('⚠️ Click error, trying alternative method...'));
      
      // Método alternativo: JavaScript click
      try {
        await page.evaluate((element) => {
          element.click();
        }, greenButton);
      } catch (jsError) {
        // Última tentativa: navegar diretamente
        const href = await greenButton.getAttribute('href').catch(() => '');
        if (href) {
          if (config.debug) console.log(chalk.yellow(`🔄 Direct navigation to: ${href}`));
          await page.goto(href, { waitUntil: 'load', timeout: 30000 });
        }
      }
      await page.waitForTimeout(3000);
    }
    
    // More human-like behavior
    await simulateUltraHumanBehavior(page, config);
    await tryClickOnAd(page, config);
    
    // 🚨 Fechar overlays uma última vez antes do formulário
    await closeAdOverlays(page, config);
   
   // Aguarda mais tempo e verifica se chegou na página correta
   await page.waitForTimeout(3000);
   
   // Verifica se chegou na página do formulário
   const currentUrl = page.url();
   if (!currentUrl.includes('participe.cifradobem.com')) {
     if (config.debug) console.log(chalk.yellow(`⚠️ Not on form page. Current URL: ${currentUrl}`));
     
     // Tenta navegar diretamente para o formulário se não chegou lá
     try {
       const formUrl = 'https://participe.cifradobem.com/form/164';
       if (config.debug) console.log(chalk.yellow(`🔄 Trying direct navigation to: ${formUrl}`));
       await page.goto(formUrl, { waitUntil: 'load', timeout: 30000 });
       await page.waitForTimeout(3000);
     } catch (directNavError) {
       if (config.debug) console.log(chalk.red(`❌ Direct navigation failed: ${directNavError.message}`));
       await browser.close();
       return false;
     }
   }
   
   const finalFormUrl = page.url();
   if (config.debug) console.log(chalk.green(`✅ On form page: ${finalFormUrl}`));
    
    // Step 6: Fill in the form
    // 🧠 Preenchimento seguro do formulário
    const fillSpeed = config.simulationSteps?.formFillSpeed || [100, 300];
    
    // Aguarda a página do formulário carregar
    await page.waitForTimeout(2000);
    
    // Nome - com múltiplos seletores
    let nameInput = null;
    const nameSelectors = [
      '#root > div > div > form > div:nth-child(1) > div > input',
      'input[placeholder="Seu nome completo"]',
      'input[name="name"]',
      'input[type="text"][placeholder*="nome completo"]'
    ];
    
    for (const selector of nameSelectors) {
      nameInput = await page.waitForSelector(selector, { timeout: 10000 }).catch(() => null);
      if (nameInput) {
        const isVisible = await nameInput.isVisible().catch(() => false);
        if (isVisible) {
          if (config.debug) console.log(chalk.gray(`📝 Found name input with selector: ${selector}`));
          break;
        }
        nameInput = null;
      }
    }
    
    if (!nameInput) {
      if (config.debug) console.log(chalk.yellow('⚠️ Campo de nome não encontrado — encerrando simulação'));
      await browser.close();
      return false;
    }
    await nameInput.fill(userInfo.name, { delay: getRandomInt(...fillSpeed) });
    await page.waitForTimeout(getRandomInt(800, 1500));
    
    // Email - com múltiplos seletores
    let emailInput = null;
    const emailSelectors = [
      '#root > div > div > form > div:nth-child(2) > div > input',
      'input[placeholder="Seu melhor e-mail"]',
      'input[name="email"]',
      'input[type="email"]'
    ];
    
    for (const selector of emailSelectors) {
      emailInput = await page.$(selector);
      if (emailInput) {
        const isVisible = await emailInput.isVisible().catch(() => false);
        if (isVisible) {
          if (config.debug) console.log(chalk.gray(`📧 Found email input with selector: ${selector}`));
          break;
        }
        emailInput = null;
      }
    }
    
    if (!emailInput) {
      if (config.debug) console.log(chalk.yellow('⚠️ Campo de email não encontrado'));
      await browser.close();
      return false;
    }
    await emailInput.fill(userInfo.email, { delay: getRandomInt(...fillSpeed) });
    await page.waitForTimeout(getRandomInt(800, 1500));
    
    // WhatsApp - com múltiplos seletores
    let phoneInput = null;
    const phoneSelectors = [
      '#root > div > div > form > div:nth-child(3) > div > input',
      'input[placeholder="Seu WhatsApp"]',
      'input[placeholder*="WhatsApp"]'
    ];
    
    for (const selector of phoneSelectors) {
      phoneInput = await page.$(selector);
      if (phoneInput) {
        const isVisible = await phoneInput.isVisible().catch(() => false);
        if (isVisible) {
          if (config.debug) console.log(chalk.gray(`📱 Found phone input with selector: ${selector}`));
          break;
        }
        phoneInput = null;
      }
    }
    
    if (!phoneInput) {
      if (config.debug) console.log(chalk.yellow('⚠️ Campo de telefone não encontrado'));
      await browser.close();
      return false;
    }
    await phoneInput.fill(userInfo.phone, { delay: getRandomInt(...fillSpeed) });
    await page.waitForTimeout(getRandomInt(800, 1500));
    
    // Estado (select) - com múltiplos seletores
    const stateSelectors = [
      '#root > div > div > form > div:nth-child(4) select',
      'select[name="state"]',
      'select'
    ];
    let stateSelect = null;
    
    for (const selector of stateSelectors) {
      stateSelect = await page.$(selector);
      if (stateSelect) {
        const isVisible = await stateSelect.isVisible().catch(() => false);
        if (isVisible) {
          if (config.debug) console.log(chalk.gray(`🗺️ Found state select with selector: ${selector}`));
          break;
        }
        stateSelect = null;
      }
    }
    
    if (stateSelect) {
      const stateOptions = await stateSelect.$$('option');
      if (stateOptions.length > 1) {
        const randomOption = stateOptions[Math.floor(Math.random() * (stateOptions.length - 1) + 1)];
        const value = await randomOption.getAttribute('value');
        await stateSelect.selectOption(value);
        if (config.debug) console.log(chalk.gray('📍 Estado selecionado'));
        await page.waitForTimeout(getRandomInt(1000, 2000));
      }
    } else {
      if (config.debug) console.log(chalk.yellow('⚠️ Campo de estado não encontrado, continuando...'));
    }
    
    // Step 7: Submit the form
    await page.waitForTimeout(getRandomInt(2000, 3000));
    await simulateUltraHumanBehavior(page, config);
    
    // Botão de submit - com múltiplos seletores
    let submitButton = null;
    const submitSelectors = [
      '#lead',
      'button[id="lead"]',
      'button:has-text("Participar do Sorteio")',
      'button[type="submit"]'
    ];
    
    for (const selector of submitSelectors) {
      submitButton = await page.waitForSelector(selector, { timeout: 10000 }).catch(() => null);
      if (submitButton) {
        const isVisible = await submitButton.isVisible().catch(() => false);
        if (isVisible) {
          if (config.debug) console.log(chalk.gray(`🚀 Found submit button with selector: ${selector}`));
          break;
        }
        submitButton = null;
      }
    }
    
    if (!submitButton) {
      if (config.debug) console.log(chalk.yellow('⚠️ Submit button not found'));
      await browser.close();
      return false;
    }
    
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    
    // Click submit and wait for response
    try {
      if (config.debug) console.log(chalk.gray('🚀 Clicking submit button'));
      await submitButton.click({ force: true });
      await page.waitForTimeout(3000);
      
      // Aguarda navegação ou timeout
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        if (config.debug) console.log(chalk.yellow('⚠️ Network idle timeout after submit, continuing...'));
      });
    } catch (submitError) {
      if (config.debug) console.log(chalk.yellow('⚠️ Submit error, trying alternative method...'));
      
      // Método alternativo: JavaScript click
      await page.evaluate((element) => {
        element.click();
      }, submitButton);
      await page.waitForTimeout(3000);
    }
    
    // Wait longer for final redirect
    await page.waitForTimeout(3000);
    
    // Check if we reached the thank you page
    const finalURL = page.url();
    // Consider success if we reach any of these URLs
    // Considera sucesso se:
    // 1. Chegou na página do formulário E clicou em submit
    // 2. OU chegou numa página de obrigado
    const reachedFormPage = finalURL.includes('participe.cifradobem.com/form/');
    const reachedThankYouPage = finalURL.includes('/obrigado') ||
                               finalURL.includes('obrigado') ||
                               finalURL.includes('/redirect') || 
                               finalURL.includes('/fake-obrigado') ||
                               finalURL.includes('/sucesso') ||
                               finalURL.includes('/thank');
    
    const success = reachedFormPage || reachedThankYouPage;
    
    if (success && config.debug) {
      console.log(chalk.green('✅ Conversion successful - reached thank you page'));
      console.log(chalk.green(`📍 Final URL: ${finalURL}`));
      
      // Gera relatório de consumo
      const dataReport = dataMonitor.generateReport(index, config.debug);
      
      await browser.close();
      return { success: true, dataReport };
    } else if (config.debug) {
      console.log(chalk.yellow(`⚠️ Did not reach thank you page. Current URL: ${finalURL}`));
      
      // Gera relatório mesmo em caso de falha
      const dataReport = dataMonitor.generateReport(index, config.debug);
      
      await browser.close();
      return { success: false, dataReport };
    }
    
    // Gera relatório de consumo
    const dataReport = dataMonitor.generateReport(index, false);
    
    await browser.close();
    return { success, dataReport };
  } catch (error) {
    if (config.debug) {
      console.error(chalk.red(`❌ Error in simulation #${index}:`), error.message);
      
      // Gera relatório mesmo em caso de erro
      const dataReport = dataMonitor.generateReport(index, config.debug);
      
      await browser.close();
      return { success: false, dataReport };
    }
    
    const dataReport = dataMonitor.generateReport(index, false);
    await browser.close();
    return { success: false, dataReport };
  }
}

/**
 * Try to click on an ad in the page
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} - Whether an ad was clicked
 */
async function tryClickOnAd(page, config) {
  try {
    // Wait for iframes to load
    await page.waitForTimeout(1500);
    
    // Find all iframes
    const iframes = await page.$$('iframe');
    
    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src');
      
      if (src && /google|ads|pubads|doubleclick/.test(src)) {
        const box = await iframe.boundingBox();
        
        if (box && box.height > 20 && box.width > 100) {
          if (config.debug) {
            console.log(chalk.green(`🎯 Found ad iframe: ${src.slice(0, 60)}...`));
          }
          
          // Move mouse to the ad
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(700);
          
          // Click on the ad
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 150 });
          
          // Wait for potential popup
          const popup = await Promise.race([
            page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null),
            page.waitForTimeout(1500).then(() => null)
          ]);
          
          if (popup) {
            if (config.debug) {
              console.log(chalk.magenta('🔄 Ad opened in new tab - waiting...'));
            }
            
            await popup.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
            await popup.waitForTimeout(5000);
            await popup.close();
          }
          
          return true;
        }
      }
    }
    
    if (config.debug) {
      console.log(chalk.yellow('🔍 No clickable ad found'));
    }
    
    return false;
  } catch (error) {
    if (config.debug) {
      console.error(chalk.red('❌ Error trying to click on ad:'), error.message);
    }
    return false;
  }
}

/**
 * Get a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Close ad overlays and popups that might be blocking interactions
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function closeAdOverlays(page, config) {
  try {
    if (config.debug) {
      console.log(chalk.gray('🔍 Checking for ad overlays to close...'));
    }
    
    // Seletores específicos para fechar ads (baseado no que você encontrou)
    const closeSelectors = [
      // Seletor específico que você encontrou
      '#dismiss-button',
      '#dismiss-button > div',
      '#dismiss-button svg',
      '#dismiss-button > div > svg',
      '#dismiss-button path',
      
      // Outros seletores comuns de close
      '[aria-label="Close"]',
      '[aria-label="Fechar"]',
      '[title="Close"]',
      '[title="Fechar"]',
      '.close-button',
      '.ad-close',
      '.popup-close',
      '.overlay-close',
      '.modal-close',
      
      // Seletores genéricos para botões de fechar
      'button svg',
      'button[class*="close"]',
      'button[class*="dismiss"]',
      'div[class*="close"]',
      'span[class*="close"]',
      
      // Seletores para overlays específicos de ads
      '.adsbygoogle .close',
      '.google-ads-close',
      '.ad-overlay-close',
      
      // Seletores para popups e modais
      '.popup .close',
      '.modal .close',
      '.overlay .close',
      
      // Seletores baseados em texto
      'button:has-text("×")',
      'button:has-text("✕")',
      'button:has-text("Close")',
      'button:has-text("Fechar")',
      'span:has-text("×")',
      'div:has-text("×")'
     ];
     
     let closedCount = 0;
     
     // Tenta fechar overlays usando cada seletor
     for (const selector of closeSelectors) {
       try {
         const elements = await page.$$(selector);
         
         for (const element of elements) {
           const isVisible = await element.isVisible().catch(() => false);
           const isClickable = await element.isEnabled().catch(() => false);
           
           if (isVisible && isClickable) {
             await element.click({ force: true, timeout: 2000 });
             closedCount++;
             
             if (config.debug) {
               console.log(chalk.red(`🚫 Closed overlay with selector: ${selector}`));
             }
             
             // Aguarda um pouco após fechar cada overlay
             await page.waitForTimeout(500);
             
             // Limita a 5 overlays fechados para evitar loop infinito
             if (closedCount >= 5) break;
           }
         }
         
         if (closedCount >= 5) break;
       } catch (selectorError) {
         // Ignora erros de seletores específicos
         continue;
       }
     }
     
     // Estratégias adicionais para fechar overlays
     if (closedCount === 0) {
       try {
         // Tenta pressionar ESC para fechar modais
         await page.keyboard.press('Escape');
         await page.waitForTimeout(500);
         
         // Tenta clicar fora de possíveis overlays (cantos da tela)
         await page.mouse.click(10, 10);
         await page.waitForTimeout(300);
         await page.mouse.click(page.viewportSize().width - 10, 10);
         await page.waitForTimeout(300);
         
         if (config.debug) {
           console.log(chalk.gray('🔄 Tried ESC and click outside to close overlays'));
         }
       } catch (escapeError) {
         // Ignora erros da estratégia ESC
       }
     }
     
     if (closedCount > 0 && config.debug) {
       console.log(chalk.green(`✅ Closed ${closedCount} ad overlays`));
     }
     
     // Aguarda um pouco para que os overlays sejam completamente removidos
     if (closedCount > 0) {
       await page.waitForTimeout(1500);
     }
     
   } catch (error) {
     if (config.debug) {
       console.log(chalk.yellow(`⚠️ Error closing overlays: ${error.message}`));
     }
   }
 }

 module.exports = {
  startSimulation,
  runSimulation
 };