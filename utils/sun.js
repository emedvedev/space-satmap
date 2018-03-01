// Most of this code has been adapted from n2yo.com.
// Wouldn't be possible without them!

function julianDate(date) {
  return (date.getTime() / 86400000) + 2440587.5;
}

function frac(x) {
  x -= Math.floor(x);
  if (x < 0) x += 1.0;
  return x;
}

function sunDecRA(what, jd) {
  const PI2 = 2 * Math.PI;
  const cosEps = 0.917482;
  const sinEps = 0.397778;
  const T = (jd - 2451545.0) / 36525.0; // number of Julian centuries since Jan 1, 2000, 0 GMT
  const M = PI2 * frac(0.993133 + 99.997361 * T);
  const DL = 6893.0 * Math.sin(M) + 72.0 * Math.sin(2.0 * M);
  const L = PI2 * frac(0.7859453 + M / PI2 + (6191.2 * T + DL) / 1296000);
  const SL = Math.sin(L);
  const X = Math.cos(L);
  const Y = cosEps * SL;
  const Z = sinEps * SL;
  const R = Math.sqrt(1.0 - Z * Z);
  const dec = (360.0 / PI2) * Math.atan(Z / R);
  let ra = (48.0 / PI2) * Math.atan(Y / (X + R));
  if (ra < 0) ra += 24.0;
  if (what === 1) return dec; return ra;
}

function dayofyear(d) {
  const yn = d.getFullYear();
  const mn = d.getMonth();
  const dn = d.getDate();
  const d1 = new Date(yn, 0, 1, 12, 0, 0); // noon on Jan. 1
  const d2 = new Date(yn, mn, dn, 12, 0, 0); // noon on input date
  const ddiff = Math.round((d2 - d1) / 864e5);
  return ddiff + 1;
}

export function getSunPosition(date) {
  const datetime = date || new Date();

  const j = julianDate(datetime);
  const dec = sunDecRA(1, j);

  const LT = datetime.getUTCHours() + datetime.getUTCMinutes() / 60;

  const DY = dayofyear(datetime);
  const g = (360 / 365.25) * (DY + LT / 24);
  const TC = 0.004297 + 0.107029
             * Math.cos(g * Math.PI / 180)
             - 1.837877
             * Math.sin(g * Math.PI / 180)
             - 0.837378
             * Math.cos(2 * g * Math.PI / 180)
             - 2.340475
             * Math.sin(2 * g * Math.PI / 180);
  const SHA = (LT - 12) * 15 + TC;

  return { lat: dec, lng: -SHA };
}

export function getEclipseOverlay(date) {
  const datetime = date || new Date();
  const sunPosition = getSunPosition(datetime);

  return {
    center: {
      lat: sunPosition.lat * -1,
      lng: sunPosition.lng + 180,
    },
    radius: (6375 * 3141.59265) / 2,
  };
}

