import type { Rotation, Location } from '../types.js'

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
  switch (rotation) {
    case 0:
      return { x: position.x, y: position.y - 1 }
    case 90:
      return { x: position.x + 1, y: position.y }
    case 180:
      return { x: position.x, y: position.y + 1 }
    case 270:
      return { x: position.x - 1, y: position.y }

    default:
      return { x: 0, y: 0 }
  }
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
