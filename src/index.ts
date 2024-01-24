import 'dotenv/config'
import fetch from 'node-fetch'
import open from 'open'
import WebSocket from 'ws'
import { Action, GameInstance, Message, NoWayOutState, Rotation, Location, Player } from './types.js'
import { message } from './utils/message.js'
import { getWalls } from './utils/walls.js'

const frontend_base = 'goldrush.monad.fi'
const backend_base = 'goldrush.monad.fi/backend'

let visited = []
let unvisited = []
let commandQueue = []
let startPos
let endPos

const diffToRotation = [[315,270,225],[0,0,180],[45,90,135]]

const rotationToPos = (rota: Rotation, pos: Location): Location => {
  switch (rota) {
    case 0:
      return {x: pos.x, y: pos.y-1 }
    case 90:
      return {x: pos.x+1, y: pos.y }
    case 180:
      return {x: pos.x, y: pos.y+1 }
    case 270:
      return {x: pos.x-1, y: pos.y }    
  
    default:
      return {x: 0, y: 0}
  }

}

const determineMove = (previousRotation: Rotation, currentLocation: Location, nextLocation: Location) => {
  const neededRotation = diffToRotation[nextLocation.x-currentLocation.x+1][nextLocation.y-currentLocation.y+1]
  let commands = []
  if(neededRotation !== previousRotation) {
    commands.push({      
      action: 'rotate',
      rotation: neededRotation})
  }
  commands.push({
    action: 'move',
  })
  return commands

}

const canBeTrimmed = (routeTrimmed) => {
  if(routeTrimmed.length > 2) {
    const lastRoute = routeTrimmed[routeTrimmed.length-1]
    const twoBack = routeTrimmed[routeTrimmed.length-3]
    if(Math.abs(twoBack.x-lastRoute.x) === 1 && Math.abs(twoBack.y-lastRoute.y) === 1) {
      return true
    }
  }
  return false
}

const combineBestRoute = () => {
  let route = []
  let currentNode = endPos
  while(true) {
    route.push(currentNode)
    if(currentNode.x === startPos.x && currentNode.y === startPos.y) {
      break
    }
  }
  return route.reverse()
}

const addNeighbours = (node, nextNode) => {
  if(visited[nextNode.x][nextNode.y]["nextTo"].find((a) => {
    return a.x === node.x && a.y === node.y
  })) {
    return
  }

  visited[nextNode.x][nextNode.y]["nextTo"].push({...node})
  visited[node.x][node.y]["nextTo"].push({...nextNode})
} 

const distanceToPoint = (node, target): number => {
  return Math.abs(node.x-target.x) + Math.abs(node.y-target.y)
}

const BFSTwoPoints = (start, end, columns, rows) => {
  const q = [start]
  const d = new Array(columns)
  for(let i = 0; i < columns; i++) {
    d[i] = new Array(rows)
    d[i].fill(null)
  }

  while(q.length > 0) {
    const u = q.shift()
    if(u.x === end.x && u.y === end.y) {
      let route = [end]
      let current = end
      while(true) {
        current = d[current.x][current.y]
        route.push(current)
        if(current.x === start.x && current.y === start.y) {
          return route.reverse()
        }
      }
    }
    for(const n of visited[u.x][u.y]["nextTo"]) {
      if(!d[n.x][n.y]) {
        q.push(n)
        d[n.x][n.y] = u
      }
    }
  }
  return null
}


const generateAction = (gameState: NoWayOutState): Action => {

  if (commandQueue.length !== 0) {
    return commandQueue.shift() as Action
  }
  const { player, square, rows, columns } = gameState
  const { rotation } = player

  if(!startPos) {
    const {start, target} = gameState
    startPos = start
    endPos = target
    for (let i = 0; i < columns; i++) {
      visited.push([])
      for (let j = 0; j < rows; j++) {
        visited[i].push({visited: false, nextTo: []})
      }
    }
  }

  const currentPosition = player.position

  visited[currentPosition.x][currentPosition.y]["visited"] = true

  for(let i = 0; i < unvisited.length; i++) {
    if(unvisited[i].x === currentPosition.x && unvisited[i].y === currentPosition.y) {
      unvisited.splice(i, 1)
      break
    }
  }

  const walls = getWalls(square)

  const possibleDirections = Object.entries(walls)
    .filter(([_, wall]) => !wall)
    .map(([rotation]) => parseInt(rotation) as Rotation)

  for(const dir of possibleDirections) {
    const adjacent = rotationToPos(dir, currentPosition)

    if(visited[adjacent.x][adjacent.y]["visited"] === true) {
      console.log("already visited")
      continue
    }

    let nodeExists = false
    for(const node of unvisited) {
      if(node.x === adjacent.x && node.y === adjacent.y) {
        nodeExists = true
        break
      }
    }

    if(!nodeExists && !(endPos.x === adjacent.x && endPos.y === adjacent.y)) {
      unvisited.push(adjacent)
    }

    addNeighbours(currentPosition, adjacent)

  }


  let route = []
  let previousRotation = gameState.startRotation

  if(unvisited.length > 0) {
    unvisited.sort((a,b) => {
      return distanceToPoint(currentPosition,a) - distanceToPoint(currentPosition,b)
    })
    route = BFSTwoPoints(currentPosition, unvisited[0], columns, rows)
    previousRotation = player.rotation
  } else {
    commandQueue.push({action: "reset"})
    route = BFSTwoPoints(startPos, endPos, columns, rows)
  }

  for(let i = 1; i < route.length; i++) {
    const commands = determineMove(previousRotation, route[i-1], route[i])
    commandQueue = commandQueue.concat(commands)
    if(commands.length === 2) {
      previousRotation = commands[0]["rotation"]
    }
  }

  if (commandQueue.length !== 0) {
    return commandQueue.shift() as Action
  }

  return {
    action: 'reset',
  }

}

const createGame = async (levelId: string, token: string) => {
  const res = await fetch(`https://${backend_base}/api/levels/${levelId}`, {
    method: 'POST',
    headers: {
      Authorization: token,
    },
  })

  if (!res.ok) {
    console.error(`Couldn't create game: ${res.statusText} - ${await res.text()}`)
    return null
  }

  return res.json() as any as GameInstance // Can be made safer
}

const main = async () => {
  const token = process.env['PLAYER_TOKEN'] ?? ''
  const levelId = process.env['LEVEL_ID'] ?? ''

  const game = await createGame(levelId, token)
  if (!game) return

  const url = `https://${frontend_base}/?id=${game.entityId}`
  console.log(`Game at ${url}`)
  await open(url) // Remove this if you don't want to open the game in browser

  await new Promise((f) => setTimeout(f, 2000))
  const ws = new WebSocket(`wss://${backend_base}/${token}/`)

  ws.addEventListener('open', () => {
    ws.send(message('sub-game', { id: game.entityId }))
  })

  ws.addEventListener('message', ({ data }) => {
    const [action, payload] = JSON.parse(data.toString()) as Message<'game-instance'>

    if (action !== 'game-instance') {
      console.log([action, payload])
      return
    }

    // New game tick arrived!
    const gameState = JSON.parse(payload['gameState']) as NoWayOutState
    const commands = generateAction(gameState)

    setTimeout(() => {
      ws.send(message('run-command', { gameId: game.entityId, payload: commands }))
    }, 100)
  })
}

await main()
