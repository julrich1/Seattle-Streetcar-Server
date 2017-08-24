const express = require("express");
const router = express.Router();

const knex = require("../knex");

const moment = require("moment");

router.get("/streetcars/:routeId", (req, res, next) => {
  const routeId = parseInt(req.params.routeId);

  if (!routeId || isNaN(routeId)) { return next("No route ID specified"); }

  const startTime = moment().subtract(5, "minutes").format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ");

  // console.log(startTime.toString(), typeof startTime);
  // console.log(  knex.raw(`SELECT * FROM streetcars WHERE created_at >= '${startTime}' AND created_at <= ${knex.fn.now()}`).toString())
  // SELECT DISTINCT ON (streetcar_id) ST_AsText(location) route_id FROM streetcars ORDER BY streetcar_id, created_at DESC;
  knex.raw(`SELECT DISTINCT ON (streetcar_id) streetcar_id, ST_X(location::geometry) AS y, ST_Y(location::geometry) AS x, route_id, heading FROM streetcars WHERE created_at >= '${startTime}' ORDER BY streetcar_id, created_at DESC;`)
    .then((result) => {
      res.send(result.rows);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;