const express = require("express");
const router = express.Router();

const knex = require("../knex");

const moment = require("moment");

router.get("/streetcars/:routeId", (req, res, next) => {
  const routeId = parseInt(req.params.routeId);

  if (!routeId || isNaN(routeId)) { return next("No route ID specified"); }

  const startTime = moment().subtract(5, "minutes").format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ");

  let streetcars = [];

  // SELECT DISTINCT ON (streetcar_id) ST_AsText(location) route_id FROM streetcars ORDER BY streetcar_id, created_at DESC;
  knex.raw(`SELECT DISTINCT ON (streetcar_id) streetcar_id, ST_X(location::geometry) AS y, ST_Y(location::geometry) AS x, route_id, heading, speedkmhr, predictable, updated_at FROM streetcars WHERE created_at >= '${startTime}' AND route_id = ${routeId} ORDER BY streetcar_id, created_at DESC;`)
    .then((result) => {
      const promises = [];      

      streetcars = result.rows;

      for (const streetcar of result.rows) {
        promises.push(getIdleTimes(streetcar));
      }
      return Promise.all(promises);
    })
    .then((result) => {
      for (const set of result) {
        for (const streetcar of streetcars) {
          if (set.streetcar_id === streetcar.streetcar_id) {
            streetcar.idle = moment(set.created_at).fromNow(true);
          }
        }
      }
      res.send(streetcars);      
    })
    .catch((err) => {
      console.log("Error fetching streetcars", err);
      next(err);
    });
});

function getIdleTimes(streetcar) {  
  const startTime = moment().subtract(60, "minutes").format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ");
  
  return knex.raw(`
    SELECT location, created_at, streetcar_id
    FROM streetcars
    WHERE location NOT IN (
      SELECT location
      FROM streetcars
      WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(${streetcar.y} ${streetcar.x})'), 40)
      AND streetcar_id = ${streetcar.streetcar_id}
      AND created_at >= '${startTime}'
    )
    AND streetcar_id = ${streetcar.streetcar_id}
    AND created_at >= '${startTime}'
    ORDER BY created_at DESC
    LIMIT 1;
  `)
    .then((result) => {
      return knex.raw(`
        SELECT location, created_at, streetcar_id
        FROM streetcars
        WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(${streetcar.y} ${streetcar.x})'), 40)
        AND created_at > '${moment(result.rows[0].created_at).format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ")}'
        AND streetcar_id = ${streetcar.streetcar_id}
        ORDER BY created_at ASC
        LIMIT 1;
      `);
    })
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log("Error fetching idle times", err);
      throw err;
    });
}

module.exports = router;