const express = require("express");
const router = express.Router();

const knex = require("../knex");

const moment = require("moment");

router.get("/streetcars/:routeId", (req, res, next) => {
  const routeId = parseInt(req.params.routeId);

  if (!routeId || isNaN(routeId)) { return next("No route ID specified"); }

  // console.log(moment().subtract(3, "minutes"));
  const startTime = moment().subtract(3, "minutes").format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ");
  // console.log(startTime.toString(), typeof startTime);
  // console.log(  knex.raw(`SELECT * FROM streetcars WHERE created_at >= '${startTime}' AND created_at <= ${knex.fn.now()}`).toString())
  knex.raw(`SELECT DISTINCT ON (streetcar_id) * FROM streetcars WHERE created_at >= '${startTime}' AND created_at <= ${knex.fn.now()} ORDER BY streetcar_id, created_at DESC`)
    .then((result) => {
      res.send(result.rows);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;