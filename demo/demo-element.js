import { Element as PolymerElement } from '/node_modules/@polymer/polymer/polymer-element.js';
import '/space-satmap.js';

// export const html = Polymer.html;

export const html = (strings, ...values) => strings[0]
+ values.map((v, i) => v + strings[i + 1]).join('');

class DemoElement extends PolymerElement {
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
        :host {

        }
      </style>

      <h3>Satellite map</h3>

      <space-satmap tle="[[tle]]"></space-satmap>
    `;
  }
}

customElements.define('demo-element', DemoElement);
