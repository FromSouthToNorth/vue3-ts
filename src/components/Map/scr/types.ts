export interface GeoJSON {
  v?: any
  id: string
  wid: string
  type: string
  geometry: Geometry
  properties: Properties
}

export interface Geometry {
  type: string
  coordinates: Array<number> | Array<Array<number>>
}

export interface Properties {
  id: string
  uid: string
  name: string
  user: string
  type: string
  version: string
  landuse: string
  'name:zh': string
  timestamp: string
}
