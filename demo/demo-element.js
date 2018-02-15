import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import '/space-satmap.js';

class DemoElement extends Element {
  constructor() {
    super();
    this.ao73 = [
      'AO-73',
      '1 39444U 13066AE  18043.64550184  .00000219  00000-0  33574-4 0  9997',
      '2 39444  97.6032  80.2095 0057986 197.5374 162.3838 14.81637900226626',
    ];
    this.iss =
      `1 25544U 98067A   18044.97086806  .00001540  00000-0  30547-4 0  9994
       2 25544  51.6423 272.9736 0003536 100.1059 100.8646 15.54090790 99353`;
    this.asteria = `ASTERIA
      1 43020U 98067NH  18046.20204772  .00009034  00000-0  13162-3 0  9994
      2 43020  51.6389 265.8787 0002942  83.3451 276.7876 15.56525536 13478`;
    this.beeaglesat = [
      '1 42736U 98067MR  18046.40309361  .00014821  00000-0  16206-3 0  9991',
      '2 42736  51.6349 256.6868 0006930 132.0270 228.1316 15.63540172 41345',
    ];
    this.atlantis = [
      '1 42737U 98067MS  18046.38928343  .00138017  00000-0  59705-3 0  9991',
      '2 42737  51.6247 243.6723 0004238 179.2002 180.9008 15.83972943 41401',
    ];
  }

  static get template() {
    return html`
      <style>
        space-satmap {
          height: 100vh;
        }
      </style>
      <space-satmap detect-location satellite-redraw="200">
        <space-satellite label="Asteria" tle="[[asteria]]" orbit-color="black"></space-satellite>
        <space-satellite label="ISS" tle="[[iss]]" orbit-color="blue"></space-satellite>
        <space-satellite label="Beeaglesat" tle="[[beeaglesat]]" orbit-color="orange"></space-satellite>
        <space-satellite label="Atlantis" tle="[[atlantis]]" orbit-color="red"></space-satellite>
        <space-satellite label="AO-73" tle="[[ao73]]" icon="cubesat"></space-satellite>
      </space-satmap>
    `;
  }
}

customElements.define('demo-element', DemoElement);
