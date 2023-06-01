<script lang="ts">
import { defineComponent, onMounted, ref, toRaw } from 'vue'

import { props } from './props'
import * as d3 from 'd3'
import * as L from 'leaflet'
import { tileLayers } from './tileLayers'
import cd from '/@/data/cd.json'
import { svgPoints } from '/@/components/Map/scr/svg/svgPoints'

export default defineComponent({
  name: 'Map',
  props,
  setup() {
    const mapContainer = ref(null)
    const rect = ref<DOMRect | null>(null)
    const map = ref<any>(null)
    const svg = ref<Element | null>(null)

    onMounted(() => {
      rect.value = d3.select(mapContainer.value).node().getBoundingClientRect()
      map.value = L.map(mapContainer.value, {
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        center: [30.66071, 104.06167],
      })
      const _map = toRaw(map.value)
      init(_map)
      initSvg(_map)
    })

    function init(map: any) {
      tileLayers.forEach((layer) => {
        L.tileLayer(layer.url, layer.options)
          .addTo(map)
      })
    }

    function initSvg(map: any) {
      L.svg({}).addTo(map)
      svg.value = d3.select(map.getPanes().overlayPane).select('svg').attr('pointer-events', 'auto')

      const points = cd.features.filter((feature) => {
        return feature.geometry.type === 'Point'
      })
      const svgPoint = svgPoints({ map })
      svgPoint(svg.value, points)
    }

    return { mapContainer, rect, map }
  },
})
</script>

<template>
  <div id="map-container" ref="mapContainer" />
</template>

<style scoped>
#map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>
