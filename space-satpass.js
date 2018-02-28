// TODO: Is the pass visible?
// TODO: No passes
// TODO: Stationary
// TODO: Styling
// TODO: Update after a pass

// TODO: Submit a pass PR to satellite.js
// TODO: Next N passes
// TODO: Next N visible passes vs next N all passes (setting)

import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';

import '/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-if.js';
import { propagate, eciToEcf, ecfToLookAngles, gstime } from '/node_modules/satellite.js/dist/satellite.es.js';
import satIcons from './space-icons.js';
import SunCalc from '/utils/suncalc.js';

class SpaceSatpass extends Element {
  static get properties() {
    return {
      groundLatitude: Number,
      groundLongitude: Number,
      roughLatitude: { type: Number, computed: '_roughCoords(groundLatitude)' },
      roughLongitude: { type: Number, computed: '_roughCoords(groundLongitude)' },
      satellite: Object,
      passes: { type: Array, value: [] },
      icon: { type: String, computed: '_icon(satellite)' },
      stationary: { type: Boolean, value: false },
    };
  }

  static get observers() {
    return [
      '_getNextPasses(roughLatitude, roughLongitude, satellite)',
    ];
  }

  static formatAzimuth(azimuth) {
    const value = Math.round(azimuth * (180 / Math.PI));
    const formatted = ['N', `${value}°`];

    if (value >= 0 && value <= 22.5) {
      formatted[0] = 'N';
    } else if (value <= 67.5) {
      formatted[0] = 'NE';
    } else if (value <= 112.5) {
      formatted[0] = 'E';
    } else if (value <= 157.5) {
      formatted[0] = 'SE';
    } else if (value <= 202.5) {
      formatted[0] = 'S';
    } else if (value <= 247.5) {
      formatted[0] = 'SW';
    } else if (value <= 292.5) {
      formatted[0] = 'W';
    } else if (value <= 337.5) {
      formatted[0] = 'NW';
    } else {
      formatted[0] = 'N';
    }

    return formatted;
  }

  ready() {
    super.ready();
    this.tickTimer = setInterval(this._tick.bind(this), 1000);
  }

  _roughCoords(coord) {
    return coord.toFixed(3);
  }

  _tick() {
    const now = Date.now();
    for (let i = 0; i < this.passes.length; i++) {
      const millisUntilPass = this.passes[i].start.date.getTime() - now;
      if (millisUntilPass <= 0) {
        this.set(`passes.${i}.now`, true);
      } else {
        const timeUntilPass = new Date(millisUntilPass);
        const hh = (`0${timeUntilPass.getUTCHours()}`).slice(-2);
        const mm = (`0${timeUntilPass.getUTCMinutes()}`).slice(-2);
        const ss = (`0${timeUntilPass.getUTCSeconds()}`).slice(-2);
        this.set(`passes.${i}.now`, false);
        this.set(`passes.${i}.until`, `${hh}:${mm}:${ss}`);
      }
    }
  }

  _icon(satellite) {
    return satIcons[satellite.icon].url;
  }

