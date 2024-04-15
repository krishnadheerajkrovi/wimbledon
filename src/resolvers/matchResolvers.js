const { ObjectId } = require("mongodb");

const matchResolvers = {
  Match: {
    mid: ({ mid }, _, context) => {
      return mid;
    },
    title: ({ title }, _, context) => {
      return title;
    },
  },
  Query: {
    match: (_, { mid }, context) => {
      return context.loaders.match.load(mid);
    },
    matches: async (_, { limit = 20, offset = 0, sort = null }, context) => {
      let result = [];
      let active_matches = [];
      let ended_matches = [];
      active_matches = await context.db
        .collection("match")
        .find({ ended_at: null })
        .toArray();
      if (active_matches.length > 0) {
        active_matches = await formatMatch(active_matches);
        Promise.all(active_matches).then((values) => {
          values.sort((a, b) => {
            if (a.prize_usd_cents < b.prize_usd_cents) {
              return 1;
            }
            if (a.prize_usd_cents > b.prize_usd_cents) {
              return -1;
            }
            return 0;
          });
          active_matches = values;
        });
      }
      ended_matches = await context.db
        .collection("match")
        .find({ ended_at: { $ne: null } })
        .toArray();
      if (ended_matches.length > 0) {
        ended_matches = await formatMatch(ended_matches);
        Promise.all(ended_matches).then((values) => {
          values.sort((a, b) => {
            if (a.ended_at < b.ended_at) {
              return 1;
            }
            if (a.ended_at > b.ended_at) {
              return -1;
            }
            return 0;
          });
          ended_matches = values;
        });
      }
      result = [...active_matches, ...ended_matches.slice(0, 4)];
      return result.slice(offset, offset + limit);
    },
  },
  Mutation: {
    //MATCH AWARD
    matchAward: async (_, { mid, pid, points }, context) => {
      let match = await context.loaders.match.load(mid);
      let player = await context.loaders.player.load(pid);

      if (match == null || player == null) {
        return new Error((message = `match or player does not exist`));
      }
      if (match.p1_id == pid || match.p2_id == pid) {
        let inc_dict = {};
        if (match.p1_id == pid) {
          inc_dict.p1_points = points ? points : 0;
        }
        if (match.p2_id == pid) {
          inc_dict.p2_points = points ? points : 0;
        }
        let res = await context.db
          .collection("match")
          .updateOne({ _id: ObjectId(mid) }, { $inc: inc_dict });
        if (res.matchedCount == 1) {
          await context.db
            .collection("player")
            .updateOne(
              { _id: ObjectId(pid) },
              { $inc: { total_points: points ? points : 0 } }
            );
          context.loaders.match.clear(mid);
          context.loaders.match.load(mid);
          return context.loaders.match.load(mid);
        }
      } else {
        return new Error((message = `player is not in match`));
      }
    },
    //MATCH CREATE
    matchCreate: async (
      _,
      { pid1, pid2, entry_fee_usd_cents, prize_usd_cents },
      context
    ) => {
      let player1 = await context.loaders.player.load(pid1);
      let player2 = await context.loaders.player.load(pid2);
      if (player1 == null || player2 == null) {
        return new Error((message = `player does not exist`));
      }
      if (player1.is_active == false || player2.is_active == false) {
        return new Error((message = `player is not active`));
      }
      if (player1.in_active_match || player2.in_active_match) {
        return new Error((message = `player is already in an active match`));
      }
      if (
        player1.balance_usd_cents < entry_fee_usd_cents ||
        player2.balance_usd_cents < entry_fee_usd_cents
      ) {
        return new Error((message = `player does not have enough balance`));
      }
      let match = {
        created_at: new Date(),
        ended_at: null,
        entry_fee_usd_cents: entry_fee_usd_cents,
        is_dq: false,
        p1_id: pid1,
        p1_points: 0,
        p2_id: pid2,
        p2_points: 0,
        prize_usd_cents: prize_usd_cents,
      };
      let res = await context.db.collection("match").insertOne(match);
      let insertedid = res.insertedId;
      let update_dict = {
        $inc: { balance_usd_cents: -entry_fee_usd_cents, num_join: 1 },
        $set: { in_active_match: insertedid },
      };
      await context.db
        .collection("player")
        .updateOne({ _id: ObjectId(pid1) }, update_dict);
      await context.db
        .collection("player")
        .updateOne({ _id: ObjectId(pid2) }, update_dict);
      return context.loaders.match.load(insertedid);
    },
    //MATCH DISQUALIFY
    matchDisqualify: async (_, { mid }, context) => {
      let match = await context.loaders.match.load(mid);
      if (match == null) {
        return new Error((message = `match does not exist`));
      }
      if (match.is_dq) {
        return new Error((message = `match is already disqualified`));
      }
      let update_dict = { is_dq: true, ended_at: new Date() };
      let res = await context.db
        .collection("match")
        .updateOne({ _id: ObjectId(mid) }, { $set: update_dict });
      let res1 = await context.db
        .collection("player")
        .updateOne({ _id: ObjectId(match.p1_id) }, { $inc: { num_dq: 1 } });
      let res2 = await context.db
        .collection("player")
        .updateOne({ _id: ObjectId(match.p2_id) }, { $inc: { num_dq: 1 } });
      if (res.matchedCount == 1) {
        context.loaders.match.clear(mid);
        context.loaders.match.load(mid);
        return context.loaders.match.load(mid);
      }
    },
    //MATCH END
    matchEnd: async (_, { mid }, context) => {
      let match = await context.loaders.match.load(mid);
      if (match == null) {
        return new Error((message = `match does not exist`));
      }
      if (match.ended_at != null) {
        return new Error((message = `match is already ended`));
      }
      let update_dict = { ended_at: new Date() };
      if (match.p1_points > match.p2_points) {
        winner_pid = match.p1_id;
      } else if (match.p1_points < match.p2_points) {
        winner_pid = match.p2_id;
      } else {
        winner_pid = null;
      }

      let res = await context.db
        .collection("match")
        .updateOne({ _id: ObjectId(mid) }, { $set: update_dict });
      if (winner_pid != null) {
        await context.db
          .collection("player")
          .updateOne(
            { _id: ObjectId(winner_pid) },
            { $inc: { balance_usd_cents: match.prize_usd_cents, num_won: 1 } }
          );
      }

      if (res.matchedCount == 1) {
        context.loaders.match.clear(mid);
        await context.loaders.match.load(mid);
        return await context.loaders.match.load(mid);
      }
    },
    matches: async (_, { limit = 20, offset = 0, sort = null }, context) => {
      let matches = await await context.db.collection("match").find().toArray();
      if (matches == null) return null;
      if (sort != null) {
        matches.sort((a, b) => {
          if (a[sort] < b[sort]) {
            return -1;
          }
          if (a[sort] > b[sort]) {
            return 1;
          }
          return 0;
        });
      }
      return matches.slice(offset, offset + limit).map(formatMatch);
    },
  },
};

module.exports = matchResolvers;
