import type { Rotation, Location, Action } from '../types.js'

export type Walls = Partial<{
  [key in Rotation]: boolean
}>

// Helper to convert values between indexes and rotations
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

/**
 * Determines the adjacent location based on the rotation needed to move
 * to it
 * @param rotation current Rotation
 * @param position current Location
 * @returns the determined Location
 */
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

/**
 * Determines the Rotation needed to move between two Locations
 * @param prev current Location
 * @param next next Location
 * @returns the determined Rotation
 */
export const determineRotation = (prev: Location, next: Location): Rotation => {
  return diffToRotation[next.x - prev.x + 1][next.y - prev.y + 1]
}

/**
 * Generates Actions needed to move between two Locations.
 * @param previousRotation current Rotation
 * @param previousLocation current Location
 * @param nextLocation next Location
 * @returns an array of Actions
 */
export const determineMove = (
  previousRotation: Rotation,
  previousLocation: Location,
  nextLocation: Location
): Action[] => {
  const neededRotation = determineRotation(previousLocation, nextLocation)
  let commands: Action[] = []
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

/**
 * Determines whether two Locations are diagonally aligned
 * @param node first Location
 * @param otherNode the other Location
 * @returns true if the Locations are diagonally aligned, false otherwise
 */
export const canCutCorner = (node: Location, otherNode: Location): boolean => {
  return Math.abs(node.x - otherNode.x) === 1 && Math.abs(node.y - otherNode.y) === 1
}
