const { chromium } = require('playwright');
const chalk = require('chalk');

/**
 * Test if the Metrito tracking system is working
 */
async function testTracking() {
  console.log(chalk.cyan('='.repeat(70)));
  console.log(chalk.cyan.bold('           Metrito Tracking Test Tool'));
  console.log(chalk.cyan('='.repeat(70)));
  
  console.log(chalk.yellow('Starting browser to test tracking...'));
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  // Enable console logging from the browser
  context.on('console', (message) => {
    if (message.text().includes('Metrito') || message.text().includes('FB Pixel')) {
      console.log(chalk.green(`Browser console: ${message.text()}`));
    }
  });
  
  const page = await context.newPage();
  
  // Add script to inspect localStorage
  await page.addInitScript(() => {
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = function(key, value) {
      console.log(`localStorage.setItem('${key}', '${value}')`);
      originalSetItem.apply(this, arguments);
    };
    
    // Log when metrito events are sent
    window.addEventListener('load', () => {
      if (window.metrito) {
        const originalSendEvent = window.metrito.sendEvent;
        window.metrito.sendEvent = function(event) {
          console.log('Metrito event sent:', JSON.stringify(event));
          return originalSendEvent.apply(this, arguments);
        };
        
        console.log('Metrito tracking script detected and hooked');
      } else {
        console.log('Metrito tracking script not found on page');
      }
    });
  });
  
  try {
    console.log(chalk.yellow('Navigating to target page...'));
    await page.goto('https://cifradedinheiro.com/acao-solidaria/conquiste-300-reais-semanalmente-com-o-cifra-do-bem/?utm_source=357&utm_term=357&cf_ads=357', {
      waitUntil: 'load',
      timeout: 45000
    });
    
    console.log(chalk.green('Page loaded successfully'));
    
    // Check if the page has the Metrito script
    const hasMetritoScript = await page.evaluate(() => {
      return typeof window.metrito !== 'undefined';
    });
    
    if (hasMetritoScript) {
      console.log(chalk.green('✅ Metrito script found on the page'));
    } else {
      console.log(chalk.red('❌ Metrito script not found on the page'));
    }
    
    // Check Facebook Pixel
    const hasFbPixel = await page.evaluate(() => {
      return typeof window.fbq !== 'undefined';
    });
    
    if (hasFbPixel) {
      console.log(chalk.green('✅ Facebook Pixel found on the page'));
    } else {
      console.log(chalk.red('❌ Facebook Pixel not found on the page'));
    }
    
    // Check lead ID in localStorage
    const leadId = await page.evaluate(() => {
      return localStorage.getItem('metrito_lead_id');
    });
    
    if (leadId) {
      console.log(chalk.green(`✅ Lead ID found in localStorage: ${leadId}`));
    } else {
      console.log(chalk.red('❌ No lead ID found in localStorage'));
    }
    
    // Try to trigger a PageView event
    console.log(chalk.yellow('Attempting to trigger a PageView event...'));
    
    await page.evaluate(() => {
      if (window.metrito && window.metrito.sendEvent) {
        window.metrito.sendEvent({
          config: {
            name: "PageView",
            facebook: {
              name: "PageView"
            }
          }
        });
        return true;
      }
      return false;
    });
    
    // Wait for potential responses
    await page.waitForTimeout(2000);
    
    console.log(chalk.cyan('='.repeat(70)));
    console.log(chalk.cyan.bold('           Testing Results'));
    console.log(chalk.cyan('='.repeat(70)));
    
    // Analyze tracking issues
    console.log(chalk.yellow('Analysis of tracking issues:'));
    
    const trackingIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for ad blockers
      if (window.document.querySelector('div[id*="banner_ad"]') === null) {
        issues.push('Possible ad blocker detected');
      }
      
      // Check if metrito is loaded properly
      if (typeof window.metrito === 'undefined' || 
          typeof window.metrito.sendEvent !== 'function') {
        issues.push('Metrito script not loaded correctly');
      }
      
      // Check for cookies permission
      if (document.cookie === '') {
        issues.push('Cookies might be blocked');
      }
      
      return issues;
    });
    
    if (trackingIssues.length > 0) {
      console.log(chalk.red('Issues detected:'));
      trackingIssues.forEach(issue => {
        console.log(chalk.red(`  - ${issue}`));
      });
    } else {
      console.log(chalk.green('No major tracking issues detected'));
    }
    
    console.log(chalk.yellow('\nRecommendations:'));
    console.log(chalk.yellow('1. Check if the tracking script version has been updated'));
    console.log(chalk.yellow('2. Verify that the Metrito account is still active'));
    console.log(chalk.yellow('3. Ensure the Facebook Pixel ID is still valid'));
    console.log(chalk.yellow('4. Try updating the User-Agent strings in the simulation'));
    console.log(chalk.yellow('5. Add more human-like behaviors to avoid bot detection'));
    
    console.log(chalk.cyan('\nPress any key to close the browser...'));
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', data => {
        resolve();
      });
    });
    
  } catch (error) {
    console.error(chalk.red('Error during testing:'), error.message);
  } finally {
    await browser.close();
  }
}

testTracking();