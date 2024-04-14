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
    // match with id
    match: (_, { mid }, context) => {
      return context.loaders.match.load(mid);
    },
  },
};

module.exports = {
  matchResolvers,
};
