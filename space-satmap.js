// TODO: Next pass if user lat/lon is set
// TODO: Eclipse area
// TODO: Footprint (radius)
// TODO: Satellite icon
// TODO: Satellite as a separate component
// TODO: Center on the satellite (?)
// TODO: "radar" animation + change color on pass
// TODO: Icons: generic 1, generic 2, sputnik, cute

// TODO: Sublime syntax file

import '/node_modules/@em-polymer/google-map/google-map-elements.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import { mixinBehaviors } from '/node_modules/@polymer/polymer/lib/legacy/class.js';
import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import { IronResizableBehavior } from '/node_modules/@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { twoline2satrec, propagate, eciToGeodetic, gstime } from '/node_modules/satellite.js/dist/satellite.es.js';
import satIcons from './space-icons.js';

class SpaceSatmap extends mixinBehaviors([IronResizableBehavior], Element) {
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
      satelliteRedraw: {
        type: Number,
        value: 70,
      },
      orbitRedraw: {
        type: Number,
        value: 300000,
      },
      zoom: {
        type: Number,
        value: 3,
      },
      map: Object,
      type: {
        type: String,
        value: 'generic',
      },
      icon: {
        type: Object,
      },
    };
  }

  static get icons() {
    return satIcons;
  }

  ready() {
    super.ready();
    if (!this.icon) {
      this.icon = SpaceSatmap.icons[this.type];
    }
    console.log(this.icon);
    this.addEventListener('iron-resize', this._setZoom);
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
        console.log('activate setter', bounds.getNorthEast().lat(), bounds.getSouthWest().lat());
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
          this.validLat = this.map.getCenter().lat() - topMargin - 0.05;
        } else {
          this.validLat = this.map.getCenter().lat() - bottomMargin + 0.05;
        }
      }
      this.map.setCenter({
        lng: this.map.getCenter().lng(),
        lat: this.validLat,
      });
    }

    this.boundsSetter = null;
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
        this.orbitInterval = setInterval(this._setCurrentOrbit.bind(this), this.orbitRedraw);
      }
    }
    if (!this.satposInterval) {
      this.satposInterval = setInterval(this._setCurrentPosition.bind(this), this.satelliteRedraw);
    }
  }

  static get template() {
    return html`
      <style>
        /* local styles go here */
        :host {
          display: block;
          height: 100%;
        }
      </style>

      <google-map map="{{map}}" latitude="0"
        zoom="[[zoom]]" min-zoom="[[zoom]]" max-zoom="10"
        map-type="terrain" disable-street-view-control
        on-google-map-bounds_changed="_checkBounds"
        api-key="AIzaSyDBBKw8NnVLo7DJrYAZRoDemWUWuwOkhHM">
        <google-map-marker icon="[[icon]]" latitude="[[lat]]" longitude="[[lon]]"></google-map-marker>
        <google-map-poly geodesic stroke-opacity="0.5" stroke-color="brown">
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
