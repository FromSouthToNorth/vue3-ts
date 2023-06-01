import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

export const LAYOUT = () => import('/@/layouts/index.vue')

export const REDIRECT_ROUTE = {
  path: '/',
  component: LAYOUT,
  redirect: '/map',
  name: 'Root',
  meta: {
    title: 'Root'
  },
  children: [
    {
      path: '/map',
      name: 'Map',
      component: () => import('/@/views/map/index.vue'),
      meta: {
        title: 'Map'
      }
    },
    {
      path: '/d3',
      name: 'd3',
      component: () => import('/@/views/d3/index.vue'),
      meta: {
        title: 'd3'
      }
    },
    {
      path: '/unoCss',
      name: 'unoCss',
      component: () => import('/@/views/unoCss/index.vue'),
      meta: {
        title: 'unoCss'
      }
    },
    {
      path: '/andDesign',
      name: 'andDesign',
      component: () => import('/@/views/andDesign/index.vue'),
      meta: {
        title: 'andDesign'
      }
    }
  ]
}

export const basicRoutes = [
  REDIRECT_ROUTE
]

export const router = createRouter({
  history: createWebHistory('/'),
  routes: basicRoutes,
  strict: true,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export function setupRouter(app: App<Element>) {
  app.use(router);
}
