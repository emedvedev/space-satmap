// TODO: Render on a phone (tabs: switch between map / passes)

// TODO: Offline viewing / cache

// ----- Far-reaching TODOs: -----

// TODO: (pass) Shared cache
// TODO: Notifications? (flag on <space-satmap>)

// TODO: Center the map on the satellite ("focus=id" parameter on <space-satmap>?)

// TODO: Next N passes
// TODO: Next N visible passes vs next N all passes

import './node_modules/@em-polymer/google-map/google-map-elements.js';
import './node_modules/@em-polymer/google-apis/google-maps-api.js';
import './node_modules/@polymer/polymer/lib/elements/dom-if.js';
import './node_modules/@polymer/paper-styles/element-styles/paper-item-styles.js';
import './node_modules/@polymer/paper-card/paper-card.js';
import './node_modules/@polymer/paper-toggle-button/paper-toggle-button.js';
import { FlattenedNodesObserver } from './node_modules/@polymer/polymer/lib/utils/flattened-nodes-observer.js';
import { mixinBehaviors } from './node_modules/@polymer/polymer/lib/legacy/class.js';
import { html, Element } from './node_modules/@polymer/polymer/polymer-element.js';
import { IronResizableBehavior } from './node_modules/@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { getEclipseOverlay } from './utils/sun.js';
import './space-satellite.js';
import './space-satpass.js';
import groundIcon from './icons/ground.js';
import GroundStation from './utils/groundstation.js';

