<template>
  <div class="container">
    <div class="row">
      <div class="col">
        <D3Force/>
      </div>
      <div class="col">
        <D3ColorLegend/>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import D3Force from '/@/components/D3Force/scr/D3Force.vue';
import D3ColorLegend from "/@/components/D3ColorLegend/src/D3ColorLegend.vue";

export default {
  components: { D3ColorLegend, D3Force }
}
</script>

<style scoped>

</style>
