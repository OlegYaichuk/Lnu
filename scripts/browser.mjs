// Підключає Playwright: локальний (npm install) або глобально встановлений
import { createRequire } from 'node:module';

export async function getChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    return createRequire(import.meta.url)('playwright').chromium;
  }
}
