<script lang="tsx">
import { defineComponent, onMounted, ref, unref } from 'vue'

import { props } from './props'
import * as d3 from 'd3'
import * as L from 'leaflet'
import RBush from 'rbush'
import 'leaflet-minimap'
import { miniTileLayer, tileLayers } from './tileLayers'
import cd from '/@/data/cd.json'
import { svgPoints } from '/@/components/Map/scr/svg/svgPoints'
import { behaviorHash } from '/@/hooks/core/useHash'
import { GeometryTypeEnum } from '/@/enums/geometryTypeEnum'

export default defineComponent({
  name: 'LeafletMap',
  props,
  setup() {
    const map = ref<any>(null)
    const mapContainer = ref(null)

    const areas = ref<Array<any>>([])
    const lines = ref<Array<any>>([])
    const points = ref<Array<any>>([])
    const labels = ref<Array<any>>([])

    const svg = ref<any | null>(null)
    const rect = ref<DOMRect | null>(null)

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

      redraw(_map)

      _map.on('moveend', () => {
        redraw(_map)
      })
    })

    function init(map: any) {
      // init dataSource
      switchLayer()

      tileLayers.forEach((layer) => {
        L.tileLayer(layer.url, layer.options)
          .addTo(map)
      })
      L.control.scale().addTo(map)
      new L.Control.MiniMap(
        L.tileLayer(miniTileLayer.url),
        { toggleDisplay: true },
      ).addTo(map)

      L.svg({}).addTo(map)
      svg.value = d3.select(map.getPanes().overlayPane)
        .select('svg')
        .attr('pointer-events', 'auto')

      // init svg -> g.points...
      unref(svg)?.append('g')
        .attr('class', 'points')
    }

    function redraw(map: any) {
      const svgPoint = svgPoints({ map })
      let pts = []
      if (map.getZoom() >= 16) {
        const tree = new RBush()
        const rb: Array<any> = []
        unref(points).forEach((point) => {
          const { geometry } = point
          const { x, y } = map.latLngToLayerPoint(
            L.latLng(
              geometry.coordinates[1],
              geometry.coordinates[0],
            ),
          )
          rb.push({
            maxX: x,
            maxY: y,
            minX: x,
            minY: y,
            point,
          })
        })
        tree.load(rb)

        const { _northEast, _southWest } = map.getBounds()
        const _southWestXY = map.latLngToLayerPoint(_southWest)
        const _northEastXY = map.latLngToLayerPoint(_northEast)
        const bbox = {
          minX: _southWestXY.x,
          minY: _northEastXY.y,
          maxX: _northEastXY.x,
          maxY: _southWestXY.y,
        }
        pts = tree.search(bbox).map((d: any) => {
          return d.point
        })
      }

      svgPoint(unref(svg), pts)
    }

    function switchLayer() {
      cd.features.forEach((feature) => {
        switch (feature.geometry.type) {
          case GeometryTypeEnum.POINT:
            points.value.push(feature)
            break
          case GeometryTypeEnum.POLYGON:
            areas.value.push(feature)
            break
          case GeometryTypeEnum.LINE_STRING:
            lines.value.push(feature)
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
}
</style>
