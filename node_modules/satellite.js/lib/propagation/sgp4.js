/*!
 * satellite-js v2.0.0
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/satellite-js
 * License: MIT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = sgp4;

var _constants = require('../constants');

var _dpper = require('./dpper');

var _dpper2 = _interopRequireDefault(_dpper);

var _dspace = require('./dspace');

var _dspace2 = _interopRequireDefault(_dspace);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*----------------------------------------------------------------------------
 *
 *                             procedure sgp4
 *
 *  this procedure is the sgp4 prediction model from space command. this is an
 *    updated and combined version of sgp4 and sdp4, which were originally
 *    published separately in spacetrack report //3. this version follows the
 *    methodology from the aiaa paper (2006) describing the history and
 *    development of the code.
 *
 *  author        : david vallado                  719-573-2600   28 jun 2005
 *
 *  inputs        :
 *    satrec  - initialised structure from sgp4init() call.
 *    tsince  - time since epoch (minutes)
 *
 *  outputs       :
 *    r           - position vector                     km
 *    v           - velocity                            km/sec
 *  return code - non-zero on error.
 *                   1 - mean elements, ecc >= 1.0 or ecc < -0.001 or a < 0.95 er
 *                   2 - mean motion less than 0.0
 *                   3 - pert elements, ecc < 0.0  or  ecc > 1.0
 *                   4 - semi-latus rectum < 0.0
 *                   5 - epoch elements are sub-orbital
 *                   6 - satellite has decayed
 *
 *  locals        :
 *    am          -
 *    axnl, aynl        -
 *    betal       -
 *    cosim   , sinim   , cosomm  , sinomm  , cnod    , snod    , cos2u   ,
 *    sin2u   , coseo1  , sineo1  , cosi    , sini    , cosip   , sinip   ,
 *    cosisq  , cossu   , sinsu   , cosu    , sinu
 *    delm        -
 *    delomg      -
 *    dndt        -
 *    eccm        -
 *    emsq        -
 *    ecose       -
 *    el2         -
 *    eo1         -
 *    eccp        -
 *    esine       -
 *    argpm       -
 *    argpp       -
 *    omgadf      -
 *    pl          -
 *    r           -
 *    rtemsq      -
 *    rdotl       -
 *    rl          -
 *    rvdot       -
 *    rvdotl      -
 *    su          -
 *    t2  , t3   , t4    , tc
 *    tem5, temp , temp1 , temp2  , tempa  , tempe  , templ
 *    u   , ux   , uy    , uz     , vx     , vy     , vz
 *    inclm       - inclination
 *    mm          - mean anomaly
 *    nm          - mean motion
 *    nodem       - right asc of ascending node
 *    xinc        -
 *    xincp       -
 *    xl          -
 *    xlm         -
 *    mp          -
 *    xmdf        -
 *    xmx         -
 *    xmy         -
 *    nodedf      -
 *    xnode       -
 *    nodep       -
 *    np          -
 *
 *  coupling      :
 *    getgravconst-
 *    dpper
 *    dspace
 *
 *  references    :
 *    hoots, roehrich, norad spacetrack report //3 1980
 *    hoots, norad spacetrack report //6 1986
 *    hoots, schumacher and glover 2004
 *    vallado, crawford, hujsak, kelso  2006
 ----------------------------------------------------------------------------*/
