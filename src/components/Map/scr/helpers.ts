import {
  geoIdentity as d3_geoIdentity,
  geoStream as d3_geoStream,
} from 'd3-geo'

import {
  geoVecAdd,
  geoVecAngle,
  geoVecLength,
} from '/@/geo/vector'
import type { GeoJSON } from './types'

export interface Segments {
  d: string
  id: string
  index: number
}

export function svgMarkerSegments(
  projection: any,
  clipExtent: Array<Array<number>>,
  dt: number,
  shouldReverse: any,
  bothDirections: any,
): (entity: GeoJSON) => Array<Segments> {
  return function (entity: GeoJSON) {
    let i = 0
    let offset = dt
    const segments: Array<Segments> = []
    const clip = d3_geoIdentity().clipExtent(clipExtent).stream
    const coordinates = [...entity.geometry.coordinates]
    let a: Array<number> | null, b: Array<number> | null
    if (shouldReverse(entity))
      coordinates.reverse()

    d3_geoStream({
      type: 'LineString',
      coordinates,
    }, projection.stream(clip({
      lineStart() {},
      lineEnd() { a = null },
      point(x: number, y: number) {
        b = [x, y]

        if (a) {
          let span = geoVecLength(a, b) - offset
          if (span >= 0) {
            const heading = geoVecAngle(a, b)
            const dx = dt * Math.cos(heading)
            const dy = dt * Math.sin(heading)
            let p = [
              a[0] + offset * Math.cos(heading),
              a[1] + offset * Math.sin(heading),
            ]

            // gather coordinates
            const coord: Array<Array<number>> = [a, p]
            for (span -= dt; span >= 0; span -= dt) {
              p = geoVecAdd(p, [dx, dy])
              coord.push(p)
            }
            coord.push(b)

            // generate svg paths
            let segment = ''
            let j
            for (j = 0; j < coord.length; j++)
              segment += `${(j === 0 ? 'M' : 'L') + coord[j][0]},${coord[j][1]}`
            segments.push({ id: entity.wid, index: i++, d: segment })
            if (bothDirections(entity)) {
              segment = ''
              for (j = coord.length - 1; j >= 0; j--)
                segment += `${(j === coord.length - 1 ? 'M' : 'L') + coord[j][0]},${coord[j][1]}`
              segments.push({ id: entity.wid, index: i++, d: segment })
            }
          }
          offset = -span
        }

        a = b
      },
    })))

    return segments
  }
}

export function dataKey(entity: GeoJSON): string {
  return `${entity.wid}v${(entity.v || 0)}`
}
