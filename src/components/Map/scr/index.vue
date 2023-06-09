<script lang="tsx">
import { defineComponent, onMounted, ref, unref } from 'vue'

import * as d3 from 'd3'
import {
  geoPath as d3_geoPath,
  geoTransform as d3_geoTransform,
} from 'd3-geo'
import RBush from 'rbush'
import * as L from 'leaflet'
import 'leaflet-minimap'
import cd from '/@/data/cd.json'
import { svgPoints } from './svg/svgPoints'
import { svgDefs } from './svg/defs'
import { behaviorHash } from '/@/hooks/core/useHash'
import { GeometryTypeEnum } from '/@/enums/geometryTypeEnum'
import login from '/@/assets/images/logo.png'

import area from '@turf/area'
import length from '@turf/length'
import { miniTileLayer, tileLayers } from './tileLayers'
import { svgTagClasses } from './tag/tag_classes'
import { svgMarkerSegments } from './helpers'
import { utilArrayFlatten } from '/@/util'

export default defineComponent({
  name: 'LeafletMap',
  setup() {
    const map = ref<any>(null)
    const mapContainer = ref(null)

    const areas = ref<Array<any>>([])
    const lines = ref<Array<any>>([])
    const points = ref<Array<any>>([])
    const legendRef = ref<any>(null)

    const renderer = ref<any>(null)

    const svgPoint = ref<any>()
    const areaJSON = ref<any>(null)
    const lineJSON = ref<any>(null)

    function layerInfo(layer: any) {
      const { properties, geometry } = layer.feature
      const _legendRef = unref(legendRef)
      _legendRef.selectAll('p').remove()
      Object.keys(properties).forEach((key) => {
        const p = _legendRef.append('p').attr('class', 'ele')
        p.append('span').text(`${key}:`)
        p.append('b').text(properties[key])
      })
      const info: any = {}
      if (geometry.type === GeometryTypeEnum.POLYGON) {
        info.key = '面积: '
        info.value = `${area(layer.feature).toFixed(4)} m²`
      }
      if (geometry.type === GeometryTypeEnum.LINE_STRING) {
        info.key = '长度: '
        info.value = `${length(layer.feature, { units: 'kilometers' }).toFixed(4)} 公里`
      }

      const p = _legendRef.append('p').attr('class', 'ele')
      p.append('span').text(info.key)
      p.append('b').text(info.value)
    }

    const svg = ref<any | null>(null)
    const rect = ref<DOMRect | null>(null)

    const tagClasses = svgTagClasses()

    function areaJSONStyle(feature: any): any {
      return {
        className: `area ${tagClasses(feature)}`,
      }
    }

    function lineJSONStyle(feature: any): any {
      return {
        className: `line ${tagClasses(feature)}`,
      }
    }

    onMounted(() => {
      if (d3.select('svg.svg-defs')
        .selectAll('marker')
        .empty()) {
        const defs = svgDefs()
        defs(d3.select('#app').append('svg').attr('class', 'svg-defs'))
      }

      rect.value = d3.select(mapContainer.value)
        .node()
        .getBoundingClientRect()
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
      _map.on('moveend', () => {
        redraw()
      })
    })

    function init(map: any) {
      // init dataSource
      switchLayer()

      svgPoint.value = svgPoints({ map })

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

      renderer.value = L.svg().addTo(map)
      svg.value = d3.select(map.getPanes().overlayPane)
        .select('svg')
        .attr('pointer-events', 'auto')

      // init lineLayer
      lineJSON.value = L.geoJSON(null, {
        renderer: unref(renderer),
        style: lineJSONStyle,
      }).on('click', (e: any) => {
        layerInfo(e.layer)
      }).addTo(map)
      // init areaLayer
      areaJSON.value = L.geoJSON(null, {
        renderer: unref(renderer),
        style: areaJSONStyle,
      }).on('click', (e: any) => {
        layerInfo(e.layer)
      }).addTo(map)
      const _svg = unref(svg)
      // init svg -> g.points...
      _svg.append('g')
        .attr('class', 'points')

      _svg.append('g').attr('class', 'onewaygroup')

      _svg.append('defs').attr('class', 'surface-defs')
    }

    function projectPoint(x: any, y: any) {
      const point = unref(map).latLngToLayerPoint(new L.LatLng(y, x))
      this.stream.point(point.x, point.y)
    }

    const projection = d3_geoTransform({
      point: projectPoint,
    })

    function redraw() {
      const _map = unref(map)
      const _svg = unref(svg)
      const areaJson = unref(areaJSON)
      const lineJson = unref(lineJSON)
      areaJson.clearLayers()
      lineJson.clearLayers()
      let as = []
      let ls = []
      let pts = []
      const { _northEast, _southWest } = _map.getBounds()
      const _southWestXY = _map.latLngToLayerPoint(_southWest)
      const _northEastXY = _map.latLngToLayerPoint(_northEast)
      const bbox = {
        minX: _southWestXY.x,
        minY: _northEastXY.y,
        maxX: _northEastXY.x,
        maxY: _southWestXY.y,
      }
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
        pts = tree.search(bbox).map((d: any) => {
          return unref(d.point)
        })
      }

      if (_map.getZoom() >= 16) {
        as = unref(areas).filter(filterArea)
        ls = unref(lines).filter(filterLine)
      }

      // area clipPath
      _svg
        .selectAll('defs')
        .selectAll('.clipPath-osm')
        .remove()
      const path = d3_geoPath()
        .projection(projection)
      let clipPaths = _svg
        .selectAll('defs')
        .selectAll('.clipPath-osm')
        .data(as)
      const clipPathsEnter = clipPaths.enter()
        .append('clipPath')
        .attr('class', 'clipPath-osm')
        .attr('id', (entity: any) => {
          return `hy-${entity.wid}-clippath`
        })
      clipPathsEnter
        .append('path')
      clipPaths = clipPaths.merge(clipPathsEnter)
        .selectAll('path')
        .attr('d', path)

      areaJson.addData(as)
      lineJson.addData(ls)
      const segments: Array<any> = []
      // line oneway
      lineJson.eachLayer((layer: any) => {
        const { feature } = layer
        if (feature.properties.oneway) {
          const clipExtent = [[bbox.minX, bbox.minY], [bbox.maxX, bbox.maxY]]
          const onewaySegments = svgMarkerSegments(
            projection,
            clipExtent,
            35,
            () => { return feature.properties.oneway === '-1' },
            () => { return feature.oneway === 'reversible' || feature.oneway === 'alternating' })
          const onewaydata = onewaySegments(feature)
          if (onewaydata.length)
            segments.push(onewaydata)
        }
      })
      const onewaydata = utilArrayFlatten(segments)
      const onewaygroup = _svg.select('g.onewaygroup')
      let markers = onewaygroup.selectAll('path')
        .data(
          () => { return onewaydata },
          (d: any) => { return [d.wid, d.index] },
        )

      markers.exit()
        .remove()

      markers = markers.enter()
        .append('path')
        .attr('class', 'oneway')
        .merge(markers)
        .attr('marker-mid', 'url(#oneway-marker)')
        .attr('d', (d: any) => {
          return d.d
        })

      areaJson.eachLayer((layer: any) => {
        d3.select(layer._path)
          .attr('clip-path', `url(#hy-${layer.feature.wid}-clippath)`)
      })

      const _svgPoint = unref(svgPoint)
      _svgPoint(_svg, pts)
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

    const zoomAreaField: any = {
      16: {
        field: 'building',
      },
    }

    function filterArea(geoJSON: any): boolean {
      const _map = unref(map)
      const layer = L.GeoJSON.geometryToLayer(geoJSON)
      const latLng = layer.getLatLngs()
      const polygonPoints: Array<any> = []
      latLng.forEach((lls: any) => {
        lls.forEach((latlng: any) => {
          const point = _map.latLngToLayerPoint(latlng)
          polygonPoints.push(point)
        })
      })
      const clipPolygon = L.PolyUtil.clipPolygon(polygonPoints, getBounds())
      const _zoomAreaField = zoomAreaField[_map.getZoom()]
      const field = _zoomAreaField ? geoJSON.properties[_zoomAreaField.field] : undefined

      return clipPolygon.length > 0 && (!_zoomAreaField || !field)
    }

    function switchLayer() {
      cd.features.forEach((feature) => {
        const index = feature.id.indexOf('/')
        if (index !== -1)
          feature.wid = `w${feature.id.substring(index + 1, feature.id.length)}`

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
  background-color: rgba(255,255,255,0.8);
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  border-radius: 4px;
  max-height: 400px;
  overflow-x: scroll;
  display: block;
  & p {
    margin: 0;
    padding: 2px 6px;

    & span{
      margin-right: 4px;
    }
  }

  & img {
    width: 56px;
    display: block;
    margin: 4px;
  }
}
</style>
