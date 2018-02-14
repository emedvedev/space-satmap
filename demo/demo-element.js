import { html, Element } from '/node_modules/@polymer/polymer/polymer-element.js';
import '/space-satmap.js';

class DemoElement extends Element {
  constructor() {
    super();
    this.tle = [
      '1 39444U 13066AE  18043.64550184  .00000219  00000-0  33574-4 0  9997',
      '2 39444  97.6032  80.2095 0057986 197.5374 162.3838 14.81637900226626',
    ];
  }

  static get template() {
    return html`
      <style>
        space-satmap {
          height: 100vh;
        }
      </style>

      <space-satmap>
        <space-satellite label="AO-73" type="cubesat" tle="[[tle]]"></space-satellite>
      </space-satmap>
    `;
  }
}

customElements.define('demo-element', DemoElement);
