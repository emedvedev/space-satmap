import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import '/node_modules/@em-polymer/google-map/google-map-elements.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import '/node_modules/@polymer/polymer/lib/elements/dom-if.js';
import { twoline2satrec, propagate, eciToGeodetic, gstime } from '/node_modules/satellite.js/dist/satellite.es.js';
import satIcons from './space-icons.js';

class SpaceSatellite extends Element {
  static get properties() {
    return {
      label: String,
      labelObject: {
        type: String,
        readOnly: true,
        computed: '_label(label)',
      },
      tle: Array,
      orbit: {
        type: Array,
        value: [],
      },
      showOrbit: {
        type: Boolean,
        value: true,
      },
      orbitBefore: {
        type: Number,
        value: 0.5,
      },
      orbitAfter: {
        type: Number,
        value: 1,
      },
      icon: {
        type: String,
        value: 'bonbon',
      },
      iconSettings: {
        type: Object,
        value: {},
      },
      orbitOpacity: {
        type: Number,
        value: 0.5,
      },
      orbitColor: {
        type: String,
        value: 'brown',
      },
    };
  }

  ready() {
    super.ready();

    this.markerIcon = SpaceSatellite.icons[this.icon];
    Object.keys(this.iconSettings)
      .forEach((k) => { this.markerIcon[k] = this.iconSettings[k]; });

    if (typeof (this.tle) === 'string') {
      this.tle = this.tle.split('\n');
    }
    this.tle = this.tle.slice(-2).map(s => s.trim());

    this.period = (24 * 60 * 60 * 1000) / parseFloat(this.tle[1].substr(52, 10));
    this.satrec = twoline2satrec(this.tle[0], this.tle[1]);
  }

  _label(label) {
    return label ? { text: label, color: '#555' } : null;
  }

  predict(date) {
    const t = date || new Date();
    const gmst = gstime(t);
    const eci = propagate(this.satrec, t);
    const geo = eciToGeodetic(eci.position, gmst);
    return {
      lng: geo.longitude * (180 / Math.PI),
      lat: geo.latitude * (180 / Math.PI),
    };
  }

  static get icons() {
    return satIcons;
  }

  static get template() {
    return html`
      <google-map-marker latitude="[[lat]]" longitude="[[lng]]" map="[[map]]" icon="[[markerIcon]]" label="[[labelObject]]"></google-map-marker>
      <template is="dom-if" if="[[showOrbit]]">
        <google-map-poly map="[[map]]" geodesic stroke-opacity="[[orbitOpacity]]" stroke-color="[[orbitColor]]">
          <template is="dom-repeat" items="[[orbit]]">
            <google-map-point latitude="[[item.lat]]" longitude="[[item.lng]]"></google-map-point>
          </template>
        </google-map-poly>
      </template>
    `;
  }
}

customElements.define('space-satellite', SpaceSatellite);
