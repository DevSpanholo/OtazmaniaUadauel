const userAgents = require('user-agents');

// Collection of mobile and desktop user agents
const mobileUserAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; Galaxy S21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; OnePlus 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Xiaomi Mi 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S23) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Mobile Safari/537.36'
];

const desktopUserAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

/**
 * Get a random user agent string based on type
 * @param {string} type - Type of user agent ('mobile', 'desktop', or 'random')
 * @returns {string} User agent string
 */
function getRandomUserAgent(type = 'random') {
  if (type === 'mobile') {
    return mobileUserAgents[Math.floor(Math.random() * mobileUserAgents.length)];
  } else if (type === 'desktop') {
    return desktopUserAgents[Math.floor(Math.random() * desktopUserAgents.length)];
  } else {
    // Use the user-agents library for more realistic user agents
    try {
      // 70% chance to get a random agent from the library
      if (Math.random() < 0.7) {
        return new userAgents({ deviceCategory: 'desktop' }).toString();
      } else {
        // 30% chance to use our predefined agents
        const allAgents = [...mobileUserAgents, ...desktopUserAgents];
        return allAgents[Math.floor(Math.random() * allAgents.length)];
      }
    } catch (error) {
      // Fallback if the library fails
      const allAgents = [...mobileUserAgents, ...desktopUserAgents];
      return allAgents[Math.floor(Math.random() * allAgents.length)];
    }
  }
}

module.exports = {
  getRandomUserAgent
};