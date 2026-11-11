// Озвучка тексту через ElevenLabs: node scripts/voice.mjs "текст" out/voice.mp3
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadEnv } from './env.mjs';
loadEnv();

export async function tts(text, outFile) {
  const voice = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TVvzbqDflHm';
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY || 'proxy-injected',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 200)}`);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, Buffer.from(await r.arrayBuffer()));
  return outFile;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [text, out = 'out/voice.mp3'] = process.argv.slice(2);
  if (!text) { console.error('Використання: npm run voice -- "текст" out/voice.mp3'); process.exit(1); }
  console.log('Збережено:', await tts(text, out));
}
