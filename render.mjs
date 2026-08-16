#!/usr/bin/env node
/* ============================================================
   FarooqStars — sky-render.mjs
   رات کا خودکار ویڈیو جنریٹر (GitHub Action سے چلتا ہے)

   وہی راستہ جو آپ کی Daily Reel کا ہے:
     GitHub  →  api/sky-save.php  →  reels/sky/  →  admin

   ہر ویڈیو:
     1. api/sky-script.php  → Claude اردو اسکرپٹ لکھتا ہے (مہینے کے اصل نقشے سے)
     2. api/tts.php         → اردو آواز، ہر جملہ اپنے وقت پر (ایک WAV)
     3. video-studio.html   → Playwright فریم بہ فریم (browser recording نہیں —
                              deterministic، ایک بھی فریم نہیں گرتا)
     4. ffmpeg              → 1080×1920 · 30fps · H.264 + AAC · mp4
     5. api/sky-save.php    → سرور پر، تاریخ کی مہر کے ساتھ

   env:
     FS_BASE      https://www.farooqstars.com        (لازمی)
     FS_SAVE_KEY  sky-save.php کی چابی               (لازمی)
     FS_MONTH     2026-09    (نہ دیں تو اگلا مہینہ)
     FS_SIGNS     0-11 یا "0,6,9"  (نہ دیں تو سب)
     FS_DUR       120
     FS_FPS       30
     FS_DRY       1  → سرور پر نہ بھیجے، صرف out/ میں رکھے
   ============================================================ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.FS_BASE || '').replace(/\/+$/, '');
const KEY  = process.env.FS_SAVE_KEY || '';
const FPS  = +(process.env.FS_FPS || 30);
const DUR  = +(process.env.FS_DUR || 120);
const DRY  = process.env.FS_DRY === '1';
const OUT  = path.resolve('out');

if (!BASE) { console.error('FS_BASE نہیں ملا'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const SIGNS = ['حمل','ثور','جوزا','سرطان','اسد','سنبلہ','میزان','عقرب','قوس','جدی','دلو','حوت'];
const SIGN_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const UMON = ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];

/* ---------- کون سا مہینہ ---------- */
function targetMonth() {
  if (process.env.FS_MONTH) {
    const [y, m] = process.env.FS_MONTH.split('-').map(Number);
    return { y, m };
  }
  const n = new Date();
  let y = n.getUTCFullYear(), m = n.getUTCMonth() + 2;      /* اگلا مہینہ */
  if (m > 12) { m = 1; y++; }
  return { y, m };
}
const { y: MY, m: MM } = targetMonth();
const D1 = `${MY}-${String(MM).padStart(2, '0')}-01`;
const D2 = `${MY}-${String(MM).padStart(2, '0')}-${new Date(Date.UTC(MY, MM, 0)).getUTCDate()}`;
const MONTH_UR = `${UMON[MM - 1]} ${MY}`;
const TAG = `${MY}-${String(MM).padStart(2, '0')}`;

