# Labyrinth route algorithm

The setup for this project is taken from 
[here](https://github.com/monadoy/rekry2023-sample). 
The template included handling the websocket connection and a randomized route 
through the labyrinth. The logic that determines how to first map the labyrinth
and then the shortest route is implemented by me.

## My solution

My starting point was to poke the game to figure out how the coordinates and 
rotations work. My first draft was a little messy, but I tried to put together 
some kind of BFS algorithm to visit every spot. Saving every route is not 
feasible, and since there is time between the moves anyway, it makes sense to
calculate the best route to any unvisited node after moving to any new 
unvisited node. Since the amount of moves can be reset, it makes sense to first
get a good picture of the whole labyrinth, and only then go for the best route.
It would be possible to implement ways to stop the mapping early and just go
for the solution route, but for this task, I did not find it necessary.

After a bit of trying and cleanup, I landed on a fairly effective way to 
determine routes with 90 degree angles. Every time the character moves to 
a new square, it first maps all neighbouring nodes to a list of all nodes. 
I already took into account that 45 degree angles also exist, but first step 
was to have a working solution. I also added a slightly modified algorithm 
to calculate the route from the start to goal, once all known nodes are 
visited. The goal is initially set as visited so that the game doesn't end 
too early.

The program works in different steps depending on what the current state is.
The commands are executed as a command queue, so that each time the program
is ready to send a command, it first looks if there are commands that are 
still not executed. If not, it evaluates the next move.

When I had all of this working in a reasonable manner, I started to look at
diagonal movement. I had already laid the groundwork for it, so it was as 
simple as adding a way to check for nodes that are diagonally connected.

Next part was to change the algorithm from DFS to Dijkstra's, which is fairly
straightforward and part of my plan initially. Turning is counted as a move,
so it should be evaluated when determining the cost of a move. Slight 
structural changes were in order, but nothing too massive.

Then I added some further optimizations, that are not massive but I chose to 
calculate the best next unvisited node from start as well. Reset takes one 
action, so it needs to be taken into account as well, but in general this
helps a lot in situations where the next best unexplored node is closer to the
start than the current position. Then I also added a way to ignore nodes that
are completely surrounded already, as that means they are already mapped.

## Improvement ideas

Most of these ideas are improvements I'd like to make, but I don't necessarily
have time to do so. I'm mainly listing them to show where I'd go next with 
this.

- Parallel execution would make this work way better, as the calculations 
  could be ran while the program is waiting. This is something I might try to 
  add, as it's not very far from the current solution.
- A better way to calculate the route: The solution does not find the absolute 
  best route, as sometimes the same distance between two nodes is not equal
  due to some ways of going around corners can take one extra turn in between.
  This could be improved in few different ways, one that is not too taxing on
  processing power is that the length of the current possible straight line
  could be used as a condition. This is something I might still try to 
  implement as it could help with finding a sligthly better route.
- Cleaner overall structure, as I'm not entirely happy with how the project is
  structured. It does it's job well enough though, if I try to implement 
  the first improvement, this might be quite easily done with it.
- Mapping the diagonal nodes might not take into account every case currently,
  and further investigation should be done. This might actually just fix the
  pathing entirely, if that's the problem.
- Ways to prioritize certain areas of the map or otherwise being more 
  deterministic with the mapping. This might not help much though as the later
  routes go all over the grid.

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