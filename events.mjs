// Month sky events from the ephemeris table — for the GENERAL monthly video
// (deterministic Urdu captions; per-sign videos use Claude's script instead).
import { monthTable } from './eph.mjs';

const UR = { sun:'سورج', moon:'چاند', mercury:'عطارد', venus:'زہرہ', mars:'مریخ',
  jupiter:'مشتری', saturn:'زحل', uranus:'یورینس', neptune:'نیپچون', pluto:'پلوٹو' };
const BURJ = ['حمل','ثور','جوزا','سرطان','اسد','سنبلہ','میزان','عقرب','قوس','جدی','دلو','حوت'];
const RASHI= ['میش','ورشبھ','متھن','کرک','سنگھ','کنیا','تُلا','ورشچک','دھن','مکر','کمبھ','مین'];
const AYAN = 24.2;                                    // Lahiri ~2026

export function monthEvents(ym, sys){                  // sys: 'west'|'vedic'
  const t = monthTable(ym);
  const names = sys==='vedic' ? RASHI : BURJ;
  const signOf = lon => { let L = ((lon - (sys==='vedic'?AYAN:0)) % 360 + 360) % 360; return Math.floor(L/30); };
  const day = i => 1 + Math.floor(i/2);                 // sample idx -> day of month
  const ev = [];
  const bodies = ['sun','mercury','venus','mars','jupiter','saturn'];
  for (const b of bodies){
    const s = t.lon[b];
    for (let i=1;i<s.length;i++){
      if (signOf(s[i]) !== signOf(s[i-1]))
        ev.push({day:day(i), pri:b==='sun'?1:2, text:`${day(i)} کو ${UR[b]} ${names[signOf(s[i])]} میں داخل`});
      const d1 = s[i]-s[i-1], d0 = i>1 ? s[i-1]-s[i-2] : d1;
      if (b!=='sun' && d0>0 && d1<0) ev.push({day:day(i), pri:2, text:`${day(i)} سے ${UR[b]} الٹی چال (Rx)`});
      if (b!=='sun' && d0<0 && d1>0) ev.push({day:day(i), pri:2, text:`${day(i)} کو ${UR[b]} سیدھی چال میں واپس`});
    }
  }
  // new / full moon
  const M=t.lon.moon, S=t.lon.sun;
  for (let i=1;i<M.length;i++){
    const a0=((M[i-1]-S[i-1])%360+360)%360, a1=((M[i]-S[i])%360+360)%360;
    if (a0>340 && a1<20) ev.push({day:day(i), pri:1, text:`${day(i)} کو نیا چاند — نئے آغاز کا وقت`});
    if (a0<180 && a1>=180) ev.push({day:day(i), pri:1, text:`${day(i)} کو پورا چاند ${names[signOf(M[i])]} میں`});
  }
  ev.sort((a,b)=>a.day-b.day || a.pri-b.pri);
  const seen=new Set(); const uniq=ev.filter(e=>{const k=e.text; if(seen.has(k))return false; seen.add(k); return true;});
  const keyDates=[...new Set(uniq.filter(e=>e.pri===1).map(e=>e.day))].slice(0,4);
  if(keyDates.length<3) uniq.filter(e=>e.pri===2).forEach(e=>{ if(keyDates.length<4 && !keyDates.includes(e.day)) keyDates.push(e.day); });
  keyDates.sort((a,b)=>a-b);
  return { events: uniq, keyDates, days: t.days };
}

const MURD=['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];
export function generalScript(ym, sys, durTarget=110){
  const [Y,MM]=ym.split('-').map(Number);
  const monthUr=MURD[MM-1]+' '+Y;
  const {events,keyDates}=monthEvents(ym,sys);
  const sysWord = sys==='vedic'?'راشی':'برج';
  const top = events.slice(0,10);
  const caps=[];
  caps.push({t:0, text:`${monthUr} کا آسمان — پورے مہینے کی بڑی تبدیلیاں، ایک نظر میں۔`});
  caps.push({t:8, text:`یہ عمومی آسمان ہے — ہر ${sysWord} پر اثر اپنے گھر کے حساب سے آتا ہے۔`});
  let tt=16; const step=Math.max(7, Math.floor((durTarget-30)/Math.max(1,top.length)));
  for(const e of top){ caps.push({t:tt, text:e.text+'۔'}); tt+=step; }
  caps.push({t:Math.min(tt, durTarget-12), text:'اپنی راشی کی مکمل ویڈیو فاروق سٹارز پر دیکھیے۔'});
  const dur=Math.min(150, tt+14);
  return {
    dur,
    badge:(sys==='vedic'?'مہینے کا آسمان · راشی':'مہینے کا آسمان · برج')+' · '+monthUr,
    head:`${monthUr} — آسمان کیا کہتا ہے\nبڑی تاریخیں اور بڑے موڑ`,
    dates:'اہم تاریخیں: '+keyDates.join(' · '),
    caps, monthUr
  };
}
