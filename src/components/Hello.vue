<template>
<!--  <Coordinate label="x" :value="x" />-->
<!--  <Coordinate label="y" :value="y" />-->
  <d3-force />
</template>

<script lang="ts" setup>
import { useMouse } from '@vueuse/core'
import Coordinate from '/@/components/Coordinate.vue'
import D3Force from '/@/components/D3Force/scr/D3Force.vue';

const { x, y } = useMouse()
</script>

<style scoped></style>
