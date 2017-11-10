const fs = require("fs");
const request = require("request");

function updateRoutes(route) {
  return new Promise((resolve, reject) => {
    request(`http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=seattle-sc&r=${route}`, (err, res, body) => {
      if (err) { return reject(); }

      fs.writeFile(`./data/${route}-route`, body, (err) => {
        if (err) { console.log(err); }

        console.log("Updating route file " + route);
      });

      const stopResult = [];
      const routeBody = JSON.parse(body);

      for (const stop of routeBody.route.stop) {
        if (stop.stopId) {
          stopResult.push(stop.stopId);
        }
      }

      resolve(stopResult);
    });
  });
}

module.exports = updateRoutes;