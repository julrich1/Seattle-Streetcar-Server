const fs = require("fs");
const path = require("path");

const express = require("express");
const router = express.Router();

router.get("/routes/:routeId", (req, res, next) => {
  const routeId = parseInt(req.params.routeId);

  //TO-DO Add better error handling

  let route;

  if (routeId === 1) { route = "FHS"; }
  if (routeId === 2) { route = "SLU"; }

  const routePath = path.join(__dirname, "../", "data", `${route}-route`);

  fs.readFile(routePath, (err, data) => {
    if (err) { return next(err); }

    res.send(JSON.parse(data));
  });
});

module.exports = router;