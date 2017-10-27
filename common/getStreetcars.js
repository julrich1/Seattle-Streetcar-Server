const knex = require("../knex");
const request = require("request");
const moment = require("moment");

let lastTime = 0;

function convertVehicles(vehicles, routeId) {
  let result = [];

  if (!Array.isArray(vehicles)) { vehicles = [vehicles]; }
  for (const vehicle of vehicles) {
    let newVehicle = {};

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

function convertVehiclesFriendlyLatLon(vehicles) {
  let result = [];

  if (!Array.isArray(vehicles)) { vehicles = [vehicles]; }
  for (const vehicle of vehicles) {
    let newVehicle = {};

    newVehicle.streetcar_id = vehicle.id;
    newVehicle.y = vehicle.lon;
    newVehicle.x = vehicle.lat;

    result.push(newVehicle);
  }

  return result;
}

function getStreetcars() {
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
      const friendlyVehicleData = convertVehiclesFriendlyLatLon(body.vehicle);
      const vehicleData = convertVehicles(body.vehicle, 1);

      console.log(`${vehicleData.length} New Results Found`);

      knex("streetcars").insert(vehicleData)
        .then(() => {
          calcIdleTimes(friendlyVehicleData);
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

function calcIdleTimes(streetcars) {
  const promises = [];

  for (const streetcar of streetcars) {
    promises.push(getIdleTimes(streetcar));
  }

  return Promise.all(promises)
    .then((result) => {
      for (const set of result) {
        for (const streetcar of streetcars) {
          if (set.streetcar_id == streetcar.streetcar_id) {
            streetcar.idle = moment(set.created_at).fromNow(true);
            delete streetcar.x;
            delete streetcar.y;
          }
        }
      }

      knex("idle_times").insert(streetcars)
        .then(() => {
        })
        .catch((err) => {
          throw err;
        });
    })
    .catch((err) => {
      console.log("Error fetching streetcars", err);
      throw err;
    });
}

function getIdleTimes(streetcar) {  
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
      return result.rows[0];
    })
    .catch((err) => {
      console.log("Error fetching idle times", err);
      throw err;
    });
}

module.exports = getStreetcars;