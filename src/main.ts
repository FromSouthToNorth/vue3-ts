import 'uno.css'
import './design/index.less'
import 'ant-design-vue/dist/antd.less'

import App from './App.vue'

import { createApp } from 'vue'
import { setupRouter } from '/@/router'

async function bootstrap() {
  const app = createApp(App)

  setupRouter(app)

  app.mount('#app')
}

bootstrap()
