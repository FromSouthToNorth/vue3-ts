<script lang="tsx">
import { defineComponent, onMounted, ref, unref } from 'vue'
import { props } from './props'

import * as d3 from 'd3'
import RBush from 'rbush'
import * as L from 'leaflet'
import 'leaflet-minimap'
import _throttle from 'lodash-es/throttle'
import { miniTileLayer, tileLayers } from './tileLayers'
import cd from '/@/data/cd.json'
import { svgPoints } from '/@/components/Map/scr/svg/svgPoints'
import { behaviorHash } from '/@/hooks/core/useHash'
import { GeometryTypeEnum } from '/@/enums/geometryTypeEnum'
import { svgTagClasses } from './tag/tag_classes'
import login from '/@/assets/images/logo.png'

export default defineComponent({
  name: 'LeafletMap',
  props,
  setup() {
    const map = ref<any>(null)
    const mapContainer = ref(null)

    const areas = ref<Array<any>>([])
    const lines = ref<Array<any>>([])
    const points = ref<Array<any>>([])
    const legendRef = ref<any>(null)

    const svgPoint = ref<any>()
    const areaJSON = L.geoJSON(null, { style: areaJSONStyle })
      .on('click', (e: any) => {
        layerInfo(e.layer)
      })
    const lineJSON = L.geoJSON(null, { style: lineJSONStyle })
      .on('click', (e: any) => {
        layerInfo(e.layer)
      })

    function layerInfo(layer: any) {
      const { properties } = layer.feature
      const _legendRef = unref(legendRef)
      _legendRef.selectAll('p').remove()
      Object.keys(properties).forEach((key) => {
        const p = _legendRef.append('p').attr('class', 'ele')
        p.append('span').text(`${key}:`)
        p.append('b').text(properties[key])
      })
    }

    const svg = ref<any | null>(null)
    const rect = ref<DOMRect | null>(null)

    const tagClasses = svgTagClasses()

    function areaJSONStyle(feature: any): any {
      return {
        className: `area stroke ${tagClasses(feature)}`,
      }
    }

    function lineJSONStyle(feature: any): any {
      return {
        className: `line stroke ${tagClasses(feature)}`,
      }
    }

    onMounted(() => {
      rect.value = d3.select(mapContainer.value).node().getBoundingClientRect()
      map.value = L.map(mapContainer.value, {
        zoom: 5,
        minZoom: 2,
        maxZoom: 24,
        center: [30.66071, 104.06167],
      })
      const _map: any = unref(map)
      const hash = behaviorHash({ map: _map })

      hash()

      init(_map)

      redraw()
      const scheduleRedraw = _throttle(redraw, 750)
      _map.on('move', () => {
        scheduleRedraw()
      })
    })

    function init(map: any) {
      // init dataSource
      switchLayer()

      svgPoint.value = svgPoints({ map })

      areaJSON.addTo(map)
      lineJSON.addTo(map)

      tileLayers.forEach((layer) => {
        L.tileLayer(layer.url, layer.options)
          .addTo(map)
      })
      L.control.scale().addTo(map)
      new L.Control.MiniMap(
        L.tileLayer(miniTileLayer.url),
        { toggleDisplay: true },
      ).addTo(map)

      const legend = L.control({
        position: 'bottomleft',
      })
      legend.onAdd = () => {
        const legend = L.DomUtil.create('div', 'legend')
        legend.innerHTML = `<img src=${login}>`
        legendRef.value = d3.select(legend)
        return legend
      }
      legend.addTo(map)

      L.svg({ }).addTo(map)
      svg.value = d3.select(map.getPanes().overlayPane)
        .select('svg')
        .attr('pointer-events', 'auto')

      // init svg -> g.points...
      unref(svg)?.append('g')
        .attr('class', 'points')
    }

    function redraw() {
      const _map = unref(map)
      let as = []
      let ls = []
      let pts = []
      if (_map.getZoom() >= 17) {
        const tree = new RBush()
        const rb: Array<any>
           = unref(points).map((point) => {
             const { geometry } = point
             const { x, y } = map.value.latLngToLayerPoint(
               L.latLng(
                 geometry.coordinates[1],
                 geometry.coordinates[0],
               ),
             )
             return {
               maxX: x,
               maxY: y,
               minX: x,
               minY: y,
               point,
             }
           })
        tree.load(rb)
        const { _northEast, _southWest } = _map.getBounds()
        const _southWestXY = _map.latLngToLayerPoint(_southWest)
        const _northEastXY = _map.latLngToLayerPoint(_northEast)
        const bbox = {
          minX: _southWestXY.x,
          minY: _northEastXY.y,
          maxX: _northEastXY.x,
          maxY: _southWestXY.y,
        }
        pts = tree.search(bbox).map((d: any) => {
          return unref(d.point)
        })
      }
      if (_map.getZoom() >= 16) {
        as = unref(areas).filter(filterArea)
        ls = unref(lines).filter(filterLine)
      }

      areaJSON.clearLayers()
      lineJSON.clearLayers()
      areaJSON.addData(as)
      lineJSON.addData(ls)
      const _svgPoint = unref(svgPoint)
      _svgPoint(unref(svg), pts)
    }

    function getBounds() {
      const _map = unref(map)
      const { _northEast, _southWest } = _map.getBounds()
      const northEastPoint = _map.latLngToLayerPoint(_northEast)
      const southWestPoint = _map.latLngToLayerPoint(_southWest)
      return L.bounds(northEastPoint, southWestPoint)
    }

    function filterLine(geoJSON: any): boolean {
      const layer = L.GeoJSON.geometryToLayer(geoJSON)
      const latLngs = layer.getLatLngs()
      const bounds = getBounds()
      for (let i = 0, j = i + 1; j < latLngs.length;) {
        const start = map.value.latLngToLayerPoint(latLngs[i++])
        const end = map.value.latLngToLayerPoint(latLngs[j++])
        const boundsPoints = L.LineUtil.clipSegment(start, end, bounds)
        if (boundsPoints.length)
          return true
      }
      return false
    }

    function filterArea(geoJSON: any): boolean {
      const layer = L.GeoJSON.geometryToLayer(geoJSON)
      const latLng = layer.getLatLngs()
      const polygonPoints: Array<any> = []
      latLng.forEach((lls: any) => {
        lls.forEach((latlng: any) => {
          const point = map.value.latLngToLayerPoint(latlng)
          polygonPoints.push(point)
        })
      })
      const clipPolygon = L.PolyUtil.clipPolygon(polygonPoints, getBounds())
      return clipPolygon.length
    }

    function switchLayer() {
      cd.features.forEach((feature) => {
        switch (feature.geometry.type) {
          case GeometryTypeEnum.POINT:
            unref(points).push(feature)
            break
          case GeometryTypeEnum.POLYGON:
            unref(areas).push(feature)
            break
          case GeometryTypeEnum.LINE_STRING:
            unref(lines).push(feature)
            break
          default:
            break
        }
      })
    }

    return () => {
      return (
        <div id='map-container' ref={mapContainer} />
      )
    }
  },
})
</script>

<style lang="less">
@import 'leaflet-minimap/dist/Control.MiniMap.min.css';

#map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  height: 100%;
  width: 100%;
  background: #000;
}
.legend {
  font-size: 13px;
  color: #333333;
  font-family: "Open Sans", Helvetica, sans-serif;
  background-color: rgba(255,255,255,0.8);
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  border-radius: 4px;

  & p {
    margin: 0;
    padding: 2px 6px;

    & span{
      margin-right: 4px;
    }
  }

  & img {
    width: 120px;
    display: block;
    margin: 4px;
  }
}
</style>
