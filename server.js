const path = require("path");

const express = require("express");
const app = express();

const morgan = require("morgan");

const updateStreetcars = require("./common/updateStreetcars");
const updateRoutes = require("./common/updateRoutes");

const bodyParser = require("body-parser");
const streetcarsRoute = require("./routes/streetcars.js");
const routesRoute = require("./routes/routes.js");

const API_PATH = "/api/";

const port = process.env.PORT || 3002;

app.disable("x-powered-by");

app.use(morgan("tiny"));
app.use(bodyParser.json());

app.use(API_PATH, streetcarsRoute);
app.use(API_PATH, routesRoute);

app.use("/", express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  console.log(err);
  res.send(err);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

updateRoutes("FHS");
updateRoutes("SLU");

function createTimers() {
  setInterval(updateStreetcars, 2000);
}

createTimers();