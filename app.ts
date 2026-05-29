import { start } from 'alemonjs';
import { createServer } from 'jsxp';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.argv.includes('--jsxp')) {
  void createServer();
} else {
  start({ platform: resolve(__dirname, 'lib/index.js') });
}
