// CI orchestrator — runs on GitHub Actions.
// env: FS_BASE, FS_KEY (=FS_SKY_SAVE_KEY) · inputs via env: MONTH, SYS, SIGNS
//   SIGNS ''            => ONE general video per requested system
//   SIGNS '6' / '0,3,6' => those sign videos (Claude script + voice required)
//   SYS 'west'|'vedic'|'both'
// Dedup: sky-vault exists-check — existing videos are never re-rendered.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { generalReading, buildReading, toCaption } from './reading.mjs';
import { fileURLToPath } from 'url';
const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir,'..');

const FS_BASE = (process.env.FS_BASE||'https://www.farooqstars.com').replace(/\/$/,'');
const KEY = process.env.FS_KEY||'';
const MONTH = process.env.MONTH;
const SYSIN = process.env.SYS||'both';
const SIGNS = (process.env.SIGNS||'').trim();
const FORCE = /^(1|true|yes)$/i.test((process.env.FORCE||'').trim());
if (!MONTH || !KEY){ console.error('need MONTH + FS_KEY'); process.exit(2); }

const SLUGS=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const BURJ=['حمل','ثور','جوزا','سرطان','اسد','سنبلہ','میزان','عقرب','قوس','جدی','دلو','حوت'];
const RASHI=['میش','ورشبھ','متھن','کرک','سنگھ','کنیا','تُلا','ورشچک','دھن','مکر','کمبھ','مین'];
const MURD=['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];
const monthUr = MURD[+MONTH.slice(5,7)-1]+' '+MONTH.slice(0,4);

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
async function rfetch(url, opts={}, tries=4, timeoutMs=45000){
  let lastErr=null;
  for(let i=0;i<tries;i++){
    const ac=new AbortController(); const to=setTimeout(()=>ac.abort(), timeoutMs);
    try{
      const r=await fetch(url, {...opts, signal:ac.signal,
        headers:{'User-Agent':UA, 'Accept':'application/json,text/plain,*/*', 'Accept-Language':'en,ur;q=0.8',
                 'Referer':FS_BASE+'/admin.html', ...(opts.headers||{})}});
      clearTimeout(to);
      if(r.status===429 || r.status===503){ lastErr=new Error('http_'+r.status); await new Promise(s=>setTimeout(s, 4000*(i+1))); continue; }
      return r;
    }catch(e){ clearTimeout(to); lastErr=e; await new Promise(s=>setTimeout(s, 3000*(i+1))); }
  }
  throw new Error('fetch_unreachable: '+(lastErr&&lastErr.message||lastErr));
}
async function post(url, form){
  const fd=new FormData();
  for(const [k,v] of Object.entries(form)){
    if (v && v.__file) fd.append(k, new Blob([fs.readFileSync(v.__file)]), path.basename(v.__file));
    else fd.append(k, String(v));
  }
  const r=await rfetch(url,{method:'POST',body:fd});
  const tx=await r.text();
  try{ return JSON.parse(tx); }catch(e){ return {ok:false,err:'non_json',status:r.status,body:tx.slice(0,300)}; }
}
const vault = form => post(FS_BASE+'/api/sky-vault.php', {key:KEY, ...form});

async function fetchVoice(caps, dur, tag){
  /* 19-Aug: a FRESH ElevenLabs synthesis of ~20 captions can take 1-3 min —
     the old 45s timeout aborted it (west-aries fail). Wait up to 5 min per try;
     tts.php caches by text-hash, so even a dropped connection isn't wasted. */
  const r = await rfetch(FS_BASE+'/api/tts.php', {method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({captions:caps.map(c=>({t:c.t,text:c.text})), voice:'ur-PK-UzmaNeural', dur, tag})},
    3, 300000);
  const j = await r.json().catch(()=>null);
  if (!j || !j.ok || !j.url) throw new Error('tts_failed: '+JSON.stringify(j).slice(0,200));
  const wav = await rfetch(FS_BASE+'/'+j.url.replace(/^\//,''), {}, 4, 120000);
  if (!wav.ok) throw new Error('tts_download_'+wav.status);
  const p = '/tmp/voice-'+tag+'.wav';
  fs.writeFileSync(p, Buffer.from(await wav.arrayBuffer()));
  return {path:p, clips:j.clips||null, seconds:j.seconds||null, via:j.via||''};
}

function localSignScript(sys, signIdx){
  // Fallback: deterministic reading from the real ephemeris (reading.mjs).
  const [y,mo] = MONTH.split('-').map(Number);
  const r = buildReading({ year:y, month:mo, sign:signIdx,
                           system: sys==='vedic' ? 'rashi' : 'burj' });
  const dur = Math.min(150, Math.max(90, Math.ceil(r.estSpeech + 6)));
  return { dur,
    badge: r.badge,
    head:  r.headline.l1 + '\n' + r.headline.l2,
    dates: r.keyDatesLine,
    caps:  r.script.map(sn => ({ t: sn.t, text: sn.text })),
    monthUr, hashtags: null, social: toCaption(r), hash: r.hash, source:'engine' };
}

async function fetchSignScript(sys, signIdx){
  // PRIMARY: the server's cached Claude-written readings (api/sky-script.php,
  // cached in fs-var/sky-scripts). Farooq's system of record for interpretation.
  const r = await rfetch(FS_BASE+'/api/sky-script.php', {method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({sign:signIdx, month:MONTH, monthUr, dur:120, sys})});
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
    badge: sys==='vedic' ? `${name} ${sysWord} · ${monthUr}` : `${sysWord}ِ ${name} · ${monthUr}`,
    head:  j.headline || `${name} — ${monthUr}\nآسمان کیا کہتا ہے`,
    dates: 'اہم تاریخیں: '+(Array.isArray(j.dates)?j.dates.join(' · '):String(j.dates||'')),
    caps, monthUr, hashtags: j.hashtags||null, social: j.social||null,
    hash: null, source:'server-cache' };
}

async function signScript(sys, signIdx){
  // server cache first (Claude's readings, already made) -> engine fallback
  const mode = (process.env.SCRIPT_SOURCE||'auto');
  if (mode==='local') return localSignScript(sys, signIdx);
  try { const sc = await fetchSignScript(sys, signIdx);
        console.log('script: server cache (Claude reading)'); return sc; }
  catch(e){
    if (mode==='server') throw e;
    console.log('script: server unavailable ('+String(e.message).slice(0,80)+') -> local engine');
    return localSignScript(sys, signIdx);
  }
}

async function ensureMusic(){
  const p='/tmp/sky-bed.mp3';
  if (fs.existsSync(p) && fs.statSync(p).size>200000) return p;
  const r=await rfetch(FS_BASE+'/media/audio/sky-bed-1.mp3');
  if(!r.ok) throw new Error('music_download_'+r.status);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  return p;
}

async function ensurePage(){
  // The renderer page ships IN THIS REPO — that is the single source of truth
  // (fonts embedded, wheel fit, text fit). Server copy is only a fallback.
  const local=path.join(__dir,'sky-render-page.html');
  if (fs.existsSync(local) && fs.statSync(local).size>400000) return local;
  const p='/tmp/skybrand.html';
  try{
    const r=await rfetch(FS_BASE+'/sky-render-page.html');
    if (r.ok){ const t=await r.text();
      if (t.length>400000){ fs.writeFileSync(p,t); return p; } }
  }catch(e){}
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
const signList = SIGNS==='' ? [null]
  : SIGNS.toLowerCase()==='all' ? Array.from({length:12},(_,i)=>i)
  : SIGNS.split(',').map(s=>{
      const t=s.trim().toLowerCase();
      const bySlug=SLUGS.indexOf(t);
      return bySlug>=0 ? bySlug : parseInt(t,10);
    }).filter(n=>Number.isInteger(n)&&n>=0&&n<12);
if (!signList.length){ console.error('SIGNS parse gave nothing:', JSON.stringify(SIGNS)); process.exit(4); }
const report=[];
for (const sys of systems){
  for (const sg of signList){
    const isGeneral = (sg===null);
    const slug = isGeneral ? 'general' : SLUGS[sg];
    const label = `${MONTH}-${sys}-${slug}`;
    try{
      const ex = await vault({action:'exists', month:MONTH, sys, sign:slug});
      if (ex.ok && ex.exists && !FORCE){ report.push({label, skipped:'exists'}); console.log('SKIP (exists)', label); continue; }
      if (ex.ok && ex.exists && FORCE){
        // force = replace the defective video: find its file in the vault and remove
        // it just before saving the new one, so the label can never go missing long.
        const ls = await vault({action:'list'});
        const old = (ls.items||[]).filter(i=>i.month===MONTH && i.sys===sys && i.sign===slug);
        for (const o of old){ const d=await vault({action:'del', file:o.file});
          console.log('FORCE replace: removed', o.file, d.ok?'ok':d.err); }
      }
      const script = isGeneral ? generalReading(MONTH, sys) : await signScript(sys, sg);
      const voice = await fetchVoice(script.caps, script.dur, label);
      /* voice determines timing (16-Aug rule): re-time captions from real clip starts */
      if (Array.isArray(voice.clips) && voice.clips.length===script.caps.length &&
          voice.clips.every(c=>typeof c.sec==='number')){
        script.caps = script.caps.map((c,i)=>({t:+voice.clips[i].sec.toFixed(2), text:c.text}));
        console.log('caption timing: exact clip starts ('+voice.via+')');
      } else if (typeof voice.seconds==='number' && voice.seconds>10){
        /* 19-Aug fix: clips missing/mismatched => at least SCALE the estimates so
           captions cover the real speech span instead of racing ahead of it */
        const last = script.caps[script.caps.length-1].t || 1;
        const k = Math.max(0.2, (voice.seconds - 5) / last);
        script.caps = script.caps.map(c=>({t:+(c.t*k).toFixed(2), text:c.text}));
        console.log('caption timing: scaled x'+k.toFixed(2)+' to voice '+voice.seconds+'s');
      }
      /* video must be long enough to hold the whole voice */
      if (typeof voice.seconds==='number' && voice.seconds + 4 > script.dur)
        script.dur = Math.min(150, Math.ceil(voice.seconds + 4));
      await ensureMusic();
      const pagePath = await ensurePage();
      const out='/tmp/out-'+label+'.mp4';
      render(sys, script, voice.path, out, pagePath);
      /* TikTok/YT caption: headline + full script + trust stamp (competitor formula) */
      const caption = script.social || (script.head.replace('\n',' — ')
        + '\n\n' + script.caps.map(c=>c.text).join(' ')
        + '\n\n' + script.dates
        + '\n\nتمام مقامات اصل ephemeris (Keplerian + ELP2000) سے شمار شدہ — آسمان جھوٹ نہیں بولتا۔'
        + '\nاپنی چاند راشی مفت جانیے: farooqstars.com');
      const hashtags = script.hashtags || (isGeneral ? `#astrology #${sys==='vedic'?'vedic':'zodiac'} #urdu #farooqstars`
        : `#${SLUGS[sg]} #astrology #monthlyhoroscope #urdu #farooqstars`);
      const sv = await vault({action:'save', month:MONTH, sys, sign:slug, dur:script.dur, hash:script.hash||'', force:FORCE?'1':'',
        caption, hashtags, voice:(voice.via==='eleven'?'elevenlabs-v3':'ur-PK-UzmaNeural'), video:{__file:out}});
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
