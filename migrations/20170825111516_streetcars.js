
exports.up = function(knex, Promise) {
  return knex.schema.table("streetcars", (table) => {
    table.specificType("speedkmhr", "smallint");
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table("streetcars", (table) => {
    table.dropColumn("speedkmhr");
  });
};
