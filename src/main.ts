import { createApp } from 'vue'
import './assets/style.css'
import App from './App.vue'
import 'uno.css'
import { setupRouter } from '/@/router';

async function bootstrap() {
  const app = createApp(App)

  setupRouter(app)

  app.mount('#app')
}

bootstrap()

