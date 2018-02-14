// TODO: Next pass + marker if user lat/lon is set
// TODO: User lat/lon from the browser location
// TODO: Eclipse area
// TODO: Satellite footprint (radius)
// TODO: Center the map on the satellite (?)
// TODO: "radar" animation + change color on pass (?)
// TODO: Icons: generic 1, generic 2, sputnik, cute
// TODO: Performance
// TODO: Sublime syntax file

import '/node_modules/@em-polymer/google-map/google-map-elements.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import { FlattenedNodesObserver } from '/node_modules/@polymer/polymer/lib/utils/flattened-nodes-observer.js';
import { mixinBehaviors } from '/node_modules/@polymer/polymer/lib/legacy/class.js';
import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import { IronResizableBehavior } from '/node_modules/@polymer/iron-resizable-behavior/iron-resizable-behavior.js';

import './space-satellite.js';

class SpaceSatmap extends mixinBehaviors([IronResizableBehavior], Element) {
  static get properties() {
    return {
      userLat: Number,
      userLon: Number,
      detectLocation: {
        type: Boolean,
        value: true,
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
    };
  }

  ready() {
    super.ready();
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
        sat.set('satelliteRedraw', this.satelliteRedraw);
        sat.set('orbitRedraw', this.orbitRedraw);
      });
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
        <slot></slot>
      </google-map>
    `;
  }
}

customElements.define('space-satmap', SpaceSatmap);
