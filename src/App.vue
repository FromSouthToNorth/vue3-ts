<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue';
import { AppProvider } from '/@/components/Application';
</script>

<template>
  <ConfigProvider>
    <AppProvider>
      <router-view/>
    </AppProvider>
  </ConfigProvider>
</template>

<style scoped></style>
