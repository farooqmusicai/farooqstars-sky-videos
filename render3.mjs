// FarooqStars sky-video renderer v3 — drives the APPROVED farooqskybrand.html
// page deterministically (fake clock frame-stepping), then muxes voice + music.
// The page's own look (badge/headline/dates/captions/wheel) is used untouched.
//
// node src/render3.mjs --sys vedic --month 2026-09 --script s.json \
//      --voice voice.wav --music music.mp3 --out out.mp4 [--day 1] [--fps 30]
// script.json = { badge, head, dates, caps:[{t,text}], dur, monthUr? }
// 16-Aug rule: no/short voice => ABORT (unless --allow-no-voice for tests).
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');

function arg(n, d){ const i = process.argv.indexOf('--'+n); return i>=0 ? process.argv[i+1] : d; }
const SYS   = arg('sys','vedic');                      // 'west' | 'vedic'
const MONTH = arg('month');                            // 2026-09
const DAY   = +arg('day','1');
const SCRIPT= arg('script');
const VOICE = arg('voice','');
const MUSIC = arg('music');
const OUT   = arg('out','out/video.mp4');
const FPS   = +arg('fps','30');
const PAGE  = arg('page', path.join(ROOT,'ref','skybrand.html'));
const WORK  = arg('workdir','/tmp/sky3');
const EXE   = arg('chrome', process.env.CHROME_EXE || '');   // '' => playwright's own chromium
const ALLOW_NO_VOICE = process.argv.includes('--allow-no-voice');

if (!MONTH || !SCRIPT || !MUSIC) { console.error('need --month --script --music'); process.exit(2); }
const S = JSON.parse(fs.readFileSync(SCRIPT,'utf8'));
const DUR = Math.min(180, Math.max(15, +S.dur));
const N = Math.round(FPS * DUR);

function ffprobe(f, entries){ return execFileSync('ffprobe',['-v','error','-show_entries',entries,'-of','json',f]).toString(); }
let voiceOK=false, voiceDur=0;
if (VOICE && fs.existsSync(VOICE)){
  voiceDur = +(JSON.parse(ffprobe(VOICE,'format=duration')).format.duration||0);
  voiceOK = voiceDur >= DUR*0.5;
}
if (!voiceOK && !ALLOW_NO_VOICE){
  console.error(JSON.stringify({fatal:'voice_missing_or_short', voiceDur, need:DUR*0.5}));
  process.exit(3);
}

/* fonts (inline, offline-proof) */
const b64=p=>fs.readFileSync(p).toString('base64');
const F=p=>path.join(ROOT,'node_modules',p);
const FONT_CSS = `
@font-face{font-family:'Noto Nastaliq Urdu';src:url(data:font/woff2;base64,${b64(F('@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2'))}) format('woff2');}
@font-face{font-family:'Noto Naskh Arabic';font-weight:700;src:url(data:font/woff2;base64,${b64(F('@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff2'))}) format('woff2');}
@font-face{font-family:'Noto Naskh Arabic';font-weight:400;src:url(data:font/woff2;base64,${b64(F('@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2'))}) format('woff2');}
@font-face{font-family:'Noto Sans Symbols 2';src:url(data:font/woff2;base64,${b64(F('@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2'))}) format('woff2');}`;

/* FULL determinism: inside the page, "now" is frozen to the TARGET date noon
   (Date + performance + Math.random all virtualized) — so the same inputs give
   byte-identical frames on any machine, any day. */
