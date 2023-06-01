import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import UnoCSS from 'unocss/vite'
import { presetAttributify, presetIcons, presetUno } from 'unocss'
import { generateModifyVars } from "./src/config/modifyVars";

const root = process.cwd();
const pathResolve = (pathname: string) => resolve(root, '.', pathname);
// https://vitejs.dev/config/
export default defineConfig({

  plugins: [vue(),
  UnoCSS({
    presets: [presetUno(),
    presetAttributify(),
    presetIcons()]
  })],

  resolve: {
    // 配置别名
    alias: [
      {
        find: /\/@\//,
        replacement: pathResolve('src') + '/'
      }
    ]
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: generateModifyVars(),
        javascriptEnabled: true,
      }
    }
  }
})
