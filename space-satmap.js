// TODO: Observer's horizon / station's reach
// TODO: "Radar" animation + change color on pass (?)
// TODO: scrolling to edges broke
// TODO: Molniya orbit render
// TODO: Center the map on the satellite ("focus=id" parameter on <space-satmap>?)
// TODO: Push notifications? ("enable-push on <space-satmap>")
// TODO: Next pass(es?) ("hide-next-pass on <space-satmap>")
// TODO: Pass refresh once expires (have the next N _non-active_ passes ready)
// TODO: Is the pass visible?
// TODO: Visible passes vs all passes


import '/node_modules/@em-polymer/google-map/google-map-elements.js';
import '/node_modules/@em-polymer/google-apis/google-maps-api.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-if.js';
import { FlattenedNodesObserver } from '/node_modules/@polymer/polymer/lib/utils/flattened-nodes-observer.js';
import { mixinBehaviors } from '/node_modules/@polymer/polymer/lib/legacy/class.js';
import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import { IronResizableBehavior } from '/node_modules/@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { propagate, eciToEcf, ecfToLookAngles, gstime } from '/node_modules/satellite.js/dist/satellite.es.js';
import { getEclipseOverlay } from './utils/sun.js';
import './space-satellite.js';
import groundIcon from './icons/ground.js';
import GroundStation from './utils/groundstation.js';

