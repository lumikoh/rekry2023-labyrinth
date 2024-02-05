import type { Rotation, Location, VisitedNode } from '../types.js'
import { canContinueStraight, determineRotation } from './calculations.js'

let maxDistance: number = 999999999

const isNodeSurrounded = (
  node: Location,
  columns: number,
  rows: number,
  visited: VisitedNode[][],
  unvisited: Location[]
) => {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) {
        continue
      }
      const row = node.x - 1 + i
      const column = node.y - 1 + j
      if (row < 0 || column < 0 || row + 1 > rows || column + 1 > columns) {
        continue
      }

      if (!visited[row][column]['visited']) {
        return false
      }
    }
  }

  for (let i = 0; i < unvisited.length; i++) {
    if (unvisited[i].x === node.x && unvisited[i].y === node.y) {
      unvisited.splice(i, 1)
      break
    }
  }
  visited[node.x][node.y]['visited'] = true

  return true
}

export const dijkstraTwoPoints = (
  start: Location,
  end: Location,
  columns: number,
  rows: number,
  rotation: Rotation,
  visited: VisitedNode[][]
): Location[] => {
  let prevRotation = rotation
  const q = [{ node: start, rotation: prevRotation, distance: 0 }]
  const d = new Array(columns)
  for (let i = 0; i < columns; i++) {
    d[i] = new Array(rows)
    for (let j = 0; j < rows; j++) {
      d[i][j] = { node: null, distance: maxDistance }
    }
  }

  while (q.length > 0) {
    const u = q.shift()
    prevRotation = u.rotation
    if (u['node'].x === end.x && u['node'].y === end.y) {
      let route = [end]
      let current = end
      while (true) {
        current = d[current.x][current.y]['node']
        route.push(current)
        if (current.x === start.x && current.y === start.y) {
          return route.reverse()
        }
      }
    }
    for (const n of visited[u['node'].x][u['node'].y]['nextTo']) {
      let distance = u['distance'] + 1
      const nextRotation = determineRotation(u['node'], n)
      if (nextRotation !== prevRotation) {
        distance = distance + 1
      }
      if (d[n.x][n.y]['distance'] > distance) {
        q.push({ node: n, rotation: nextRotation, distance: distance })
        d[n.x][n.y]['node'] = u['node']
        d[n.x][n.y]['distance'] = distance
      }
    }
    q.sort((a, b) => {
      if (a.distance - b.distance !== 0) {
        return a.distance - b.distance
      }
      if (canContinueStraight(a.node, a.rotation, visited)) {
        return -0.5
      } else if (canContinueStraight(b.node, b.rotation, visited)) {
        return 0.5
      } else {
        return 0
      }
    })
  }
  return null
}

export const dijkstraNearest = (
  start: Location,
  columns: number,
  rows: number,
  rotation: Rotation,
  visited: VisitedNode[][],
  unvisited: Location[]
) => {
  let prevRotation = rotation
  const q = [{ node: start, rotation: prevRotation, distance: 0 }]
  const d = new Array(columns)
  for (let i = 0; i < columns; i++) {
    d[i] = new Array(rows)
    for (let j = 0; j < rows; j++) {
      d[i][j] = { node: null, distance: maxDistance }
    }
  }

  while (q.length > 0) {
    const u = q.shift()
    prevRotation = u.rotation
    if (
      unvisited.find((m) => {
        return m.x === u['node'].x && m.y === u['node'].y
      }) &&
      !isNodeSurrounded(u['node'], columns, rows, visited, unvisited)
    ) {
      let route = [u['node']]
      let current = u['node']

      while (true) {
        current = d[current.x][current.y]['node']
        route.push(current)
        if (current.x === start.x && current.y === start.y) {
          return route.reverse()
        }
      }
    }
    for (const n of visited[u['node'].x][u['node'].y]['nextTo']) {
      let distance = u['distance'] + 1
      const nextRotation = determineRotation(u['node'], n)
      if (nextRotation !== prevRotation) {
        distance = distance + 1
      }
      if (d[n.x][n.y]['distance'] > distance) {
        q.push({ node: n, rotation: nextRotation, distance: distance })
        d[n.x][n.y]['node'] = u['node']
        d[n.x][n.y]['distance'] = distance
      }
    }
    q.sort((a, b) => {
      return a.distance - b.distance
    })
  }
  return null
}