const which = process.env.FS_SIGNS
  ? process.env.FS_SIGNS.split(',').map(x => +x.trim()).filter(x => x >= 0 && x < 12)
  : [...Array(12).keys()];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(file, body) {
  const r = await fetch(`${BASE}/api/${file}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const t = await r.text();
  try { return JSON.parse(t); }
  catch { throw new Error(`${file} → ${r.status}: ${t.slice(0, 300)}`); }
}

/* ---------- ffmpeg: خام فریم → mp4 ---------- */
function encoder(mp4, wav) {
  const args = ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-vcodec', 'mjpeg', '-r', String(FPS), '-i', 'pipe:0'];
  if (wav) args.push('-i', wav);
  args.push(
    '-map', '0:v:0', ...(wav ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '160k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
    '-r', String(FPS), '-movflags', '+faststart', mp4
  );
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  return p;
}

/* ============================================================ */
const page0 = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await page0.newContext({ viewport: { width: 1120, height: 1960 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.error('PAGE:', e.message));

const made = [];
for (const si of which) {
  const t0 = Date.now();
  log(`── ${SIGN_EN[si]} / ${SIGNS[si]} · ${MONTH_UR}`);

  /* 1 · صفحہ + اصل آسمان + مہینے کا نقشہ */
  await page.goto(`${BASE}/video-studio.html?render=1`, { waitUntil: 'domcontentloaded' });
  let setup = await page.evaluate(c => window.FSVS.setup(c),
    { sign: si, sys: 'vedic', d1: D1, d2: D2, dur: DUR, month: MONTH_UR });
  if (!setup.ok) { console.error('  ⚠ آسمان نہیں بنا — چھوڑا'); continue; }
  const mapTxt = await page.evaluate(() => window.FSVS.mapText());
  log(`   نقشہ: ${setup.events} واقعات (${setup.big} بڑے)`);

  /* 2 · Claude اردو اسکرپٹ لکھے */
  let script;
  try {
    script = await api('sky-script.php', { sign: si, month: TAG, monthUr: MONTH_UR, map: mapTxt, dur: DUR });
    if (!script.ok) throw new Error(script.err + (script.detail ? ' — ' + script.detail : ''));
  } catch (e) { console.error('  ⚠ اسکرپٹ:', e.message); continue; }
  log(`   اسکرپٹ: ${script.captions.length} جملے`);

  /* 3 · اسکرپٹ صفحے میں ڈالیں (سرخی + کیپشن) */
  setup = await page.evaluate(c => window.FSVS.setup(c), {
    sign: si, sys: 'vedic', d1: D1, d2: D2, dur: DUR, month: MONTH_UR,
    headline: script.headline, dates: script.dates, captions: script.captions, map: false
  });
  let capsOut = await page.evaluate(() => window.FSVS.captionsOut());
  let DUR_ACTUAL = DUR;

  /* 4 · اردو آواز — دو مرحلوں میں
        پہلا: اصل دورانیے معلوم کرنے کے لیے
        دوسرا: اُن دورانیوں پر جملے ٹھیک بٹھا کر آخری WAV               */
  let wav = null;
  const voice = script.voice || 'ur-PK-UzmaNeural';
  try {
    let caps = capsOut;
    let t = await api('tts.php', { captions: caps, voice, rate: -6, pitch: 0, dur: DUR, tag: `s${si+1}-${TAG}-a` });
    if (!t.ok) throw new Error(t.err + (t.detail ? ' — ' + t.detail : ''));

    /* اصل دورانیے صفحے کو دو → وہ جملے ایک کے بعد ایک باندھ دے گا */
    const fixed = await page.evaluate(c => window.FSVS.applyVoice(c), t.clips);
    DUR_ACTUAL = fixed.dur;
    caps = await page.evaluate(() => window.FSVS.captionsOut());

    t = await api('tts.php', { captions: caps, voice, rate: -6, pitch: 0, dur: DUR_ACTUAL, tag: `s${si+1}-${TAG}` });
    if (!t.ok) throw new Error(t.err);

    wav = path.join(OUT, `voice-${si+1}-${TAG}.wav`);
    fs.writeFileSync(wav, Buffer.from(await (await fetch(`${BASE}/${t.url}`)).arrayBuffer()));
    const speech = t.clips.reduce((a, c) => a + c.sec, 0);
    const quiet  = Math.max(0, t.seconds - speech);
    log(`   آواز: ${t.seconds}س · بولنا ${speech.toFixed(1)}س · خاموشی ${quiet.toFixed(1)}س (${Math.round(quiet/t.seconds*100)}%)`);
    if (quiet > t.seconds * 0.20) console.error(`  ⚠ خاموشی ${Math.round(quiet/t.seconds*100)}% — تحریر مختصر ہے`);
  } catch (e) {
    console.error('  ⚠ آواز:', e.message, '— بغیر آواز بنے گی');
  }

  /* 5 · فریم بہ فریم (deterministic — کوئی فریم نہیں گرتا) */
  const mp4 = path.join(OUT, `sky-${TAG}-${String(si + 1).padStart(2, '0')}-${SIGN_EN[si].toLowerCase()}.mp4`);
  const ff = encoder(mp4, wav);
  const total = Math.round(DUR_ACTUAL * FPS);
  for (let i = 0; i < total; i++) {
    const dataUrl = await page.evaluate(t => {
      window.FSVS.setFrame(t);
      return document.getElementById('c').toDataURL('image/jpeg', 0.94);
    }, i / FPS);
    if (!ff.stdin.write(Buffer.from(dataUrl.slice(23), 'base64'))) {
      await new Promise(r => ff.stdin.once('drain', r));
    }
    if (i % (FPS * 20) === 0) log(`   فریم ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))); });

  const size = fs.statSync(mp4).size;
  log(`   ✅ ${path.basename(mp4)} — ${(size / 1048576).toFixed(1)} MB · ${((Date.now() - t0) / 1000 / 60).toFixed(1)} منٹ`);

  /* 6 · سرور پر */
  const meta = {
    kind: 'sign', month: TAG, sign: si, signUr: SIGNS[si], signEn: SIGN_EN[si],
    monthUr: MONTH_UR, dur: DUR, headline: script.headline, dates: script.dates,
    caption: script.social, hashtags: script.hashtags, voice: script.voice || 'ur-PK-UzmaNeural',
    seconds: DUR_ACTUAL, bytes: size, builtAt: new Date().toISOString()
  };
  fs.writeFileSync(mp4.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 1));

  if (!DRY) {
    const fd = new FormData();
    fd.append('key', KEY);
    fd.append('meta', JSON.stringify(meta));
    fd.append('video', new Blob([fs.readFileSync(mp4)], { type: 'video/mp4' }), path.basename(mp4));
    const r = await fetch(`${BASE}/api/sky-save.php`, { method: 'POST', body: fd });
    const j = await r.text();
    log(`   ⤴ سرور: ${j.slice(0, 160)}`);
  }
  made.push(path.basename(mp4));
}

await page0.close();
log(`\n══ مکمل: ${made.length} ویڈیو · ${MONTH_UR}`);
made.forEach(m => log('   ' + m));
