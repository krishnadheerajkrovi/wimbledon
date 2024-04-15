const app = require("./app");
const utils = require("./utils");
const path = require("path");
const node_port = 3000;

async function startServer() {
  try {
    const mongoConfigPath = path.join(__dirname, "config/mongo.json");
    const redisConfigPath = path.join(__dirname, "config/redis.json");
    const validJson = utils.checkValidJSON(mongoConfigPath);
    if (!validJson) {
      process.exit(2);
    } else {
      const mongoConfig = require(mongoConfigPath);
      const redisConfig = require(redisConfigPath);
      const mongoConnection = await utils.createMongoConnection(mongoConfig);
      const redisClient = utils.createRedisClient(redisConfig);
      app.set("db", mongoConnection);
      app.listen(node_port);
      console.log(
        "GraphQL API server running at http://localhost:3000/graphql"
      );
    }
  } catch (error) {
    console.error("An error occurred while starting the server:", error);
    process.exit(1);
  }
}

startServer();
