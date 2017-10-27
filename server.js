const fs = require("fs");
const path = require("path");

const request = require("request");

const express = require("express");
const app = express();

const knex = require("./knex");

const morgan = require("morgan");

const moment = require("moment");

const bodyParser = require("body-parser");
const streetcarsRoute = require("./routes/streetcars.js");
const routesRoute = require("./routes/routes.js");

const API_PATH = "/api/";

app.disable("x-powered-by");

app.use(morgan("tiny"));
app.use(bodyParser.json());

// Sample query to insert new streetcar into DB
// insert into streetcars values (DEFAULT, 500, 1, ST_GeographyFromText('SRID=4326;POINT(-122.320911 47.618008)'), 181, 't');

// app.all("*", function(req, res, next) {
//   // res.header("Access-Control-Allow-Origin", "*");
//   // res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
//   // res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
//   return next();
// });

app.use(API_PATH, streetcarsRoute);
app.use(API_PATH, routesRoute);
app.get(API_PATH + "idletimes", (req, res) => {
  calculateIdleTime().then((result) => {
    res.send(result);
  });
  
}); 

app.use("/", express.static(path.join(__dirname, "public")));

let lastTime = 0;

updateRoutes("FHS");
updateRoutes("SLU");

//TO-DO - Make this run once per day
// Maybe check if data changed at all before rewriting the file
function updateRoutes(route) {
  request(`http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=seattle-sc&r=${route}`, (err, res, body) => {
    if (err) { return; }

    fs.writeFile(`./data/${route}-route`, body, (err) => {
      if (err) { console.log(err); }
    });
  });
}

function convertVehicles(vehicles, routeId) {
  let result = [];

  if (!Array.isArray(vehicles)) { vehicles = [vehicles]; }
  for (const vehicle of vehicles) {
    let newVehicle = {};

    // console.log(vehicle);
    newVehicle.streetcar_id = vehicle.id;
    newVehicle.route_id = routeId;
    newVehicle.location = knex.raw(`ST_GeographyFromText('SRID=4326;POINT(${vehicle.lon} ${vehicle.lat})')`);
    newVehicle.heading = vehicle.heading;
    newVehicle.predictable = vehicle.predictable;
    newVehicle.speedkmhr = vehicle.speedKmHr;
    // knex.raw("ST_GeographyFromText('SRID=4326;POINT(-122.3148 47.601659)')")

    result.push(newVehicle);
  }

  return result;
}

function getStreetcar() {
  request(`http://webservices.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=seattle-sc&r=FHS&t=${lastTime}`, (err, res, body) => {
    if (err) { return; }

    try {
      body = JSON.parse(body);
    } catch(e) {
      console.log(`Error parsing JSON: ${e}`);
      return;
    }
        
    lastTime = body.lastTime.time;
    
    if (body.vehicle) {
      const vehicleData = convertVehicles(body.vehicle, 1);

      console.log(`${vehicleData.length} New Results Found`);

      knex("streetcars").insert(vehicleData)
        .then((result) => {
          
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });

  request(`http://webservices.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=seattle-sc&r=SLU&t=${lastTime}`, (err, res, body) => {
    if (err) { return; }

    try {
      body = JSON.parse(body);
    } catch(e) {
      console.log(`Error parsing JSON: ${e}`);
      return;
    }        
    lastTime = body.lastTime.time;
    
    if (body.vehicle) {
      const vehicleData = convertVehicles(body.vehicle, 2);

      console.log(`${vehicleData.length} New Results Found`);

      knex("streetcars").insert(vehicleData)
        .then((result) => {
          
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });
}

function createTimers() {
  setInterval(getStreetcar, 2000);
}

app.use((err, req, res, next) => {
  console.log(err);
  res.send(err);
});

const port = process.env.PORT || 3002;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

createTimers();