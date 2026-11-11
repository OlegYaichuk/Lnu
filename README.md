# Lnu — інструменти для створення відео

Вертикальні відео (Reels / Shorts / TikTok, 1080×1920) з тексту:
**сцени (JSON) → кадри (Playwright) → озвучка (ElevenLabs) → MP4 (ffmpeg)**.

## Що потрібно

| # | Інструмент | Навіщо | Як встановити |
|---|------------|--------|---------------|
| 1 | Node.js 18+ | запуск скриптів | https://nodejs.org |
| 2 | ffmpeg | збирання відео і звуку | macOS `brew install ffmpeg` · Ubuntu `sudo apt install ffmpeg` · Windows `winget install ffmpeg` |
| 3 | Chromium (Playwright) | малювання кадрів | `npm install && npx playwright install chromium` |
| 4 | Ключ голосу ElevenLabs | озвучка (необов'язково) | https://elevenlabs.io/app/settings/api-keys → `.env` |

## Старт

```bash
npm install
npx playwright install chromium
cp .env.example .env        # встав ELEVENLABS_API_KEY=...
npm run check               # перевір мою настройку
npm run render              # video/example.json -> out/video.mp4
```

Без ключа голосу відео теж збирається — просто без озвучки (`--no-voice` вимикає її примусово).

## Команди

- `npm run check` — перевіряє Node.js, ffmpeg, Chromium і ключ голосу.
- `npm run render -- video/my.json out/my.mp4` — рендер свого сценарію.
- `npm run voice -- "Текст" out/voice.mp3` — лише озвучка.

## Формат сцени (`video/*.json`)

```json
{
  "scenes": [
    {
      "kicker": "// крок 4 · настройка",
      "title": "Перевір *інструменти*",     // *текст* — сірим
      "step": 4,                            // плашка з номером
      "window": "перевір мою настройку",    // заголовок «вікна»
      "items": [{ "label": "Node.js", "badge": "є" },
                { "label": "Ключ голосу", "badge": "встав ключ", "tone": "warn" }],
      "subtitle": "Додатковий текст",
      "voice": "Що сказати голосом",
      "duration": 4                         // сек; подовжується під довжину озвучки
    }
  ]
}
```
