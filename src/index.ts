import 'dotenv/config'
import fetch from 'node-fetch'
import open from 'open'
import WebSocket from 'ws'
import { Action, GameInstance, Message, NoWayOutState } from './types.js'
import { message } from './utils/message.js'
import { queueActions, setupGame } from './gameController.js'

const frontend_base = 'goldrush.monad.fi'
const backend_base = 'goldrush.monad.fi/backend'

// This is used as a slightly hacky solutions to keep executing actions one
// by one within the frame of the given template.
let commandQueue: Array<Action> = []
let gameRunning: boolean = false

/**
 * Generates the next Action needed to traverse the labyrinth
 * @param gameState current game state (NoWayOutState)
 * @returns The next Action
 */
const generateAction = (gameState: NoWayOutState): Action => {
  if (commandQueue.length !== 0) {
    return commandQueue.shift() as Action
  }

  if (!gameRunning) {
    setupGame(gameState)

    gameRunning = true
  }

  commandQueue = queueActions(gameState)

  if (commandQueue.length !== 0) {
    return commandQueue.shift() as Action
  }

  return {
    action: 'reset',
  }
}

/**
 * Generates a new game based on the given level id and player token.
 * @param levelId level id for the game as a string
 * @param token player token as a string
 * @returns A promise of the GameInstance
 */
const createGame = async (levelId: string, token: string): Promise<GameInstance> => {
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

  return res.json() as Promise<GameInstance>
}

/**
 * Controls the main flow of the game
 */
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
    const gameState: NoWayOutState = JSON.parse(payload['gameState']) as NoWayOutState
    const commands = generateAction(gameState)

    setTimeout(() => {
      ws.send(message('run-command', { gameId: game.entityId, payload: commands }))
    }, 100)
  })
}

await main()
