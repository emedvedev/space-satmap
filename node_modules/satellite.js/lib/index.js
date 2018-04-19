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
exports.ecfToLookAngles = exports.ecfToEci = exports.eciToEcf = exports.eciToGeodetic = exports.geodeticToEcf = exports.degreesLong = exports.degreesLat = exports.dopplerFactor = exports.invjday = exports.jday = exports.gstimeFromDate = exports.gstimeFromJday = exports.gstime = exports.twoline2satrec = exports.sgp4 = exports.propagate = exports.constants = undefined;

var _constants = require('./constants');

var constants = _interopRequireWildcard(_constants);

var _ext = require('./ext');

var _io = require('./io');

var _io2 = _interopRequireDefault(_io);

var _propagation = require('./propagation');

var _dopplerFactor = require('./dopplerFactor');

var _dopplerFactor2 = _interopRequireDefault(_dopplerFactor);

var _transforms = require('./transforms');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var gstimeFromJday = function gstimeFromJday() {
  console.warn('gstimeFromJday is deprecated, use gstime instead.'); // eslint-disable-line no-console
  return _propagation.gstime.apply(undefined, arguments);
};

var gstimeFromDate = function gstimeFromDate() {
  console.warn('gstimeFromDate is deprecated, use gstime instead.'); // eslint-disable-line no-console
  return _propagation.gstime.apply(undefined, arguments);
};

exports.constants = constants;
exports.propagate = _propagation.propagate;
exports.sgp4 = _propagation.sgp4;
exports.twoline2satrec = _io2.default;
exports.gstime = _propagation.gstime;
exports.gstimeFromJday = gstimeFromJday;
exports.gstimeFromDate = gstimeFromDate;
exports.jday = _ext.jday;
exports.invjday = _ext.invjday;
exports.dopplerFactor = _dopplerFactor2.default;
exports.degreesLat = _transforms.degreesLat;
exports.degreesLong = _transforms.degreesLong;
exports.geodeticToEcf = _transforms.geodeticToEcf;
exports.eciToGeodetic = _transforms.eciToGeodetic;
exports.eciToEcf = _transforms.eciToEcf;
exports.ecfToEci = _transforms.ecfToEci;
exports.ecfToLookAngles = _transforms.ecfToLookAngles;