import { geoPath as d3_geoPath } from 'd3-geo'
import { utilDisplayName, utilDisplayNameForPath } from '/@/util'
import { GeometryTypeEnum } from '/@/enums/geometryTypeEnum'
import RBush from 'rbush'
import { geoPathLength, geoPolygonIntersectsPolygon } from '/@/geo/geom'
import { geoVecInterp, geoVecLength } from '/@/geo/vector'

export function svgLabels(projection: any, context: any) {
  const path = d3_geoPath(projection)

  const { map } = context

  const _entitybboxes: any = {}
  const _rdrawn = new RBush()
  const _textWidthCache: any = {}
  const _rskipped = new RBush()

  // Listed from highest to lowest priority
  const labelStack = [
    ['line', 'aeroway', '*', 12],
    ['line', 'highway', 'motorway', 12],
    ['line', 'highway', 'trunk', 12],
    ['line', 'highway', 'primary', 12],
    ['line', 'highway', 'secondary', 12],
    ['line', 'highway', 'tertiary', 12],
    ['line', 'highway', '*', 12],
    ['line', 'railway', '*', 12],
    ['line', 'waterway', '*', 12],
    ['area', 'aeroway', '*', 12],
    ['area', 'amenity', '*', 12],
    ['area', 'building', '*', 12],
    ['area', 'historic', '*', 12],
    ['area', 'leisure', '*', 12],
    ['area', 'man_made', '*', 12],
    ['area', 'natural', '*', 12],
    ['area', 'shop', '*', 12],
    ['area', 'tourism', '*', 12],
    ['area', 'camp_site', '*', 12],
    ['point', 'aeroway', '*', 10],
    ['point', 'amenity', '*', 10],
    ['point', 'building', '*', 10],
    ['point', 'historic', '*', 10],
    ['point', 'leisure', '*', 10],
    ['point', 'man_made', '*', 10],
    ['point', 'natural', '*', 10],
    ['point', 'shop', '*', 10],
    ['point', 'tourism', '*', 10],
    ['point', 'camp_site', '*', 10],
    ['line', 'ref', '*', 12],
    ['area', 'ref', '*', 12],
    ['point', 'ref', '*', 10],
    ['line', 'name', '*', 12],
    ['area', 'name', '*', 12],
    ['point', 'name', '*', 10],
  ]

  function get(array: Array<any>, prop: string) {
    return function (_d: any, i: number) { return array[i][prop] }
  }

  function textWidth(text: string, size: number | string, elem?: SVGTextContentElement): number {
    let c: any = _textWidthCache[size]
    if (!c)
      c = _textWidthCache[size] = {}
    if (c[text]) {
      return c[text]
    }
    else if (elem) {
      c[text] = elem.getComputedTextLength()
      return c[text]
    }
    else {
      const str = encodeURIComponent(text).match(/%[CDEFcdef]/g)
      if (str === null)
        return size / 3 * 2 * text.length

      else
        return size / 3 * (2 * text.length + str.length)
    }
  }

  function drawPointLabels(selection: any, entities: Array<any>, classes: string, labels: Array<any>) {
    const texts = selection.selectAll(`text.${classes}`)
      .data(entities)

    texts.exit()
      .remove()

    texts.enter()
      .append('text')
      .attr('class', (d: any, i: number) => {
        return `${classes} ${labels[i].classes} ${d.wid}`
      })
      .merge(texts)
      .attr('x', get(labels, 'x'))
      .attr('y', get(labels, 'y'))
      .style('text-anchor', get(labels, 'textAnchor'))
      .text((d) => { return utilDisplayName(d.properties) })
      .each((d: any, i: number) => {
        textWidth(utilDisplayName(d.properties), labels[i].height, this)
      })
  }

  function drawLineLabels(selection: any, entities: any, classes: string, labels: Array<any>) {
    const texts = selection.selectAll(`text.${classes}`).data(entities)

    texts.exit().remove()

    texts.enter()
      .append('text')
      .attr('class', (d: any, i: number) => { return `${classes} ${labels[i].classes} ${d.wid}` })
      .append('textPath')
      .attr('class', 'textpath')

    selection.selectAll(`text.${classes}`).selectAll('.textpath')
      .data(entities)
      .attr('startOffset', '50%')
      .attr('xlink:href', (d: any) => { return `#labelpath-${d.wid}` })
      .text(utilDisplayName)
  }

  function drawLabels(selection: any, entities: Array<any>, rect: DOMRect, clipExtent: Array<number>) {
    const labelable: Array<any> = []
    const renderNodeAs: any = {}
    let i, j, k, entity, geometry: any
    for (i = 0; i < labelStack.length; i++)
      labelable.push([])

    for (i = 0; i < entities.length; i++) {
      entity = entities[i]
      geometry = entity.geometry.type
      if (geometry === GeometryTypeEnum.POINT) {
        let markerPadding
        geometry = 'point'
        renderNodeAs[entity.wid] = 'point'
        if (map.getZoom() >= 18)
          markerPadding = 20

        else
          markerPadding = 0

        const coord = map.latLngToLayerPoint(
          L.latLng(entity.geometry.coordinates[1],
            entity.geometry.coordinates[0]),
        )
        const nodePadding = 10
        console.log(coord)

        const bbox = {
          minX: coord.x - nodePadding,
          minY: coord.y - nodePadding - markerPadding,
          maxX: coord.x + nodePadding,
          maxY: coord.y + nodePadding,
        }
        doInsert(bbox, `${entity.wid}P`)
      }
      if (!utilDisplayName(entity.properties))
        continue

      for (k = 0; k < labelStack.length; k++) {
        const matchGeom = labelStack[k][0]
        const matchKey = labelStack[k][1]
        const matchVal = labelStack[k][2]
        const hasVal = entity.properties[matchKey]

        if (geometry === matchGeom && hasVal && (matchVal === '*' || matchVal === hasVal)) {
          labelable[k].push(entity)
          break
        }
      }
    }

    const positions: any = {
      point: [],
      line: [],
      area: [],
    }

    const labelled: any = {
      point: [],
      line: [],
      area: [],
    }

    // 尝试为可标记实体找到一个有效标签
    for (k = 0; k < labelable.length; k++) {
      const fontSize: number | string = labelStack[k][3]

      for (i = 0; i < labelable[k].length; i++) {
        entity = labelable[k][i]
        geometry = entity.geometry.type

        const getName = (geometry === GeometryTypeEnum.LINE_STRING) ? utilDisplayNameForPath : utilDisplayName
        const name = getName(entity.properties)
        const width = name && textWidth(name, fontSize)
        let p = null
        if (geometry === GeometryTypeEnum.POINT) {
          geometry = 'point'
          const renderAs = renderNodeAs[entity.wid]
          p = getPointLabel(entity, width, fontSize, renderAs)
        }
        else if (geometry === GeometryTypeEnum.LINE_STRING) {
          geometry = 'line'
          p = getLineLabel(entity, width, fontSize)
        }
        else if (geometry === GeometryTypeEnum.POLYGON) {
          geometry = 'area'
          console.log(geometry)
        }

        if (p) {
          p.classes = `${geometry} tag-${labelStack[k][1]}`
          positions[geometry].push(p)
          labelled[geometry].push(entity)
        }
      }
    }

    function getPointLabel(entity: any, width: any, height: number | string, geometry: string): any {
      height = Number(height)
      const y = (geometry === 'point' ? -12 : 0)
      const pointOffsets: any = {
        ltr: [15, y, 'start'],
        rtl: [-15, y, 'end'],
      }

      const coord = map.latLngToLayerPoint(L.latLng(entity.geometry.coordinates[1], entity.geometry.coordinates[0]))
      const textPadding = 2
      const offset = pointOffsets.ltr
      const p = {
        height,
        width,
        x: coord.x + offset[0],
        y: coord.y + offset[1],
        textAnchor: offset[2],
      }

      // insert a collision box for the text label..
      const bbox = {
        minX: p.x - textPadding,
        minY: p.y - (height / 2) - textPadding,
        maxX: p.x + width + textPadding,
        maxY: p.y + (height / 2) + textPadding,
      }

      if (tryInsert([bbox], entity.id, true))
        return p
    }

    function getLineLabel(entity: any, width: any, height: number | string) {
      height = Number(height)
      const viewport = clipExtent
      const points = entity.geometry.coordinates.map((e: any) => {
        const { x, y } = map.latLngToLayerPoint(L.latLng(e[1], e[0]))
        return [x, y]
      })
      const length = geoPathLength(points)

      if (length < width + 20)
        return

      // % along the line to attempt to place the label
      const lineOffsets = [50, 45, 55, 40, 60, 35, 65, 30, 70,
        25, 75, 20, 80, 15, 95, 10, 90, 5, 95]
      const padding = 3

      for (let i = 0; i < lineOffsets.length; i++) {
        const offset = lineOffsets[i]
        const middle = offset / 100 * length
        const start = middle - width / 2
        if (start < 0 || start + width > length)
          continue
        let sub = subpath(points, start, start + width)
        if (!sub || !geoPolygonIntersectsPolygon(viewport, sub, true))
          continue

        const isReverse = reverse(sub)
        if (isReverse)
          sub = sub.reverse()

        const bboxes = []
        const boxsize = (height + 2) / 2

        for (let j = 0; j < sub.length - 1; i++) {
          const a = sub[j]
          const b = sub[j + 1]
          const num = Math.max(1, Math.floor(geoVecLength(a, b) / boxsize / 2))
          for (let box = 0; box < num; box++) {
            const p = geoVecInterp(a, b, box / num)
            const x0 = p[0] - boxsize - padding
            const y0 = p[1] - boxsize - padding
            const x1 = p[0] + boxsize + padding
            const y1 = p[1] + boxsize + padding

            bboxes.push({
              minX: Math.min(x0, x1),
              minY: Math.min(y0, y1),
              maxX: Math.max(x0, x1),
              maxY: Math.max(y0, y1),
            })
          }
        }

        if (tryInsert(bboxes, entity.wid, false)) {
          return {
            'font-size': height + 2,
            'lineString': lineString(sub),
            'startOffset': `${offset}%`,
          }
        }
      }

      function lineString(points: Array<any>) {
        return `M${points.join('L')}`
      }

      function reverse(p: Array<any>): boolean {
        const angle = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0])
        return !(p[0][0] < p[p.length - 1][0] && angle < Math.PI / 2 && angle > -Math.PI / 2)
      }

      function subpath(points: Array<any>, from: number, to: number) {
        let sofar = 0
        let start, end, i0, i1
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i]
          const b = points[i + 1]
          const current = geoVecLength(a, b)
          let portion
          if (!start && sofar + current >= from) {
            portion = (from - sofar) / current
            start = [
              a.x + portion * (b.x - a.x),
              a.y + portion * (b.y - a.y),
            ]
            i0 = i + 1
          }
          if (!end && sofar + current >= to) {
            portion = (to - sofar) / current
            end = [
              a.x + portion * (b.x - a.x),
              a.y + portion * (b.y - a.y),
            ]
            i1 = i + 1
          }
          sofar += current
        }
        const result = points.slice(i0, i1)
        result.unshift(start)
        result.push(end)
        return result
      }
    }

    // force insert a singular bounding box
    // singular box only, no array, id better be unique
    function doInsert(bbox: any, id: string) {
      bbox.id = id

      const oldbox = _entitybboxes[id]
      if (oldbox)
        _rdrawn.remove(oldbox)

      _entitybboxes[id] = bbox
      _rdrawn.insert(bbox)
    }

    function tryInsert(bboxes: Array<any>, id: string, saveSkipped: boolean): boolean {
      let skipped = false
      for (let i = 0; i < bboxes.length; i++) {
        const bbox = bboxes[i]
        bbox.id = id
        console.log(bbox)
        console.log(rect)

        if (bbox.minX < 0 || bbox.minY < 0 || bbox.maxX > rect.width || bbox.maxY > rect.height) {
          console.log(' min max ')

          skipped = true
          break
        }
        if (_rdrawn.collides(bbox)) {
          console.log('collides')
          skipped = true
          break
        }
      }
      _entitybboxes[id] = bboxes
      if (skipped) {
        if (saveSkipped)
          _rskipped.load(bboxes)
      }
      else {
        _rdrawn.load(bboxes)
      }

      return !skipped
    }

    const layer = selection.selectAll('.labels')
    layer.selectAll('.labels-group')
      .data(['halo', 'label'])
      .enter()
      .append('g')
      .attr('class', (d: string) => { return `labels-group ${d}` })

    const halo = layer.selectAll('.labels-group.halo')
    const label = layer.selectAll('.labels-group.label')

    // points
    drawPointLabels(label, labelled.point, 'pointlabel', positions.point)
    drawPointLabels(halo, labelled.point, 'pointlabel', positions.point)

    // lines
    drawLineLabels(label, labelled.line, 'linelabel', positions.line)
    drawLineLabels(halo, labelled.line, 'linelabel-halo', positions.line)
  }

  return drawLabels
}
