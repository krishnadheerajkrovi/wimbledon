const matchResolvers = require("./matchResolvers");
const playerResolvers = require("./playerResolvers");

const resolvers = {
  Query: {
    ...playerResolvers.Query,
    ...matchResolvers.Query,
    // Add other Query resolvers if any
  },
  Mutation: {
    ...playerResolvers.Mutation,
    ...matchResolvers.Mutation,
    // Add other Mutation resolvers if any
  },
  Match: {
    ...playerResolvers.Match,
    ...matchResolvers.Match,
    // Add other custom type resolvers if any
  }
};

module.exports = resolvers;
