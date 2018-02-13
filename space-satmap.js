// TODO: Next pass if user lat/lon is set
// TODO: Eclipse area
// TODO: Footprint
// TODO: Icon

import '/node_modules/@em-polymer/google-map/google-map-elements.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import { twoline2satrec, propagate, eciToGeodetic, gstime } from '/node_modules/satellite.js/dist/satellite.es.js';

class SpaceSatmap extends Element {
  static get properties() {
    return {
      tle: Array,
      showOrbit: {
        type: Boolean,
        value: true,
      },
      userLatLon: Array,
      orbit: {
        type: Array,
        value: [],
      },
      map: Object,
    };
  }

  _getLatLon(date) {
    const t = date || new Date();
    const gmst = gstime(t);
    const eci = propagate(this.satrec, t);
    const geo = eciToGeodetic(eci.position, gmst);
    return {
      lon: geo.longitude * 180 / Math.PI,
      lat: geo.latitude * 180 / Math.PI,
    };
  }

  _setCurrentOrbit() {
    const now = new Date().getTime();
    // Start drawing the orbit at half a period before now:
    for (let i = 0, t = now - this.period / 2; t < now + this.period; i++, t += 20000) {
      const latlon = this._getLatLon(new Date(t));
      if (!this.orbit[i]) {
        this.set(`orbit.${i}`, latlon);
      }
      this.set(`orbit.${i}.lat`, latlon.lat);
      this.set(`orbit.${i}.lon`, latlon.lon);
    }
  }

  _setCurrentPosition() {
    const pos = this._getLatLon();
    this.lon = pos.lon;
    this.lat = pos.lat;
  }

  _setTLE(tle) {
    this.orbit = [];
    this.period = 24 * 60 / parseFloat(tle[1].substr(52, 10)) * 60000;
    this.satrec = twoline2satrec(tle[0], tle[1]);
    if (this.showOrbit) {
      this._setCurrentOrbit();
      if (!this.orbitInterval) {
        // Update the orbit every 5 minutes.
        this.orbitInterval = setInterval(this._setCurrentOrbit.bind(this), 1000 * 300);
      }
    }
    if (!this.satposInterval) {
      this.satposInterval = setInterval(this._setCurrentPosition.bind(this), 70);
    }
  }

  static get template() {
    return html`
      <style>
        /* local styles go here */
        :host {
          display: block;
          height: 600px;
        }
        iron-icon {
          fill: var(--icon-toggle-color, rgba(0,0,0,0));
          stroke: var(--icon-toggle-outline-color, currentcolor);
        }
        :host([pressed]) iron-icon {
          fill: var(--icon-toggle-pressed-color, currentcolor);
        }
      </style>

      [[lat]] [[lon]]

      <template is="dom-repeat" items="[[orbit]]">
        <div>latitude="[[item.lat]]" longitude="[[item.lon]]"</div>
      </template>

      <google-map map="{{map}}" api-key="AIzaSyDBBKw8NnVLo7DJrYAZRoDemWUWuwOkhHM">
        <google-map-marker latitude="[[lat]]" longitude="[[lon]]"></google-map-marker>
        <google-map-poly geodesic stroke-opacity="0.5" stroke-color="cyan">
          <template is="dom-repeat" items="[[orbit]]">
            <google-map-point latitude="[[item.lat]]" longitude="[[item.lon]]"></google-map-point>
          </template>
        </google-map-poly>
      </google-map>
    `;
  }

  static get observers() {
    return [
      '_setTLE(tle)',
    ];
  }
}

customElements.define('space-satmap', SpaceSatmap);
