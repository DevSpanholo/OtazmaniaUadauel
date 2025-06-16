/**
 * Enhanced human behavior simulation for high-quality traffic
 */

/**
 * Simulate ultra-realistic human behavior
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateUltraHumanBehavior(page, config) {
  console.log('🧠 Starting ultra-realistic human behavior simulation...');
  
  // 1. Natural reading behavior
  await simulateReading(page, config);
  
  // 2. Realistic scrolling patterns
  await simulateNaturalScrolling(page, config);
  
  // 3. Mouse movements and hover effects
  await simulateMouseBehavior(page, config);
  
  // 4. Text selection and interaction
  await simulateTextInteraction(page, config);
  
  // 5. Pause and think behavior
  await simulateThinkingPauses(page, config);
}

/**
 * Simulate natural reading behavior
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateReading(page, config) {
  console.log('📖 Simulating reading behavior...');
  
  // Get all text elements
  const textElements = await page.$$('p, h1, h2, h3, h4, h5, h6, span, div');
  
  for (let i = 0; i < Math.min(textElements.length, 5); i++) {
    const element = textElements[i];
    
    try {
      const isVisible = await element.isVisible();
      if (!isVisible) continue;
      
      // Scroll to element
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(getRandomInt(500, 1000));
      
      // Get text length to calculate reading time
      const text = await element.textContent();
      if (!text || text.length < 10) continue;
      
      // Calculate reading time (average 200 words per minute)
      const words = text.split(' ').length;
      const readingTime = Math.max(2000, (words / 200) * 60 * 1000);
      const actualReadingTime = getRandomInt(readingTime * 0.5, readingTime * 1.5);
      
      console.log(`📚 Reading ${words} words for ${actualReadingTime}ms`);
      
      // Simulate eye movement by moving mouse slightly
      const box = await element.boundingBox();
      if (box) {
        for (let j = 0; j < 3; j++) {
          const x = box.x + getRandomInt(0, box.width);
          const y = box.y + getRandomInt(0, box.height);
          await page.mouse.move(x, y, { steps: getRandomInt(3, 8) });
          await page.waitForTimeout(getRandomInt(actualReadingTime / 6, actualReadingTime / 3));
        }
      }
      
    } catch (error) {
      // Continue with next element
      continue;
    }
  }
}

/**
 * Simulate natural scrolling patterns
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateNaturalScrolling(page, config) {
  console.log('📜 Simulating natural scrolling...');
  
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  
  let currentPosition = 0;
  const targetPosition = pageHeight * 0.8; // Scroll to 80% of page
  
  while (currentPosition < targetPosition) {
    // Variable scroll amounts (like real users)
    const scrollAmount = getRandomInt(100, 400);
    
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    currentPosition += scrollAmount;
    
    // Random pauses while scrolling (like reading)
    const pauseTime = getRandomInt(1000, 4000);
    await page.waitForTimeout(pauseTime);
    
    // Sometimes scroll back up a bit (like re-reading)
    if (Math.random() > 0.7) {
      await page.evaluate(() => {
        window.scrollBy(0, -150);
      });
      await page.waitForTimeout(getRandomInt(500, 1500));
    }
  }
  
  // Sometimes scroll to top and back down
  if (Math.random() > 0.6) {
    console.log('🔄 Scrolling back to top and down again...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(getRandomInt(2000, 4000));
    
    // Scroll down again, but faster
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(getRandomInt(300, 800));
    }
  }
}

/**
 * Simulate realistic mouse behavior
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateMouseBehavior(page, config) {
  console.log('🖱️ Simulating mouse behavior...');
  
  const viewport = await page.viewportSize();
  
  // Random mouse movements across the page
  for (let i = 0; i < getRandomInt(8, 15); i++) {
    const x = getRandomInt(50, viewport.width - 50);
    const y = getRandomInt(50, viewport.height - 50);
    
    await page.mouse.move(x, y, { 
      steps: getRandomInt(10, 25) 
    });
    
    // Sometimes hover over elements
    if (Math.random() > 0.6) {
      await page.waitForTimeout(getRandomInt(500, 2000));
    }
    
    await page.waitForTimeout(getRandomInt(200, 800));
  }
  
  // Hover over interactive elements
  const interactiveElements = await page.$$('a, button, input, select');
  
  for (let i = 0; i < Math.min(interactiveElements.length, 3); i++) {
    const element = interactiveElements[getRandomInt(0, interactiveElements.length - 1)];
    
    try {
      const isVisible = await element.isVisible();
      if (isVisible) {
        await element.hover();
        await page.waitForTimeout(getRandomInt(1000, 3000));
      }
    } catch (error) {
      // Continue with next element
      continue;
    }
  }
}

/**
 * Simulate text selection and interaction
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateTextInteraction(page, config) {
  console.log('✏️ Simulating text interaction...');
  
  // Sometimes select text (like copying interesting parts)
  if (Math.random() > 0.5) {
    const textElements = await page.$$('p, h2, h3');
    
    if (textElements.length > 0) {
      const randomElement = textElements[getRandomInt(0, textElements.length - 1)];
      
      try {
        const isVisible = await randomElement.isVisible();
        if (isVisible) {
          // Triple click to select paragraph
          await randomElement.click({ clickCount: 3 });
          await page.waitForTimeout(getRandomInt(1000, 3000));
          
          // Deselect by clicking elsewhere
          await page.mouse.click(100, 100);
          await page.waitForTimeout(getRandomInt(500, 1000));
        }
      } catch (error) {
        // Continue
      }
    }
  }
  
  // Sometimes use keyboard shortcuts
  if (Math.random() > 0.7) {
    // Ctrl+F (search behavior)
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(getRandomInt(1000, 2000));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(getRandomInt(500, 1000));
  }
}

/**
 * Simulate thinking pauses
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateThinkingPauses(page, config) {
  console.log('🤔 Simulating thinking pauses...');
  
  // Long pause like user is thinking/deciding
  const thinkingTime = getRandomInt(5000, 15000);
  console.log(`💭 Thinking for ${thinkingTime}ms...`);
  
  // During thinking, small mouse movements
  for (let i = 0; i < thinkingTime / 2000; i++) {
    const currentPos = await page.evaluate(() => ({ x: 0, y: 0 }));
    await page.mouse.move(
      currentPos.x + getRandomInt(-50, 50),
      currentPos.y + getRandomInt(-30, 30),
      { steps: getRandomInt(3, 8) }
    );
    await page.waitForTimeout(2000);
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

module.exports = {
  simulateUltraHumanBehavior
};