function sgp4(satrec, tsince) {
  var rec = _extends({}, satrec);

  var coseo1 = void 0;
  var sineo1 = void 0;
  var cosip = void 0;
  var sinip = void 0;
  var cosisq = void 0;
  var delm = void 0;
  var delomg = void 0;
  var eo1 = void 0;
  var argpm = void 0;
  var argpp = void 0;
  var su = void 0;
  var t3 = void 0;
  var t4 = void 0;
  var tc = void 0;
  var tem5 = void 0;
  var temp = void 0;
  var tempa = void 0;
  var tempe = void 0;
  var templ = void 0;
  var inclm = void 0;
  var mm = void 0;
  var nm = void 0;
  var nodem = void 0;
  var xincp = void 0;
  var xlm = void 0;
  var mp = void 0;
  var nodep = void 0;

  /* ------------------ set mathematical constants --------------- */
  // sgp4fix divisor for divide by zero check on inclination
  // the old check used 1.0 + cos(pi-1.0e-9), but then compared it to
  // 1.5 e-12, so the threshold was changed to 1.5e-12 for consistency

  var temp4 = 1.5e-12;

  var vkmpersec = _constants.earthRadius * _constants.xke / 60.0;

  // --------------------- clear sgp4 error flag -----------------
  rec.t = tsince;
  rec.error = 0;

  //  ------- update for secular gravity and atmospheric drag -----
  var xmdf = rec.mo + rec.mdot * rec.t;
  var argpdf = rec.argpo + rec.argpdot * rec.t;
  var nodedf = rec.nodeo + rec.nodedot * rec.t;
  argpm = argpdf;
  mm = xmdf;
  var t2 = rec.t * rec.t;
  nodem = nodedf + rec.nodecf * t2;
  tempa = 1.0 - rec.cc1 * rec.t;
  tempe = rec.bstar * rec.cc4 * rec.t;
  templ = rec.t2cof * t2;

  if (rec.isimp !== 1) {
    delomg = rec.omgcof * rec.t;
    //  sgp4fix use mutliply for speed instead of pow
    var delmtemp = 1.0 + rec.eta * Math.cos(xmdf);
    delm = rec.xmcof * (delmtemp * delmtemp * delmtemp - rec.delmo);
    temp = delomg + delm;
    mm = xmdf + temp;
    argpm = argpdf - temp;
    t3 = t2 * rec.t;
    t4 = t3 * rec.t;
    tempa = tempa - rec.d2 * t2 - rec.d3 * t3 - rec.d4 * t4;
    tempe += rec.bstar * rec.cc5 * (Math.sin(mm) - rec.sinmao);
    templ = templ + rec.t3cof * t3 + t4 * (rec.t4cof + rec.t * rec.t5cof);
  }
  nm = rec.no;
  var em = rec.ecco;
  inclm = rec.inclo;
  if (rec.method === 'd') {
    tc = rec.t;

    var dspaceOptions = {
      irez: rec.irez,
      d2201: rec.d2201,
      d2211: rec.d2211,
      d3210: rec.d3210,
      d3222: rec.d3222,
      d4410: rec.d4410,
      d4422: rec.d4422,
      d5220: rec.d5220,
      d5232: rec.d5232,
      d5421: rec.d5421,
      d5433: rec.d5433,
      dedt: rec.dedt,
      del1: rec.del1,
      del2: rec.del2,
      del3: rec.del3,
      didt: rec.didt,
      dmdt: rec.dmdt,
      dnodt: rec.dnodt,
      domdt: rec.domdt,
      argpo: rec.argpo,
      argpdot: rec.argpdot,
      t: rec.t,
      tc: tc,
      gsto: rec.gsto,
      xfact: rec.xfact,
      xlamo: rec.xlamo,
      no: rec.no,
      atime: rec.atime,
      em: em,
      argpm: argpm,
      inclm: inclm,
      xli: rec.xli,
      mm: mm,
      xni: rec.xni,
      nodem: nodem,
      nm: nm
    };

    var dspaceResult = (0, _dspace2.default)(dspaceOptions);

    em = dspaceResult.em;
    argpm = dspaceResult.argpm;
    inclm = dspaceResult.inclm;
    mm = dspaceResult.mm;
    nodem = dspaceResult.nodem;
    nm = dspaceResult.nm;
  }

  if (nm <= 0.0) {
    // printf("// error nm %f\n", nm);
    rec.error = 2;
    // sgp4fix add return
    return [false, false];
  }

  var am = Math.pow(_constants.xke / nm, _constants.x2o3) * tempa * tempa;
  nm = _constants.xke / Math.pow(am, 1.5);
  em -= tempe;

  // fix tolerance for error recognition
  // sgp4fix am is fixed from the previous nm check
  if (em >= 1.0 || em < -0.001) {
    // || (am < 0.95)
    // printf("// error em %f\n", em);
    rec.error = 1;
    // sgp4fix to return if there is an error in eccentricity
    return [false, false];
  }

  //  sgp4fix fix tolerance to avoid a divide by zero
  if (em < 1.0e-6) {
    em = 1.0e-6;
  }
  mm += rec.no * templ;
  xlm = mm + argpm + nodem;

  nodem %= _constants.twoPi;
  argpm %= _constants.twoPi;
  xlm %= _constants.twoPi;
  mm = (xlm - argpm - nodem) % _constants.twoPi;

  // ----------------- compute extra mean quantities -------------
  var sinim = Math.sin(inclm);
  var cosim = Math.cos(inclm);

  // -------------------- add lunar-solar periodics --------------
  var ep = em;
  xincp = inclm;
  argpp = argpm;
  nodep = nodem;
  mp = mm;
  sinip = sinim;
  cosip = cosim;
  if (rec.method === 'd') {
    var dpperParameters = {
      inclo: rec.inclo,
      init: 'n',
      ep: ep,
      inclp: xincp,
      nodep: nodep,
      argpp: argpp,
      mp: mp,
      opsmode: rec.operationmod
    };

    var dpperResult = (0, _dpper2.default)(rec, dpperParameters);

    ep = dpperResult.ep;
    nodep = dpperResult.nodep;
    argpp = dpperResult.argpp;
    mp = dpperResult.mp;


    xincp = dpperResult.inclp;

    if (xincp < 0.0) {
      xincp = -xincp;
      nodep += _constants.pi;
      argpp -= _constants.pi;
    }
    if (ep < 0.0 || ep > 1.0) {
      //  printf("// error ep %f\n", ep);
      rec.error = 3;
      //  sgp4fix add return
      return [false, false];
    }
  }

  //  -------------------- long period periodics ------------------
  if (rec.method === 'd') {
    sinip = Math.sin(xincp);
    cosip = Math.cos(xincp);
    rec.aycof = -0.5 * _constants.j3oj2 * sinip;

    //  sgp4fix for divide by zero for xincp = 180 deg
    if (Math.abs(cosip + 1.0) > 1.5e-12) {
      rec.xlcof = -0.25 * _constants.j3oj2 * sinip * (3.0 + 5.0 * cosip) / (1.0 + cosip);
    } else {
      rec.xlcof = -0.25 * _constants.j3oj2 * sinip * (3.0 + 5.0 * cosip) / temp4;
    }
  }

  var axnl = ep * Math.cos(argpp);
  temp = 1.0 / (am * (1.0 - ep * ep));
  var aynl = ep * Math.sin(argpp) + temp * rec.aycof;
  var xl = mp + argpp + nodep + temp * rec.xlcof * axnl;

  // --------------------- solve kepler's equation ---------------
  var u = (xl - nodep) % _constants.twoPi;
  eo1 = u;
  tem5 = 9999.9;
  var ktr = 1;

  //    sgp4fix for kepler iteration
  //    the following iteration needs better limits on corrections
  while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
    sineo1 = Math.sin(eo1);
    coseo1 = Math.cos(eo1);
    tem5 = 1.0 - coseo1 * axnl - sineo1 * aynl;
    tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;
    if (Math.abs(tem5) >= 0.95) {
      if (tem5 > 0.0) {
        tem5 = 0.95;
      } else {
        tem5 = -0.95;
      }
    }
    eo1 += tem5;
    ktr += 1;
  }

  //  ------------- short period preliminary quantities -----------
  var ecose = axnl * coseo1 + aynl * sineo1;
  var esine = axnl * sineo1 - aynl * coseo1;
  var el2 = axnl * axnl + aynl * aynl;
  var pl = am * (1.0 - el2);
  if (pl < 0.0) {
    //  printf("// error pl %f\n", pl);
    rec.error = 4;
    //  sgp4fix add return
    return [false, false];
  }

  var rl = am * (1.0 - ecose);
  var rdotl = Math.sqrt(am) * esine / rl;
  var rvdotl = Math.sqrt(pl) / rl;
  var betal = Math.sqrt(1.0 - el2);
  temp = esine / (1.0 + betal);
  var sinu = am / rl * (sineo1 - aynl - axnl * temp);
  var cosu = am / rl * (coseo1 - axnl + aynl * temp);
  su = Math.atan2(sinu, cosu);
  var sin2u = (cosu + cosu) * sinu;
  var cos2u = 1.0 - 2.0 * sinu * sinu;
  temp = 1.0 / pl;
  var temp1 = 0.5 * _constants.j2 * temp;
  var temp2 = temp1 * temp;

  // -------------- update for short period periodics ------------
  if (rec.method === 'd') {
    cosisq = cosip * cosip;
    rec.con41 = 3.0 * cosisq - 1.0;
    rec.x1mth2 = 1.0 - cosisq;
    rec.x7thm1 = 7.0 * cosisq - 1.0;
  }

  var mrt = rl * (1.0 - 1.5 * temp2 * betal * rec.con41) + 0.5 * temp1 * rec.x1mth2 * cos2u;
  su -= 0.25 * temp2 * rec.x7thm1 * sin2u;
  var xnode = nodep + 1.5 * temp2 * cosip * sin2u;
  var xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
  var mvt = rdotl - nm * temp1 * rec.x1mth2 * sin2u / _constants.xke;
  var rvdot = rvdotl + nm * temp1 * (rec.x1mth2 * cos2u + 1.5 * rec.con41) / _constants.xke;

  // --------------------- orientation vectors -------------------
  var sinsu = Math.sin(su);
  var cossu = Math.cos(su);
  var snod = Math.sin(xnode);
  var cnod = Math.cos(xnode);
  var sini = Math.sin(xinc);
  var cosi = Math.cos(xinc);
  var xmx = -snod * cosi;
  var xmy = cnod * cosi;
  var ux = xmx * sinsu + cnod * cossu;
  var uy = xmy * sinsu + snod * cossu;
  var uz = sini * sinsu;
  var vx = xmx * cossu - cnod * sinsu;
  var vy = xmy * cossu - snod * sinsu;
  var vz = sini * cossu;

  // --------- position and velocity (in km and km/sec) ----------
  var r = {
    x: mrt * ux * _constants.earthRadius,
    y: mrt * uy * _constants.earthRadius,
    z: mrt * uz * _constants.earthRadius
  };
  var v = {
    x: (mvt * ux + rvdot * vx) * vkmpersec,
    y: (mvt * uy + rvdot * vy) * vkmpersec,
    z: (mvt * uz + rvdot * vz) * vkmpersec
  };

  // sgp4fix for decaying satellites
  if (mrt < 1.0) {
    // printf("// decay condition %11.6f \n",mrt);
    rec.error = 6;
    return {
      position: false,
      velocity: false,
      satrec: rec
    };
  }

  return {
    position: r,
    velocity: v,
    satrec: rec
  };
}