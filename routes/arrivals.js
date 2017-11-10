const express = require("express");
const router = express.Router();

const fetchArrivals = require("../common/fetchArrivals");
const updateRoutes = require("../common/updateRoutes");

const stops = { slu: [], fhs: [] };
let arrivals = { slu: {}, fhs: {} }; 

router.get("/routes/:routeId/arrivals/:stops", (req, res, next) => {
  const routeId = parseInt(req.params.routeId);

  console.log(req.params.routeId, req.params.stops);
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

  // console.log("stopIds : ", stopIds);
  res.send(result);
});

updateRoutes("FHS").then((stopsResult) => {
  stops.fhs = stopsResult;
  console.log("FHS Stops", stopsResult);
});

updateRoutes("SLU").then((stopsResult) => {
  stops.slu = stopsResult;
  console.log("SLU Stops", stopsResult);
});

setInterval(() => { fetchArrivals(stops).then((result) => { arrivals = result; }); }, 5000);  

module.exports = router;