class SpaceSatmap extends mixinBehaviors([IronResizableBehavior], Element) {
  static get properties() {
    return {
      groundLatitude: Number,
      groundLongitude: Number,
      groundIcon: {
        type: Object,
        value: groundIcon,
      },
      hasGroundStation: {
        type: Boolean,
        computed: '_hasGroundStation(groundLatitude, groundLongitude)',
      },
      showPasses: {
        type: Boolean,
        value: false,
        computed: '_showPasses(hideNextPass, satellites, groundLatitude)',
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
      hideNextPass: {
        type: Boolean,
        value: false,
      },
      passesEnabled: {
        type: Boolean,
        value: true,
      },
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

  togglePasses() {
    this.passesEnabled = !this.passesEnabled;
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

  _showPasses(hideNextPass, satellites, groundLatitude) {
    return !hideNextPass && !!satellites && !!groundLatitude;
  }

  static get observers() {
    return [
      '_updateIntervals(satelliteRedraw, overlayRedraw)',
      '_updateGroundStation(hasGroundStation, groundLatitude, groundLongitude, groundIcon, map)',
      '_showPasses(hideNextPass, satellites, groundLatitude)',
    ];
  }

  static get template() {
    return html`
      <style include="paper-item-styles">
        :host {
          display: block;
          height: 100%;
        }
        .passes {
          position: absolute;
          left: 10px;
          right: 80px;
          bottom: 22px;

          display: flex;
          flex-wrap: wrap;

          pointer-events: none;
        }
        .passes>* {
          pointer-events: auto;
        }
        space-satpass {
          margin: 10px 10px 0 0;
        }
        .passes paper-card {
          position: absolute;
          top: -40px;
          font-size: 11px;
          height: 29px;
          line-height: 29px;
          padding: 0 8px 0 30px;
          color: rgb(86, 86, 86);
          cursor: default;
        }
        .passes paper-card span {
          position: absolute;
          top: 8px;
          left: 8px;
          background-color: rgba(255,255,255,.65);
          border: 1px solid rgba(155,155,155,.57);
          border-radius: 1px;
          font-size: 1px;
          height: 11px;
          margin: 0 4px 0 1px;
          outline: 0;
          width: 11px;
        }
        .passes paper-card:hover span {
          box-shadow: inset 0 1px 1px rgba(0, 0, 0, .1);
          border: 1px solid #b2b2b2;
        }
        .passes paper-card span.checked::before {
          content: '';
          height: 15px;
          outline: 0;
          width: 15px;
          left: 0;
          position: relative;
          display: block;
          top: -3px;
          background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAtklEQVQ4y2P4//8/A7Ux1Q0cxoaCADIbCUgCMTvVXAoE5kA8CYidyXYpGrAH4iVAHIXiCwoMDQTimUBcBsRMlBrKCsTpUANzkC0j11BuIK6EGlgKsoAkQ4FgChD7AzELVI8YEDdDDawDYk6YQaQY6gg1oAqILYC4D8oHGcyLbBAphoJAKtQgGO4EYiHk2CLHUJAXm6AG9gCxNHoSIMdQEJCFGqiALaGSayjMxQwUGzq0S6nhZygA2ojsbh6J67kAAAAASUVORK5CYII=) no-repeat -5px -3px;
          background-image: -webkit-image-set(url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAtklEQVQ4y2P4//8/A7Ux1Q0cxoaCADIbCUgCMTvVXAoE5kA8CYidyXYpGrAH4iVAHIXiCwoMDQTimUBcBsRMlBrKCsTpUANzkC0j11BuIK6EGlgKsoAkQ4FgChD7AzELVI8YEDdDDawDYk6YQaQY6gg1oAqILYC4D8oHGcyLbBAphoJAKtQgGO4EYiHk2CLHUJAXm6AG9gCxNHoSIMdQEJCFGqiALaGSayjMxQwUGzq0S6nhZygA2ojsbh6J67kAAAAASUVORK5CYII=) 1x, url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAqCAYAAADFw8lbAAABLUlEQVRYw+3XvyuEcRzAcVwUJQMWNnKz5VI2y5XhBv+AorwWi00m9wfIKrJbmG4wKmWR9YYbKBMmEVFHZzFc345M5zN83/UsT996Xj1Pz/dHT08ul8vlct0M29iMDOzDHlrfVzUisoDDNmQLu9GQg6glyJ1oyGGcJcgD9EZCjuIyQR6hEAk5gXqCrKE/EnIKNwnyFAORkEXcJshzDEVCzuIhQV5hJBJyHo8Jso6xSMgyXhLkNSa78fATTP9h3CJeE+Qdit16Sy00sY/xH8as4KMDcqabn7N983CPtfaJGqsdkE8o/cdO5ziBNFBBNbnfwjPm/nMzcdEBlV5vWIiwXjd+Qb6jHGlJfOiAbGIp2natlMyVn1iOepSotP3p69EPZhvYykfUXC6Xy+XC9QXkXzluK91iJAAAAABJRU5ErkJggg==) 2x);
          background-image: image-set(url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAtklEQVQ4y2P4//8/A7Ux1Q0cxoaCADIbCUgCMTvVXAoE5kA8CYidyXYpGrAH4iVAHIXiCwoMDQTimUBcBsRMlBrKCsTpUANzkC0j11BuIK6EGlgKsoAkQ4FgChD7AzELVI8YEDdDDawDYk6YQaQY6gg1oAqILYC4D8oHGcyLbBAphoJAKtQgGO4EYiHk2CLHUJAXm6AG9gCxNHoSIMdQEJCFGqiALaGSayjMxQwUGzq0S6nhZygA2ojsbh6J67kAAAAASUVORK5CYII=) 1x, url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAqCAYAAADFw8lbAAABLUlEQVRYw+3XvyuEcRzAcVwUJQMWNnKz5VI2y5XhBv+AorwWi00m9wfIKrJbmG4wKmWR9YYbKBMmEVFHZzFc345M5zN83/UsT996Xj1Pz/dHT08ul8vlct0M29iMDOzDHlrfVzUisoDDNmQLu9GQg6glyJ1oyGGcJcgD9EZCjuIyQR6hEAk5gXqCrKE/EnIKNwnyFAORkEXcJshzDEVCzuIhQV5hJBJyHo8Jso6xSMgyXhLkNSa78fATTP9h3CJeE+Qdit16Sy00sY/xH8as4KMDcqabn7N983CPtfaJGqsdkE8o/cdO5ziBNFBBNbnfwjPm/nMzcdEBlV5vWIiwXjd+Qb6jHGlJfOiAbGIp2natlMyVn1iOepSotP3p69EPZhvYykfUXC6Xy+XC9QXkXzluK91iJAAAAABJRU5ErkJggg==) 2x);
        }
        /*.passes paper-card:hover {
          background-color: rgb(235, 235, 235);
        }*/
      </style>

      <google-map map="{{map}}" latitude="0" longitude="0"
        zoom="[[zoom]]" min-zoom="[[zoom]]" max-zoom="10"
        map-type="terrain" disable-street-view-control
        on-google-map-bounds_changed="_checkBounds"
        on-google-map-ready="_setCurrentOverlays"
        api-key="AIzaSyDBBKw8NnVLo7DJrYAZRoDemWUWuwOkhHM">
        <slot></slot>
      </google-map>

      <template is="dom-if" if="[[showPasses]]">
        <div class="passes">

          <paper-card on-click="togglePasses" elevation="1">
            <template is="dom-if" if="[[passesEnabled]]">
              <span class="checked"></span> Show passes
            </template>
            <template is="dom-if" if="[[!passesEnabled]]">
              <span></span> Show passes
            </template>
          </paper-card>

          <template is="dom-if" if="[[passesEnabled]]">
            <template is="dom-repeat" items="[[satellites]]">
              <space-satpass satellite="[[item]]"
                ground-latitude="[[groundLatitude]]"
                ground-longitude="[[groundLongitude]]"></space-satpass>
            </template>
          </template>
        </div>
      </template>
    `;
  }
}

customElements.define('space-satmap', SpaceSatmap);
