import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import '/space-satmap.js';

class DemoElement extends Element {
  constructor() {
    super();
    this.ao73 = [
      '1 39444U 13066AE  18043.64550184  .00000219  00000-0  33574-4 0  9997',
      '2 39444  97.6032  80.2095 0057986 197.5374 162.3838 14.81637900226626',
    ];
    this.iss = [
      '1 25544U 98067A   18044.97086806  .00001540  00000-0  30547-4 0  9994',
      '2 25544  51.6423 272.9736 0003536 100.1059 100.8646 15.54090790 99353',
    ];
  }

  static get template() {
    return html`
      <style>
        space-satmap {
          height: 100vh;
        }
      </style>

      <space-satmap satellite-redraw="200">
        <space-satellite label="ISS" tle="[[iss]]" orbit-color="blue"></space-satellite>
        <space-satellite label="AO-73" type="cubesat" tle="[[ao73]]"></space-satellite>
      </space-satmap>
    `;
  }
}

customElements.define('demo-element', DemoElement);
