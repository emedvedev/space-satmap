import { html, Element } from './node_modules/@polymer/polymer/polymer-element.js';
import './node_modules/@em-polymer/google-map/google-map-elements.js';
import './node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import './node_modules/@polymer/polymer/lib/elements/dom-if.js';
import { twoline2satrec } from './utils/satellite.js';
import predict from './utils/jspredict.js';
import satIcons from './space-icons.js';

class SpaceSatellite extends Element {
  static get properties() {
    return {
      name: String,
      labelObject: {
        type: String,
        readOnly: true,
        computed: '_label(name, hideLabel)',
      },
      tle: Array,
      orbit: {
        type: Array,
        value: [],
      },
      hideLabel: {
        type: Boolean,
        value: false,
      },
      hideOrbit: {
        type: Boolean,
        value: false,
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
    this.satrec = twoline2satrec(this.tle[0], this.tle[1]);
    this.period = (24 * 60 * 60 * 1000) / parseFloat(this.tle[1].substr(52, 10));

    this.stringTLE = `SAT\n${this.tle.join('\n')}`;
  }

  _label(name, hideLabel) {
    return name && !hideLabel ? { text: name, color: '#555' } : null;
  }

  predict(date) {
    const prediction = predict.observe(this.stringTLE, null, date);
    return {
      lng: prediction.longitude,
      lat: prediction.latitude,
    };
  }

  static get icons() {
    return satIcons;
  }

  static get template() {
    return html`
      <google-map-marker z-index="2" map="[[map]]"
        latitude="[[lat]]" longitude="[[lng]]"
        icon="[[markerIcon]]" label="[[labelObject]]"></google-map-marker>
      <template is="dom-if" if="[[!hideOrbit]]">
        <google-map-poly map="[[map]]" stroke-opacity="[[orbitOpacity]]" stroke-color="[[orbitColor]]">
          <template is="dom-repeat" items="[[orbit]]">
            <google-map-point latitude="[[item.lat]]" longitude="[[item.lng]]"></google-map-point>
          </template>
        </google-map-poly>
      </template>
    `;
  }
}

customElements.define('space-satellite', SpaceSatellite);

export default SpaceSatellite;
