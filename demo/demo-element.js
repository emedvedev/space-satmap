import '/node_modules/@polymer/paper-styles/element-styles/paper-material-styles.js';
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
      `1 25544U 98067A   18048.53986095  .00001284  00000-0  26665-4 0  9990
       2 25544  51.6419 255.1811 0003571 108.3921 273.4252 15.54102564 99917`;
    this.raduga = `RADUGA-1M 3 [+]
      1 39375U 13062A   18046.29840976 -.00000047  00000-0  00000-0 0  9995
      2 39375   0.0272 187.5898 0002254 161.6490 333.4435  1.00273592 15602`;
    this.iridium98 = [
      'IRIDIUM 98 [+]',
      '1 27451U 02031B   18046.59596499  .00000123  00000-0  37005-4 0  9995',
      '2 27451  86.3936 280.4066 0001571  89.1236 271.0139 14.34223839826193',
    ];
    this.molniya347 = `MOLNIYA 3-47
      1 23642U 95042A   18041.79420537  .00001569  00000-0  39995-3 0  9997
      2 23642  62.9357 259.5030 7229585 288.8717  10.1175  2.01940750165043`;
    this.molniya = [
      '1 08195U 75081A   18045.01405012  .00000930  00000-0  63561-3 0  9991',
      '2 08195  61.8616  60.4846 7508686 281.2199  10.0818  2.00850991310953',
    ];
    this.qzs2 = `1 42738U 17028A   18045.98320326 -.00000151 +00000-0 +00000-0 0  9991
                 2 42738 044.3969 286.2529 0739632 270.9510 080.7101 01.00283927002628`;
    this.ops5798 = `1   897U 64063B   18046.48120737 +.00000037 +00000-0 +41030-4 0  9996
                    2   897 090.1505 017.3902 0020416 029.1792 086.6617 13.53417198633515`;
  }

  static get template() {
    return html`
      <style>
        space-satmap {
          height: 100vh;
        }
      </style>
      <space-satmap detect-location satellite-redraw="200">
        <space-satellite name="QZS-2" tle="[[qzs2]]" orbit-color="teal" icon="bonbon"></space-satellite>
        <space-satellite name="Molniya 3-47" tle="[[molniya347]]" orbit-color="black" icon="sputnik"></space-satellite>
        <space-satellite name="ISS" tle="[[iss]]" orbit-color="blue" icon="cutie"></space-satellite>
        <space-satellite name="AO-73" tle="[[ao73]]" icon="cubesat"></space-satellite>
        <space-satellite name="OPS 5798" tle="[[ops5798]]" orbit-color="green" icon="teal"></space-satellite>
      </space-satmap>
    `;
  }
}

customElements.define('demo-element', DemoElement);
