<script lang="ts">
import { defineComponent, ref, toRefs } from 'vue';
import { prefixCls } from '/@/settings/designSetting';
import { createAppProviderContext } from '/@/components/Application/src/useAppcontext';

const props = {
  prefixCls: { type: String, default: prefixCls }
}

export default defineComponent({
  name: 'AppProvider',
  inheritAttrs: false,
  props,
  setup(props, { slots }) {
    const isMobile = ref(false);
    const { prefixCls } = toRefs(props);
    // Inject variables into the global
    createAppProviderContext({ prefixCls, isMobile });
  }
})
</script>

<style scoped>

</style>
