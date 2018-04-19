/*!
 * satellite-js v2.0.0
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/satellite-js
 * License: MIT
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var pi = exports.pi = Math.PI;
var twoPi = exports.twoPi = pi * 2;
var deg2rad = exports.deg2rad = pi / 180.0;
var rad2deg = exports.rad2deg = 180 / pi;
var minutesPerDay = exports.minutesPerDay = 1440.0;
var mu = exports.mu = 398600.5; // in km3 / s2
var earthRadius = exports.earthRadius = 6378.137; // in km
var xke = exports.xke = 60.0 / Math.sqrt(earthRadius * earthRadius * earthRadius / mu);
var tumin = exports.tumin = 1.0 / xke;
var j2 = exports.j2 = 0.00108262998905;
var j3 = exports.j3 = -0.00000253215306;
var j4 = exports.j4 = -0.00000161098761;
var j3oj2 = exports.j3oj2 = j3 / j2;
var x2o3 = exports.x2o3 = 2.0 / 3.0;