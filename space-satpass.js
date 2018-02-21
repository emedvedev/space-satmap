// TODO: Pass refresh once expires (have the next N _non-active_ passes ready)
// TODO: Is the pass visible?
// TODO: Visible passes vs all passes
// TODO: Submit a pass PR to satellite.js
// TODO: Next N passes
// TODO: Optimize passes (smaller steps)
// TODO: No passes
// TODO: Stationary

import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';

import '/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-if.js';
import { propagate, eciToEcf, ecfToLookAngles, gstime } from '/node_modules/satellite.js/dist/satellite.es.js';
import satIcons from './space-icons.js';

class SpaceSatpass extends Element {
  static get properties() {
    return {
      groundLatitude: Number,
      groundLongitude: Number,
      groundAltitude: Number,
      satellite: Object,
      passes: { type: Array, value: [] },
      icon: { type: String, computed: '_icon(satellite)' },
    };
  }

  static get observers() {
    return [
      '_getNextPasses(groundLatitude, groundLongitude, groundAltitude, satellite)',
    ];
  }

  static formatAzimuth(azimuth) {
    const value = Math.round(azimuth * (180 / Math.PI));
    const formatted = ['N', `${value}°`];

    if (value > 22.5 || value <= 67.5) {
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
    }

    return formatted;
  }

  _icon(satellite) {
    return satIcons[satellite.icon].url;
  }

  _getNextPasses(groundLatitude, groundLongitude, groundAltitude, satellite) {
    if (groundLatitude && groundLongitude && groundAltitude && satellite) {
      const maxIterations = 17280; // within the next 48h
      const minAltitude = 10;
      const largeStep = 10000;
      const groundStation = {
        latitude: groundLatitude * (Math.PI / 180),
        longitude: groundLongitude * (Math.PI / 180),
        height: groundAltitude,
      };
      const timestamps = [];
      const now = new Date().getTime();
      for (let i = 0; i < maxIterations; i++) {
        const iterDate = new Date(now + (largeStep * i));
        timestamps[i] = [iterDate, gstime(iterDate)];
      }

      this.passes = [];
      const maxPasses = 1;
      const currentPass = [];
      for (let i = 0; i < timestamps.length; i++) {
        const t = timestamps[i][0];
        const gmst = timestamps[i][1];
        const positionEci = propagate(satellite.satrec, t).position;
        const positionEcf = eciToEcf(positionEci, gmst);
        const lookAngles = ecfToLookAngles(groundStation, positionEcf);
        const elevationDeg = lookAngles.elevation * (180 / Math.PI);
        if (elevationDeg > 0) {
          // TODO: Once a pass is identified, increase the precision
          currentPass.push([elevationDeg, lookAngles.azimuth, t]);
        } else if (currentPass.length) {
          const pass = {};
          while (currentPass.length) {
            const step = currentPass.pop();
            pass.start = { date: step[2], azimuth: step[1] };
            if (!pass.end) {
              pass.end = { date: step[2], azimuth: step[1] };
            }
            if (!pass.max || pass.max.elevation < step[0]) {
              pass.max = { date: step[2], azimuth: step[1], elevation: step[0] };
            }
            pass.duration = pass.end.date.getTime() - pass.start.date.getTime();
          }
          if (pass.max.elevation > minAltitude) {
            pass.start.azimuth = SpaceSatpass.formatAzimuth(pass.start.azimuth);
            pass.start.date = `${(`0${pass.start.date.getHours()}`).slice(-2)}:${(`0${pass.start.date.getMinutes()}`).slice(-2)}`;

            pass.max.azimuth = SpaceSatpass.formatAzimuth(pass.max.azimuth);
            pass.max.date = `${(`0${pass.max.date.getHours()}`).slice(-2)}:${(`0${pass.max.date.getMinutes()}`).slice(-2)}`;
            pass.max.elevation = Math.round(pass.max.elevation);

            pass.end.azimuth = SpaceSatpass.formatAzimuth(pass.end.azimuth);
            pass.end.date = `${(`0${pass.end.date.getHours()}`).slice(-2)}:${(`0${pass.end.date.getMinutes()}`).slice(-2)}`;

            pass.duration = Math.ceil((pass.duration) / 1000 / 60);
            if (pass.duration > 60) {
              pass.duration = `${Math.ceil(pass.duration / 60)}h ${pass.duration % 60}m`;
            } else {
              pass.duration = `${pass.duration}m`;
            }

            this.set('passes.0', pass);

            if (this.passes.length >= maxPasses) {
              break;
            }
          }
        }
      }
      if (currentPass.length === timestamps.length) {
        console.log('Stationary?'); // TODO
      }
      console.log(this.passes);
    }
  }

  static get template() {
    return html`
      <style include="paper-item-styles">
        :host {
          width: 250px;
          box-sizing: border-box;
          @apply --paper-font-common-base;
        }
        .pass-header {
          @apply --paper-font-headline;
          margin-top: 0;
          line-height: 32px;
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
          border: 2px dashed #ccc;
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
          margin-top: 5px;
        }
        .pass-azimuth {
          position: relative;
          left: 3px;
        }
      </style>

      <template is="dom-if" if="[[groundLatitude]]">
        <paper-card elevation="1">
          <div class="card-content">
            <h2 class="pass-header">
              <img class="pass-icon" src="[[icon]]" />
              [[satellite.name]]
            </h2>
            <h3>NNN Until Pass / Passing Now</h3>
            <p>Passes for [[passes.0.duration]].</p>
            <div class="pass-position">
              <div class="pass-stages">
                <div class="pass-start">
                  <div class="pass-datetime">[[passes.0.start.date]]</div>
                  <div class="pass-direction">[[passes.0.start.azimuth.0]]</div>
                  <div class="pass-azimuth">[[passes.0.start.azimuth.1]]</div>
                </div>
                <div class="pass-max">
                  <div class="pass-datetime">[[passes.0.max.date]]</div>
                  <div class="pass-direction">[[passes.0.max.azimuth.0]]</div>
                  <div class="pass-azimuth">[[passes.0.max.azimuth.1]]</div>
                </div>
                <div class="pass-end">
                  <div class="pass-datetime">[[passes.0.end.date]]</div>
                  <div class="pass-direction">[[passes.0.end.azimuth.0]]</div>
                  <div class="pass-azimuth">[[passes.0.end.azimuth.1]]</div>
                </div>
              </div>
              <div class="pass-elevation"><span>[[passes.0.max.elevation]]°</span></div>
            </div>
          </div>
        </paper-card>
      </template>
    `;
  }
}

customElements.define('space-satpass', SpaceSatpass);

export default SpaceSatpass;
