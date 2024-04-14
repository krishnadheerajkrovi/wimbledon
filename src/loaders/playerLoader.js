const { formatPlayer } = require("../utils");

async function getPlayers(db, keys) {
  keys = keys.map((key) => ObjectId(key));
  let players = await db
    .collection("player")
    .find({ _id: { $in: keys } })
    .toArray();
  return (
    players.map(formatPlayer) || new Error(`players collection does not exist `)
  );
}

module.exports = { getPlayers };
