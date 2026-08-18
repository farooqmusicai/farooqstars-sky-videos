// Month ephemeris table — geocentric apparent ecliptic longitudes, unwrapped, 12h samples.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const eph = require('ephemeris');
const BODIES = ['moon','mercury','venus','sun','mars','jupiter','saturn','uranus','neptune','pluto'];

export function monthTable(ym){                       // ym = '2026-09'
  const [Y,M] = ym.split('-').map(Number);
  const start = new Date(Date.UTC(Y, M-1, 1, 0, 0, 0));
  const end   = new Date(Date.UTC(Y, M, 1, 0, 0, 0));
  const days  = Math.round((end - start) / 86400000);
  const steps = days * 2 + 1;
  const lon = {}; BODIES.forEach(b => lon[b] = []);
  for (let s = 0; s < steps; s++){
    const d = new Date(start.getTime() + s * 43200000);
    const r = eph.getAllPlanets(d, 51.25, 25.28, 0);
    for (const b of BODIES){
      let L = r.observed[b].apparentLongitudeDd;
      const arr = lon[b];
      if (arr.length){
        const prev = arr[arr.length-1];
        while (L < prev - 180) L += 360;
        while (L > prev + 180) L -= 360;
      }
      arr.push(+L.toFixed(2));
    }
  }
  return { steps, start: ym+'-01', days, lon };
}
