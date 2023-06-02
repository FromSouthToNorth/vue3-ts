import type { App, Component } from 'vue'

// https://github.com/vant-ui/vant/issues/8302
interface EventShim {
  new (...args: any[]): {
    $props: {
      onClick?: (...args: any[]) => void
    }
  }
}

export type WithInstall<T> = T & {
  install(app: App): void
} & EventShim
export type CustomComponent = Component & { displayName?: string }

export function withInstall<T extends CustomComponent>(component: T, alias?: string) {
  (component as Record<string, unknown>).install = (app: App) => {
    const compName = component.name || component.displayName
    if (!compName)
      return
    app.component(compName, component)
    if (alias)
      app.config.globalProperties[alias] = component
  }
  return component as WithInstall<T>
}

export function utilStringQs(str: string): any {
  let i = 0
  while (i < str.length && (str[i] === '?' || str[i] === '#')) i++
  str = str.slice(i)

  return str.split('&').reduce((obj: any, pair: string) => {
    const parts = pair.split('=')
    if (parts.length === 2)
      obj[parts[0]] = (parts[1] === null) ? '' : decodeURIComponent(parts[1])

    return obj
  }, {})
}

export function utilQsString(obj: any, noencode: boolean): string {
  // encode everything except special characters used in certain hash parameters:
  // "/" in map states, ":", ",", {" and "}" in background
  function softEncode(s: string) {
    return encodeURIComponent(s).replace(/(%2F|%3A|%2C|%7B|%7D)/g, decodeURIComponent)
  }

  return Object.keys(obj).sort().map((key) => {
    return `${encodeURIComponent(key)}=${
          noencode ? softEncode(obj[key]) : encodeURIComponent(obj[key])}`
  }).join('&')
}
