function init(google) {
  /** @constructor */
  function GroundStation(lat, lng, image, map) {
    // Initialize all properties.
    this.lat_ = lat;
    this.lng_ = lng;
    this.image_ = image;
    this.map_ = map;

    // Define a property to hold the image's div. We'll
    // actually create this div upon receipt of the onAdd()
    // method so we'll leave it null for now.
    this.div_ = null;

    // Explicitly call setMap on this overlay.
    this.setMap(map);
  }

  GroundStation.prototype = new google.maps.OverlayView();

  /**
   * onAdd is called when the map's panes are ready and the overlay has been
   * added to the map.
   */
  GroundStation.prototype.onAdd = function () {
    const div = document.createElement('div');
    div.style.display = 'none';
    div.style.borderStyle = 'none';
    div.style.borderWidth = '0px';
    div.style.position = 'absolute';

    // Create the img element and attach it to the div.
    const img = document.createElement('img');
    img.src = this.image_.url;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.position = 'absolute';
    div.appendChild(img);

    this.div_ = div;

    // Add the element to the "overlayLayer" pane.
    const panes = this.getPanes();
    panes.overlayLayer.appendChild(div);
  };

  GroundStation.prototype.draw = function () {
    const overlayProjection = this.getProjection();
    const pixels = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(this.lat_, this.lng_));
    if (!isNaN(pixels.x)) {
      const div = this.div_;
      div.style.display = 'block';
      div.style.left = `${pixels.x - (this.image_.scaledSize.width / 2)}px`;
      div.style.top = `${pixels.y - (this.image_.scaledSize.height / 2)}px`;
      div.style.width = `${this.image_.scaledSize.width}px`;
      div.style.height = `${this.image_.scaledSize.height}px`;
    }
  };

  GroundStation.prototype.onRemove = function () {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
  };

  return GroundStation;
}

export default init;
