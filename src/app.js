const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const DataLoader = require("dataloader");
const utils = require("./utils");
const loaders = require("./loaders");
const { createExecutableSchema } = require("./utils");
const fs = require("fs");

const app = express();

const typeDefs = fs
  .readFileSync("./src/schema/schema-v2.graphql")
  .toString("utf-8");
const resolvers = require("./resolvers");
const schema = createExecutableSchema(resolvers, typeDefs);

app.use(
  "/graphql",
  graphqlHTTP(async (req) => ({
    schema,
    graphiql: true,
    context: {
      db: req.app.get("db"),
      loaders: {
        player: new DataLoader((keys) =>
          loaders.getPlayers(req.app.get("db"), keys)
        ),
        match: new DataLoader((keys) =>
          loaders.getMatches(req.app.get("db"), keys)
        ),
      },
    },
  }))
);

module.exports = app;