  _getNextPasses(roughLatitude, roughLongitude, satellite) {
    console.log(roughLatitude, roughLongitude, satellite);
    if (roughLatitude && roughLongitude && satellite) {
      const largeStep = 30000;
      const maxIterations = 5760; // look for passes within the next 48h

      const smallStep = 1000;
      const maxBoundedIterations = 86400 * 2; // detect passes of up to 24h in duration

      const minAltitude = 10;
      const maxPasses = 1;
      const now = new Date().getTime();
      const currentPass = [];

      const groundStation = {
        latitude: roughLatitude * (Math.PI / 180),
        longitude: roughLongitude * (Math.PI / 180),
        height: 1,
      };

      this.passes = [];

      let currentTime = now;
      let currentStep = 0;
      let passRough = null;

      while (currentStep < maxIterations) {
        const t = new Date(currentTime);
        const gmst = gstime(t);
        const positionEci = propagate(satellite.satrec, t).position;
        const positionEcf = eciToEcf(positionEci, gmst);
        const lookAngles = ecfToLookAngles(groundStation, positionEcf);
        const elevationDeg = lookAngles.elevation * (180 / Math.PI);

        if (elevationDeg > 0) {
          currentTime -= largeStep;
          passRough = currentTime;
          break;
        }

        currentStep += 1;
        currentTime += largeStep;
      }

      if (passRough) {
        if (currentTime < now) {
          console.log(`pass in progress for ${satellite.name}`);
          currentStep = 0;
          while (currentStep < maxIterations) {
            const t = new Date(currentTime);
            const gmst = gstime(t);
            const positionEci = propagate(satellite.satrec, t).position;
            const positionEcf = eciToEcf(positionEci, gmst);
            const lookAngles = ecfToLookAngles(groundStation, positionEcf);
            const elevationDeg = lookAngles.elevation * (180 / Math.PI);

            if (elevationDeg <= 0) {
              currentTime -= largeStep;
              passRough = currentTime;
              break;
            }

            currentStep += 1;
            currentTime -= largeStep;
          }
        }

        currentStep = 0;

        while (currentStep < maxBoundedIterations) {
          currentTime += smallStep;
          const t = new Date(currentTime);
          const gmst = gstime(t);
          const positionEci = propagate(satellite.satrec, t).position;
          const positionEcf = eciToEcf(positionEci, gmst);
          const lookAngles = ecfToLookAngles(groundStation, positionEcf);
          const elevationDeg = lookAngles.elevation * (180 / Math.PI);

          if (elevationDeg > 0) {
            const sun = SunCalc.getPosition(t, roughLatitude, roughLongitude).altitude * (180 / Math.PI);
            const sunlit = sun > -18 && sun < -6;
            const eclipsed = null;
            currentPass.push([elevationDeg, lookAngles.azimuth, t, sunlit]);
          } else if (currentPass.length) {
            const pass = {};
            let duration = null;
            const sunlitRate = [0, 0];

            while (currentPass.length) {
              const step = currentPass.pop();
              sunlitRate[0] += 1;
              if (step[3]) {
                sunlitRate[1] += 1;
              }
              pass.start = { date: step[2], azimuth: step[1] };
              if (!pass.end) {
                pass.end = { date: step[2], azimuth: step[1] };
              }
              if (!pass.max || pass.max.elevation < step[0]) {
                pass.max = { date: step[2], azimuth: step[1], elevation: step[0] };
              }
              duration = pass.end.date.getTime() - pass.start.date.getTime();
            }
            duration = new Date(duration);

            if (pass.max.elevation > minAltitude) {
              console.log(pass.start.date, pass.end.date, sunlitRate);
              pass.start.azimuth = SpaceSatpass.formatAzimuth(pass.start.azimuth);
              pass.start.dateString = `${(`0${pass.start.date.getHours()}`).slice(-2)}:${(`0${pass.start.date.getMinutes()}`).slice(-2)}`;

              pass.max.azimuth = SpaceSatpass.formatAzimuth(pass.max.azimuth);
              pass.max.dateString = `${(`0${pass.max.date.getHours()}`).slice(-2)}:${(`0${pass.max.date.getMinutes()}`).slice(-2)}`;
              pass.max.elevation = Math.round(pass.max.elevation);

              pass.end.azimuth = SpaceSatpass.formatAzimuth(pass.end.azimuth);
              pass.end.dateString = `${(`0${pass.end.date.getHours()}`).slice(-2)}:${(`0${pass.end.date.getMinutes()}`).slice(-2)}`;

              const durationElements = [];
              if (duration.getUTCHours()) {
                durationElements.push(`${duration.getUTCHours()}h`);
              }
              if (duration.getUTCMinutes()) {
                durationElements.push(`${duration.getUTCMinutes()}m`);
              }
              if (!duration.getUTCHours()) {
                durationElements.push(`${duration.getUTCSeconds()}s`);
              }
              pass.duration = durationElements.join(' ');

              this.set('passes.0', pass);
            } else {
              console.log(`pass discarded for ${satellite.name}`);
            }

            if (this.passes.length >= maxPasses) {
              break;
            }
          }

          currentStep += 1;
        }
      }

      // Special case: stationary
    }
  }

