const path = require("path");

const express = require("express");
const app = express();

const morgan = require("morgan");

const streetcarsRoute = require("./routes/streetcars");
const routesRoute = require("./routes/routes");
const arrivalsRoute = require("./routes/arrivals");

const bodyParser = require("body-parser");

const API_PATH = "/api/";
const PORT = process.env.PORT || 3002;

app.disable("x-powered-by");

app.use(morgan("tiny"));
app.use(bodyParser.json());

app.use(API_PATH, streetcarsRoute);
app.use(API_PATH, routesRoute);
app.use(API_PATH, arrivalsRoute);

app.use("/", express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  console.log(err);
  res.send(err);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});