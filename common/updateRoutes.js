const fs = require("fs");
const request = require("request");

function updateRoutes(route) {
  request(`http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=seattle-sc&r=${route}`, (err, res, body) => {
    if (err) { return; }

    fs.writeFile(`./data/${route}-route`, body, (err) => {
      if (err) { console.log(err); }

      console.log("Updating route file " + route);
    });
  });
}

module.exports = updateRoutes;