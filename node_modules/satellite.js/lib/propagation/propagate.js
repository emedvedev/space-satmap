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
exports.default = propagate;

var _constants = require('../constants');

var _ext = require('../ext');

var _sgp = require('./sgp4');

var _sgp2 = _interopRequireDefault(_sgp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function propagate() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  // Return a position and velocity vector for a given date and time.
  var satrec = args[0];
  var date = Array.prototype.slice.call(args, 1);
  var j = _ext.jday.apply(undefined, _toConsumableArray(date));
  var m = (j - satrec.jdsatepoch) * _constants.minutesPerDay;
  return (0, _sgp2.default)(satrec, m);
}