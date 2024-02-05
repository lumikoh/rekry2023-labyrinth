import type { Rotation, Location, VisitedNode } from '../types.js'

export type Walls = Partial<{
  [key in Rotation]: boolean
}>

const diffToRotation: Rotation[][] = [
  [315, 270, 225],
  [0, 0, 180],
  [45, 90, 135],
]

/**
 * Square is a 4 bit number, each bit represents a wall
 * @param square
 * @returns Walls around the square
 */
export const getWalls = (square: number): Walls => {
  const masks = [0b1000, 0b0100, 0b0010, 0b0001] as const

  return {
    0: (square & masks[0]) !== 0,
    90: (square & masks[1]) !== 0,
    180: (square & masks[2]) !== 0,
    270: (square & masks[3]) !== 0,
  }
}

export const rotationToPosition = (rotation: Rotation, position: Location): Location => {
  let x = -1
  let y = -1
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (rotation === diffToRotation[i][j]) {
        return { x: x + i + position.x, y: y + j + position.y }
      }
    }
  }
  return { x: 0, y: 0 }
}

export const determineRotation = (prev: Location, next: Location): Rotation => {
  return diffToRotation[next.x - prev.x + 1][next.y - prev.y + 1]
}

export const determineMove = (previousRotation: Rotation, currentLocation: Location, nextLocation: Location) => {
  const neededRotation = determineRotation(currentLocation, nextLocation)
  let commands = []
  if (neededRotation !== previousRotation) {
    commands.push({
      action: 'rotate',
      rotation: neededRotation,
    })
  }
  commands.push({
    action: 'move',
  })
  return commands
}

export const canCutCorner = (node: Location, otherNode: Location): boolean => {
  return Math.abs(node.x - otherNode.x) === 1 && Math.abs(node.y - otherNode.y) === 1
}

export const canContinueStraight = (node: Location, rotation: Rotation, visited: VisitedNode[][]): boolean => {
  const nextNode = rotationToPosition(rotation, node)
  if (visited[node.x][node.y]['nextTo'].find((n) => n.x === nextNode.x && n.y === nextNode.y)) {
    return true
  }
  return false
}
