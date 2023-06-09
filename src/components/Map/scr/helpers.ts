import {
  geoIdentity as d3_geoIdentity,
  geoStream as d3_geoStream,
} from 'd3-geo'

export function svgMarkerSegments(
  projection: any,
  clipExtent: Array<Array<number>>,
  dt: number,
  shouldReverse: any,
  bothDirections: any,
): any {
  return function (entity: any) {
    let i = 0
    let offset = dt
    const segments: { id: any; index: number; d: string }[] = []
    const clip = d3_geoIdentity().clipExtent(clipExtent).stream
    const coordinates = entity.geometry.coordinates
    let a: any, b: any
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

export function geoVecLength(a: Array<number>, b: Array<number>): number {
  return Math.sqrt(geoVecLengthSquare(a, b))
}

export function geoVecLengthSquare(a: Array<number>, b: Array<number>): number {
  b = b || [0, 0]
  const x = a[0] - b[0]
  const y = a[1] - b[1]
  return (x * x) + (y * y)
}

// Return the counterclockwise angle in the range (-pi, pi)
// between the positive X axis and the line intersecting a and b.
export function geoVecAngle(a: Array<number>, b: Array<number>): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

// vector addition
export function geoVecAdd(a: Array<number>, b: Array<number>): Array<number> {
  return [a[0] + b[0], a[1] + b[1]]
}
