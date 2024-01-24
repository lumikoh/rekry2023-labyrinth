import 'dotenv/config'
import fetch from 'node-fetch'
import open from 'open'
import WebSocket from 'ws'
import { Action, GameInstance, Message, NoWayOutState, Rotation, Location, Player } from './types.js'
import { message } from './utils/message.js'
import { getWalls } from './utils/walls.js'

const frontend_base = 'goldrush.monad.fi'
const backend_base = 'goldrush.monad.fi/backend'

let routes = []
let currentRoute = []
let currentLen = 0
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

const determineMove = (player: Player, nextLocation: Location) => {
  const neededRotation = diffToRotation[nextLocation.x-player.position.x+1][nextLocation.y-player.position.y+1]
  let commands = []
  if(neededRotation !== player.rotation) {
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
    const routeLen = routes[currentNode.x][currentNode.y]["route"].length
    currentNode = routes[currentNode.x][currentNode.y]["route"][routeLen-2]
  }
  return route.reverse()
}

// Change this to your own implementation
const generateAction = (gameState: NoWayOutState): Action => {

  if (commandQueue.length !== 0) {
    return commandQueue.shift() as Action
  }
  const { player, square } = gameState
  const { rotation } = player

  if(!startPos) {
    const {start, target, rows, columns} = gameState
    startPos = start
    endPos = target
    for (let i = 0; i < columns; i++) {
      routes.push([])
      visited.push([])
      for (let j = 0; j < rows; j++) {
        routes[i].push({len: 9999, route: []})
        visited[i].push(false)
      }
    }
    visited[start.x][start.y] = true
    routes[start.x][start.y] = {len: 0, route: []}
    currentRoute = [start]

    //console.log(visited)
  }

  const currentPosition = player.position
  //console.log(currentPosition)

  visited[currentPosition.x][currentPosition.y] = true

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

  // console.log(possibleDirections)

  let nextMove = null

  for(const dir of possibleDirections) {
    const adjacent = rotationToPos(dir, currentPosition)

    if(visited[adjacent.x][adjacent.y]) {
      continue
    }

    if(routes[adjacent.x][adjacent.y]["len"] < currentLen + 1) {
      // console.log(routes[adjacent.x][adjacent.y]["len"])
      continue
    } else {
      routes[adjacent.x][adjacent.y] = {len: currentLen +1, route: currentRoute.concat([adjacent])}
    }

    // console.log(adjacent)

    if(!nextMove && 
      !(endPos.x === adjacent.x && endPos.y === adjacent.y)) {
        console.log("test")
        nextMove = adjacent

    } else {

      let nodeExists = false
      for(const node of unvisited) {
        if(node.x === adjacent.x && node.y === adjacent.y) {
          nodeExists = true
          break
        }
      }

      if(!nodeExists && !(endPos.x === adjacent.x && endPos.y === adjacent.y)) {
        unvisited.push({...adjacent, distance: currentLen+1})
      }
    }

  }
  currentRoute.push(nextMove)
  if(nextMove) {
    commandQueue = determineMove(player, nextMove)
  }
  console.log(commandQueue)

  if (commandQueue.length !== 0) {
    currentLen++
    return commandQueue.shift() as Action
  }

  console.log("moving")

  console.log(currentLen)

  console.log(unvisited[0])

  if(unvisited.length !== 0) {
    unvisited.sort(function(a,b){return a.distance - b.distance})
    const nextNode = unvisited.shift()
    currentRoute = routes[nextNode.x][nextNode.y]["route"].slice()
  } else {
    currentRoute = combineBestRoute()
  }

  let previousRotation = 0 as Rotation
  for (let i = 1; i < currentRoute.length; i++) {
    console.log(i)
    const actions = determineMove({position: currentRoute[i-1], rotation: previousRotation}, currentRoute[i])
    
    if(actions.length == 2) {
      previousRotation = actions[0].rotation
    }
    commandQueue = commandQueue.concat(actions)
  
  }
  
  currentLen = currentRoute.length-1

  console.log(commandQueue)

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