  static get template() {
    return html`
      <style include="paper-item-styles">
        :host {
          width: 250px;
          box-sizing: border-box;
          @apply --paper-font-common-base;
          color: rgba(0, 0, 0, .87);
        }
        paper-card {
          width: 100%;
          box-sizing: border-box;
        }
        .pass-header {
          @apply --paper-font-headline;
          line-height: 32px;
          margin: -16px -16px 20px;
          padding: 13px 16px 12px;
          /*border-bottom: 1px solid rgba(0, 0, 0, .12);*/
        }
        .pass-header img {
          vertical-align: middle;
          display: inline-block;
          margin-top: -4px;
          margin-right: 5px;
        }
        .pass-position {
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          font-size: 14px;
        }
        .pass-stages {
          display: flex;
          justify-content: space-between;
          margin-top: 67px;
          box-sizing: border-box;
          border-top: 2px solid #ccc;
        }
        .pass-position::before {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 125px;
          border: 1px dashed #ccc;
          content: '';
          left: 9px;
          top: 12px;
          right: 0;
          box-sizing: border-box;
          transform: rotate(90deg);
        }
        .pass-start,
        .pass-max,
        .pass-end {
          z-index: 2;
          width: 25%;
          position: relative;
          background: white;
          text-align: center;
        }
        .pass-max {
          border-color: white;
        }
        .pass-start::after,
        .pass-max::after,
        .pass-end::after {
          content: '';
          position: absolute;
          left: 50%;
          margin-left: -12px;
          top: 0;
          margin-top: -12px;
          width: 24px;
          height: 24px;
          background-color: white;
          background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIxLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NzAgNDcwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA0NzAgNDcwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0FBQUFBQTt9Cjwvc3R5bGU+CjxnPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ2Ny44LDM3Ny4zbC0xMjItMTIyYy0yLjktMi45LTcuNy0yLjktMTAuNiwwbC0zMC41LDMwLjVsLTEwLjYtMTAuNmw4MC4xLTgwLjFjMi45LTIuOSwyLjktNy43LDAtMTAuNgoJCWwtMy43LTMuN2wzMC4xLTMwLjFjMS42LTEuNiwyLjQtMy43LDIuMi01LjlsLTMuMS0zNi42Yy0wLjUtNS41LTMuNy0xMi4zLTcuNi0xNi4zTDM3OC4xLDc4Yy0zLjktMy45LTEwLjctNy4xLTE2LjMtNy42bC0zNi42LTMuMQoJCWMtMC4xLDAtMC4xLDAtMC4yLDBjLTAuMiwwLTAuNCwwLTAuNiwwYy0wLjEsMC0wLjIsMC0wLjMsMGMtMC4yLDAtMC4zLDAtMC41LDBjLTAuMSwwLTAuMiwwLTAuMywwYy0wLjIsMC0wLjMsMC4xLTAuNSwwLjEKCQljLTAuMSwwLTAuMiwwLTAuMywwLjFjLTAuMiwwLTAuMywwLjEtMC41LDAuMWMtMC4xLDAtMC4yLDAuMS0wLjMsMC4xYy0wLjIsMC4xLTAuMywwLjEtMC41LDAuMmMtMC4xLDAtMC4xLDAuMS0wLjIsMC4xCgkJYy0wLjIsMC4xLTAuMywwLjItMC41LDAuM2MtMC4xLDAtMC4xLDAuMS0wLjIsMC4xYy0wLjIsMC4xLTAuMywwLjItMC41LDAuNGMtMC4xLDAtMC4xLDAuMS0wLjIsMC4xYy0wLjIsMC4yLTAuNCwwLjMtMC42LDAuNQoJCWwtMzAuMSwzMC4xbC0zLjctMy43Yy0yLjktMi45LTcuNy0yLjktMTAuNiwwbC04MC4xLDgwLjFsLTEwLjYtMTAuNmwzMC41LTMwLjVjMi45LTIuOSwyLjktNy43LDAtMTAuNmwtMTIyLTEyMgoJCWMtMi45LTIuOS03LjctMi45LTEwLjYsMEwxMC41LDczLjhjLTIuOSwyLjktMi45LDcuNywwLDEwLjZsMTIyLDEyMmMxLjUsMS41LDMuNCwyLjIsNS4zLDIuMnMzLjgtMC43LDUuMy0yLjJsMzAuNS0zMC41bDEwLjYsMTAuNgoJCWwtNzYuOSw3Ni45Yy0yLjksMi45LTIuOSw3LjcsMCwxMC42bDI2LjcsMjYuN2wtMTIsMTJjLTI1LjgtMTguNS01Ni42LTI4LjYtODktMjguNmMtOC45LDAtMTcuOSwwLjgtMjYuNywyLjMKCQljLTIuOCwwLjUtNSwyLjUtNS45LDUuMXMtMC4xLDUuNiwxLjgsNy42bDQwLjMsNDAuM2wtNi43LDY1LjNjLTAuMiwyLjIsMC42LDQuNSwyLjIsNi4xbDIxLjIsMjEuMmMxLjQsMS40LDMuMywyLjIsNS4zLDIuMgoJCWMwLjMsMCwwLjUsMCwwLjgsMGw2NS4zLTYuN2w0MC4zLDQwLjNjMS40LDEuNCwzLjMsMi4yLDUuMywyLjJjMC44LDAsMS41LTAuMSwyLjMtMC4zYzIuNy0wLjgsNC42LTMuMSw1LjEtNS45CgkJYzYuOS0zOS4xLTEuOC03OS0yMy4zLTExMS40bDEyLjctMTIuN2wyMy4xLDIzLjFjMS41LDEuNSwzLjQsMi4yLDUuMywyLjJzMy44LTAuNyw1LjMtMi4ybDc2LjktNzYuOWwxMC42LDEwLjZsLTMwLjUsMzAuNQoJCWMtMi45LDIuOS0yLjksNy43LDAsMTAuNmwxMjIsMTIyYzEuNSwxLjUsMy40LDIuMiw1LjMsMi4yczMuOC0wLjcsNS4zLTIuMmw3MS42LTcxLjZDNDcwLjcsMzg1LDQ3MC43LDM4MC4zLDQ2Ny44LDM3Ny4zCgkJTDQ2Ny44LDM3Ny4zeiBNMTk4LjgsMTI5LjVsLTEzLjMsMTMuM2wtNTAuNC01MC40bDEzLjMtMTMuM0wxOTguOCwxMjkuNUwxOTguOCwxMjkuNXogTTI2LjQsNzkuMWwxMy4zLTEzLjNsMzQuNSwzNC41CgkJYzEuNSwxLjUsMy40LDIuMiw1LjMsMi4yczMuOC0wLjcsNS4zLTIuMmMyLjktMi45LDIuOS03LjcsMC0xMC42TDUwLjMsNTUuMkw2My41LDQyTDk4LDc2LjVjMS41LDEuNSwzLjQsMi4yLDUuMywyLjIKCQlzMy44LTAuNyw1LjMtMi4yYzIuOS0yLjksMi45LTcuNywwLTEwLjZMNzQuMSwzMS40bDEzLjMtMTMuM2w1MC40LDUwLjRsLTE4LjYsMTguNmMwLDAtMjMuOSwyMy45LTIzLjksMjMuOQoJCWMwLDAtMTguNiwxOC42LTE4LjYsMTguNkwyNi40LDc5LjFMMjYuNCw3OS4xeiBNMTM3LjgsMTkwLjVsLTUwLjQtNTAuNGwxMy4zLTEzLjNsNTAuNCw1MC40TDEzNy44LDE5MC41TDEzNy44LDE5MC41eiBNMTY4LjMsMTYwCgkJYzAsMC02LjYsNi42LTYuNiw2LjZsLTUwLjQtNTAuNGwxMy4zLTEzLjNsNTAuNCw1MC40TDE2OC4zLDE2MEwxNjguMywxNjB6IE0zNjAuNSw4NS40YzIsMC4yLDUuNSwxLjgsNi45LDMuMmwxMy45LDEzLjkKCQljMS40LDEuNCwzLjEsNSwzLjIsNi45bDIuOCwzMy4xbC0yNy42LDI3LjZsLTYwLTYwbDI0LjgtMjQuOGgwIE02Ny4yLDQxOUw1MSw0MDIuOGw1LjEtNDkuNmw2MC43LDYwLjcKCQlDMTE2LjgsNDEzLjksNjcuMiw0MTksNjcuMiw0MTl6IE0xNzAuNSw0NDYuM0wyMy43LDI5OS41YzMuMS0wLjIsNi4xLTAuMyw5LjItMC4zYzMxLjIsMCw2MC44LDEwLjMsODQuOSwyOS4yCgkJYzAuMSwwLDAuMSwwLjEsMC4yLDAuMWM0LjMsMy40LDguNSw3LjEsMTIuNCwxMUMxNTguNiwzNjcuOCwxNzMuMSw0MDYuOSwxNzAuNSw0NDYuM3ogTTE1MS4xLDM0MC4yYy0zLjItMy45LTYuNS03LjYtMTAuMS0xMS4yCgkJYy0yLjQtMi40LTQuOC00LjYtNy4zLTYuOGwxMC44LTEwLjhsMTcuNywxNy43TDE1MS4xLDM0MC4yTDE1MS4xLDM0MC4yeiBNMjAxLjIsMzQ2LjhsLTc4LTc4bDE1Ny4xLTE1Ny4xbDc4LDc4TDIwMS4yLDM0Ni44CgkJTDIwMS4yLDM0Ni44eiBNMjc5LjUsMzMyLjJsMTMuMy0xMy4zbDM0LjUsMzQuNWMxLjUsMS41LDMuNCwyLjIsNS4zLDIuMnMzLjgtMC43LDUuMy0yLjJjMi45LTIuOSwyLjktNy43LDAtMTAuNmwtMzQuNS0zNC41CgkJbDYuNi02LjZjMCwwLDYuNi02LjYsNi42LTYuNmwzNC41LDM0LjVjMS41LDEuNSwzLjQsMi4yLDUuMywyLjJzMy44LTAuNyw1LjMtMi4yYzIuOS0yLjksMi45LTcuNywwLTEwLjZsLTM0LjUtMzQuNWwxMy4zLTEzLjMKCQlsNTAuNCw1MC40bC02MSw2MUwyNzkuNSwzMzIuMkwyNzkuNSwzMzIuMnogTTM5MC45LDQ0My42bC01MC40LTUwLjRsMTMuMy0xMy4zbDUwLjQsNTAuNEwzOTAuOSw0NDMuNnogTTQxNC44LDQxOS43bC01MC40LTUwLjQKCQlsMTMuMy0xMy4zbDUwLjQsNTAuNEw0MTQuOCw0MTkuN3ogTTQzOC42LDM5NS45bC01MC40LTUwLjRsMTMuMy0xMy4zbDUwLjQsNTAuNEw0MzguNiwzOTUuOXoiLz4KCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNy4zLDQyMS41Yy0yLjktMi45LTcuNy0yLjktMTAuNiwwYy0yLjksMi45LTIuOSw3LjcsMCwxMC42bDIxLjIsMjEuMmMxLjUsMS41LDMuNCwyLjIsNS4zLDIuMgoJCXMzLjgtMC43LDUuMy0yLjJjMi45LTIuOSwyLjktNy43LDAtMTAuNkwyNy4zLDQyMS41eiIvPgo8L2c+Cjwvc3ZnPgo=);
          background-size: cover;
        }
        .pass-max::after {
          margin-top: -67px;
        }
        .pass-end::after {
          transform: rotate(180deg);
        }
        .pass-start div,
        .pass-max div,
        .pass-end div {
          background: white;
        }
        .pass-start div:first-child,
        .pass-max div:first-child,
        .pass-end div:first-child {
          padding-top: 5px;
          background: white;
          position: relative;
          z-index: 1;
          border-top: 2px solid #ccc;
          top: -2px;
        }
        .pass-elevation {
          position: absolute;
          height: 20px;
          line-height: 20px;
          top: 38px;
          left: 50%;
          transform: translateX(-50%);
        }
        .pass-elevation span {
          position: relative;
          left: 2px;
        }
        .pass-elevation::before,
        .pass-elevation::after {
          position: absolute;
          width: 1px;
          background: #ccc;
          content: '';
          height: 10px;
          left: 50%;
          margin-left: -0.5px;
        }
        .pass-elevation::before {
          height: 10px;
          bottom: 20px;
        }
        .pass-elevation::after {
          top: 20px;
        }
        .pass-direction {
          color: rgba(0, 0, 0, .54);
        }
        .pass-azimuth {
          position: relative;
          left: 3px;
          margin-top: 5px;
        }
        h3 {
          text-align: center;
          line-height: 22px;
          margin: 0 0 20px;
          font-weight: 500;
        }
        h3 span {
          display: block;
          text-transform: uppercase;
          font-size: 14px;
          font-weight: 400;
        }
        h3.now {
          line-height: 44px;
          text-transform: uppercase;
          font-size: 16px;
        }

        .pass-content {
          display: flex;
          flex-wrap: wrap;
        }
        .pass-time {
          width: 50%;
          box-sizing: border-box;
        }
        .pass-parameters {
          width: 50%;
          box-sizing: border-box;
          padding-left: 10%;
        }
        .pass-position {
          width: 100%;
          box-sizing: border-box;
        }

        .pass-duration,
        .pass-visibility {
          height: 22px;
          line-height: 22px;
          font-size: 14px;
          padding-left: 30px;
          position: relative;
          color: rgba(0, 0, 0, .54);
        }
        .pass-visibility {
          display: flex;
          align-items: center;
          padding-left: 32px;
        }
        .pass-visibility span {
          background: rgba(0, 0, 0, .12);
          height: 6px;
          width: 6px;
          border-radius: 1px;
          margin-right: 3px;
        }
        .pass-visibility span.visible {
          background: #aaa;
        }
        .pass-duration::before,
        .pass-visibility::before {
          position: absolute;
          top: 50%;
          margin-top: -8px;
          background-repeat: no-repeat;
          background-position: center center;
          width: 32px;
          height: 16px;
          left: 0;
          content: '';
          opacity: .54;
        }
        .pass-duration::before {
          background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NDggNTEyIj48cGF0aCBkPSJNMzkzLjkgMTg0bDIyLjYtMjIuNmM0LjctNC43IDQuNy0xMi4zIDAtMTdsLTE3LTE3Yy00LjctNC43LTEyLjMtNC43LTE3IDBsLTIwLjcgMjAuN2MtMzEuMS0yNy41LTcwLjQtNDUuOS0xMTMuOC01MC44VjQ4aDI4YzYuNiAwIDEyLTUuNCAxMi0xMlYxMmMwLTYuNi01LjQtMTItMTItMTJIMTcyYy02LjYgMC0xMiA1LjQtMTIgMTJ2MjRjMCA2LjYgNS40IDEyIDEyIDEyaDI4djQ5LjRDOTYuNCAxMDkuMyAxNiAxOTcuMiAxNiAzMDRjMCAxMTQuOSA5My4xIDIwOCAyMDggMjA4czIwOC05My4xIDIwOC0yMDhjMC00NC43LTE0LjEtODYuMS0zOC4xLTEyMHpNMjI0IDQ2NGMtODguNCAwLTE2MC03MS42LTE2MC0xNjBzNzEuNi0xNjAgMTYwLTE2MCAxNjAgNzEuNiAxNjAgMTYwLTcxLjYgMTYwLTE2MCAxNjB6bTEyLTExMmgtMjRjLTYuNiAwLTEyLTUuNC0xMi0xMlYyMDRjMC02LjYgNS40LTEyIDEyLTEyaDI0YzYuNiAwIDEyIDUuNCAxMiAxMnYxMzZjMCA2LjYtNS40IDEyLTEyIDEyeiIvPjwvc3ZnPg==);
        }
        .pass-visibility::before {
          background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NzYgNTEyIj48cGF0aCBkPSJNNTY5LjM1NCAyMzEuNjMxQzUxMi45NyAxMzUuOTQ5IDQwNy44MSA3MiAyODggNzIgMTY4LjE0IDcyIDYzLjAwNCAxMzUuOTk0IDYuNjQ2IDIzMS42MzFhNDcuOTk5IDQ3Ljk5OSAwIDAgMCAwIDQ4LjczOUM2My4wMzEgMzc2LjA1MSAxNjguMTkgNDQwIDI4OCA0NDBjMTE5Ljg2IDAgMjI0Ljk5Ni02My45OTQgMjgxLjM1NC0xNTkuNjMxYTQ3Ljk5NyA0Ny45OTcgMCAwIDAgMC00OC43Mzh6TTI4OCAzOTJjLTEwMi41NTYgMC0xOTIuMDkxLTU0LjcwMS0yNDAtMTM2IDQ0LjE1Ny03NC45MzMgMTIzLjY3Ny0xMjcuMjcgMjE2LjE2Mi0xMzUuMDA3QzI3My45NTggMTMxLjA3OCAyODAgMTQ0LjgzIDI4MCAxNjBjMCAzMC45MjgtMjUuMDcyIDU2LTU2IDU2cy01Ni0yNS4wNzItNTYtNTZsLjAwMS0uMDQyQzE1Ny43OTQgMTc5LjA0MyAxNTIgMjAwLjg0NCAxNTIgMjI0YzAgNzUuMTExIDYwLjg4OSAxMzYgMTM2IDEzNnMxMzYtNjAuODg5IDEzNi0xMzZjMC0zMS4wMzEtMTAuNC01OS42MjktMjcuODk1LTgyLjUxNUM0NTEuNzA0IDE2NC42MzggNDk4LjAwOSAyMDUuMTA2IDUyOCAyNTZjLTQ3LjkwOCA4MS4yOTktMTM3LjQ0NCAxMzYtMjQwIDEzNnoiLz48L3N2Zz4=);
        }
        .pass-visibility.invisible::before {
          background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NzYgNTEyIj48cGF0aCBkPSJNMjcyLjcwMiAzNTkuMTM5Yy04MC40ODMtOS4wMTEtMTM2LjIxMi04Ni44ODYtMTE2LjkzLTE2Ny4wNDJsMTE2LjkzIDE2Ny4wNDJ6TTI4OCAzOTJjLTEwMi41NTYgMC0xOTIuMDkyLTU0LjcwMS0yNDAtMTM2IDIxLjc1NS0zNi45MTcgNTIuMS02OC4zNDIgODguMzQ0LTkxLjY1OGwtMjcuNTQxLTM5LjM0M0M2Ny4wMDEgMTUyLjIzNCAzMS45MjEgMTg4Ljc0MSA2LjY0NiAyMzEuNjMxYTQ3Ljk5OSA0Ny45OTkgMCAwIDAgMCA0OC43MzlDNjMuMDA0IDM3Ni4wMDYgMTY4LjE0IDQ0MCAyODggNDQwYTMzMi44OSAzMzIuODkgMCAwIDAgMzkuNjQ4LTIuMzY3bC0zMi4wMjEtNDUuNzQ0QTI4NC4xNiAyODQuMTYgMCAwIDEgMjg4IDM5MnptMjgxLjM1NC0xMTEuNjMxYy0zMy4yMzIgNTYuMzk0LTgzLjQyMSAxMDEuNzQyLTE0My41NTQgMTI5LjQ5Mmw0OC4xMTYgNjguNzRjMy44MDEgNS40MjkgMi40OCAxMi45MTItMi45NDkgMTYuNzEyTDQ1MC4yMyA1MDkuODNjLTUuNDI5IDMuODAxLTEyLjkxMiAyLjQ4LTE2LjcxMi0yLjk0OUwxMDIuMDg0IDMzLjM5OWMtMy44MDEtNS40MjktMi40OC0xMi45MTIgMi45NDktMTYuNzEyTDEyNS43NyAyLjE3YzUuNDI5LTMuODAxIDEyLjkxMi0yLjQ4IDE2LjcxMiAyLjk0OWw1NS41MjYgNzkuMzI1QzIyNi42MTIgNzYuMzQzIDI1Ni44MDggNzIgMjg4IDcyYzExOS44NiAwIDIyNC45OTYgNjMuOTk0IDI4MS4zNTQgMTU5LjYzMWE0OC4wMDIgNDguMDAyIDAgMCAxIDAgNDguNzM4ek01MjggMjU2Yy00NC4xNTctNzQuOTMzLTEyMy42NzctMTI3LjI3LTIxNi4xNjItMTM1LjAwN0MzMDIuMDQyIDEzMS4wNzggMjk2IDE0NC44MyAyOTYgMTYwYzAgMzAuOTI4IDI1LjA3MiA1NiA1NiA1NnM1Ni0yNS4wNzIgNTYtNTZsLS4wMDEtLjA0MmMzMC42MzIgNTcuMjc3IDE2LjczOSAxMzAuMjYtMzYuOTI4IDE3MS43MTlsMjYuNjk1IDM4LjEzNUM0NTIuNjI2IDM0Ni41NTEgNDk4LjMwOCAzMDYuMzg2IDUyOCAyNTZ6Ii8+PC9zdmc+);
        }
      </style>

      <template is="dom-if" if="[[roughLatitude]]">
        <paper-card elevation="1">
          <div class="card-content">
            <h2 class="pass-header">
              <img class="pass-icon" src="[[icon]]" />
              [[satellite.name]]
            </h2>

            <div class="pass-content">

              <template is="dom-if" if="[[stationary]]">

                <h3>Stationary</h3>

                <div class="pass-position">
                  <div class="pass-stages">
                    <div class="pass-max">
                      <div class="pass-datetime">[[passes.0.max.dateString]]</div>
                      <div class="pass-direction">[[passes.0.max.azimuth.0]]</div>
                      <div class="pass-azimuth">[[passes.0.max.azimuth.1]]</div>
                    </div>
                  </div>
                  <div class="pass-elevation"><span>[[passes.0.max.elevation]]°</span></div>
                </div>

              </template>
              <template is="dom-if" if="[[!stationary]]">

                <template is="dom-if" if="[[passes.0]]">

                  <div class="pass-time">
                    <template is="dom-if" if="[[passes.0.now]]">
                      <h3 class="now">Passing</h3>
                    </template>
                    <template is="dom-if" if="[[!passes.0.now]]">
                      <h3 class="until">[[passes.0.until]] <span>until pass</span></h3>
                    </template>
                  </div>

                  <div class="pass-parameters">
                    <div class="pass-duration">[[passes.0.duration]]</div>
                    <div class="pass-visibility invisible"><span></span><span></span><span></span><span></span></div>
                  </div>

                  <div class="pass-position">
                    <div class="pass-stages">
                      <div class="pass-start">
                        <div class="pass-datetime">[[passes.0.start.dateString]]</div>
                        <div class="pass-azimuth">[[passes.0.start.azimuth.1]]</div>
                        <div class="pass-direction">[[passes.0.start.azimuth.0]]</div>
                      </div>
                      <div class="pass-max">
                        <div class="pass-datetime">[[passes.0.max.dateString]]</div>
                        <div class="pass-azimuth">[[passes.0.max.azimuth.1]]</div>
                        <div class="pass-direction">[[passes.0.max.azimuth.0]]</div>
                      </div>
                      <div class="pass-end">
                        <div class="pass-datetime">[[passes.0.end.dateString]]</div>
                        <div class="pass-azimuth">[[passes.0.end.azimuth.1]]</div>
                        <div class="pass-direction">[[passes.0.end.azimuth.0]]</div>
                      </div>
                    </div>
                    <div class="pass-elevation"><span>[[passes.0.max.elevation]]°</span></div>
                  </div>

                </template>

                <template is="dom-if" if="[[!passes.0]]">
                  <div class="pass-time">
                    <h3 class="now">No passes</h3>
                    <p>Passes are calculated for the next 48 hours.</p>
                  </div>
                </template>

              </template>
            </div>
          </div>
        </paper-card>
      </template>
    `;
  }
}

customElements.define('space-satpass', SpaceSatpass);

export default SpaceSatpass;
