const request = require("request");

function fetchArrivals(stops) {
  let queryString = `http://webservices.nextbus.com/service/publicJSONFeed?command=predictionsForMultiStops&a=seattle-sc`;
  
  let route = "FHS";
  for (const stop of stops.fhs) {
    queryString += `&stops=${route}|${stop}`;
  }

  route = "SLU";
  for (const stop of stops.slu) {
    queryString += `&stops=${route}|${stop}`;
  }

  return new Promise((resolve, reject) => {
    request(queryString, (err, res, body) => {
      if (err) { return reject(); }

      let jsonObj;

      try {
        jsonObj = JSON.parse(body);
      }
      catch (e) {
        console.log("There was an error parsing arrivals JSON");
        return;
      }
      
      const result = { slu: {}, fhs: {} };
      let routeTag = "";
      let stopTag;

      if (jsonObj.predictions) {
        for (const prediction of jsonObj.predictions) {
          routeTag = prediction.routeTag.toLowerCase();
          stopTag = parseInt(prediction.stopTag);
          
          result[routeTag][stopTag] = { arrivals: [], stopTitle: prediction.stopTitle, stopId: stopTag };
          
          if (prediction.direction && Array.isArray(prediction.direction.prediction)) {
            for (const stopPrediction of prediction.direction.prediction) {
              result[routeTag][stopTag].arrivals.push(stopPrediction.minutes);
            }
          }
          else {
            result[routeTag][stopTag].arrivals.push("Unknown");
          }
        }

        console.log("Updating arrival times");
        resolve(result);
      }
    });
  });
}

module.exports = fetchArrivals;