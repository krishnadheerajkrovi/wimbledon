const {enum_handed} = require('../constants/enums');
const { ObjectId } = require("mongodb");


const playerResolvers = {
  Query: {
    player: (_, { pid }, context) => {
      return context.loaders.player.load(pid);
    },
    players: async (_, { limit = 20, offset = 0, sort = null }, context) => {
      let players = await context.db.collection("player").find().toArray();
      if (players == null) return null;
      if (sort != null) {
        players.sort((a, b) => {
          if (a[sort] < b[sort]) {
            return -1;
          }
          if (a[sort] > b[sort]) {
            return 1;
          }
          return 0;
        });
      }
      return players.slice(offset, offset + limit).map(formatPlayer);
    },
  },
  Mutation: {
    playerCreate: async (_, { playerInput }, context) => {
      let player = {
        fname: playerInput.fname,
        lname: playerInput.lname,
        handed: enum_handed[playerInput.handed],
        balance_usd_cents: playerInput.initial_balance_usd_cents,
        is_active: false,
        num_join: 0,
        num_won: 0,
        num_dq: 0,
        total_points: 0,
        total_prize_usd_cents: 0,
        efficiency: 0,
        in_active_match: false,
      };
      let res = await context.db.collection("player").insertOne(player);
      return context.loaders.player.load(res.insertedId);
    },

    playerUpdate: async (_, { pid, playerInput }, context) => {
      let updated_dict = {};
      if (playerInput.lname != null) {
        updated_dict["lname"] = playerInput.lname;
      }
      if (playerInput.is_active != null) {
        updated_dict["is_active"] = playerInput.is_active;
      }
      let res = await context.db.collection("player").updateOne(
        { _id: ObjectId(pid) },
        {
          $set: updated_dict,
        }
      );
      context.loaders.player.clear(pid);
      context.loaders.player.load(pid);
      return context.loaders.player.load(pid);
    },

    playerDelete: async (_, { pid }, context) => {
      let player = await context.loaders.player.load(ObjectId(pid));
      if (player == null) {
        return new Error((message = `player does not exist`));
      }
      if (player.is_active) {
        return new Error((message = `player is an active player`));
      }

      let res = await context.db
        .collection("player")
        .deleteOne({ _id: ObjectId(pid) });
      if (res.deletedCount > 0) {
        return true;
      }
      return false;
    },

    playerDeposit: async (_, { pid, amount_usd_cents }, context) => {
      let player = await context.loaders.player.load(ObjectId(pid));
      if (player == null) {
        return new Error((message = `player does not exist`));
      }
      let res = await context.db
        .collection("player")
        .updateOne(
          { _id: ObjectId(pid) },
          { $inc: { balance_usd_cents: amount_usd_cents } }
        );
      if (res.matchedCount == 1) {
        context.loaders.player.clear(pid);
        context.loaders.player.load(pid);
        return context.loaders.player.load(pid);
      }
    },
  },
};

module.exports = playerResolvers;
