<template>
  <div text-center p4 ref="coordinate">
    <span>{{ value }}</span>
    <br />
    <span>Mouse {{ label }}</span>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'

export default defineComponent({
  name: 'Coordinate',
  props: {
    value: Number,
    label: String,
  },
  setup(props) {
    const value = computed(() => props.value)
    const label = computed(() => props.label)

    const coordinate = ref<any | null>(null)

    onMounted(() => {
      console.log(coordinate.value);
    })

    return {
      value,
      label,
      coordinate
    }
  }
})
</script>

<style scoped></style>