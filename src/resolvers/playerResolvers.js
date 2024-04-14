const playerResolvers ={
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
        }
    }
}

module.exports = 
{
    playerResolvers
}