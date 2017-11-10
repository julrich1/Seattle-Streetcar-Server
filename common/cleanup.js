// select * from streetcars where created_at < NOW() - INTERVAL '7 days'

const knex = require("../knex");

knex.raw("DELETE FROM streetcars WHERE created_at > NOW() - INTERVAL '7 days'")
  .then((result) => {
    console.log(`Deleted ${result.rowCount} rows`);    
    process.exit();
  });