const fs = require("fs");
const path = require("path");

const request = require("request");

const express = require("express");
const app = express();

const knex = require("./knex");

const morgan = require("morgan");

const bodyParser = require("body-parser");
const streetcarsRouter = require("./routes/streetcars.js");
const routesRouter = require("./routes/routes.js");

const ROUTE_ID = 1; // Associate to "FHS"

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

app.use(streetcarsRouter);
app.use(routesRouter);

app.use("/", express.static(path.join(__dirname, "public")));

let lastTime = 0;

updateRoutes("FHS");

//TO-DO - Make this run once per day
// Maybe check if data changed at all before rewriting the file
function updateRoutes(route) {
  request(`http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=seattle-sc&r=${route}`, (err, res, body) => {
    if (err) { return; }

    fs.writeFile(`./data/${route}-route`, body, (err) => {
      if (err) { console.log(err); }
    });

    // console.log(body.route.path);
    // console.log(body.route.path.length);
  });
}

calculateIdleTime();

function calculateIdleTime() {
  knex.raw("SELECT * FROM streetcars WHERE created_at >= NOW() - INTERVAL '20 minutes' AND created_at <= NOW() ORDER BY streetcar_id, created_at DESC;")
    .then((result) => {
      console.log(result.rows);
    });
}

function convertVehicles(vehicles) {
  let result = [];

  if (!Array.isArray(vehicles)) { vehicles = [vehicles]; }
  for (const vehicle of vehicles) {
    let newVehicle = {};

    // console.log(vehicle);
    newVehicle.streetcar_id = vehicle.id;
    newVehicle.route_id = ROUTE_ID;
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
    body = JSON.parse(body);
        
    lastTime = body.lastTime.time;
    
    if (body.vehicle) {
      const vehicleData = convertVehicles(body.vehicle);

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

app.listen(8000, () => {
  console.log("Listening on port 8000");
});

createTimers();