const target = new Date(+MONTH.slice(0,4), +MONTH.slice(5,7)-1, DAY, 12, 0, 0);
const BASE = target.getTime();
const clicks = 0;
const MURD=['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];

fs.rmSync(WORK,{recursive:true,force:true}); fs.mkdirSync(WORK,{recursive:true});
const fdir = path.join(WORK,'frames'); fs.mkdirSync(fdir,{recursive:true});

const br = await chromium.launch(EXE ? {executablePath:EXE} : {});
const ctx = await br.newContext({viewport:{width:520,height:940}});
await ctx.addInitScript(`
  window.__V={now:0,q:[]};
  performance.now=()=>window.__V.now;
  (function(){
    const R=Date, B=${BASE};
    function FD(...a){ return a.length ? new R(...a) : new R(B + window.__V.now); }
    FD.now=()=>B+window.__V.now; FD.parse=R.parse; FD.UTC=R.UTC; FD.prototype=R.prototype;
    window.Date=FD;
  })();
  (function(){ let s=20260818>>>0;
    Math.random=function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  })();
  window.requestAnimationFrame=cb=>{window.__V.q.push(cb);return window.__V.q.length;};
  window.cancelAnimationFrame=()=>{};
  window.__step=(ms)=>{window.__V.now+=ms;const q=window.__V.q;window.__V.q=[];q.forEach(cb=>{try{cb(window.__V.now)}catch(e){window.__stepErr=String(e)}});};
  window.__run=(n,ms)=>{for(let i=0;i<n;i++)window.__step(ms);};
`);
const pg = await ctx.newPage();
let perr=null; pg.on('pageerror',e=>perr=String(e).slice(0,300));
await pg.goto('file://'+PAGE);
await pg.addStyleTag({content:FONT_CSS});
await pg.evaluate('window.__run(6,33.33)');

/* language → Urdu (button toggles; verify body.ur) */
if (!(await pg.evaluate('document.body.classList.contains("ur")'))){
  await pg.click('#langBtn'); await pg.evaluate('window.__run(2,33.33)');
}
/* zodiac: default Vedic; one click => Western */
if (SYS==='west'){
  for(let i=0;i<3;i++){
    const z=await pg.evaluate('document.body.className');
    if(/\bwest\b/.test(z)) break;
    await pg.click('#zodiacBtn'); await pg.evaluate('window.__run(2,33.33)');
  }
}
/* date → target */
const btn = clicks>=0 ? '#next' : '#prev';
for(let i=0;i<Math.abs(clicks);i++){ await pg.click(btn); }
await pg.evaluate('window.__run(3,33.33)');
const dateShown = await pg.evaluate('document.getElementById("dateLabel").textContent');
/* verify target date reached (day + Urdu month + year all present) */
const wantDay=String(DAY), wantYear=MONTH.slice(0,4), wantMon=MURD[+MONTH.slice(5,7)-1];
if(!(dateShown.includes(wantMon) && dateShown.includes(wantYear) && new RegExp('(^|[^0-9])'+wantDay+'([^0-9]|$)').test(dateShown))){
  console.error(JSON.stringify({fatal:'date_mismatch', dateShown, want:{day:wantDay,mon:wantMon,year:wantYear}}));
  process.exit(4);
}

/* studio + fill */
await pg.click('#m-studio'); await pg.evaluate('window.__run(3,33.33)');
await pg.evaluate((S)=>{
  const set=(id,v)=>{const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));};
  set('f-badge', S.badge);
  set('f-head',  S.head);
  set('f-dates', S.dates);
  set('f-caps',  JSON.stringify(S.caps.map(c=>({t:c.t, text:c.text||c.x}))));
  const d=document.getElementById('dur'); d.value=String(Math.round(S.durSlider)); d.dispatchEvent(new Event('input',{bubbles:true}));
}, {...S, durSlider: DUR});
await pg.evaluate('window.__run(2,33.33)');

/* sanity: stage is 1080x1920 */
const st = await pg.evaluate('({w:document.getElementById("stage").width,h:document.getElementById("stage").height,body:document.body.className})');
console.log(JSON.stringify({stage:st, dateShown, clicks, N, dur:DUR, sys:SYS, voice:voiceOK?'yes':'NO(test)'}));
if (st.w!==1080||st.h!==1920){ console.error('stage size unexpected'); process.exit(4); }

