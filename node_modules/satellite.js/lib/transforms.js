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
exports.degreesLat = degreesLat;
exports.degreesLong = degreesLong;
exports.geodeticToEcf = geodeticToEcf;
exports.eciToGeodetic = eciToGeodetic;
exports.ecfToEci = ecfToEci;
exports.eciToEcf = eciToEcf;
exports.ecfToLookAngles = ecfToLookAngles;

var _constants = require('./constants');

function radiansToDegrees(radians) {
  return radians * _constants.rad2deg;
}

function degreesLat(radians) {
  if (radians < -_constants.pi / 2 || radians > _constants.pi / 2) {
    throw new RangeError('Latitude radians must be in range [-pi/2; pi/2].');
  }
  return radiansToDegrees(radians);
}

function degreesLong(radians) {
  if (radians < -_constants.pi || radians > _constants.pi) {
    throw new RangeError('Longitude radians must be in range [-pi; pi].');
  }
  return radiansToDegrees(radians);
}

function geodeticToEcf(geodeticCoords) {
  var longitude = geodeticCoords.longitude,
      latitude = geodeticCoords.latitude,
      height = geodeticCoords.height;


  var a = 6378.137;
  var b = 6356.7523142;
  var f = (a - b) / a;
  var e2 = 2 * f - f * f;
  var normal = a / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));

  var x = (normal + height) * Math.cos(latitude) * Math.cos(longitude);
  var y = (normal + height) * Math.cos(latitude) * Math.sin(longitude);
  var z = (normal * (1 - e2) + height) * Math.sin(latitude);

  return {
    x: x,
    y: y,
    z: z
  };
}

function eciToGeodetic(eciCoords, gmst) {
  // http://www.celestrak.com/columns/v02n03/
  var a = 6378.137;
  var b = 6356.7523142;
  var R = Math.sqrt(eciCoords.x * eciCoords.x + eciCoords.y * eciCoords.y);
  var f = (a - b) / a;
  var e2 = 2 * f - f * f;
  var longitude = Math.atan2(eciCoords.y, eciCoords.x) - gmst;
  var kmax = 20;
  var k = 0;
  var latitude = Math.atan2(eciCoords.z, Math.sqrt(eciCoords.x * eciCoords.x + eciCoords.y * eciCoords.y));
  var C = void 0;
  while (k < kmax) {
    C = 1 / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));
    latitude = Math.atan2(eciCoords.z + a * C * e2 * Math.sin(latitude), R);
    k += 1;
  }
  var height = R / Math.cos(latitude) - a * C;
  return { longitude: longitude, latitude: latitude, height: height };
}

function ecfToEci(ecfCoords, gmst) {
  // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
  //
  // [X]     [C -S  0][X]
  // [Y]  =  [S  C  0][Y]
  // [Z]eci  [0  0  1][Z]ecf
  //
  var X = ecfCoords.x * Math.cos(gmst) - ecfCoords.y * Math.sin(gmst);
  var Y = ecfCoords.x * Math.sin(gmst) + ecfCoords.y * Math.cos(gmst);
  var Z = ecfCoords.z;
  return { x: X, y: Y, z: Z };
}

function eciToEcf(eciCoords, gmst) {
  // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
  //
  // [X]     [C -S  0][X]
  // [Y]  =  [S  C  0][Y]
  // [Z]eci  [0  0  1][Z]ecf
  //
  //
  // Inverse:
  // [X]     [C  S  0][X]
  // [Y]  =  [-S C  0][Y]
  // [Z]ecf  [0  0  1][Z]eci

  var x = eciCoords.x * Math.cos(gmst) + eciCoords.y * Math.sin(gmst);
  var y = eciCoords.x * -Math.sin(gmst) + eciCoords.y * Math.cos(gmst);
  var z = eciCoords.z;


  return {
    x: x,
    y: y,
    z: z
  };
}

function topocentric(observerCoords, satelliteCoords) {
  // http://www.celestrak.com/columns/v02n02/
  // TS Kelso's method, except I'm using ECF frame
  // and he uses ECI.

  var longitude = observerCoords.longitude,
      latitude = observerCoords.latitude;


  var observerEcf = geodeticToEcf(observerCoords);

  var rx = satelliteCoords.x - observerEcf.x;
  var ry = satelliteCoords.y - observerEcf.y;
  var rz = satelliteCoords.z - observerEcf.z;

  var topS = Math.sin(latitude) * Math.cos(longitude) * rx + Math.sin(latitude) * Math.sin(longitude) * ry - Math.cos(latitude) * rz;

  var topE = -Math.sin(longitude) * rx + Math.cos(longitude) * ry;

  var topZ = Math.cos(latitude) * Math.cos(longitude) * rx + Math.cos(latitude) * Math.sin(longitude) * ry + Math.sin(latitude) * rz;

  return { topS: topS, topE: topE, topZ: topZ };
}

/**
 * @param {Object} tc
 * @param {Number} tc.topS Positive horizontal vector S due south.
 * @param {Number} tc.topE Positive horizontal vector E due east.
 * @param {Number} tc.topZ Vector Z normal to the surface of the earth (up).
 * @returns {Object}
 */
function topocentricToLookAngles(tc) {
  var topS = tc.topS,
      topE = tc.topE,
      topZ = tc.topZ;

  var rangeSat = Math.sqrt(topS * topS + topE * topE + topZ * topZ);
  var El = Math.asin(topZ / rangeSat);
  var Az = Math.atan2(-topE, topS) + _constants.pi;

  return {
    azimuth: Az,
    elevation: El,
    rangeSat: rangeSat // Range in km
  };
}

function ecfToLookAngles(observerCoordsEcf, satelliteCoordsEcf) {
  var topocentricCoords = topocentric(observerCoordsEcf, satelliteCoordsEcf);
  return topocentricToLookAngles(topocentricCoords);
}