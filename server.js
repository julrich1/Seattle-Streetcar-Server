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

function calculateIdleTime() {
  const startTime = moment().subtract(5, "minutes").format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ");
  
  //knex.raw("SELECT * FROM streetcars WHERE created_at >= NOW() - INTERVAL '20 minutes' AND created_at <= NOW() ORDER BY streetcar_id, created_at DESC;")
  return knex.raw(`
    SELECT DISTINCT ON (streetcar_id) streetcar_id, ST_X(location::geometry) AS y, ST_Y(location::geometry) AS x, route_id, heading, speedkmhr, predictable, updated_at
    FROM streetcars WHERE created_at >= '${startTime}'
    AND route_id = ${1}
    ORDER BY streetcar_id, created_at DESC;`)
    .then((result) => {
      const promises = [];
      // console.log(result);
      for (const streetcar of result.rows) {
        promises.push(queryLocations(streetcar));
      }
      return Promise.all(promises);
    })
    .then((result) => {
      const streetcars = [];

      for (const set of result) {
        streetcars.push({streetcar_id: set.rows[0].streetcar_id, lastMove: moment(set.rows[0].created_at).fromNow(true)});
      }
      // console.log("Result right before return: ", streetcars);
      console.log(streetcars.length);
      return streetcars;
    });
}

function queryLocations(streetcar) {  
  const startTime = moment().subtract(60, "minutes").format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ");
  
  return knex.raw(`
    SELECT location, created_at, streetcar_id
    FROM streetcars
    WHERE location NOT IN (
      SELECT location
      FROM streetcars
      WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(${streetcar.y} ${streetcar.x})'), 40)
      AND streetcar_id = ${streetcar.streetcar_id}
      AND created_at >= '${startTime}'
    )
    AND streetcar_id = ${streetcar.streetcar_id}
    AND created_at >= '${startTime}'
    ORDER BY created_at DESC
    LIMIT 1;
  `)
    .then((result) => {
      console.log(result.rows[0].streetcar_id, moment(result.rows[0].created_at).toString(), streetcar.y, streetcar.x);
      return knex.raw(`
        SELECT location, created_at, streetcar_id
        FROM streetcars
        WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(${streetcar.y} ${streetcar.x})'), 40)
        AND created_at > '${moment(result.rows[0].created_at).format("YYYY-MM-DD HH:mm:ss.SSSSSSZZ")}'
        AND streetcar_id = ${streetcar.streetcar_id}
        ORDER BY created_at ASC
        LIMIT 1;
      `);
    })
    .then((result) => {
      // console.log(result);
      return result;
    });
  // return knex.raw(`
  //   SELECT DISTINCT ON (streetcar_id) streetcar_id, created_at 
  //   FROM streetcars WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(${streetcar.y} ${streetcar.x})'), 40) 
  //   AND streetcar_id = ${streetcar.streetcar_id} 
  //   AND created_at >= '${startTime}'
  //   AND route_id = ${1}
  //   ORDER BY streetcar_id, created_at;`);
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
    body = JSON.parse(body);
        
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

app.listen(3002, () => {
  console.log("Listening on port 3002");
});

createTimers();