# Lead Simulation Tool

A powerful tool for simulating lead generation and testing tracking systems.

## Features

- Simulates realistic user behavior to generate leads
- Bypasses common bot detection mechanisms
- Configurable simulation parameters
- Detailed logging and reporting
- Proxy rotation capability
- Browser fingerprint randomization
- Cookie and session management

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
npm start
```

This will run the simulation with the default settings from the config.json file.

### Command Line Options

```bash
# Run with debug mode enabled
npm run dev

# Run with custom configuration
node index.js --config custom-config.json

# Specify number of simulations
node index.js --num 50

# Set concurrency level
node index.js --concurrency 5

# Set user agent type
node index.js --useragent mobile

# Test the tracking system
npm run test
```

## Configuration

Edit the `config.json` file to customize the simulation behavior:

```json
{
  "targetUrl": "https://example.com/?utm_source=test",
  "totalSimulations": 100,
  "concurrency": 3,
  "debug": false,
  "userAgentType": "random",
  "simulationSteps": {
    "initialWait": [1000, 3000],
    "humanInteractionInterval": [200, 1000],
    "scrollDepthPercentage": [30, 80],
    "adClickProbability": 0.7
  }
}
```

## Troubleshooting

If your simulations aren't being counted by the tracking system:

1. Run the test tool to check the tracking system:
   ```bash
   npm run test
   ```

2. Check if the tracking script has been updated
3. Verify that your accounts and tracking IDs are still valid
4. Try updating the User-Agent strings
5. Add more human-like behaviors to avoid bot detection

## License

MIT