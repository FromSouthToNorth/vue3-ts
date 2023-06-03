import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { MAP_ROUTERR } from './constant'

export const LAYOUT = () => import('/@/layouts/default/index.vue')

export const REDIRECT_ROUTE = {
  path: '/',
  component: LAYOUT,
  redirect: MAP_ROUTERR,
  name: 'Root',
  meta: {
    title: 'Root',
  },
  children: [
    {
      path: MAP_ROUTERR,
      name: 'Map',
      component: () => import('/@/views/map/index.vue'),
      meta: {
        title: '地图',
      },
    },
    {
      path: '/d3',
      name: 'd3',
      component: () => import('/@/views/d3/index.vue'),
      meta: {
        title: 'd3',
      },
    },
    {
      path: '/unoCss',
      name: 'unoCss',
      component: () => import('/@/views/unoCss/index.vue'),
      meta: {
        title: 'unoCss',
      },
    },
    {
      path: '/andDesign',
      name: 'andDesign',
      component: () => import('/@/views/andDesign/index.vue'),
      meta: {
        title: 'andDesign',
      },
    },
    {
      path: '/markdown',
      name: 'markdown',
      component: () => import('/@/views/markdown/index.vue'),
      meta: {
        title: 'markdown',
      },
    },
  ],
}

export const basicRoutes = [
  REDIRECT_ROUTE,
]

export const router = createRouter({
  history: createWebHistory('/'),
  routes: basicRoutes,
  strict: true,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

export function setupRouter(app: App<Element>) {
  app.use(router)
}
