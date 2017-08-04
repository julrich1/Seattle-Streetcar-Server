const request = require("request");

const express = require("express");

const knex = require("./knex");

const app = express();

let lastTime = 0;

function getStreetcar() {
  request(`http://webservices.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=seattle-sc&r=FHS&t=${lastTime}`, (err, res, body) => {
    if (err) { return; }
    body = JSON.parse(body);
    // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    // console.log('body:', JSON.parse(body)); // Print the HTML for the Google homepage.
    console.log(body);
    
    lastTime = body.lastTime.time;
  });
}

function createTimers() {
  setInterval(getStreetcar, 2000);
}

app.use("/", (req, res, next) => {
  knex("streetcars")
    .then((result) => {

      res.send(result[0].location);
    })
    .catch((err) => {
      next(err);
    });
});

app.use((err, req, res, next) => {
  console.log(err);
  res.send(err);
});

app.listen(8000, () => {
  console.log("Listening on port 8000");
});

createTimers();