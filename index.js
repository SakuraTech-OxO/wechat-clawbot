import { start } from 'alemonjs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
start({ platform: resolve(__dirname, 'lib/index.js') });
