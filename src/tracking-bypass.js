/**
 * Functions to bypass tracking detection mechanisms
 */

/**
 * Setup tracking bypass on the browser context
 * @param {BrowserContext} context - Playwright browser context
 * @param {Object} config - Configuration object
 */
async function setupTrackingBypass(context, config) {
  // Add script to handle window.navigator
  await setupNavigatorOverrides(context);
  
  // Setup cookies for tracking
  await setupTrackingCookies(context, config);
  
  // Add event listeners interceptor
  await interceptEventListeners(context);
  
  // Override tracking functions
  await overrideTrackingFunctions(context);
}

/**
 * Setup navigator overrides to appear more realistic
 * @param {BrowserContext} context - Playwright browser context
 */
async function setupNavigatorOverrides(context) {
  await context.addInitScript(() => {
    // Override properties that might reveal automation
    const overrideProps = {
      webdriver: false,
      // Make sure navigator.languages is consistent with the locale
      languages: ['pt-BR', 'pt', 'en-US', 'en'],
      plugins: {
        length: 3,
        refresh: function() {},
        item: function() { return { description: 'PDF Viewer', filename: 'internal-pdf-viewer' }; }
      }
    };
    
    // Apply overrides
    for (const [key, value] of Object.entries(overrideProps)) {
      try {
        Object.defineProperty(navigator, key, {
          get: function() { return value; }
        });
      } catch (e) {
        // Some properties might not be writable, just ignore errors
      }
    }
    
    // Override navigator.plugins and navigator.mimeTypes
    try {
      const mockPluginData = [
        { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer", description: "Portable Document Format" },
        { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai", description: "Portable Document Format" },
        { name: "Native Client", filename: "internal-nacl-plugin", description: "Native Client Executable" }
      ];
      
      // Simulate plugins array
      const mockPlugins = mockPluginData.map(plugin => {
        return {
          name: plugin.name,
          filename: plugin.filename,
          description: plugin.description,
          length: 1,
          item: function() { return this; },
          namedItem: function() { return this; }
        };
      });
      
      // Override plugins property
      Object.defineProperty(Navigator.prototype, 'plugins', {
        get: function() {
          return {
            length: mockPlugins.length,
            item: function(index) { return mockPlugins[index] || null; },
            namedItem: function(name) { 
              return mockPlugins.find(plugin => plugin.name === name) || null;
            },
            refresh: function() {},
            // Make it iterable
            [Symbol.iterator]: function* () {
              for (let i = 0; i < mockPlugins.length; i++) {
                yield mockPlugins[i];
              }
            }
          };
        }
      });
    } catch (e) {
      // Ignore errors
    }
  });
}

/**
 * Setup tracking cookies to avoid being detected as a new visitor
 * @param {BrowserContext} context - Playwright browser context
 * @param {Object} config - Configuration object
 */
async function setupTrackingCookies(context, config) {
  // Add common tracking cookies
  const cookies = [
    {
      name: '_ga',
      value: `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 10000000)}`,
      domain: '.cifradedinheiro.com',
      path: '/',
      expires: Date.now() / 1000 + 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    },
    {
      name: '_fbp',
      value: `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000000)}`,
      domain: '.cifradedinheiro.com',
      path: '/',
      expires: Date.now() / 1000 + 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    },
    {
      name: '_gcl_au',
      value: `1.1.${Math.floor(Math.random() * 1000000000)}.${Date.now()}`,
      domain: '.cifradedinheiro.com',
      path: '/',
      expires: Date.now() / 1000 + 60 * 60 * 24 * 90, // 90 days
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    }
  ];
  
  // Add cookies to context
  await context.addCookies(cookies);
}

/**
 * Intercept event listeners to manipulate tracking behavior
 * @param {BrowserContext} context - Playwright browser context
 */
async function interceptEventListeners(context) {
  await context.addInitScript(() => {
    // Store original addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    // Override addEventListener to intercept certain events
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // Intercept events that might be used for bot detection
      if (['mousemove', 'mousedown', 'mouseup', 'click', 'scroll'].includes(type)) {
        // Wrap the listener to modify behavior if needed
        const wrappedListener = function(event) {
          // Make sure the event has proper properties
          if (event.isTrusted === false) {
            Object.defineProperty(event, 'isTrusted', { value: true });
          }
          
          // Call the original listener
          return listener.apply(this, arguments);
        };
        
        // Call original with wrapped listener
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      
      // Call original for other event types
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

/**
 * Override tracking functions to ensure they register our activity
 * @param {BrowserContext} context - Playwright browser context
 */
async function overrideTrackingFunctions(context) {
  await context.addInitScript(() => {
    // Make sure the metrito object exists
    window.addEventListener('load', () => {
      // Ensure metrito is available
      if (typeof window.metrito === 'undefined') {
        // Create a stub if it doesn't exist
        window.metrito = {
          addLead: function(url) { return url; },
          sendEvent: function(event) { 
            console.log('Metrito event:', event);
            return true;
          }
        };
      }
      
      // Add additional attributes for the lead to be registered
      try {
        const leadId = localStorage.getItem('metrito_lead_id');
        if (leadId) {
          // Ensure this lead is properly tracked
          const params = new URLSearchParams(window.location.search);
          if (!params.has('mlid')) {
            // Add the lead ID to the URL
            params.set('mlid', JSON.parse(leadId));
            
            // Replace the URL
            const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
            window.history.replaceState({}, document.title, newUrl);
            
            console.log('Added mlid to URL:', JSON.parse(leadId));
          }
        }
      } catch (e) {
        // Ignore errors
      }
    });
    
    // Ensure Facebook Pixel is working
    try {
      // Original fbq function if it exists
      const originalFbq = window.fbq;
      
      // Define fbq if it doesn't exist
      if (typeof window.fbq === 'undefined') {
        window.fbq = function(method, eventName, params) {
          console.log('FB Pixel:', method, eventName, params);
        };
        window.fbq.loaded = true;
        window._fbq = window.fbq;
      }
      
      // Override fbq to ensure our events are tracked
      window.fbq = function(method, eventName, params, options) {
        // Log the call
        console.log('FB Pixel call:', method, eventName, params);
        
        // Call original if it exists
        if (originalFbq) {
          return originalFbq.call(this, method, eventName, params, options);
        }
      };
      
      // Ensure loaded property is set
      window.fbq.loaded = true;
      window._fbq = window.fbq;
    } catch (e) {
      // Ignore errors
    }
  });
}

module.exports = {
  setupTrackingBypass
};