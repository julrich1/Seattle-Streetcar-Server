
exports.up = function(knex, Promise) {
  return knex.schema.createTable("streetcars", (table) => {
    table.increments();
    table.specificType("streetcar_id", "smallint").notNullable();
    table.specificType("route_id", "smallint").notNullable();
    table.specificType("location", "point");
    table.timestamps(true, true);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists("streetcars");
};
