# Labyrinth route algorithm

The setup for this project is taken from [here](https://github.com/monadoy/rekry2023-sample). The template included handling the websocket connection and a randomized route through the labyrinth. The logic that determines how to first map the labyrinth and then the shortest route is implemented by me.

## My solution

My starting point was to poke the game to figure out how the coordinates and rotations work. My first draft was a little messy, but I tried to put together some kind of BFS algorithm to visit every spot.

After a bit of trying and cleanup, I landed on a fairly effective way to determine routes with 90 degree angles. Every time the character moves to a new square, it first maps all neighbouring nodes to a list of all nodes. 

## Requirements
- Node 18
- Yarn v1

## Setup
Copy the `.env.sample` to `.env` and fill it with the correct information.

```sh
# Install dependencies
yarn install

# Run script with nodemon and restart on file change
yarn dev
```