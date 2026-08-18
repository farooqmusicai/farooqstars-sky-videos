// CI orchestrator — runs on GitHub Actions.
// env: FS_BASE, FS_KEY (=FS_SKY_SAVE_KEY) · inputs via env: MONTH, SYS, SIGNS
//   SIGNS ''            => ONE general video per requested system
//   SIGNS '6' / '0,3,6' => those sign videos (Claude script + voice required)
//   SYS 'west'|'vedic'|'both'
// Dedup: sky-vault exists-check — existing videos are never re-rendered.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { generalScript } from './events.mjs';
import { fileURLToPath } from 'url';
const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir,'..');

const FS_BASE = (process.env.FS_BASE||'https://www.farooqstars.com').replace(/\/$/,'');
const KEY = process.env.FS_KEY||'';
const MONTH = process.env.MONTH;
const SYSIN = process.env.SYS||'both';
const SIGNS = (process.env.SIGNS||'').trim();
if (!MONTH || !KEY){ console.error('need MONTH + FS_KEY'); process.exit(2); }

const SLUGS=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const BURJ=['حمل','ثور','جوزا','سرطان','اسد','سنبلہ','میزان','عقرب','قوس','جدی','دلو','حوت'];
const RASHI=['میش','ورشبھ','متھن','کرک','سنگھ','کنیا','تُلا','ورشچک','دھن','مکر','کمبھ','مین'];
const MURD=['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];
const monthUr = MURD[+MONTH.slice(5,7)-1]+' '+MONTH.slice(0,4);

async function post(url, form){
  const fd=new FormData();
  for(const [k,v] of Object.entries(form)){
    if (v && v.__file) fd.append(k, new Blob([fs.readFileSync(v.__file)]), path.basename(v.__file));
    else fd.append(k, String(v));
  }
  const r=await fetch(url,{method:'POST',body:fd});
  const tx=await r.text();
  try{ return JSON.parse(tx); }catch(e){ return {ok:false,err:'non_json',status:r.status,body:tx.slice(0,300)}; }
}
const vault = form => post(FS_BASE+'/api/sky-vault.php', {key:KEY, ...form});

async function fetchVoice(caps, dur, tag){
  const r = await fetch(FS_BASE+'/api/tts.php', {method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({captions:caps.map(c=>({t:c.t,text:c.text})), voice:'ur-PK-UzmaNeural', dur, tag})});
  const j = await r.json().catch(()=>null);
  if (!j || !j.ok || !j.url) throw new Error('tts_failed: '+JSON.stringify(j).slice(0,200));
  const wav = await fetch(FS_BASE+'/'+j.url.replace(/^\//,''));
  if (!wav.ok) throw new Error('tts_download_'+wav.status);
  const p = '/tmp/voice-'+tag+'.wav';
  fs.writeFileSync(p, Buffer.from(await wav.arrayBuffer()));
  return {path:p, clips:j.clips||null, seconds:j.seconds||null};
}

async function fetchSignScript(sys, signIdx){
  // api/sky-script.php (LIVE contract, read 18 Aug): JSON POST php://input,
  // {sign:int, month:'YYYY-MM', monthUr, dur} -> {ok, signUr, headline, dates[],
  //  captions[strings], hashtags, social, chars}. No key. Cached in fs-var/sky-scripts.
  const r = await fetch(FS_BASE+'/api/sky-script.php', {method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({sign:signIdx, month:MONTH, monthUr, dur:120})});
  const j = await r.json().catch(()=>null);
  if (!j || !j.ok) throw new Error('script_failed: '+JSON.stringify(j).slice(0,220));
  const lines = j.captions || j.sentences || j.lines;
  if (!Array.isArray(lines) || lines.length<8) throw new Error('script_shape: '+JSON.stringify(Object.keys(j)));
  let t=0; const caps = lines.map(L=>{ const text=(L&&L.text)||L; const at=(L&&L.t!=null)?+L.t:t;
    t=at+Math.max(6, Math.round((String(text).length)/14)); return {t:at, text:String(text)}; });
  const dur = Math.min(150, Math.max(90, (caps[caps.length-1].t + 9)));
  const name = sys==='vedic'?RASHI[signIdx]:BURJ[signIdx];
  const sysWord = sys==='vedic'?'راشی':'برج';
  return { dur,
    badge: `${name} ${sysWord} · ${monthUr}`,
    head:  j.headline || `${name} — ${monthUr}\nآسمان کیا کہتا ہے`,
    dates: 'اہم تاریخیں: '+(Array.isArray(j.dates)?j.dates.join(' · '):String(j.dates||'')),
    caps, monthUr, hashtags: j.hashtags||null, social: j.social||null };
}

async function ensureMusic(){
  const p='/tmp/sky-bed.mp3';
  if (fs.existsSync(p) && fs.statSync(p).size>200000) return p;
  const r=await fetch(FS_BASE+'/media/audio/sky-bed-1.mp3');
  if(!r.ok) throw new Error('music_download_'+r.status);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  return p;
}

async function ensurePage(){
  // The approved renderer page lives on the server (single source of truth).
  const p='/tmp/skybrand.html';
  if (fs.existsSync(p) && fs.statSync(p).size>400000) return p;
  try{
    const r=await fetch(FS_BASE+'/sky-render-page.html');
    if (r.ok){ const t=await r.text();
      if (t.length>400000){ fs.writeFileSync(p,t); return p; } }
  }catch(e){}
  const local=path.join(ROOT,'page','skybrand.html');          // repo fallback
  if (fs.existsSync(local)) return local;
  throw new Error('render_page_unavailable');
}

function render(sys, script, voicePath, outFile, pagePath){
  const sj='/tmp/script-'+path.basename(outFile,'.mp4')+'.json';
  fs.writeFileSync(sj, JSON.stringify(script));
  execFileSync('node',[path.join(__dir,'render3.mjs'),
    '--sys',sys,'--month',MONTH,'--day','1','--script',sj,
    '--voice',voicePath,'--music','/tmp/sky-bed.mp3','--out',outFile,
    '--page',pagePath],{stdio:'inherit'});
}

const systems = SYSIN==='both' ? ['west','vedic'] : [SYSIN];
const signList = SIGNS==='' ? [null] : SIGNS.split(',').map(s=>parseInt(s,10)).filter(n=>n>=0&&n<12);
const report=[];
for (const sys of systems){
  for (const sg of signList){
    const isGeneral = (sg===null);
    const slug = isGeneral ? 'general' : SLUGS[sg];
    const label = `${MONTH}-${sys}-${slug}`;
    try{
      const ex = await vault({action:'exists', month:MONTH, sys, sign:slug});
      if (ex.ok && ex.exists){ report.push({label, skipped:'exists'}); console.log('SKIP (exists)', label); continue; }
      const script = isGeneral ? generalScript(MONTH, sys) : await fetchSignScript(sys, sg);
      const voice = await fetchVoice(script.caps, script.dur, label);
      /* voice determines timing (16-Aug rule): re-time captions from real clip starts */
      if (Array.isArray(voice.clips) && voice.clips.length===script.caps.length &&
          voice.clips.every(c=>typeof c.sec==='number')){
        script.caps = script.caps.map((c,i)=>({t:+voice.clips[i].sec.toFixed(2), text:c.text}));
      }
      await ensureMusic();
      const pagePath = await ensurePage();
      const out='/tmp/out-'+label+'.mp4';
      render(sys, script, voice.path, out, pagePath);
      /* TikTok/YT caption: headline + full script + trust stamp (competitor formula) */
      const caption = script.head.replace('\n',' — ')
        + '\n\n' + script.caps.map(c=>c.text).join(' ')
        + '\n\n' + script.dates
        + '\n\nتمام مقامات اصل ephemeris (Keplerian + ELP2000) سے شمار شدہ — آسمان جھوٹ نہیں بولتا۔'
        + '\nاپنی چاند راشی مفت جانیے: farooqstars.com';
      const hashtags = script.hashtags || (isGeneral ? `#astrology #${sys==='vedic'?'vedic':'zodiac'} #urdu #farooqstars`
        : `#${SLUGS[sg]} #astrology #monthlyhoroscope #urdu #farooqstars`);
      const sv = await vault({action:'save', month:MONTH, sys, sign:slug, dur:script.dur,
        caption, hashtags, voice:'ur-PK-UzmaNeural', video:{__file:out}});
      if (!sv.ok) throw new Error('save_failed '+JSON.stringify(sv).slice(0,200));
      report.push({label, saved:sv.saved, dedup:sv.dedup||false, sizeMB:sv.sizeMB});
      console.log('DONE', label, JSON.stringify(sv));
      fs.rmSync(out,{force:true});
    }catch(e){
      report.push({label, error:String(e.message||e).slice(0,300)});
      console.error('FAIL', label, e.message||e);
      process.exitCode=1;                       // job red, but keep going with the rest
    }
  }
}
console.log('REPORT '+JSON.stringify(report,null,1));
