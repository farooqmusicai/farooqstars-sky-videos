// src/ephem.js
var D2R = Math.PI / 180;
var R2D = 180 / Math.PI;
function norm360(x) {
  x %= 360;
  return x < 0 ? x + 360 : x;
}
function norm180(x) {
  x = norm360(x);
  return x > 180 ? x - 360 : x;
}
function toJD(date) {
  return date.getTime() / 864e5 + 24405875e-1;
}
function centuries(jd) {
  return (jd - 2451545) / 36525;
}
var ELEMENTS = {
  mercury: [
    0.38709927,
    0.20563593,
    7.00497902,
    252.2503235,
    77.45779628,
    48.33076593,
    37e-8,
    1906e-8,
    -594749e-8,
    149472.67411175,
    0.16047689,
    -0.12534081
  ],
  venus: [
    0.72333566,
    677672e-8,
    3.39467605,
    181.9790995,
    131.60246718,
    76.67984255,
    39e-7,
    -4107e-8,
    -7889e-7,
    58517.81538729,
    268329e-8,
    -0.27769418
  ],
  earth: [
    1.00000261,
    0.01671123,
    -1531e-8,
    100.46457166,
    102.93768193,
    0,
    562e-8,
    -4392e-8,
    -0.01294668,
    35999.37244981,
    0.32327364,
    0
  ],
  mars: [
    1.52371034,
    0.0933941,
    1.84969142,
    -4.55343205,
    -23.94362959,
    49.55953891,
    1847e-8,
    7882e-8,
    -813131e-8,
    19140.30268499,
    0.44441088,
    -0.29257343
  ],
  jupiter: [
    5.202887,
    0.04838624,
    1.30439695,
    34.39644051,
    14.72847983,
    100.47390909,
    -11607e-8,
    -13253e-8,
    -183714e-8,
    3034.74612775,
    0.21252668,
    0.20469106
  ],
  saturn: [
    9.53667594,
    0.05386179,
    2.48599187,
    49.95424423,
    92.59887831,
    113.66242448,
    -12506e-7,
    -50991e-8,
    193609e-8,
    1222.49362201,
    -0.41897216,
    -0.28867794
  ],
  uranus: [
    19.18916464,
    0.04725744,
    0.77263783,
    313.23810451,
    170.9542763,
    74.01692503,
    -196176e-8,
    -4397e-8,
    -242939e-8,
    428.48202785,
    0.40805281,
    0.04240589
  ],
  neptune: [
    30.06992276,
    859048e-8,
    1.77004347,
    -55.12002969,
    44.96476227,
    131.78422574,
    26291e-8,
    5105e-8,
    35372e-8,
    218.45945325,
    -0.32241464,
    -508664e-8
  ]
};
function heliocentric(name, T) {
  const E = ELEMENTS[name];
  const a = E[0] + E[6] * T;
  const e = E[1] + E[7] * T;
  const I = (E[2] + E[8] * T) * D2R;
  const L = E[3] + E[9] * T;
  const peri = E[4] + E[10] * T;
  const node = (E[5] + E[11] * T) * D2R;
  const w = peri * D2R - node;
  let M = norm180(L - peri) * D2R;
  let Ecc = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) {
    const dM = M - (Ecc - e * Math.sin(Ecc));
    Ecc += dM / (1 - e * Math.cos(Ecc));
  }
  const xp = a * (Math.cos(Ecc) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(Ecc);
  const cw = Math.cos(w), sw = Math.sin(w);
  const cn = Math.cos(node), sn = Math.sin(node);
  const ci = Math.cos(I), si = Math.sin(I);
  return {
    x: (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    y: (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    z: sw * si * xp + cw * si * yp
  };
}
function moonDistance(T) {
  const D = (297.8501921 + 445267.1114034 * T) * D2R;
  const M = (357.5291092 + 35999.0502909 * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T) * D2R;
  const F = (93.272095 + 483202.0175233 * T) * D2R;
  const km = 385000.56 - 20905.355 * Math.cos(Mp) - 3699.111 * Math.cos(2 * D - Mp) - 2955.968 * Math.cos(2 * D) - 569.925 * Math.cos(2 * Mp) + 48.888 * Math.cos(M) - 3.149 * Math.cos(2 * F) + 246.158 * Math.cos(2 * D - 2 * Mp) - 152.138 * Math.cos(2 * D - M - Mp) - 170.733 * Math.cos(2 * D + Mp) - 204.586 * Math.cos(2 * D - M) - 129.62 * Math.cos(M - Mp) + 108.743 * Math.cos(D) + 104.755 * Math.cos(M + Mp) + 79.661 * Math.cos(Mp - 2 * F);
  return km;
}
function moonLongitude(T) {
  const Lp = 218.3164477 + 481267.88123421 * T - 15786e-7 * T * T;
  const D = (297.8501921 + 445267.1114034 * T - 18819e-7 * T * T) * D2R;
  const M = (357.5291092 + 35999.0502909 * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T + 87414e-7 * T * T) * D2R;
  const F = (93.272095 + 483202.0175233 * T - 36539e-7 * T * T) * D2R;
  const s = 1e-6 * (6288774 * Math.sin(Mp) + 1274027 * Math.sin(2 * D - Mp) + 658314 * Math.sin(2 * D) + 213618 * Math.sin(2 * Mp) - 185116 * Math.sin(M) - 114332 * Math.sin(2 * F) + 58793 * Math.sin(2 * D - 2 * Mp) + 57066 * Math.sin(2 * D - M - Mp) + 53322 * Math.sin(2 * D + Mp) + 45758 * Math.sin(2 * D - M) - 40923 * Math.sin(M - Mp) - 34720 * Math.sin(D) - 30383 * Math.sin(M + Mp) + 15327 * Math.sin(2 * D - 2 * F) - 12528 * Math.sin(Mp + 2 * F) + 10980 * Math.sin(Mp - 2 * F) + 10675 * Math.sin(4 * D - Mp) + 10034 * Math.sin(3 * Mp) + 8548 * Math.sin(4 * D - 2 * Mp) - 7888 * Math.sin(2 * D + M - Mp) - 6766 * Math.sin(2 * D + M) - 5163 * Math.sin(D - Mp) + 4987 * Math.sin(D + M) + 4036 * Math.sin(2 * D - M + Mp) + 3994 * Math.sin(2 * D + 2 * Mp) + 3861 * Math.sin(4 * D) + 3665 * Math.sin(2 * D - 3 * Mp));
  return norm360(Lp + s);
}
function meanNode(T) {
  return norm360(125.0445479 - 1934.1362891 * T + 20754e-7 * T * T);
}
function lahiriAyanamsa(T) {
  return 23.853 + 1.396042 * T;
}
var PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"];
var AU_KM = 1495978707e-1;
function tropicalLongitudes(jd) {
  const T = centuries(jd);
  const earth = heliocentric("earth", T);
  const out = {}, dist = {};
  out.sun = norm360(Math.atan2(-earth.y, -earth.x) * R2D);
  dist.sun = Math.hypot(earth.x, earth.y, earth.z) * AU_KM;
  out.moon = moonLongitude(T);
  dist.moon = moonDistance(T);
  for (const p of PLANETS) {
    const h = heliocentric(p, T);
    const dx = h.x - earth.x, dy = h.y - earth.y, dz = h.z - earth.z;
    out[p] = norm360(Math.atan2(dy, dx) * R2D);
    dist[p] = Math.hypot(dx, dy, dz) * AU_KM;
  }
  const node = meanNode(T);
  out.rahu = node;
  dist.rahu = 0;
  out.ketu = norm360(node + 180);
  dist.ketu = 0;
  out._d = dist;
  return out;
}
function geoLongitude(id, jd, sidereal = false) {
  const all = tropicalLongitudes(jd);
  const lon = all[id];
  if (lon === void 0) return NaN;
  return sidereal ? norm360(lon - lahiriAyanamsa(centuries(jd))) : lon;
}
function geoSpeed(id, jd) {
  const h = 0.25;
  let d = tropicalLongitudes(jd + h)[id] - tropicalLongitudes(jd - h)[id];
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d / (2 * h);
}

// src/events.js
var jdToDate = (j) => new Date((j - 24405875e-1) * 864e5);
var signOf = (lon) => Math.floor(norm360(lon) / 30);
function bisect(f, lo, hi, iters = 42) {
  const flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(f(mid)) === Math.sign(flo)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
function findIngresses(id, jd0, jd1, sidereal, step = 0.5) {
  const lon = (j) => geoLongitude(id, j, sidereal);
  const out = [];
  let prev = lon(jd0), prevSign = signOf(prev);
  for (let j = jd0 + step; j <= jd1; j += step) {
    const cur = lon(j), curSign = signOf(cur);
    if (curSign !== prevSign) {
      const boundary = curSign > prevSign || prevSign === 11 && curSign === 0 ? curSign * 30 : prevSign * 30;
      const f = (t2) => {
        let d = norm360(lon(t2) - boundary);
        return d > 180 ? d - 360 : d;
      };
      const t = bisect(f, j - step, j);
      out.push({
        kind: "ingress",
        body: id,
        jd: t,
        date: jdToDate(t),
        sign: signOf(geoLongitude(id, t + 0.02, sidereal)),
        from: prevSign,
        retro: geoSpeed(id, t) < 0
      });
    }
    prev = cur;
    prevSign = curSign;
  }
  return out;
}
function findStations(id, jd0, jd1, sidereal, step = 0.5) {
  if (id === "sun" || id === "moon" || id === "rahu" || id === "ketu") return [];
  const sp = (j) => geoSpeed(id, j);
  const out = [];
  let prev = sp(jd0);
  for (let j = jd0 + step; j <= jd1; j += step) {
    const cur = sp(j);
    if (Math.sign(cur) !== Math.sign(prev)) {
      const t = bisect(sp, j - step, j, 34);
      out.push({
        kind: "station",
        body: id,
        jd: t,
        date: jdToDate(t),
        direction: cur < 0 ? "retrograde" : "direct",
        sign: signOf(geoLongitude(id, t, sidereal)),
        deg: norm360(geoLongitude(id, t, sidereal)) % 30
      });
    }
    prev = cur;
  }
  return out;
}
function findLunations(jd0, jd1, sidereal) {
  const elong = (j) => {
    let d = geoLongitude("moon", j) - geoLongitude("sun", j);
    return norm360(d);
  };
  const out = [];
  for (const target of [0, 180]) {
    const f = (j) => {
      let x = elong(j) - target;
      while (x < -180) x += 360;
      while (x > 180) x -= 360;
      return x;
    };
    let prev = f(jd0);
    for (let j = jd0 + 0.25; j <= jd1; j += 0.25) {
      const cur = f(j);
      if (prev <= 0 && cur > 0) {
        const t = bisect(f, j - 0.25, j);
        out.push({
          kind: target === 0 ? "newmoon" : "fullmoon",
          body: "moon",
          jd: t,
          date: jdToDate(t),
          sign: signOf(geoLongitude("moon", t, sidereal)),
          sunSign: signOf(geoLongitude("sun", t, sidereal))
        });
      }
      prev = cur;
    }
  }
  return out.sort((a, b) => a.jd - b.jd);
}
function moonLat(jd) {
  const T = centuries(jd);
  const D2R2 = Math.PI / 180;
  const D = (297.8501921 + 445267.1114034 * T) * D2R2;
  const M = (357.5291092 + 35999.0502909 * T) * D2R2;
  const Mp = (134.9633964 + 477198.8675055 * T) * D2R2;
  const F = (93.272095 + 483202.0175233 * T) * D2R2;
  return 1e-6 * (5128122 * Math.sin(F) + 280602 * Math.sin(Mp + F) + 277693 * Math.sin(Mp - F) + 173237 * Math.sin(2 * D - F) + 55413 * Math.sin(2 * D - Mp + F) + 46271 * Math.sin(2 * D - Mp - F) + 32573 * Math.sin(2 * D + F) + 17198 * Math.sin(2 * Mp + F) + 9266 * Math.sin(2 * D + Mp - F) + 8822 * Math.sin(2 * Mp - F) + 8216 * Math.sin(2 * D - M - F) + 4324 * Math.sin(2 * D - 2 * Mp - F) + 4200 * Math.sin(2 * D + Mp + F) - 3359 * Math.sin(2 * D + M - F) + 2463 * Math.sin(2 * D - M - Mp + F) + 2211 * Math.sin(2 * D - M + F) + 2065 * Math.sin(2 * D - M - Mp - F) - 1870 * Math.sin(M - Mp - F) + 1828 * Math.sin(4 * D - Mp - F) - 1794 * Math.sin(M + F) - 1749 * Math.sin(3 * F));
}
function tagEclipses(lunations) {
  return lunations.map((l) => {
    const beta = Math.abs(moonLat(l.jd));
    const solar = l.kind === "newmoon";
    const limit = solar ? 1.58 : 1.05;
    if (beta >= limit) return l;
    return {
      ...l,
      kind: solar ? "solar_eclipse" : "lunar_eclipse",
      eclipseType: solar ? beta < 0.5 ? "total" : beta < 1.05 ? "partial" : "grazing" : beta < 0.38 ? "total" : beta < 0.72 ? "partial" : "penumbral",
      beta
    };
  });
}
var ASPECT_ANGLES = [
  { name: "conjunction", angle: 0, weight: 3 },
  { name: "opposition", angle: 180, weight: 3 },
  { name: "square", angle: 90, weight: 2.5 },
  { name: "trine", angle: 120, weight: 2 },
  { name: "sextile", angle: 60, weight: 1 }
];
var FAST = ["sun", "mercury", "venus", "mars"];
var SLOW = ["jupiter", "saturn", "uranus", "neptune", "rahu"];
function findAspects(jd0, jd1, sidereal, step = 0.5) {
  const out = [];
  const pairs = [];
  for (const a of FAST) for (const b of SLOW) pairs.push([a, b]);
  pairs.push(
    ["sun", "mercury"],
    ["sun", "venus"],
    ["sun", "mars"],
    ["venus", "mars"],
    ["mercury", "venus"],
    ["mercury", "mars"]
  );
  pairs.push(["jupiter", "saturn"], ["saturn", "uranus"], ["jupiter", "uranus"]);
  for (const [A, B] of pairs) {
    const sep = (j) => {
      let d = geoLongitude(A, j) - geoLongitude(B, j);
      return norm360(d);
    };
    for (const asp of ASPECT_ANGLES) {
      for (const target of asp.angle === 0 || asp.angle === 180 ? [asp.angle] : [asp.angle, 360 - asp.angle]) {
        const f = (j) => {
          let x = sep(j) - target;
          while (x < -180) x += 360;
          while (x > 180) x -= 360;
          return x;
        };
        let prev = f(jd0);
        for (let j = jd0 + step; j <= jd1; j += step) {
          const cur = f(j);
          if (Math.abs(cur - prev) < 90 && Math.sign(cur) !== Math.sign(prev)) {
            const t = bisect(f, j - step, j, 34);
            out.push({
              kind: "aspect",
              a: A,
              b: B,
              aspect: asp.name,
              angle: asp.angle,
              weight: asp.weight,
              jd: t,
              date: jdToDate(t),
              aSign: signOf(geoLongitude(A, t, sidereal)),
              bSign: signOf(geoLongitude(B, t, sidereal))
            });
          }
          prev = cur;
        }
      }
    }
  }
  return out.sort((a, b) => a.jd - b.jd);
}
var SCANNED = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "rahu"];
function monthEvents(year, month, sidereal) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const jd0 = toJD(start), jd1 = toJD(end);
  let events = [];
  for (const id of SCANNED) {
    events = events.concat(findIngresses(id, jd0, jd1, sidereal));
    events = events.concat(findStations(id, jd0, jd1, sidereal));
  }
  events = events.concat(tagEclipses(findLunations(jd0, jd1, sidereal)));
  events = events.concat(findAspects(jd0, jd1, sidereal));
  const positions = {};
  for (const id of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"]) {
    const lon = geoLongitude(id, jd0, sidereal);
    positions[id] = {
      lon,
      sign: signOf(lon),
      deg: Math.floor(norm360(lon) % 30),
      retro: geoSpeed(id, jd0) < 0
    };
  }
  events.sort((a, b) => a.jd - b.jd);
  events.forEach((e) => {
    e.day = jdToDate(e.jd).getUTCDate();
  });
  return {
    year,
    month,
    sidereal,
    jd0,
    jd1,
    events,
    positions,
    ayanamsa: lahiriAyanamsa(centuries(jd0))
  };
}

// src/reading.js
var SIGNS = [
  { en: "Aries", burj: "\u062D\u0645\u0644", rashi: "\u0645\u06CC\u0634", glyph: "\u2648", slug: "aries" },
  { en: "Taurus", burj: "\u062B\u0648\u0631", rashi: "\u0648\u0631\u0634\u0628\u06BE", glyph: "\u2649", slug: "taurus" },
  { en: "Gemini", burj: "\u062C\u0648\u0632\u0627", rashi: "\u0645\u062A\u06BE\u0646", glyph: "\u264A", slug: "gemini" },
  { en: "Cancer", burj: "\u0633\u0631\u0637\u0627\u0646", rashi: "\u06A9\u0631\u06A9", glyph: "\u264B", slug: "cancer" },
  { en: "Leo", burj: "\u0627\u0633\u062F", rashi: "\u0633\u0646\u06AF\u06BE", glyph: "\u264C", slug: "leo" },
  { en: "Virgo", burj: "\u0633\u0646\u0628\u0644\u06C1", rashi: "\u06A9\u0646\u06CC\u0627", glyph: "\u264D", slug: "virgo" },
  { en: "Libra", burj: "\u0645\u06CC\u0632\u0627\u0646", rashi: "\u062A\u064F\u0644\u0627", glyph: "\u264E", slug: "libra" },
  { en: "Scorpio", burj: "\u0639\u0642\u0631\u0628", rashi: "\u0648\u0631\u0634\u0686\u06A9", glyph: "\u264F", slug: "scorpio" },
  { en: "Sagittarius", burj: "\u0642\u0648\u0633", rashi: "\u062F\u06BE\u0646", glyph: "\u2650", slug: "sagittarius" },
  { en: "Capricorn", burj: "\u062C\u062F\u06CC", rashi: "\u0645\u06A9\u0631", glyph: "\u2651", slug: "capricorn" },
  { en: "Aquarius", burj: "\u062F\u0644\u0648", rashi: "\u06A9\u0645\u0628\u06BE", glyph: "\u2652", slug: "aquarius" },
  { en: "Pisces", burj: "\u062D\u0648\u062A", rashi: "\u0645\u06CC\u0646", glyph: "\u2653", slug: "pisces" }
];
var MONTHS_UR = [
  "\u062C\u0646\u0648\u0631\u06CC",
  "\u0641\u0631\u0648\u0631\u06CC",
  "\u0645\u0627\u0631\u0686",
  "\u0627\u067E\u0631\u06CC\u0644",
  "\u0645\u0626\u06CC",
  "\u062C\u0648\u0646",
  "\u062C\u0648\u0644\u0627\u0626\u06CC",
  "\u0627\u06AF\u0633\u062A",
  "\u0633\u062A\u0645\u0628\u0631",
  "\u0627\u06A9\u062A\u0648\u0628\u0631",
  "\u0646\u0648\u0645\u0628\u0631",
  "\u062F\u0633\u0645\u0628\u0631"
];
var P = {
  sun: { ur: "\u0633\u0648\u0631\u062C", role: "\u0634\u0646\u0627\u062E\u062A \u0627\u0648\u0631 \u0639\u0632\u062A" },
  moon: { ur: "\u0686\u0627\u0646\u062F", role: "\u062F\u0644 \u0627\u0648\u0631 \u062C\u0630\u0628\u0627\u062A" },
  mercury: { ur: "\u0639\u0637\u0627\u0631\u062F", role: "\u0628\u0627\u062A \u0686\u06CC\u062A \u0627\u0648\u0631 \u06A9\u0627\u063A\u0630\u0627\u062A" },
  venus: { ur: "\u0632\u06C1\u0631\u06C1", role: "\u0645\u062D\u0628\u062A\u060C \u067E\u06CC\u0633\u06C1 \u0627\u0648\u0631 \u0631\u0634\u062A\u06D2" },
  mars: { ur: "\u0645\u0631\u06CC\u062E", role: "\u06C1\u0645\u062A \u0627\u0648\u0631 \u0639\u0645\u0644" },
  jupiter: { ur: "\u0645\u0634\u062A\u0631\u06CC", role: "\u06A9\u0634\u0627\u062F\u06AF\u06CC \u0627\u0648\u0631 \u0642\u0633\u0645\u062A" },
  saturn: { ur: "\u0632\u062D\u0644", role: "\u0645\u062D\u0646\u062A \u0627\u0648\u0631 \u0630\u0645\u06C1 \u062F\u0627\u0631\u06CC" },
  uranus: { ur: "\u06CC\u0648\u0631\u06CC\u0646\u0633", role: "\u0627\u0686\u0627\u0646\u06A9 \u062A\u0628\u062F\u06CC\u0644\u06CC" },
  neptune: { ur: "\u0646\u06CC\u067E\u0686\u0648\u0646", role: "\u062E\u0648\u0627\u0628 \u0627\u0648\u0631 \u062F\u06BE\u0646\u062F" },
  rahu: { ur: "\u0631\u0627\u06C1\u0648", role: "\u0628\u06BE\u0648\u06A9 \u0627\u0648\u0631 \u06A9\u06BE\u0646\u0686\u0627\u0624" },
  ketu: { ur: "\u06A9\u06CC\u062A\u0648", role: "\u0628\u06D2 \u062A\u0639\u0644\u0642\u06CC" }
};
var RULER = [
  "mars",
  "venus",
  "mercury",
  "moon",
  "sun",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "saturn",
  "jupiter"
];
var H = [
  {
    area: "\u0622\u067E \u06A9\u06CC \u0627\u067E\u0646\u06CC \u0630\u0627\u062A",
    long: "\u0622\u067E \u06A9\u0627 \u0627\u067E\u0646\u0627 \u0622\u067E \u2014 \u062C\u0633\u0645\u060C \u0686\u06C1\u0631\u06C1\u060C \u0627\u0648\u0631 \u0644\u0648\u06AF \u0622\u067E \u06A9\u0648 \u06A9\u06CC\u0633\u06D2 \u062F\u06CC\u06A9\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA",
    open: "\u0622\u067E \u062E\u0648\u062F \u0633\u0627\u0645\u0646\u06D2 \u0622 \u062C\u0627\u062A\u06D2 \u06C1\u06CC\u06BA"
  },
  {
    area: "\u067E\u06CC\u0633\u06C1 \u0627\u0648\u0631 \u062E\u0627\u0646\u062F\u0627\u0646",
    long: "\u0622\u0645\u062F\u0646\u06CC\u060C \u062C\u0645\u0639 \u067E\u0648\u0646\u062C\u06CC\u060C \u06AF\u06BE\u0631 \u0648\u0627\u0644\u06D2\u060C \u0627\u0648\u0631 \u0622\u067E \u06A9\u06CC \u0627\u067E\u0646\u06CC \u0628\u0627\u062A",
    open: "\u067E\u06CC\u0633\u06D2 \u06A9\u06CC \u0628\u0627\u062A \u0633\u0627\u0645\u0646\u06D2 \u0622\u062A\u06CC \u06C1\u06D2"
  },
  {
    area: "\u06C1\u0645\u062A \u0627\u0648\u0631 \u0631\u0627\u0628\u0637\u06D2",
    long: "\u0628\u06C1\u0646 \u0628\u06BE\u0627\u0626\u06CC\u060C \u0645\u062E\u062A\u0635\u0631 \u0633\u0641\u0631\u060C \u067E\u06CC\u063A\u0627\u0645\u060C \u0627\u0648\u0631 \u0622\u067E \u06A9\u06CC \u0627\u067E\u0646\u06CC \u06C1\u0645\u062A",
    open: "\u0631\u0627\u0628\u0637\u06D2 \u06A9\u06BE\u0644\u062A\u06D2 \u06C1\u06CC\u06BA"
  },
  {
    area: "\u06AF\u06BE\u0631 \u0627\u0648\u0631 \u062F\u0644 \u06A9\u0627 \u0686\u06CC\u0646",
    long: "\u06AF\u06BE\u0631\u060C \u0645\u0627\u06BA\u060C \u062C\u0627\u0626\u06CC\u062F\u0627\u062F\u060C \u0627\u0648\u0631 \u0627\u0646\u062F\u0631 \u06A9\u0627 \u0633\u06A9\u0648\u0646",
    open: "\u06AF\u06BE\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u062F\u06BE\u06CC\u0627\u0646 \u062C\u0627\u062A\u0627 \u06C1\u06D2"
  },
  {
    area: "\u0645\u062D\u0628\u062A \u0627\u0648\u0631 \u062A\u062E\u0644\u06CC\u0642",
    long: "\u0627\u0648\u0644\u0627\u062F\u060C \u0645\u062D\u0628\u062A\u060C \u062A\u062E\u0644\u06CC\u0642\u060C \u0627\u0648\u0631 \u062F\u0644 \u06A9\u06CC \u062E\u0648\u0634\u06CC",
    open: "\u062F\u0644 \u06A9\u06CC \u0628\u0627\u062A \u062C\u0627\u06AF\u062A\u06CC \u06C1\u06D2"
  },
  {
    area: "\u06A9\u0627\u0645 \u0627\u0648\u0631 \u0635\u062D\u062A",
    long: "\u0631\u0648\u0632\u0645\u0631\u06C1 \u06A9\u0627\u0645\u060C \u0635\u062D\u062A\u060C \u0642\u0631\u0636\u060C \u0627\u0648\u0631 \u0645\u0642\u0627\u0628\u0644\u06C1",
    open: "\u0631\u0648\u0632\u0645\u0631\u06C1 \u06A9\u0627\u0645 \u0628\u06BE\u0627\u0631\u06CC \u06C1\u0648 \u062C\u0627\u062A\u0627 \u06C1\u06D2"
  },
  {
    area: "\u0631\u0634\u062A\u06C1 \u0627\u0648\u0631 \u0634\u0631\u0627\u06A9\u062A",
    long: "\u0634\u0631\u06CC\u06A9\u0650 \u062D\u06CC\u0627\u062A\u060C \u0634\u0631\u0627\u06A9\u062A\u060C \u0645\u0639\u0627\u06C1\u062F\u06D2\u060C \u0627\u0648\u0631 \u0633\u0627\u0645\u0646\u06D2 \u0648\u0627\u0644\u0627 \u0641\u0631\u06CC\u0642",
    open: "\u062F\u0648\u0633\u0631\u0627 \u0641\u0631\u06CC\u0642 \u0633\u0627\u0645\u0646\u06D2 \u0622\u062A\u0627 \u06C1\u06D2"
  },
  {
    area: "\u0627\u0686\u0627\u0646\u06A9 \u0645\u0648\u0691",
    long: "\u06AF\u06C1\u0631\u06CC \u062A\u0628\u062F\u06CC\u0644\u06CC\u060C \u0631\u0627\u0632\u060C \u0648\u0631\u0627\u062B\u062A\u060C \u0627\u0648\u0631 \u062F\u0648\u0633\u0631\u0648\u06BA \u06A9\u0627 \u067E\u06CC\u0633\u06C1",
    open: "\u06A9\u0648\u0626\u06CC \u0686\u06CC\u0632 \u0627\u0686\u0627\u0646\u06A9 \u067E\u0644\u0679\u062A\u06CC \u06C1\u06D2"
  },
  {
    area: "\u0642\u0633\u0645\u062A \u0627\u0648\u0631 \u0633\u0641\u0631",
    long: "\u0642\u0633\u0645\u062A\u060C \u0644\u0645\u0628\u0627 \u0633\u0641\u0631\u060C \u0627\u0633\u062A\u0627\u062F\u060C \u0627\u0648\u0631 \u0627\u06CC\u0645\u0627\u0646",
    open: "\u0631\u0627\u0633\u062A\u06C1 \u06A9\u06BE\u0644\u062A\u0627 \u06C1\u06D2"
  },
  {
    area: "\u06A9\u0627\u0645 \u0627\u0648\u0631 \u0645\u0642\u0627\u0645",
    long: "\u067E\u06CC\u0634\u06C1\u060C \u0639\u0632\u062A\u060C \u0645\u0642\u0627\u0645\u060C \u0627\u0648\u0631 \u0644\u0648\u06AF\u0648\u06BA \u06A9\u06CC \u0646\u0638\u0631",
    open: "\u06A9\u0627\u0645 \u0622\u067E \u06A9\u0648 \u0633\u0627\u0645\u0646\u06D2 \u0644\u06D2 \u0622\u062A\u0627 \u06C1\u06D2"
  },
  {
    area: "\u062F\u0648\u0633\u062A \u0627\u0648\u0631 \u0622\u0645\u062F\u0646\u06CC",
    long: "\u062F\u0648\u0633\u062A\u060C \u062D\u0644\u0642\u06C1\u060C \u062E\u0648\u0627\u06C1\u0634\u06CC\u06BA\u060C \u0627\u0648\u0631 \u0622\u0645\u062F\u0646\u06CC \u06A9\u0627 \u0628\u06C1\u0627\u0624",
    open: "\u062D\u0644\u0642\u06C1 \u062D\u0631\u06A9\u062A \u0645\u06CC\u06BA \u0622\u062A\u0627 \u06C1\u06D2"
  },
  {
    area: "\u062A\u0646\u06C1\u0627\u0626\u06CC \u0627\u0648\u0631 \u0622\u0631\u0627\u0645",
    long: "\u062A\u0646\u06C1\u0627\u0626\u06CC\u060C \u062E\u0631\u0686\u060C \u0628\u06CC\u0631\u0648\u0646\u0650 \u0645\u0644\u06A9\u060C \u0627\u0648\u0631 \u0646\u06CC\u0646\u062F",
    open: "\u0645\u06C1\u06CC\u0646\u06C1 \u0627\u0646\u062F\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u0645\u0691\u062A\u0627 \u06C1\u06D2"
  }
];
var ASPECT_UR = {
  conjunction: { n: "\u0642\u0650\u0631\u0627\u0646", v: "\u0627\u06CC\u06A9 \u062C\u06AF\u06C1 \u0622 \u0645\u0644\u062A\u06D2 \u06C1\u06CC\u06BA" },
  opposition: { n: "\u0645\u0642\u0627\u0628\u0644\u06C1", v: "\u0622\u0645\u0646\u06D2 \u0633\u0627\u0645\u0646\u06D2 \u0622 \u062C\u0627\u062A\u06D2 \u06C1\u06CC\u06BA" },
  square: { n: "\u062A\u0631\u0628\u06CC\u0639", v: "\u0622\u067E\u0633 \u0645\u06CC\u06BA \u0631\u06AF\u0691 \u06A9\u06BE\u0627\u062A\u06D2 \u06C1\u06CC\u06BA" },
  trine: { n: "\u062A\u062B\u0644\u06CC\u062B", v: "\u0627\u06CC\u06A9 \u062F\u0648\u0633\u0631\u06D2 \u06A9\u0627 \u0633\u0627\u062A\u06BE \u062F\u06CC\u062A\u06D2 \u06C1\u06CC\u06BA" },
  sextile: { n: "\u062A\u0633\u062F\u06CC\u0633", v: "\u0627\u06CC\u06A9 \u062F\u0631\u0648\u0627\u0632\u06C1 \u06A9\u06BE\u0648\u0644\u062A\u06D2 \u06C1\u06CC\u06BA" }
};
var houseOf = (sign, target) => (sign - target + 12) % 12 + 1;
var ANGULAR = /* @__PURE__ */ new Set([1, 4, 7, 10]);
function score(e, target) {
  const ruler = RULER[target];
  let s = 0, house = null;
  if (e.kind === "solar_eclipse" || e.kind === "lunar_eclipse") {
    s = 11;
    house = houseOf(e.sign, target);
  } else if (e.kind === "station") {
    s = 8;
    house = houseOf(e.sign, target);
    if (e.body === ruler) s += 3;
    if (["jupiter", "saturn"].includes(e.body)) s += 1;
  } else if (e.kind === "ingress") {
    house = houseOf(e.sign, target);
    s = { sun: 5, mercury: 5, venus: 6, mars: 6, jupiter: 9, saturn: 9, rahu: 8 }[e.body] || 4;
    if (e.body === ruler) s += 3;
    if (house === 1) s += 2;
  } else if (e.kind === "fullmoon") {
    s = 6;
    house = houseOf(e.sign, target);
  } else if (e.kind === "newmoon") {
    s = 6;
    house = houseOf(e.sign, target);
  } else if (e.kind === "aspect") {
    s = e.weight + 1;
    house = houseOf(e.aSign, target);
    if (e.a === ruler || e.b === ruler) s += 2.5;
    if (e.b === "saturn" || e.a === "saturn") s += 1;
    if (["sun", "mercury"].includes(e.a) && ["sun", "mercury"].includes(e.b)) s -= 1.5;
  }
  if (ANGULAR.has(house)) s += 0.8;
  return { s, house };
}
var day = (n) => String(n);
function sentenceFor(e, target, house) {
  const h = H[house - 1];
  const ruler = RULER[target];
  if (e.kind === "solar_eclipse")
    return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u0633\u0648\u0631\u062C \u06AF\u0631\u06C1\u0646 \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u067E\u0691\u062A\u0627 \u06C1\u06D2\u06D4 \u062C\u0648 \u0686\u06CC\u0632 \u067E\u06C1\u0644\u06D2 \u06C1\u06CC \u0688\u06BE\u06CC\u0644\u06CC \u062A\u06BE\u06CC\u060C \u0648\u06C1 \u06CC\u06C1\u06CC\u06BA \u0679\u0648\u0679\u06D2 \u06AF\u06CC \u2014 \u0627\u0648\u0631 \u0627\u064F\u0633 \u06A9\u06CC \u062C\u06AF\u06C1 \u06A9\u0686\u06BE \u0646\u06CC\u0627 \u0622\u0626\u06D2 \u06AF\u0627\u06D4`;
  if (e.kind === "lunar_eclipse")
    return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u0686\u0627\u0646\u062F \u06AF\u0631\u06C1\u0646 \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u06A9\u0648 \u0631\u0648\u0634\u0646 \u06A9\u0631\u062A\u0627 \u06C1\u06D2\u06D4 \u06CC\u06C1 \u06A9\u0686\u06BE \u0634\u0631\u0648\u0639 \u0646\u06C1\u06CC\u06BA \u06A9\u0631\u062A\u0627\u060C \u062E\u062A\u0645 \u06A9\u0631\u062A\u0627 \u06C1\u06D2\u06D4 \u062C\u0648 \u0622\u067E \u06A9\u0648 \u062A\u06BE\u06A9\u0627 \u0631\u06C1\u0627 \u06C1\u06D2\u060C \u0627\u064F\u0633\u06D2 \u062C\u0627\u0646\u06D2 \u062F\u06CC\u06BA\u06D4`;
  if (e.kind === "station") {
    const p = P[e.body].ur;
    return e.direction === "retrograde" ? `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u0633\u06D2 ${p} \u0627\u064F\u0644\u0679\u0627 \u0686\u0644\u0646\u06D2 \u0644\u06AF\u062A\u0627 \u06C1\u06D2\u060C \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA\u06D4 \u0646\u06CC\u0627 \u0645\u0639\u0627\u06C1\u062F\u06C1 \u0646\u06C1 \u06A9\u0631\u06CC\u06BA \u2014 \u067E\u0631\u0627\u0646\u0627 \u06A9\u0627\u0645 \u0645\u06A9\u0645\u0644 \u06A9\u0631\u06CC\u06BA\u06D4` : `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${p} \u0633\u06CC\u062F\u06BE\u0627 \u06C1\u0648 \u062C\u0627\u062A\u0627 \u06C1\u06D2\u06D4 ${h.area} \u06A9\u0627 \u062C\u0648 \u06A9\u0627\u0645 \u0645\u06C1\u06CC\u0646\u0648\u06BA \u0633\u06D2 \u0627\u0679\u06A9\u0627 \u062A\u06BE\u0627\u060C \u0627\u0628 \u0686\u0644\u0646\u0627 \u0634\u0631\u0648\u0639 \u06C1\u0648\u062A\u0627 \u06C1\u06D2\u06D4`;
  }
  if (e.kind === "ingress") {
    const p = P[e.body].ur;
    if (house === 1)
      return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${p} \u062E\u0648\u062F \u0622\u067E \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u0622 \u062C\u0627\u062A\u0627 \u06C1\u06D2\u06D4 \u0644\u0648\u06AF \u0622\u067E \u06A9\u0648 \u0646\u0648\u0679\u0633 \u06A9\u0631\u062A\u06D2 \u06C1\u06CC\u06BA\u060C \u0627\u0648\u0631 \u062C\u0648 \u062F\u0631\u0648\u0627\u0632\u06D2 \u0628\u0646\u062F \u0644\u06AF\u062A\u06D2 \u062A\u06BE\u06D2 \u0648\u06C1 \u06A9\u06BE\u0644\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4`;
    if (e.body === ruler)
      return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u0622\u067E \u06A9\u0627 \u0627\u067E\u0646\u0627 \u062D\u0627\u06A9\u0645 ${p} ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u062F\u0627\u062E\u0644 \u06C1\u0648\u062A\u0627 \u06C1\u06D2\u06D4 \u0627\u06AF\u0644\u06D2 \u06A9\u0626\u06CC \u06C1\u0641\u062A\u06D2 \u0622\u067E \u06A9\u0627 \u0632\u0648\u0631 \u0627\u0650\u0633\u06CC \u0637\u0631\u0641 \u0631\u06C1\u06D2 \u06AF\u0627\u06D4`;
    return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${p} \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u0622\u062A\u0627 \u06C1\u06D2\u06D4 ${h.open}\u06D4`;
  }
  if (e.kind === "fullmoon")
    return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0627 \u067E\u0648\u0631\u0627 \u0686\u0627\u0646\u062F \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u06C1\u06D2\u06D4 \u062C\u0648 \u0628\u0627\u062A \u0645\u06C1\u06CC\u0646\u0648\u06BA \u0633\u06D2 \u062F\u0628\u06CC \u062A\u06BE\u06CC\u060C \u0627\u0650\u0633 \u06C1\u0641\u062A\u06D2 \u0635\u0627\u0641 \u06C1\u0648 \u062C\u0627\u0626\u06D2 \u06AF\u06CC\u06D4`;
  if (e.kind === "newmoon")
    return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0627 \u0646\u06CC\u0627 \u0686\u0627\u0646\u062F \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u06C1\u06D2\u06D4 \u0646\u0626\u06CC \u0634\u0631\u0648\u0639\u0627\u062A \u06A9\u06D2 \u0644\u06CC\u06D2 \u0645\u06C1\u06CC\u0646\u06D2 \u06A9\u0627 \u0633\u0628 \u0633\u06D2 \u0635\u0627\u0641 \u062F\u0646 \u06CC\u06C1\u06CC \u06C1\u06D2\u06D4`;
  if (e.kind === "aspect") {
    const a = P[e.a].ur, b = P[e.b].ur, asp = ASPECT_UR[e.aspect];
    if (e.aspect === "opposition" && (e.b === "saturn" || e.a === "saturn"))
      return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u06A9\u0627 \u0633\u0627\u0645\u0646\u0627 ${b} \u0633\u06D2 \u06C1\u0648\u062A\u0627 \u06C1\u06D2\u06D4 \u06CC\u0627 \u062A\u0648 \u067E\u06A9\u0627 \u0648\u0639\u062F\u06C1 \u06A9\u0631\u06CC\u06BA\u060C \u06CC\u0627 \u0635\u0627\u0641 \u062D\u062F \u0628\u0627\u0646\u062F\u06BE \u062F\u06CC\u06BA \u2014 \u062F\u0631\u0645\u06CC\u0627\u0646 \u06A9\u0627 \u0631\u0627\u0633\u062A\u06C1 \u0627\u0650\u0633 \u062F\u0646 \u06A9\u0627\u0645 \u0646\u06C1\u06CC\u06BA \u06A9\u0631\u06D2 \u06AF\u0627\u06D4`;
    if (e.aspect === "square")
      return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} ${asp.v}\u06D4 ${h.area} \u0645\u06CC\u06BA \u062F\u0628\u0627\u0624 \u0645\u062D\u0633\u0648\u0633 \u06C1\u0648\u06AF\u0627 \u2014 \u062C\u0644\u062F\u06CC \u0645\u06CC\u06BA \u0641\u06CC\u0635\u0644\u06C1 \u0646\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4`;
    if (e.aspect === "trine")
      return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} ${asp.v}\u06D4 ${h.area} \u0645\u06CC\u06BA \u06A9\u0627\u0645 \u0628\u063A\u06CC\u0631 \u0632\u0648\u0631 \u0644\u06AF\u0627\u0626\u06D2 \u06C1\u0648 \u062C\u0627\u062A\u0627 \u06C1\u06D2\u06D4`;
    if (e.aspect === "sextile")
      return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} ${asp.v}\u06D4 \u0645\u0648\u0642\u0639 \u062E\u0648\u062F \u0646\u06C1\u06CC\u06BA \u0622\u0626\u06D2 \u06AF\u0627 \u2014 \u06C1\u0627\u062A\u06BE \u0628\u0691\u06BE\u0627\u0646\u0627 \u0622\u067E \u06A9\u0648 \u067E\u0691\u06D2 \u06AF\u0627\u06D4`;
    return `${day(e.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} ${asp.v}\u06D4 ${h.area} \u0645\u06CC\u06BA \u0645\u0639\u0627\u0645\u0644\u06C1 \u0627\u067E\u0646\u06D2 \u0639\u0631\u0648\u062C \u067E\u0631 \u06C1\u0648\u062A\u0627 \u06C1\u06D2\u06D4`;
  }
  return "";
}
function headlineFor(top, target, sys) {
  const S = SIGNS[target];
  const name = sys === "rashi" ? S.rashi : S.burj;
  const e = top[0], h = H[e.house - 1];
  const line1 = (() => {
    if (e.kind === "solar_eclipse") return `\u0633\u0648\u0631\u062C \u06AF\u0631\u06C1\u0646 \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u0648 \u0646\u0626\u06D2 \u0633\u0631\u06D2 \u0633\u06D2 \u0644\u06A9\u06BE\u062A\u0627 \u06C1\u06D2\u06D4`;
    if (e.kind === "lunar_eclipse") return `\u0686\u0627\u0646\u062F \u06AF\u0631\u06C1\u0646 ${h.area} \u0633\u06D2 \u067E\u0631\u0627\u0646\u0627 \u0628\u0648\u062C\u06BE \u0627\u064F\u062A\u0627\u0631\u062A\u0627 \u06C1\u06D2\u06D4`;
    if (e.kind === "ingress" && e.house === 1) return `${P[e.body].ur} \u062E\u0648\u062F \u0622\u067E \u06A9\u06D2 \u06AF\u06BE\u0631 \u0644\u0648\u0679 \u0622\u06CC\u0627 \u06C1\u06D2\u06D4`;
    if (e.kind === "ingress") return `${P[e.body].ur} \u0622\u067E \u06A9\u06D2 ${h.area} \u06A9\u0627 \u0631\u062E \u0628\u062F\u0644\u062A\u0627 \u06C1\u06D2\u06D4`;
    if (e.kind === "station" && e.direction === "retrograde") return `${P[e.body].ur} \u0627\u064F\u0644\u0679\u0627 \u0686\u0644\u062A\u0627 \u06C1\u06D2 \u2014 \u0631\u0641\u062A\u0627\u0631 \u06A9\u0645 \u06A9\u0631\u0646\u06CC \u067E\u0691\u06D2 \u06AF\u06CC\u06D4`;
    if (e.kind === "station") return `${P[e.body].ur} \u0633\u06CC\u062F\u06BE\u0627 \u06C1\u0648\u062A\u0627 \u06C1\u06D2 \u2014 \u0631\u06A9\u0627 \u06C1\u0648\u0627 \u06A9\u0627\u0645 \u0686\u0644\u062A\u0627 \u06C1\u06D2\u06D4`;
    if (e.kind === "fullmoon") return `\u067E\u0648\u0631\u0627 \u0686\u0627\u0646\u062F ${h.area} \u06A9\u0648 \u0635\u0627\u0641 \u06A9\u0631 \u062F\u06CC\u062A\u0627 \u06C1\u06D2\u06D4`;
    if (e.kind === "newmoon") return `\u0646\u06CC\u0627 \u0686\u0627\u0646\u062F ${h.area} \u0645\u06CC\u06BA \u0646\u0626\u06CC \u0634\u0631\u0648\u0639\u0627\u062A \u062F\u06CC\u062A\u0627 \u06C1\u06D2\u06D4`;
    return `${h.area} \u0627\u0650\u0633 \u0645\u06C1\u06CC\u0646\u06D2 \u06A9\u0627 \u0645\u0631\u06A9\u0632 \u06C1\u06D2\u06D4`;
  })();
  const e2 = top[1];
  const line2 = e2 ? `${day(e2.day)} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u0645\u06C1\u06CC\u0646\u06C1 \u067E\u0644\u0679\u062A\u0627 \u06C1\u06D2\u06D4` : `\u0645\u06C1\u06CC\u0646\u06C1 ${name} \u06A9\u06D2 \u0644\u06CC\u06D2 \u0635\u0627\u0641 \u06A9\u06BE\u0644\u062A\u0627 \u06C1\u06D2\u06D4`;
  return { l1: line1, l2: line2 };
}
function buildReading({
  year,
  month,
  sign,
  system = "burj",
  wordsPerSecond = 2.4,
  duration = 112
}) {
  const sidereal = system === "rashi";
  const m = monthEvents(year, month, sidereal);
  const S = SIGNS[sign];
  const name = sidereal ? S.rashi : S.burj;
  const sysWord = sidereal ? "\u0631\u0627\u0634\u06CC" : "\u0628\u0631\u062C";
  const fullName = sidereal ? `${name} ${sysWord}` : `${sysWord}\u0650 ${name}`;
  const ruler = RULER[sign];
  const scored = m.events.map((e) => {
    const { s, house } = score(e, sign);
    return { ...e, score: s, house };
  }).filter((e) => e.house && e.score > 3.2).sort((a, b) => b.score - a.score);
  const chosen = [];
  const usedDays = /* @__PURE__ */ new Set();
  for (const e of scored) {
    if (usedDays.has(e.day)) continue;
    chosen.push(e);
    usedDays.add(e.day);
    if (chosen.length >= 6) break;
  }
  chosen.sort((a, b) => a.day - b.day);
  const top = [...chosen].sort((a, b) => b.score - a.score);
  const head = headlineFor(top, sign, system);
  const rp = m.positions[ruler];
  const rulerHouse = houseOf(rp.sign, sign);
  const rh = H[rulerHouse - 1];
  const lines = [];
  lines.push(`${name} \u0648\u0627\u0644\u0648 \u2014 ${MONTHS_UR[month - 1]} ${year} \u0622\u067E \u06A9\u06D2 \u0644\u06CC\u06D2 \u062E\u0627\u0644\u06CC \u0645\u06C1\u06CC\u0646\u06C1 \u0646\u06C1\u06CC\u06BA \u06C1\u06D2\u06D4`);
  lines.push(`\u0622\u0626\u06CC\u06D2 \u062F\u06CC\u06A9\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA \u06CC\u06C1 \u0645\u06C1\u06CC\u0646\u06C1 \u062A\u0627\u0631\u06CC\u062E \u0628\u06C1 \u062A\u0627\u0631\u06CC\u062E \u06A9\u06CC\u0633\u06D2 \u06A9\u06BE\u0644\u062A\u0627 \u06C1\u06D2\u06D4`);
  lines.push(`\u0645\u06C1\u06CC\u0646\u06C1 \u0634\u0631\u0648\u0639 \u06C1\u0648\u062A\u0627 \u06C1\u06D2 \u062A\u0648 \u0622\u067E \u06A9\u0627 \u062D\u0627\u06A9\u0645 ${P[ruler].ur} ${rh.area} \u06A9\u06D2 \u06AF\u06BE\u0631 \u0645\u06CC\u06BA \u06A9\u06BE\u0691\u0627 \u06C1\u06D2${rp.retro ? " \u0627\u0648\u0631 \u0627\u064F\u0644\u0679\u0627 \u0686\u0644 \u0631\u06C1\u0627 \u06C1\u06D2" : ""}\u06D4 \u06CC\u0639\u0646\u06CC \u067E\u06C1\u0644\u06D2 \u062F\u0646 \u0633\u06D2 \u06C1\u06CC \u0632\u0648\u0631 ${rh.long} \u067E\u0631 \u06C1\u06D2\u06D4`);
  for (const e of chosen) lines.push(sentenceFor(e, sign, e.house));
  const late = chosen.filter((e) => e.day >= 20);
  lines.push(late.length ? `\u0645\u06C1\u06CC\u0646\u06D2 \u06A9\u0627 \u0622\u062E\u0631\u06CC \u062D\u0635\u06C1 \u06C1\u0644\u06A9\u0627 \u0646\u06C1\u06CC\u06BA \u06C1\u06D2 \u2014 ${late.map((e) => day(e.day)).join(" \u0627\u0648\u0631 ")} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u062F\u06BE\u06CC\u0627\u0646 \u0631\u06A9\u06BE\u06CC\u06BA\u06D4` : `\u0645\u06C1\u06CC\u0646\u06D2 \u06A9\u0627 \u0622\u062E\u0631\u06CC \u062D\u0635\u06C1 \u0646\u0633\u0628\u062A\u0627\u064B \u062E\u0627\u0645\u0648\u0634 \u06C1\u06D2 \u2014 \u06CC\u06C1\u06CC \u0648\u0642\u062A \u06C1\u06D2 \u06A9\u06C1 \u062C\u0648 \u0634\u0631\u0648\u0639 \u06A9\u06CC\u0627 \u062A\u06BE\u0627 \u0627\u064F\u0633\u06D2 \u0645\u06A9\u0645\u0644 \u06A9\u0631\u06CC\u06BA\u06D4`);
  lines.push(`\u06CC\u06C1 \u067E\u0648\u0631\u06D2 ${fullName} \u06A9\u0627 \u062D\u0627\u0644 \u06C1\u06D2\u06D4 \u0622\u067E \u06A9\u0627 \u0627\u067E\u0646\u0627 \u0632\u0627\u0626\u0686\u06C1 \u0627\u0650\u0633 \u0633\u06D2 \u0632\u06CC\u0627\u062F\u06C1 \u0635\u0627\u0641 \u0628\u0627\u062A \u06A9\u0631\u062A\u0627 \u06C1\u06D2\u06D4`);
  lines.push(`\u06A9\u0645\u0646\u0679 \u0645\u06CC\u06BA \u0627\u067E\u0646\u0627 ${sysWord} \u0644\u06A9\u06BE\u06CC\u06BA \u2014 \u0645\u06CC\u06BA \u0622\u067E \u06A9\u0648 \u0622\u067E \u06A9\u06CC \u0627\u067E\u0646\u06CC \u0631\u06CC\u0688\u0646\u06AF \u06A9\u0627 \u0644\u0646\u06A9 \u0628\u06BE\u06CC\u062C \u062F\u0648\u06BA \u06AF\u0627\u06D4 \u0627\u06AF\u0644\u06D2 \u0645\u06C1\u06CC\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0641\u0627\u0644\u0648 \u06A9\u0631\u06CC\u06BA\u06D4`);
  const wc = (t2) => t2.trim().split(/\s+/).filter(Boolean).length;
  const GAP = 0.42;
  const spokenLen = (ls) => ls.reduce((a, l) => a + wc(l) / wordsPerSecond + GAP, 0.6);
  let words = lines.reduce((a, l) => a + wc(l), 0);
  while (spokenLen(lines) > duration && chosen.length > 3) {
    const weakest = chosen.reduce((w, e) => e.score < w.score ? e : w);
    const idx = lines.findIndex((l) => l === sentenceFor(weakest, sign, weakest.house));
    if (idx < 0) break;
    lines.splice(idx, 1);
    chosen.splice(chosen.indexOf(weakest), 1);
    words = lines.reduce((a, l) => a + wc(l), 0);
  }
  let t = 0.6;
  const script = lines.map((text) => {
    const start = t;
    const dur = wc(text) / wordsPerSecond;
    t += dur + GAP;
    return { t: +start.toFixed(2), dur: +dur.toFixed(2), text };
  });
  const keyDates = chosen.map((e) => e.day).sort((a, b) => a - b);
  const spoken = lines.join(" ");
  const key = `${S.slug}-${year}-${String(month).padStart(2, "0")}-${system}`;
  return {
    key,
    sign,
    system,
    year,
    month,
    signName: name,
    fullName,
    sysWord,
    glyph: S.glyph,
    slug: S.slug,
    badge: `${S.glyph} ${fullName} \xB7 ${MONTHS_UR[month - 1]} ${year}`,
    accent: sidereal ? "#a796ec" : "#d9b36c",
    headline: head,
    keyDates,
    keyDatesLine: `\u0627\u06C1\u0645 \u062A\u0627\u0631\u06CC\u062E\u06CC\u06BA: ${keyDates.join(" \xB7 ")}`,
    script,
    words,
    estSpeech: +t.toFixed(1),
    events: chosen,
    allEvents: m.events.length,
    ayanamsa: m.ayanamsa,
    spoken,
    hash: hashOf(spoken + head.l1 + head.l2)
  };
}
function hashOf(str) {
  let h1 = 2166136261, h2 = 16777619;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 12);
}
function toSSML(reading, voice = "ur-PK-UzmaNeural") {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = reading.script.map((s, i) => {
    const isHook = i === 0;
    const isCTA = i >= reading.script.length - 2;
    const dated = /^\d+ تاریخ/.test(s.text.trim());
    let rate = "0%", pitch = "0%";
    if (isHook) {
      rate = "-8%";
      pitch = "-2%";
    } else if (isCTA) {
      rate = "-4%";
      pitch = "+3%";
    } else if (dated) {
      rate = "-2%";
    }
    const text = esc(s.text).replace(
      /^(\d+)( تاریخ)/,
      '<emphasis level="strong">$1</emphasis>$2'
    );
    return `    <break time="${isHook ? 250 : 420}ms"/>
    <prosody rate="${rate}" pitch="${pitch}">${text}</prosody>`;
  }).join("\n");
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ur-PK">
  <voice name="${voice}">
    <mstts:express-as style="calm" xmlns:mstts="http://www.w3.org/2001/mstts">
${body}
    </mstts:express-as>
  </voice>
</speak>`;
}
function toCaption(r) {
  const S = SIGNS[r.sign];
  return [
    `${r.glyph} ${r.fullName} \u2014 ${MONTHS_UR[r.month - 1]} ${r.year}`,
    "",
    r.spoken,
    "",
    "\u062A\u0645\u0627\u0645 \u0645\u0642\u0627\u0645\u0627\u062A \u06A9\u06CC\u067E\u0644\u0631 \u0627\u0648\u0631 ELP2000 \u0639\u0646\u0627\u0635\u0631 \u0633\u06D2 \u0634\u0645\u0627\u0631 \u06A9\u06CC\u06D2 \u06AF\u0626\u06D2 \u06C1\u06CC\u06BA\u06D4 \u0622\u0633\u0645\u0627\u0646 \u062C\u06BE\u0648\u0679 \u0646\u06C1\u06CC\u06BA \u0628\u0648\u0644\u062A\u0627\u06D4",
    "",
    `\u06A9\u0645\u0646\u0679 \u0645\u06CC\u06BA \u0627\u067E\u0646\u0627 ${r.sysWord} \u0644\u06A9\u06BE\u06CC\u06BA \u2014 \u0622\u067E \u06A9\u06CC \u0627\u067E\u0646\u06CC \u0631\u06CC\u0688\u0646\u06AF \u06A9\u0627 \u0644\u0646\u06A9 \u0628\u06BE\u06CC\u062C \u062F\u0648\u06BA \u06AF\u0627 \u2726`,
    "",
    `\u0627\u06C1\u0645 \u062A\u0627\u0631\u06CC\u062E\u06CC\u06BA: ${r.keyDates.join(" \xB7 ")}`,
    "",
    `${r.signName} \u0648\u0627\u0644\u0648 \u2014 \u0627\u0650\u0646 \u0645\u06CC\u06BA \u0633\u06D2 \u06A9\u0648\u0646 \u0633\u06CC \u062A\u0627\u0631\u06CC\u062E \u0622\u067E \u067E\u0631 \u0633\u0628 \u0633\u06D2 \u0632\u06CC\u0627\u062F\u06C1 \u0644\u06AF\u06CC\u061F \u0646\u06CC\u0686\u06D2 \u0644\u06A9\u06BE\u06CC\u06BA\u06D4`,
    "",
    [
      "#\u0641\u0627\u0631\u0648\u0642_\u0633\u0679\u0627\u0631\u0632",
      `#${S.en.toLowerCase()}`,
      "#\u0632\u0627\u0626\u0686\u06C1",
      "#\u0639\u0644\u0645_\u0646\u062C\u0648\u0645",
      "#\u0627\u0631\u062F\u0648",
      r.system === "rashi" ? "#\u0631\u0627\u0634\u06CC" : "#\u0628\u0631\u062C",
      "#monthlyhoroscope",
      "#astrology"
    ].join(" ")
  ].join("\n");
}

// src/general.js
var P2 = {
  sun: "\u0633\u0648\u0631\u062C",
  moon: "\u0686\u0627\u0646\u062F",
  mercury: "\u0639\u0637\u0627\u0631\u062F",
  venus: "\u0632\u06C1\u0631\u06C1",
  mars: "\u0645\u0631\u06CC\u062E",
  jupiter: "\u0645\u0634\u062A\u0631\u06CC",
  saturn: "\u0632\u062D\u0644",
  uranus: "\u06CC\u0648\u0631\u06CC\u0646\u0633",
  neptune: "\u0646\u06CC\u067E\u0686\u0648\u0646",
  rahu: "\u0631\u0627\u06C1\u0648",
  ketu: "\u06A9\u06CC\u062A\u0648"
};
var MEAN = {
  sun: "\u0634\u0646\u0627\u062E\u062A \u0627\u0648\u0631 \u0639\u0632\u062A",
  mercury: "\u0628\u0627\u062A \u0686\u06CC\u062A \u0627\u0648\u0631 \u06A9\u0627\u0631\u0648\u0628\u0627\u0631",
  venus: "\u0645\u062D\u0628\u062A \u0627\u0648\u0631 \u067E\u06CC\u0633\u06C1",
  mars: "\u06C1\u0645\u062A \u0627\u0648\u0631 \u062C\u06BE\u06AF\u0691\u0627",
  jupiter: "\u0642\u0633\u0645\u062A \u0627\u0648\u0631 \u06A9\u0634\u0627\u062F\u06AF\u06CC",
  saturn: "\u0645\u062D\u0646\u062A \u0627\u0648\u0631 \u0622\u0632\u0645\u0627\u0626\u0634",
  rahu: "\u0628\u06BE\u0648\u06A9 \u0627\u0648\u0631 \u06C1\u0644\u0686\u0644"
};
function sentence(e, names) {
  const d = String(e.day);
  if (e.kind === "solar_eclipse")
    return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u0633\u0648\u0631\u062C \u06AF\u0631\u06C1\u0646 ${names[e.sign]} \u0645\u06CC\u06BA \u067E\u0691\u062A\u0627 \u06C1\u06D2\u06D4 \u062C\u0633 \u06A9\u0627 \u06CC\u06C1 \u0628\u0631\u062C \u06C1\u06D2 \u0627\u064F\u0633 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0628\u0691\u0627 \u0645\u0648\u0691 \u2014 \u0628\u0627\u0642\u06CC \u0633\u0628 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0628\u06BE\u06CC \u0646\u06CC\u0627 \u0622\u063A\u0627\u0632 \u0627\u0650\u0633\u06CC \u06C1\u0641\u062A\u06D2 \u0686\u06BE\u067E\u0627 \u06C1\u06D2\u06D4`;
  if (e.kind === "lunar_eclipse")
    return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 \u0686\u0627\u0646\u062F \u06AF\u0631\u06C1\u0646 ${names[e.sign]} \u0645\u06CC\u06BA \u06C1\u06D2\u06D4 \u067E\u0631\u0627\u0646\u06CC \u0628\u0627\u062A\u06CC\u06BA \u062E\u062A\u0645 \u06C1\u0648\u062A\u06CC \u06C1\u06CC\u06BA \u2014 \u062C\u0648 \u0628\u0648\u062C\u06BE \u0627\u064F\u0679\u06BE\u0627\u0626\u06D2 \u067E\u06BE\u0631 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u060C \u06CC\u06C1 \u0627\u064F\u062A\u0627\u0631\u0646\u06D2 \u06A9\u0627 \u0648\u0642\u062A \u06C1\u06D2\u06D4`;
  if (e.kind === "station")
    return e.direction === "retrograde" ? `${d} \u062A\u0627\u0631\u06CC\u062E \u0633\u06D2 ${P2[e.body]} \u0627\u064F\u0644\u0679\u0627 \u0686\u0644\u0646\u06D2 \u0644\u06AF\u062A\u0627 \u06C1\u06D2\u06D4 ${MEAN[e.body] || "\u0645\u0639\u0627\u0645\u0644\u0627\u062A"} \u0645\u06CC\u06BA \u062C\u0644\u062F\u06CC \u0646\u06C1 \u06A9\u0631\u06CC\u06BA \u2014 \u067E\u0631\u0627\u0646\u0627 \u06A9\u0627\u0645 \u067E\u06C1\u0644\u06D2\u06D4` : `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${P2[e.body]} \u0633\u06CC\u062F\u06BE\u0627 \u06C1\u0648 \u062C\u0627\u062A\u0627 \u06C1\u06D2\u06D4 \u062C\u0648 \u06A9\u0627\u0645 \u0627\u0679\u06A9\u06D2 \u062A\u06BE\u06D2\u060C \u0627\u0628 \u0686\u0644\u06CC\u06BA \u06AF\u06D2\u06D4`;
  if (e.kind === "ingress")
    return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${P2[e.body]} ${names[e.sign]} \u0645\u06CC\u06BA \u062F\u0627\u062E\u0644 \u06C1\u0648\u062A\u0627 \u06C1\u06D2 \u2014 ${MEAN[e.body] || "\u0645\u0639\u0627\u0645\u0644\u0627\u062A"} \u06A9\u0627 \u0631\u0646\u06AF \u0628\u062F\u0644\u062A\u0627 \u06C1\u06D2\u06D4`;
  if (e.kind === "fullmoon")
    return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0627 \u067E\u0648\u0631\u0627 \u0686\u0627\u0646\u062F ${names[e.sign]} \u0645\u06CC\u06BA \u06C1\u06D2\u06D4 \u062C\u0648 \u0628\u0627\u062A \u062F\u0628\u06CC \u06C1\u0648\u0626\u06CC \u062A\u06BE\u06CC\u060C \u0633\u0627\u0645\u0646\u06D2 \u0622 \u062C\u0627\u0626\u06D2 \u06AF\u06CC\u06D4`;
  if (e.kind === "newmoon")
    return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0627 \u0646\u06CC\u0627 \u0686\u0627\u0646\u062F ${names[e.sign]} \u0645\u06CC\u06BA \u06C1\u06D2 \u2014 \u0646\u0626\u06CC \u0634\u0631\u0648\u0639\u0627\u062A \u06A9\u0627 \u0633\u0628 \u0633\u06D2 \u0635\u0627\u0641 \u062F\u0646\u06D4`;
  if (e.kind === "aspect") {
    const a = P2[e.a], b = P2[e.b];
    if (e.aspect === "opposition") return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} \u0622\u0645\u0646\u06D2 \u0633\u0627\u0645\u0646\u06D2 \u06C1\u06CC\u06BA\u06D4 \u0641\u06CC\u0635\u0644\u06C1 \u0635\u0627\u0641 \u06A9\u0631\u06CC\u06BA \u2014 \u062F\u0631\u0645\u06CC\u0627\u0646 \u06A9\u0627 \u0631\u0627\u0633\u062A\u06C1 \u0646\u06C1\u06CC\u06BA \u0686\u0644\u06D2 \u06AF\u0627\u06D4`;
    if (e.aspect === "square") return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} \u0631\u06AF\u0691 \u06A9\u06BE\u0627\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4 \u062F\u0628\u0627\u0624 \u06A9\u0627 \u062F\u0646 \u06C1\u06D2 \u2014 \u0628\u062D\u062B \u0633\u06D2 \u0628\u0686\u06CC\u06BA\u06D4`;
    if (e.aspect === "trine") return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} \u06A9\u0627 \u0633\u0627\u062A\u06BE \u06C1\u06D2\u06D4 \u06A9\u0627\u0645 \u0622\u0633\u0627\u0646\u06CC \u0633\u06D2 \u0628\u0646\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4`;
    if (e.aspect === "conjunction") return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} \u0627\u06CC\u06A9 \u062C\u06AF\u06C1 \u0622 \u0645\u0644\u062A\u06D2 \u06C1\u06CC\u06BA \u2014 \u0646\u0626\u06CC \u0634\u0631\u0648\u0639\u0627\u062A \u06A9\u0627 \u0632\u0648\u0631\u06D4`;
    return `${d} \u062A\u0627\u0631\u06CC\u062E \u06A9\u0648 ${a} \u0627\u0648\u0631 ${b} \u06A9\u0627 \u0632\u0627\u0648\u06CC\u06C1 \u0628\u0646\u062A\u0627 \u06C1\u06D2 \u2014 \u0645\u0648\u0642\u0639 \u06C1\u0627\u062A\u06BE \u0628\u0691\u06BE\u0627\u0646\u06D2 \u0648\u0627\u0644\u0648\u06BA \u06A9\u0627 \u06C1\u06D2\u06D4`;
  }
  return "";
}
function generalReading(ym, sys, { wordsPerSecond = 2.4, duration = 105 } = {}) {
  const [year, month] = ym.split("-").map(Number);
  const sidereal = sys === "vedic";
  const names = SIGNS.map((s) => sidereal ? s.rashi : s.burj);
  const sysWord = sidereal ? "\u0631\u0627\u0634\u06CC" : "\u0628\u0631\u062C";
  const monthUr = `${MONTHS_UR[month - 1]} ${year}`;
  const m = monthEvents(year, month, sidereal);
  const W = { solar_eclipse: 12, lunar_eclipse: 11, station: 8, ingress: 6, fullmoon: 7, newmoon: 7, aspect: 3 };
  const scored = m.events.map((e) => {
    let s = W[e.kind] || 2;
    if (e.kind === "ingress" && ["jupiter", "saturn", "rahu"].includes(e.body)) s += 3;
    if (e.kind === "aspect") {
      s += e.weight;
      if ([e.a, e.b].includes("saturn")) s += 1;
    }
    return { ...e, s };
  }).sort((a, b) => b.s - a.s);
  const chosen = [];
  const used = /* @__PURE__ */ new Set();
  for (const e of scored) {
    if (used.has(e.day)) continue;
    chosen.push(e);
    used.add(e.day);
    if (chosen.length >= 6) break;
  }
  chosen.sort((a, b) => a.day - b.day);
  const lines = [
    `${monthUr} \u06A9\u0627 \u0622\u0633\u0645\u0627\u0646 \u062E\u0627\u0644\u06CC \u0646\u06C1\u06CC\u06BA \u06C1\u06D2 \u2014 \u0627\u0650\u0633 \u0645\u06C1\u06CC\u0646\u06D2 ${chosen.length} \u0628\u0691\u06D2 \u0645\u0648\u0691 \u0622 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u06D4`,
    `\u0622\u0626\u06CC\u06D2 \u062A\u0627\u0631\u06CC\u062E \u0628\u06C1 \u062A\u0627\u0631\u06CC\u062E \u062F\u06CC\u06A9\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA\u060C \u062A\u0627\u06A9\u06C1 \u06A9\u0648\u0626\u06CC \u062F\u0646 \u0622\u067E \u06A9\u0648 \u062D\u06CC\u0631\u0627\u0646 \u0646\u06C1 \u06A9\u0631\u06D2\u06D4`,
    ...chosen.map((e) => sentence(e, names)),
    `\u0627\u067E\u0646\u06D2 ${sysWord} \u06A9\u0627 \u0627\u0644\u06AF \u062D\u0627\u0644 \u062C\u0627\u0646\u0646\u0627 \u06C1\u06D2\u061F \u06A9\u0645\u0646\u0679 \u0645\u06CC\u06BA \u0627\u067E\u0646\u0627 ${sysWord} \u0644\u06A9\u06BE\u06CC\u06BA \u2014 \u0644\u0646\u06A9 \u0628\u06BE\u06CC\u062C \u062F\u0648\u06BA \u06AF\u0627\u06D4 \u0641\u0627\u0644\u0648 \u06A9\u0631\u06CC\u06BA \u062A\u0627\u06A9\u06C1 \u0627\u06AF\u0644\u0627 \u0645\u06C1\u06CC\u0646\u06C1 \u0646\u06C1 \u0686\u06BE\u0648\u0679\u06D2\u06D4`
  ];
  const wc = (t2) => t2.trim().split(/\s+/).filter(Boolean).length;
  const GAP = 0.42;
  let t = 0.6;
  const caps = lines.map((text) => {
    const at = t;
    t += wc(text) / wordsPerSecond + GAP;
    return { t: +at.toFixed(2), text };
  });
  const dur = Math.min(150, Math.max(90, Math.ceil(t + 6)));
  const keyDates = chosen.map((e) => e.day);
  const big = chosen.reduce((a, b) => b.s > a.s ? b : a);
  return {
    dur,
    caps,
    monthUr,
    badge: `\u0622\u0633\u0645\u0627\u0646 \u06A9\u0627 \u062D\u0627\u0644 \xB7 ${monthUr}`,
    head: `${monthUr} \u06A9\u06D2 ${chosen.length} \u0628\u0691\u06D2 \u0645\u0648\u0691
\u0633\u0628 ${sysWord} \u0648\u0627\u0644\u0648\u06BA \u06A9\u06D2 \u0644\u06CC\u06D2`,
    dates: "\u0627\u06C1\u0645 \u062A\u0627\u0631\u06CC\u062E\u06CC\u06BA: " + keyDates.join(" \xB7 "),
    hashtags: `#astrology #${sidereal ? "vedic #\u0631\u0627\u0634\u06CC" : "zodiac #\u0628\u0631\u062C"} #urdu #\u0632\u0627\u0626\u0686\u06C1 #farooqstars #monthlyhoroscope`,
    social: null,
    hash: hashOf(lines.join(" "))
  };
}
export {
  MONTHS_UR,
  SIGNS,
  buildReading,
  generalReading,
  hashOf,
  monthEvents,
  toCaption,
  toSSML
};
