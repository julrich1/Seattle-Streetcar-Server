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

  console.log("Query string is: ", queryString);

  return new Promise((resolve, reject) => {
    request(queryString, (err, res, body) => {
      if (err) { return reject(); }

      const jsonObj = JSON.parse(body);
      const result = { slu: {}, fhs: {} };
      let routeTag = "";
      let stopTag;

      for (const prediction of jsonObj.predictions) {
        routeTag = prediction.routeTag.toLowerCase();
        stopTag = parseInt(prediction.stopTag);
        
        result[routeTag][stopTag] = [];
        
        for (const stopPrediction of prediction.direction.prediction) {
          result[routeTag][stopTag].push(stopPrediction.minutes);
        }
      }

      console.log(result);
    });
  });
}

module.exports = fetchArrivals;