const knex = require("../knex");
const request = require("request");

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

    result.push(newVehicle);
  }

  return result;
}

function updateStreetcars() {
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

module.exports = updateStreetcars;