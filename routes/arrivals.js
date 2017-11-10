const express = require("express");
const router = express.Router();

const fetchArrivals = require("../common/fetchArrivals");
const updateRoutes = require("../common/updateRoutes");
const updateStreetcars = require("../common/updateStreetcars");

const stops = { slu: [], fhs: [] };
let arrivals = { slu: {}, fhs: {} }; 

router.get("/routes/:routeId/arrivals/:stops", (req, res, next) => {
  const routeId = parseInt(req.params.routeId);

  const stopIds = req.params.stops.split(",");
  const result = [];

  if (routeId === 1) {
    for (const id of stopIds) {
      if (arrivals.fhs.hasOwnProperty(id)) {
        result.push(arrivals.fhs[id]);
      }
    }
  }
  else if (routeId === 2) {
    for (const id of stopIds) {
      if (arrivals.slu.hasOwnProperty(id)) {
        result.push(arrivals.slu[id]);
      }
    }
  }

  res.send(result);
});

updateRoutes("FHS").then((stopsResult) => {
  stops.fhs = stopsResult;
  return updateRoutes("SLU");
}).then((stopsResult) => {
  stops.slu = stopsResult;
  return fetchArrivals(stops);
}).then((result) => {
  arrivals = result;
});


setInterval(() => { fetchArrivals(stops).then((result) => { arrivals = result; }); }, 20000);  
setInterval(updateStreetcars, 2000);

module.exports = router;