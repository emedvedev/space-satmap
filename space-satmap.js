// TODO: Marker icon for the ground station
// TODO: Next pass
// TODO: Eclipse area

// TODO: Icons

// TODO: Satellite footprint (radius) + observer footprint
// TODO: Center the map on the satellite (?)
// TODO: "radar" animation + change color on pass (?)

import '/node_modules/@em-polymer/google-map/google-map-elements.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-if.js';
import { FlattenedNodesObserver } from '/node_modules/@polymer/polymer/lib/utils/flattened-nodes-observer.js';
import { mixinBehaviors } from '/node_modules/@polymer/polymer/lib/legacy/class.js';
import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import { IronResizableBehavior } from '/node_modules/@polymer/iron-resizable-behavior/iron-resizable-behavior.js';

import './space-satellite.js';

class SpaceSatmap extends mixinBehaviors([IronResizableBehavior], Element) {
  static get properties() {
    return {
      groundLatitude: Number,
      groundLongitude: Number,
      hasGroundStation: {
        type: Boolean,
        computed: '_hasGroundStation(groundLatitude, groundLongitude)',
      },
      detectLocation: {
        type: Boolean,
        value: false,
      },
      nextPass: Boolean,
      satelliteRedraw: {
        type: Number,
        value: 200,
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
      satellites: {
        type: Array,
        value: [],
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
          this.validLat = this.map.getCenter().lat() - (topMargin - 0.05);
        } else {
          this.validLat = this.map.getCenter().lat() - (bottomMargin + 0.05);
        }
      }
      this.map.setCenter({
        lng: this.map.getCenter().lng(),
        lat: this.validLat,
      });
    }

    this.boundsSetter = null;
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
    this._setCurrentOrbits();
    this._setCurrentPositions();
  }

  _updateIntervals(sat, orbit) {
    clearInterval(this.orbitInterval);
    clearInterval(this.satposInterval);
    this.orbitInterval = setInterval(this._setCurrentOrbits.bind(this), orbit);
    this.satposInterval = setInterval(this._setCurrentPositions.bind(this), sat);
  }

  _setCurrentOrbits() {
    const now = new Date().getTime();
    this.satellites
      .filter(sat => sat.showOrbit)
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

  static get observers() {
    return [
      '_updateIntervals(satelliteRedraw, orbitRedraw)',
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
        api-key="AIzaSyDBBKw8NnVLo7DJrYAZRoDemWUWuwOkhHM">
        <slot></slot>
        <template is="dom-if" if="[[hasGroundStation]]">
          <google-map-marker latitude="[[groundLatitude]]" longitude="[[groundLongitude]]"></google-map-marker>
        </template>
      </google-map>
    `;
  }
}

customElements.define('space-satmap', SpaceSatmap);
