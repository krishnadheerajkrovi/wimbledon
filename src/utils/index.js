const { makeExecutableSchema } = require("@graphql-tools/schema");
const { errorType } = require("../constants");
const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs");

function checkValidJSON(file_path) {
  try {
    JSON.parse(fs.readFileSync(file_path, "utf8"));
  } catch (e) {
    return false;
  }
  return true;
}

async function createMongoConnection(config) {
  host = config.host || "localhost";
  port = config.port || 27017;
  opts = config.opts || { useUnifiedTopology: true };
  const connection = new MongoClient(`mongodb://${host}:${port}`, opts);
  await connection.connect();
  database = config.db || "wimbledon";
  const conn = connection.db(database);
  console.log("Connected to Mongo DB Server");
  return conn;
}

function createExecutableSchema(resolvers, typeDefs) {
  return makeExecutableSchema({
    resolvers,
    resolverValidationOptions: {
      requireResolversForAllFields: "ignore",
      requireResolversToMatchSchema: "ignore",
    },
    typeDefs,
  });
}

const getErrorCode = (errorName) => {
  return errorType[errorName];
};

function formatMatch(match) {
  if (match == null) return null;
  if (Array.isArray(match)) {
    return Promise.all(match.map(formatMatch));
  } else {
    let res = Promise.all([
      db
        .collection("player")
        .find({ _id: ObjectId(match.p1_id) })
        .toArray(),
      db
        .collection("player")
        .find({ _id: ObjectId(match.p2_id) })
        .toArray(),
    ]).then((players) => {
      players = formatPlayer(players);
      res = {
        mid: match._id,
        entry_fee_usd_cents: match.entry_fee_usd_cents,
        p1_id: match.p1_id,
        p1: players[0][0],
        p1_points: match?.p1_points ? match.p1_points : 0,
        p2_id: match.p2_id,
        p2: players[1][0],
        p2_points: match?.p2_points ? match.p2_points : 0,
        winner:
          match.p1_points > match.p2_points
            ? players[0][0]
            : match.p2_points == match.p1_points
            ? null
            : players[1][0],
        is_dq: match?.is_dq ? match.is_dq : false,
        is_active: match?.ended_at == null,
        prize_usd_cents: match?.prize_usd_cents,
        age: Math.floor((new Date() - match.created_at) / 1000),
        ended_at: match?.ended_at ? match.ended_at : null,
      };
      return res;
    });
    return res;
  }
}

function formatPlayer(player) {
  if (player == null) return null;

  if (Array.isArray(player)) {
    return player.map(formatPlayer);
  }

  let res = {
    pid: player._id,
    fname: player.fname,
    lname: player.lname,
    name: `${player.fname}${player.lname ? ` ${player.lname}` : ""}`,
    handed: rev_enum[player.handed],
    is_active: player.is_active,
    num_join: player.num_join ? player.num_join : 0,
    num_won: player.num_won ? player.num_won : 0,
    num_dq: player.num_dq ? player.num_dq : 0,
    balance_usd_cents: player.balance_usd_cents,
    total_points: player.total_points ? player.total_points : 0,
    total_prize_usd_cents: player.total_prize_usd_cents
      ? player.total_prize_usd_cents
      : 0,
    efficiency:
      player.num_won / player.num_join ? player.num_won / player.num_join : 0,
    in_active_match: !!player.in_active_match,
  };
  return res;
}

module.exports = {
  checkValidJSON,
  createMongoConnection,
  createExecutableSchema,
  getErrorCode,
  formatMatch,
  formatPlayer,
};
