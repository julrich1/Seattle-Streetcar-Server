
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex("streetcars").del()
    .then(function () {
      // Inserts seed entries
      return knex("streetcars").insert([
        {id: 1, streetcar_id: 1, route_id: 1, location: knex.raw("ST_GeographyFromText('SRID=4326;POINT(-122.3148 47.601659)')")}
      ]);
    })
    .then(() => {
      return knex.raw("SELECT setval('streetcars_id_seq', (SELECT MAX(id) FROM streetcars));");
    });
};
