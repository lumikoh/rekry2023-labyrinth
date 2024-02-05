import { NoWayOutState, Location, Rotation, Action, VisitedNode } from './types.js'
import { dijkstraNearest, dijkstraTwoPoints } from './utils/algorithms.js'
import { canCutCorner, determineMove, getWalls, rotationToPosition } from './utils/calculations.js'

let visited: VisitedNode[][] = []
let unvisited: Location[] = []
let startPos: Location
let endPos: Location
let squaresLeft: number = 0

const addNeighbours = (node: Location, nextNode: Location) => {
  if (
    visited[nextNode.x][nextNode.y]['nextTo'].find((a: Location) => {
      return a.x === node.x && a.y === node.y
    })
  ) {
    return
  }

  visited[nextNode.x][nextNode.y]['nextTo'].push({ ...node })
  visited[node.x][node.y]['nextTo'].push({ ...nextNode })
}

export const setupGame = (gameState: NoWayOutState) => {
  const { rows, columns, start, target } = gameState

  squaresLeft = columns * rows
  console.log('Total nodes: ' + squaresLeft)
  console.log('------------------------------')
  startPos = start
  endPos = target
  for (let i = 0; i < columns; i++) {
    visited.push([])
    for (let j = 0; j < rows; j++) {
      visited[i].push({ visited: false, nextTo: [] })
    }
  }
}

export const queueActions = (gameState: NoWayOutState): Action[] => {
  let commandQueue: Action[] = []

  const { player, square, rows, columns } = gameState

  const currentPosition: Location = player.position

  visited[currentPosition.x][currentPosition.y]['visited'] = true

  squaresLeft--

  if (squaresLeft % 100 === 0) {
    console.log('Unexplored nodes left: ' + squaresLeft)
    console.log('------------------------------')
  }

  for (let i = 0; i < unvisited.length; i++) {
    if (unvisited[i].x === currentPosition.x && unvisited[i].y === currentPosition.y) {
      unvisited.splice(i, 1)
      break
    }
  }

  const walls = getWalls(square)

  const possibleDirections = Object.entries(walls)
    .filter(([_, wall]) => !wall)
    .map(([rotation]) => parseInt(rotation) as Rotation)

  for (const dir of possibleDirections) {
    const adjacent = rotationToPosition(dir, currentPosition)

    if (visited[adjacent.x][adjacent.y]['visited'] === true) {
      continue
    }

    let nodeExists = false
    for (const node of unvisited) {
      if (node.x === adjacent.x && node.y === adjacent.y) {
        nodeExists = true
        break
      }
    }

    if (!nodeExists && !(endPos.x === adjacent.x && endPos.y === adjacent.y)) {
      unvisited.push(adjacent)
    }

    addNeighbours(currentPosition, adjacent)
  }
  for (const n of visited[currentPosition.x][currentPosition.y]['nextTo']) {
    for (const nn of visited[n.x][n.y]['nextTo']) {
      if (canCutCorner(currentPosition, nn)) {
        addNeighbours(currentPosition, nn)
      }
    }
  }

  let route: Location[] = []
  let previousRotation: Rotation = gameState.startRotation

  const routeFromCurrent = dijkstraNearest(currentPosition, columns, rows, previousRotation, visited, unvisited)
  const routeFromStart = dijkstraNearest(startPos, columns, rows, gameState.startRotation, visited, unvisited)

  if (unvisited.length > 0) {
    if (routeFromCurrent.length > routeFromStart.length + 1) {
      route = routeFromStart
      commandQueue = [{ action: 'reset' }]
    } else {
      previousRotation = player.rotation
      route = routeFromCurrent
    }
  } else {
    commandQueue = [{ action: 'reset' }]
    route = dijkstraTwoPoints(startPos, endPos, columns, rows, previousRotation, visited)
    for (const x of route) {
      console.log(x)
      let z = '  '
      for (const y of visited[x.x][x.y]['nextTo']) {
        z += '|x: ' + y.x + ' y: ' + y.y + ' '
      }
      console.log(z)
      console.log('----------------------------')
    }
  }

  for (let i = 1; i < route.length; i++) {
    const commands = determineMove(previousRotation, route[i - 1], route[i])
    commandQueue = commandQueue.concat(commands)
    if (commands.length === 2) {
      previousRotation = commands[0]['rotation']
    }
  }

  return commandQueue
}