/* play + frames */
await pg.evaluate('document.getElementById("play").click()');
const t0=Date.now();
const START=+(process.env.START||0), END=Math.min(+(process.env.END||N),N);
if (START>0) await pg.evaluate(`window.__run(${START},${1000/FPS})`);   // fast-forward (still renders — deterministic)
for(let i=START;i<END;i++){
  const d=await pg.evaluate(`(window.__step(${1000/FPS}), document.getElementById('stage').toDataURL('image/jpeg',0.94))`);
  fs.writeFileSync(path.join(fdir,'f'+String(i).padStart(5,'0')+'.jpg'), Buffer.from(d.split(',')[1],'base64'));
  if(i%300===0) console.log(JSON.stringify({frames:i,of:N,msPerFrame:+((Date.now()-t0)/(i-START+1)).toFixed(0)}));
  if(perr){ console.error('PAGEERR',perr); process.exit(4); }
}
await br.close();
console.log(JSON.stringify({stage_done:true, frames:END-START, min:+((Date.now()-t0)/60000).toFixed(1)}));
if (END<N){ console.log(JSON.stringify({chunk_only:true})); process.exit(0); }

/* mux (same proven chain as render2) */
fs.mkdirSync(path.dirname(OUT),{recursive:true});
const af = voiceOK
  ? `[1:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${DUR},asplit=2[vkey][vmix];`+
    `[2:a]aloop=loop=-1:size=2147483647,atrim=0:${DUR},aresample=44100,volume=0.30,afade=t=out:st=${(DUR-3).toFixed(2)}:d=3[mus];`+
    `[mus][vkey]sidechaincompress=threshold=0.024:ratio=7:attack=60:release=700:makeup=1[duck];`+
    `[duck][vmix]amix=inputs=2:duration=first:normalize=0[aout]`
  : `[2:a]aloop=loop=-1:size=2147483647,atrim=0:${DUR},aresample=44100,volume=0.42,afade=t=out:st=${(DUR-3).toFixed(2)}:d=3[aout]`;
const inputs = voiceOK ? ['-i',VOICE,'-i',MUSIC] : ['-i',MUSIC,'-i',MUSIC];
execFileSync('ffmpeg',['-y','-framerate',String(FPS),'-i',path.join(fdir,'f%05d.jpg'),...inputs,
  '-filter_complex',af,'-map','0:v','-map','[aout]',
  '-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-r',String(FPS),
  '-c:a','aac','-b:a','160k','-t',String(DUR),OUT],{stdio:['ignore','ignore','pipe']});

/* verify */
const meta=JSON.parse(ffprobe(OUT,'format=duration,size:stream=codec_type,codec_name,width,height'));
const vst=meta.streams.find(s=>s.codec_type==='video'), ast=meta.streams.find(s=>s.codec_type==='audio');
let silencePct=null;
if(voiceOK){
  const sd=spawnSync('ffmpeg',['-i',VOICE,'-af','silencedetect=noise=-30dB:d=0.8','-f','null','-'],{encoding:'utf8'});
  let sil=0,m; const re=/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g;
  while((m=re.exec(sd.stderr||''))) sil+=Math.min(+m[2],voiceDur)-+m[1];
  silencePct=+(100*sil/Math.min(voiceDur,DUR)).toFixed(1);
}
const ok = vst&&ast&&vst.width===1080&&vst.height===1920&&Math.abs(+meta.format.duration-DUR)<2;
console.log(JSON.stringify({done:ok, file:OUT, sizeMB:+(fs.statSync(OUT).size/1048576).toFixed(2),
  dur:+(+meta.format.duration).toFixed(1), video:vst&&vst.codec_name+' '+vst.width+'x'+vst.height,
  audio:ast&&ast.codec_name, voiceSilencePct:silencePct}));
if(!ok) process.exit(5);