class SpaceSatmap extends mixinBehaviors([IronResizableBehavior], Element) {
  static get properties() {
    return {
      groundLatitude: Number,
      groundLongitude: Number,
      groundAltitude: { type: Number, value: 1 },
      groundIcon: {
        type: Object,
        value: groundIcon,
      },
      hasGroundStation: {
        type: Boolean,
        computed: '_hasGroundStation(groundLatitude, groundLongitude)',
      },
      detectLocation: {
        type: Boolean,
        value: false,
      },
      hideEclipseOverlay: {
        type: Boolean,
        value: false,
      },
      eclipseOverlayOpacity: {
        type: Number,
        value: 0.15,
      },
      hideNextPass: Boolean,
      satelliteRedraw: {
        type: Number,
        value: 200,
      },
      overlayRedraw: {
        type: Number,
        value: 60000,
      },
      zoom: {
        type: Number,
        value: 3,
      },
      map: Object,
      satellites: {
        type: Array,
        value: [],
      },
      passes: {
        type: Object,
        value: {},
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('iron-resize', this._setZoom);

    if (this.detectLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._updateGround.bind(this));
      navigator.geolocation.watchPosition(this._updateGround.bind(this));
    }
  }

  _updateGround(position) {
    this.groundLatitude = position.coords.latitude;
    this.groundLongitude = position.coords.longitude;
    if (position.coords.altitude && position.coords.altitude > 1) {
      this.groundAltitude = position.coords.altitude;
    }
  }

  _setZoom() {
    const zoom = this.zoom;
    const newZoom = Math.ceil(Math.log(this.offsetHeight / 256) / Math.log(2));
    if (zoom !== newZoom) {
      this.zoom = newZoom;
      if (this.map) {
        this.map.setCenter({
          lng: this.map.getCenter().lng(),
          lat: 0,
        });
      }
    }
  }

  _checkBounds() {
    if (typeof (this.validLat) !== 'number') {
      this.validLat = 0;
      return;
    }
    if (!this.boundsSetter) {
      const bounds = this.map.getBounds();
      if (bounds.getNorthEast().lat() > 85.05 || bounds.getSouthWest().lat() < -85.05) {
        this.boundsSetter = setTimeout(this._setBounds.bind(this), 50);
      } else {
        this.validLat = this.map.getCenter().lat();
      }
    }
  }

  _setBounds() {
    const bounds = this.map.getBounds();
    const topMargin = bounds.getNorthEast().lat() - 85.05;
    const bottomMargin = bounds.getSouthWest().lat() + 85.05;

    if (topMargin > 0 || bottomMargin < 0) {
      if (this.map.getCenter().lat() === this.validLat) {
        // Zoomed out or resized outside of the bounds, so we have to
        // recalculate the center.
        if (topMargin > 0) {
          this.validLat = this.map.getCenter().lat() - (topMargin + 0.05);
        } else {
          this.validLat = this.map.getCenter().lat() - (bottomMargin - 0.05);
        }
      }
      this.map.setCenter({
        lng: this.map.getCenter().lng(),
        lat: this.validLat,
      });
    }

    this.boundsSetter = null;
  }

  _getNextPasses(groundLatitude, groundLongitude, groundAltitude, hideNextPass, satellites) {
    if (hideNextPass) {
      this.passes = {};
    } else if (satellites && groundLatitude && groundLongitude) {
      const maxIterations = 12000; // within the next 48h
      const minAltitude = 10;
      const largeStep = 15000;
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

      satellites
        .filter(sat => !sat.hideNextPass)
        .forEach((sat) => {
          this.passes[sat.name] = [];
          const maxPasses = 1;
          const currentPass = [];
          for (let i = 0; i < timestamps.length; i++) {
            const t = timestamps[i][0];
            const gmst = timestamps[i][1];
            const positionEci = propagate(sat.satrec, t).position;
            const positionEcf = eciToEcf(positionEci, gmst);
            const lookAngles = ecfToLookAngles(groundStation, positionEcf);
            const elevationDeg = lookAngles.elevation * (180 / Math.PI);
            if (elevationDeg > 0) {
              // start stepping back until elevationDeg < 0
              // start stepping forward with smaller precision
              // TODO: Once a pass is identified, increase the precision
              currentPass.push([elevationDeg, lookAngles.azimuth * (180 / Math.PI), t]);
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
                this.passes[sat.name].push(pass);
                if (this.passes[sat.name].length >= maxPasses) {
                  break;
                }
              }
            }
          }
          if (currentPass.length === timestamps.length) {
            console.log('Stationary?'); // TODO
          }
          console.log(sat.name, this.passes[sat.name]);
        });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._observer = new FlattenedNodesObserver(this, this._attachSatellites);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer.disconnect();
  }

  _attachSatellites(changes) {
    changes.addedNodes
      .filter(e => e.tagName === 'SPACE-SATELLITE')
      .forEach((sat) => {
        this.satellites.push(sat);
      });
    this._setCurrentOverlays();
    this._setCurrentPositions();
  }

  _updateIntervals(sat, overlay) {
    clearInterval(this.orbitInterval);
    clearInterval(this.satposInterval);
    this.orbitInterval = setInterval(this._setCurrentOverlays.bind(this), overlay);
    this.satposInterval = setInterval(this._setCurrentPositions.bind(this), sat);
  }

  _setCurrentOverlays() {
    const now = new Date().getTime();
    // Orbits
    this.satellites
      .filter(sat => !sat.hideOrbit)
      .forEach((sat) => {
        const orbit = [];
        // Start drawing the orbit at half a period before now:
        for (let i = 0, t = now - (sat.period * sat.orbitBefore);
          t < now + (sat.period * sat.orbitAfter);
          i++, t += 20000) {
          const latlon = sat.predict(new Date(t));
          orbit[i] = latlon;
        }
        sat.set('orbit', orbit);
      });
    // Eclipse
    if (!this.hideEclipseOverlay && typeof google !== 'undefined') {
      const overlayOptions = getEclipseOverlay(new Date());
      overlayOptions.fillOpacity = this.eclipseOverlayOpacity;
      overlayOptions.strokeWeight = 0;
      overlayOptions.map = this.map;
      if (!this.eclipseOverlay) {
        this.eclipseOverlay = new google.maps.Circle(overlayOptions);
      } else {
        this.eclipseOverlay.setOptions(overlayOptions);
      }
    }
  }

  _setCurrentPositions() {
    this.satellites.forEach((sat) => {
      const pos = sat.predict();
      sat.lat = pos.lat;
      sat.lng = pos.lng;
    });
  }

  _hasGroundStation(lat, lng) {
    return !!lat && !!lng;
  }

  _updateGroundStation(hasGroundStation, groundLatitude, groundLongitude, icon, map) {
    if (map) {
      if (!this.overlay) {
        const GS = GroundStation(google);
        this.overlay = new GS(groundLatitude, groundLongitude, icon, map);
      } else {
        this.overlay.lat_ = groundLatitude;
        this.overlay.lng_ = groundLongitude;
      }
    }
  }

  static get observers() {
    return [
      '_updateIntervals(satelliteRedraw, overlayRedraw)',
      '_getNextPasses(groundLatitude, groundLongitude, groundAltitude, hideNextPass, satellites)',
      '_updateGroundStation(hasGroundStation, groundLatitude, groundLongitude, groundIcon, map)',
    ];
  }

  static get template() {
    return html`
      <style>
        :host {
          display: block;
          height: 100%;
        }
      </style>

      <google-map map="{{map}}" latitude="0" longitude="0"
        zoom="[[zoom]]" min-zoom="[[zoom]]" max-zoom="10"
        map-type="terrain" disable-street-view-control
        on-google-map-bounds_changed="_checkBounds"
        on-google-map-ready="_setCurrentOverlays"
        api-key="AIzaSyDBBKw8NnVLo7DJrYAZRoDemWUWuwOkhHM">
        <slot></slot>
      </google-map>
    `;
  }
}

customElements.define('space-satmap', SpaceSatmap);
