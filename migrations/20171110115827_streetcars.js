
exports.up = function(knex, Promise) {
  return knex.schema.alterTable("streetcars", (table) => {
    table.index("created_at");
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.alterTable("streetcars", (table) => {
    table.dropIndex("created_at");
  });
};
