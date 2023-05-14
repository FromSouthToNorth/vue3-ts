export const tileLayers = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      key: 'openstreetmap'
    }
  },
  {
    url: 'https://api.mapbox.com/styles/v1/openstreetmap/ckasmteyi1tda1ipfis6wqhuq/tiles/256/{z}/{x}/{y}@2x?access_token={access_token}',
    options: {
      access_token: 'pk.eyJ1Ijoib3BlbnN0cmVldG1hcCIsImEiOiJjbGRlaXd3cHUwYXN3M29waWp0bGNnYWdyIn0.RRlhUnKlUFNhKsKjhaZ2zA',
      key: 'Position Assist Overlay',
      maxZoom: 16,
    }
  }
]