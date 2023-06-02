import { utilQsString, utilStringQs } from '../util'
import { utilObjectOmit } from '../util/object'
import { prefs } from '../util/preferences'

export function behaviorHash(context: any) {
  let _cachedHash: any = null

  function computedHashParameters(): object {
    const map = context.map
    const center: Array<Number> = map.getCenter()
    const zoom: number = map.getZoom()
    const precision: number = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2))
    const oldParams: any = utilObjectOmit(utilStringQs(window.location.hash), ['comment', 'source', 'hashtags', 'walkthrough'])
    const newParams: any = {}

    delete oldParams.id
    newParams.map = `${zoom.toFixed(2)}/${center[1].toFixed(precision)}/${center[0].toFixed(precision)}`

    return Object.assign(oldParams, newParams)
  }

  function computedHash(): string {
    return `#${utilQsString(computedHashParameters(), true)}`
  }

  function updateHashIfNeeded() {
    const latestHahs: string = computedHash()
    if (_cachedHash !== latestHahs) {
      _cachedHash = latestHahs
      window.history.replaceState(null, '', latestHahs)
      const q = utilStringQs(latestHahs)
      if (q.map)
        prefs('map-location', q.map)
    }
  }
  // lodash-es throttle
}
