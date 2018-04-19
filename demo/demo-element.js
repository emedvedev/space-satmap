import '../node_modules/@polymer/paper-styles/element-styles/paper-material-styles.js';
import { html, Element } from '../node_modules/@polymer/polymer/polymer-element.js';
import '../space-satmap.js';

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
      1 23642U 95042A   18058.62866679  .00000210  00000-0 -75405-2 0  9996
      2 23642  62.9606 257.1441 7218342 288.9618  10.0525  2.01983768165381`;
    this.comsat = [
      '1 36582U 10021B   18059.48174147 +.00000060 +00000-0 +00000-0 0  9993',
      '2 36582 000.0100 179.4763 0002536 176.4839 348.8289 01.00271885028574',
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
        <space-satellite name="Molniya 3-47" tle="[[molniya347]]" orbit-color="#2980b9" icon="sputnik"></space-satellite>
        <space-satellite name="QZS-2" tle="[[qzs2]]" orbit-color="#f39c12" icon="bonbon"></space-satellite>
        <space-satellite name="ISS" tle="[[iss]]" orbit-color="#c0392b" icon="cutie"></space-satellite>
        <space-satellite name="AO-73" tle="[[ao73]]" icon="cubesat" orbit-color="#8e44ad"></space-satellite>
        <space-satellite name="COMSATBW-2" tle="[[comsat]]" hide-orbit icon="teal"></space-satellite>
      </space-satmap>
    `;
  }
}

customElements.define('demo-element', DemoElement);
