<template>
  <div id="map-container" ref="mapContainer">
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, toRaw } from 'vue'

import { props } from './props'
import * as d3 from 'd3'
import * as L from 'leaflet'
import { tileLayers } from './tileLayers'
import cd from '/@/data/cd.json'
import { svgPoints } from '/@/components/Map/scr/svg/svgPoints';

export default defineComponent({
  name: 'Map',
  props: props,
  setup(props) {
    const mapContainer = ref(null)
    let rect = ref<DOMRect | null>(null)
    let map = ref<any>(null)
    let svg = ref<Element | null>(null)

    onMounted(() => {
      rect.value = d3.select(mapContainer.value).node().getBoundingClientRect()
      map.value = L.map(mapContainer.value, {
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        center: [30.66071, 104.06167]
      })
      const _map = toRaw(map.value);
      init(_map)
      initSvg(_map)
    })

    function init(map) {
      tileLayers.forEach(layer => {
        L.tileLayer(layer.url, layer.options)
            .addTo(map);
      })
    }

    function initSvg(map) {
      L.svg({}).addTo(map)
      svg.value = d3.select(map.getPanes()['overlayPane']).select('svg').attr('pointer-events', 'auto')
      
      const points = cd.features.filter(feature => {
        return feature.geometry.type === 'Point'
      })
      const svgPoint = svgPoints({ map });
      svgPoint(svg.value, points)
    }

    function setSize() {
      const observer = new ResizeObserver(e => {
        const { width, height } = e[0].contentRect;
        const _svg = toRaw(svg.value);
        _svg.attr('width', width).attr('height', height)
      })
      observer.observe(mapContainer.value)
    }

    return { mapContainer, rect, map }
  }
})
</script>

<style scoped>
#map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>