const { join } = require('path');

/**
 * Configuration for Puppeteer on local and Render cloud environments
 * Ensures Chrome is installed inside the project directory so Render preserves it.
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDir: join(__dirname, '.cache', 'puppeteer'),
};
