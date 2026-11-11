// Крок "перевір мою настройку": Node.js, ffmpeg, браузер для кадрів, ключ голосу
import { execFileSync } from 'node:child_process';
import { loadEnv } from './env.mjs';
loadEnv();

const ok = (m) => console.log(`  \x1b[32m✔\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✘\x1b[0m ${m}`);
let failed = 0;

console.log('Перевірка інструментів для відео:\n');

// 1. Node.js
const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) ok(`Node.js ${process.versions.node}`);
else { bad(`Node.js ${process.versions.node} — потрібна версія 18+ (https://nodejs.org)`); failed++; }

// 2. ffmpeg
try {
  const v = execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0];
  ok(v.split(' Copyright')[0]);
} catch {
  bad('ffmpeg не знайдено. Встановлення: macOS `brew install ffmpeg`, Ubuntu `sudo apt install ffmpeg`, Windows `winget install ffmpeg`');
  failed++;
}

// 3. Браузер для рендеру кадрів
try {
  const chromium = await (await import('./browser.mjs')).getChromium();
  const b = await chromium.launch();
  await b.close();
  ok('Playwright + Chromium');
} catch (e) {
  bad('Playwright/Chromium недоступний: виконай `npm install && npx playwright install chromium`');
  failed++;
}

// 4. Ключ голосу (ElevenLabs)
const key = process.env.ELEVENLABS_API_KEY;
try {
  const r = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': key || 'proxy-injected' },
  });
  if (r.ok) ok('Ключ голосу ElevenLabs працює');
  else {
    bad(`Ключ голосу: ElevenLabs відповів ${r.status}. Встав ключ у .env (ELEVENLABS_API_KEY=...) — див. .env.example`);
    console.log('    (без ключа відео все одно зберуться, але без озвучки)');
  }
} catch (e) {
  bad(`Ключ голосу: немає доступу до api.elevenlabs.io (${e.cause?.code || e.message})`);
  console.log('    (без ключа відео все одно зберуться, але без озвучки)');
}

console.log(failed ? `\nНе вистачає ${failed} обов'язкових інструментів.` : '\nВсе готово — можна робити відео: `npm run render`');
process.exit(failed ? 1 : 0);
