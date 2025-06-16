/**
 * Functions to simulate human behavior
 */

/**
 * Simulate human behavior on the page
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function simulateHumanBehavior(page, config) {
  // Get random behavior parameters
  const behaviors = [
    scrollPage,
    moveMouseRandomly,
    typeRandomText,
    pressRandomKeys
  ];
  
  // Select 2-3 random behaviors
  const numBehaviors = Math.floor(Math.random() * 2) + 2;
  const selectedBehaviors = shuffleArray(behaviors).slice(0, numBehaviors);
  
  // Execute each behavior
  for (const behavior of selectedBehaviors) {
    await behavior(page, config);
  }
}

/**
 * Scroll the page randomly
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function scrollPage(page, config) {
  // Get page height
  const pageHeight = await page.evaluate(() => {
  const body = document.body;
  return body ? body.scrollHeight : 0;
});

  
  // Determine scroll depth (between 30-80% of page height)
  const minScroll = config.simulationSteps?.scrollDepthPercentage?.[0] || 30;
  const maxScroll = config.simulationSteps?.scrollDepthPercentage?.[1] || 80;
  const scrollDepth = Math.floor(pageHeight * (getRandomInt(minScroll, maxScroll) / 100));
  
  // Scroll in small steps to simulate human behavior
  const steps = getRandomInt(5, 10);
  const stepSize = Math.floor(scrollDepth / steps);
  
  for (let i = 0; i < steps; i++) {
    await page.evaluate((yPos) => {
      window.scrollBy(0, yPos);
    }, stepSize);
    
    // Random pause between scroll actions
    await page.waitForTimeout(getRandomInt(100, 300));
  }
  
  // Pause after scrolling
  await page.waitForTimeout(getRandomInt(500, 1500));
  
  // Sometimes scroll back up a bit
  if (Math.random() > 0.6) {
    await page.evaluate(() => {
      window.scrollBy(0, -300);
    });
    await page.waitForTimeout(getRandomInt(200, 500));
  }
}

/**
 * Move the mouse randomly across the page
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function moveMouseRandomly(page, config) {
  // Get viewport dimensions
  const dimensions = await page.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  });
  
  // Move mouse to 3-6 random positions
  const moves = getRandomInt(3, 6);
  
  for (let i = 0; i < moves; i++) {
    const x = getRandomInt(0, dimensions.width);
    const y = getRandomInt(0, dimensions.height);
    
    await page.mouse.move(x, y, { steps: getRandomInt(5, 10) });
    await page.waitForTimeout(getRandomInt(100, 300));
  }
}

/**
 * Type random text in a visible input field
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function typeRandomText(page, config) {
  // Find visible input fields
  const inputSelector = 'input:not([type="hidden"]):not([readonly]):not([disabled])';
  const inputExists = await page.$(inputSelector) !== null;
  
  if (!inputExists) return;
  
  // Select a random input
  const inputs = await page.$$(inputSelector);
  if (inputs.length === 0) return;
  
  const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
  
  // Check if input is visible
  const isVisible = await randomInput.isVisible().catch(() => false);
  if (!isVisible) return;
  
  // Focus the input
  await randomInput.focus();
  
  // Type some random text
  const randomTexts = ['teste', 'exemplo', 'texto', 'informação', 'dados'];
  const randomText = randomTexts[Math.floor(Math.random() * randomTexts.length)];
  
  // Type with random delays between keystrokes
  await randomInput.type(randomText, { delay: getRandomInt(100, 300) });
  
  // Sometimes clear the text
  if (Math.random() > 0.7) {
    await randomInput.fill('');
  }
}

/**
 * Press random keys
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration object
 */
async function pressRandomKeys(page, config) {
  // List of keys to press
  const keys = ['ArrowDown', 'ArrowUp', 'Tab', 'Home', 'End'];
  
  // Press 1-3 random keys
  const presses = getRandomInt(1, 3);
  
  for (let i = 0; i < presses; i++) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    await page.keyboard.press(randomKey);
    await page.waitForTimeout(getRandomInt(100, 300));
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
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

module.exports = {
  simulateHumanBehavior
};