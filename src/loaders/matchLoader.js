const { formatMatch } = require("../utils");
const { ObjectId } = require("mongodb");

//GET MATCHES
async function getMatches(db, keys) {
  keys = keys.map((key) => ObjectId(key));
  let matches = await db
    .collection("match")
    .find({ _id: { $in: keys } })
    .toArray();
  return (
    formatMatch(matches) || new Error(`matches collection does not exist `)
  );
}

module.exports = { getMatches };
