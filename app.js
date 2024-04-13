const express = require('express')
const app = express()
app.use(express.json())
const path = require('path')
const dbPath = path.join(__dirname, 'cricketMatchDetails.db')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
let db = null
const initializeDBAndServer = async () => {
  try {
    app.listen(3000, () => {
      console.log('Starting server http://localhost/3000/')
    })
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()
app.get('/players/', async (request, response) => {
  const playerQuery = `
  SELECT * FROM player_details ORDER BY player_id`
  const playerArray = await db.all(playerQuery)
  const ans = player => {
    return {
      playerId: player.player_id,
      playerName: player.player_name,
    }
  }
  response.send(playerArray.map(player => ans(player)))
})
app.get('/players/:playerId', async (request, response) => {
  const {playerId} = request.params
  const playerQuery = `
  SELECT * FROM player_details WHERE player_id=${playerId}`
  const playerArray = await db.get(playerQuery)
  response.send({
    playerId: playerArray.player_id,
    playerName: playerArray.player_name,
  })
})
app.put('/players/:playerId', async (request, response) => {
  const {playerId} = request.params
  const playerDetails = request.body
  const {playerName} = playerDetails
  const playerQuery = `
  UPDATE player_details 
  SET
  player_name= '${playerName}'
  WHERE player_id=${playerId}`
  await db.run(playerQuery)
  response.send('Player Details Updated')
})
app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const matchQuery = `
  SELECT * FROM match_details WHERE match_id=${matchId}`
  const matchArray = await db.get(matchQuery)
  response.send({
    matchId: matchArray.match_id,
    match: matchArray.match,
    year: matchArray.year,
  })
})
app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const matchQuery = `
  SELECT * FROM match_details INNER JOIN 
  player_match_score ON player_match_score.match_id=match_details.match_id
  WHERE player_match_score.player_id=${playerId}`
  const matchArray = await db.all(matchQuery)
  const ans = matchArray => {
    return {
      matchId: matchArray.match_id,
      match: matchArray.match,
      year: matchArray.year,
    }
  }
  response.send(matchArray.map(match => ans(match)))
})
app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const matchQuery = `
  SELECT * FROM player_details INNER JOIN player_match_score
  ON player_details.player_id=player_match_score.player_id WHERE
  player_match_score.match_id=${matchId}`
  const matchArray = await db.all(matchQuery)
  const ans = match => {
    return {
      playerId: match.player_id,
      playerName: match.player_name,
    }
  }
  response.send(matchArray.map(match => ans(match)))
})
app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const playerQuery = `
  SELECT player_details.player_id as player_id,
  player_details.player_name as player_name, 
  sum(player_match_score.score) as totalScore,
  sum(player_match_score.fours) as totalFours,
  sum(player_match_score.sixes) as totalSixes
  FROM player_match_score INNER JOIN
  player_details ON 
  player_details.player_id=player_match_score.player_id
  WHERE player_details.player_id=${playerId} GROUP BY player_details.player_id `
  const playerArray = await db.get(playerQuery)
  response.send({
    playerId: playerArray.player_id,
    playerName: playerArray.player_name,
    totalScore: playerArray.totalScore,
    totalFours: playerArray.totalFours,
    totalSixes: playerArray.totalSixes,
  })
})
module.exports = app
