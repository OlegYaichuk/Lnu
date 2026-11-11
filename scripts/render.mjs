// Рендер вертикального відео 1080x1920 з файлу сцен.
// node scripts/render.mjs [video/example.json] [out/video.mp4] [--no-voice]
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { getChromium } from './browser.mjs';
import { tts } from './voice.mjs';
import { loadEnv } from './env.mjs';
loadEnv();

const args = process.argv.slice(2);
const noVoice = args.includes('--no-voice');
const [input = 'video/example.json', output = 'out/video.mp4'] = args.filter((a) => !a.startsWith('--'));
const spec = JSON.parse(readFileSync(input, 'utf8'));
const W = 1080, H = 1920;
const work = resolve('out/tmp');
mkdirSync(work, { recursive: true });

const esc = (s = '') => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sceneHtml(s, i, total) {
  const items = (s.items || []).map((it, n) => `
    <div class="row"><span class="num">${n + 1}</span><span class="label">${esc(it.label)}</span>
    ${it.badge ? `<span class="badge ${it.tone || 'ok'}">${esc(it.badge)}</span>` : ''}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;font-family:Inter,"DejaVu Sans",sans-serif;color:#141414;
    background:#efece6 radial-gradient(#00000014 2px,transparent 2px) 0 0/28px 28px;padding:150px 90px;position:relative}
  .kicker{font-family:"DejaVu Sans Mono",monospace;font-size:38px;letter-spacing:6px;color:#777}
  h1{font-size:104px;line-height:1.05;font-weight:800;margin-top:40px}
  h1 em{font-style:normal;color:#8a8a8a}
  .step{position:absolute;right:90px;top:520px;background:#141414;color:#fff;font-size:110px;font-weight:800;
    width:170px;height:170px;border-radius:28px;display:grid;place-items:center;transform:rotate(3deg);box-shadow:10px 12px 0 #0002}
  .win{margin-top:300px;background:#1d1d1b;border-radius:36px;box-shadow:0 30px 60px #0004;overflow:hidden}
  .bar{background:#2a2a28;padding:26px 30px;display:flex;gap:16px;align-items:center}
  .dot{width:26px;height:26px;border-radius:50%;background:#555}
  .title{margin-left:20px;font-family:"DejaVu Sans Mono",monospace;color:#bbb;font-size:32px;background:#1d1d1b;padding:8px 24px;border-radius:30px;flex:1}
  .rows{padding:40px 50px 60px}
  .row{display:flex;align-items:center;gap:30px;color:#fff;font-size:56px;font-weight:700;padding:26px 0}
  .num{background:#333;border-radius:14px;width:70px;height:70px;display:grid;place-items:center;font-size:40px}
  .label{flex:1}
  .badge{font-size:40px;padding:12px 28px;border-radius:14px}
  .ok{background:#1f4a32;color:#8fe0a8}.warn{background:#4a1f1f;color:#ff8f8f}
  .sub{margin-top:80px;font-size:56px;font-weight:600;line-height:1.3}
  .progress{position:absolute;left:90px;right:90px;bottom:120px;height:10px;background:#0001;border-radius:5px}
  .progress i{display:block;height:100%;width:${((i + 1) / total) * 100}%;background:#141414;border-radius:5px}
  </style></head><body>
  ${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}
  <h1>${esc(s.title).replace(/\*(.+?)\*/g, '<em>$1</em>')}</h1>
  ${s.step ? `<div class="step">${esc(String(s.step))}</div>` : ''}
  ${items ? `<div class="win"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
     <span class="title">${esc(s.window || '')}</span></div><div class="rows">${items}</div></div>` : ''}
  ${s.subtitle ? `<div class="sub">${esc(s.subtitle)}</div>` : ''}
  <div class="progress"><i></i></div></body></html>`;
}

const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));

const browser = await (await getChromium()).launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const clips = [];
let voiceOn = !noVoice;

for (const [i, s] of spec.scenes.entries()) {
  const png = join(work, `scene${i}.png`);
  await page.setContent(sceneHtml(s, i, spec.scenes.length), { waitUntil: 'load' });
  await page.screenshot({ path: png });

  let audio = null;
  let dur = s.duration || 3;
  if (voiceOn && s.voice) {
    try {
      audio = await tts(s.voice, join(work, `scene${i}.mp3`));
      dur = Math.max(dur, probe(audio) + 0.4);
    } catch (e) {
      console.warn(`⚠ Озвучка недоступна (${e.message.split('\n')[0]}). Продовжую без голосу.`);
      voiceOn = false;
    }
  }

  const clip = join(work, `scene${i}.mp4`);
  const zoom = `scale=${W * 2}:${H * 2},zoompan=z='min(zoom+0.0006,1.06)':d=${Math.ceil(dur * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=30`;
  const a = audio ? ['-i', audio] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo'];
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-i', png, ...a,
    '-vf', `${zoom},fade=t=in:st=0:d=0.25,format=yuv420p`, '-af', 'apad', '-t', dur.toFixed(2),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-ar', '44100', '-ac', '2', clip]);
  clips.push(clip);
  console.log(`✔ сцена ${i + 1}/${spec.scenes.length} (${dur.toFixed(1)} с)`);
}
await browser.close();

const list = join(work, 'list.txt');
writeFileSync(list, clips.map((c) => `file '${c}'`).join('\n'));
mkdirSync(resolve(output, '..'), { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);
console.log(`\nГотово: ${output} (${probe(output).toFixed(1)} с${voiceOn ? ', з озвучкою' : ', без озвучки'})`);
