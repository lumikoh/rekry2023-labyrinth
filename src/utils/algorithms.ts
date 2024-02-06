import type { Rotation, Location, VisitedNode } from '../types.js'
import { determineRotation } from './calculations.js'

// Arbitrary number that is large enough, could be max int as well
const maxDistance: number = 999999999

/**
 * Checks if a node is surrounded by nodes that have already been checked.
 * If that is the case, it is redundant to visit it anymore as all of it's
 * connections are already known.
 * @param node the Location that needs to be checked
 * @param columns number of columns in the game
 * @param rows number of rows in the game
 * @param visited 2D array of visited nodes
 * @param unvisited an array of unvisited Locations
 * @returns true if node is surrounded by visited nodes, false otherwise
 */
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

/**
 * A modified dijkstra's algorithm between two points that considers the
 * actions needed for rotations. In the context of this project, it's used
 * to find a route between the start and the goal, but it works for any
 * nodes as long as a connection exists.
 * @param start starting Location
 * @param end end Location
 * @param columns number of columns in the game
 * @param rows number rows in the game
 * @param rotation starting Rotation
 * @param visited 2D array of visited nodes
 * @returns an array of Locations that represents the route, or null if no
 * route was found
 */
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
      return a.distance - b.distance
    })
  }
  return null
}

/**
 * Finds the closest unvisited node using a modified dijkstra's algorithm that
 * considers the Actions needed for Rotations.
 * @param start starting Location
 * @param columns number columns in the game
 * @param rows number rows in the game
 * @param rotation starting Rotation
 * @param visited 2D array of visited nodes
 * @param unvisited an array of unvisited Locations
 * @returns an array of Locations that represents the route, or null if no
 * route was found
 */
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
