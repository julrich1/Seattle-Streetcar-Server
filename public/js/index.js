const UPDATE_INTERVAL = 2000; // Update interval for streetcar changes
const STOP_UPDATE_INTERVAL = 20000; // Update interval for open info window on a stop
const FAVORITES_UPDATE_INTERVAL = 20000; // Update interval for the favorites bar

var map;
let markers = [];
let stops = [];
var favorites = {FHS:[], SLU:[]};
let lastTime = 0;
let activeWindowTimer; // Used to update stop info windows if they are kept open
let route = "FHS";

function initRoute() {
  $.ajax({ url: `http://localhost:8000/routes/1` }).done(function(data) {

    let routeCoords = [];

    for (const path of data.route.path) {
      for (const points of path.point) {
        routeCoords.push({lat: Number(points.lat), lng: Number(points.lon)});
      }

      let routeLines = new google.maps.Polyline({
        path: routeCoords,
        geodesic: true,
        strokeColor: "black",
        strokeOpacity: 0.7,
        strokeWeight: 3
      });

      routeLines.setMap(map);
      routeCoords = [];
    }

    initStops(data.route.stop);
  }).fail(function(data) {
    console.error("There was an error retrieving data from the API.", data);
  });
}

function initStops(stopData) {
  let iterator = 0;

  for (const stop of stopData) {
    stops[iterator] = new google.maps.Marker(
      {
        map: map,
        label: "",
        optimized: false,
        zIndex: 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 4,
          strokeColor: "blue",
          fillColor: "blue",
          fillOpacity: 1
        }
      });

    const coords = {lat: Number(stop.lat), lng: Number(stop.lon)};

    stops[iterator].setPosition(coords);

    stops[iterator].set("stopId", stop.stopId);
    stops[iterator].set("title", stop.title);
    stops[iterator].set("infoWindow", new google.maps.InfoWindow({
      content: stop.title
    }));

    stops[iterator].addListener("click", function() {
      getArrivalTime(this);
      closeAllInfoWindows();
      activeWindowTimer = setInterval(getArrivalTime, STOP_UPDATE_INTERVAL, this);
      this.infoWindow.open(map, this);
    });

    iterator++;
  }
}

function getArrivalTime(stop) {
  $.ajax({ url: `http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=seattle-sc&r=${route}&s=${stop.stopId}` }).done(function(data) {
    // If an error is returned - Can happen when a stop is at the end of the line and contains no arrival info.
    if (data.Error) { return; }

    let contentString = "";

    contentString += `<div class="stop-header"><h3>${stop.title}</h3>`;
    contentString = addFavoriteButton(contentString, stop);
    contentString += "<h4>Arrivals:</h4>";
    contentString += "<ol class=\"arrival-info\">";

    for (const arrivalTime of data.predictions.direction.prediction) {
      contentString += `<li>${arrivalTime.minutes} mins</li>`;
    }

    contentString += "</ul>";

    stop.infoWindow.setContent(contentString, stop);

    addFavoriteListener(stop);

  }).fail(function(data) {
    console.error("There was an error retrieving data from the API.", data);
  });
}

function addFavoriteButton(content, stop) {
  let icon = "star";

  if (!isFavorited(stop.stopId)) {
    icon = "star_border";
  }

  content += `<i class="material-icons yellow-text fav-star pointer" id="${stop.stopId}">${icon}</i></div>`;

  return content;
}

function addFavoriteListener(stop) {
  $(`#${stop.stopId}`).click(function (){
    toggleFavorite(stop);

    if (isFavorited(stop.stopId)) {
      $(`#${stop.stopId}`).text("star");
    }
    else {
      $(`#${stop.stopId}`).text("star_border");
    }
  });
}

function isFavorited(stopId) {
  for (const favorite of favorites[route]) {
    if (favorite.stopId === stopId) {
      return true;
    }
  }
  return false;
}

function getStreetCarDataInitial() {
  $.ajax({ url: `http://localhost:8000/streetcars/1` }).done(function(data) {

    // lastTime = data.lastTime.time;

    let iterator = 0;

    for (const vehicle of data) {
      markers[iterator] = new google.maps.Marker(
        {
          map: map,
          label: "",
          duration: 2000,
          easing: "easeInQuad",
          speedMph: convertKmHrToMph(vehicle.speedKmHr),
          markerLastTime: vehicle.secsSinceReport,
          zIndex: 10,
          optimized: false,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            rotation: 0,
            fillOpacity: 1
          }
        });

      markers[iterator].set("id", vehicle.streetcar_id);
      
      const fillColor = getIconColor();

      markers[iterator].icon.strokeColor = fillColor;
      markers[iterator].icon.fillColor = fillColor;

      markers[iterator].set("infoWindow", new google.maps.InfoWindow({
        content: ""
      }));

      markers[iterator].addListener("click", function() {
        closeAllInfoWindows();
        this.infoWindow.open(map, this);
      });

      console.log(vehicle);
      setStreetCarRotation(markers[iterator], vehicle.heading);
      setStreetCarPosition(markers[iterator], {lat: Number(vehicle.x), lng: Number(vehicle.y)});

      updateStreetcarInfoWindow(markers[iterator]);

      iterator++;
    }

    setInterval(getStreetCarData, UPDATE_INTERVAL);
    setInterval(updateIntervals, 1000);
  }).fail(function(data) {
    console.error("There was an error retrieving data from the API.", data);
  });
}

function getStreetCarData() {
  $.ajax({ url: `http://localhost:8000/streetcars/1` }).done(function(data) {

    if (!data) {
      return;
    }

    // If the AJAX call returns one element, convert it into an array for data consistency.
    // if (!Array.isArray(data)) {
    //   data.vehicle = [data.vehicle];
    // }

    // lastTime = data.lastTime.time;

    for (const vehicle of data) {
      const coords = {lat: Number(vehicle.x), lng: Number(vehicle.y)};
      const marker = findMarkerById(vehicle.streetcar_id);

      if (!marker) {
        console.error("Couldn't find marker!", vehicle.streetcar_id);
      }
      else {
        marker.set("markerLastTime", vehicle.secsSinceReport);
        marker.set("speedMph", convertKmHrToMph(vehicle.speedKmHr));
        setStreetCarRotation(marker, vehicle.heading);
        setStreetCarPosition(marker, coords);
      }
    }
  }).fail(function(data, status, error) {
    console.error("There was an error retrieving data from the API.", data, status, error);
  });
}

function convertKmHrToMph(speed) {
  return speed === undefined ? "N/A" : Math.round(speed * 0.62137119223733) + " Mph";
}

// Updates the time for each info window
function updateIntervals() {
  for (const marker of markers) {
    const markerLastTime = Number(marker.get("markerLastTime"));
    marker.set("markerLastTime", markerLastTime + 1);
    updateAllStreetcarInfoWindows();
  }
}

function updateStreetcarInfoWindow(marker) {
  const lat = marker.getPosition().lat().toFixed(6);
  const lng = marker.getPosition().lng().toFixed(6);

  const contentString = `<ul>
    <li>Last Updated: ${marker.markerLastTime} seconds ago</li>
    <li>Last Speed: ${marker.speedMph}</li>
    <li>Location: ${lat}, ${lng}</li>
    </ul>`;

  marker.infoWindow.setContent(contentString);
}

function updateAllStreetcarInfoWindows() {
  for (const marker of markers) {
    updateStreetcarInfoWindow(marker);
  }
}

function setStreetCarPosition(marker, coords) {
  marker.setPosition(coords);
}

function setStreetCarRotation(marker, degrees) {
  marker.icon.rotation = Number(degrees);
  marker.setIcon(marker.icon);
}

function findMarkerById(id) {
  for (const marker of markers) {
    if (marker.id === id) {
      return marker;
    }
  }
  return null;
}

function initMap() {
  let centerRoute;

  switch (route) {
  case "FHS":
    centerRoute = {lat: 47.609809, lng: -122.320826};
    break;
  case "SLU":
    centerRoute = {lat: 47.621358, lng: -122.338190};
    break;
  }
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 15,
    center: centerRoute,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    clickableIcons: false
  });

  map.addListener("click", function() {
    closeAllInfoWindows();
  });
}

function getIconColor() {
  let fillColor = "green";

  return fillColor;
}

function closeAllInfoWindows() {

  clearInterval(activeWindowTimer);

  for (const stop of stops) {
    stop.infoWindow.close();
  }

  for (const marker of markers) {
    marker.infoWindow.close();
  }
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));

  getFavoritesArrivalTimes();
  drawFavorites();
}

function toggleFavorite(stop) {
  let iterator = 0;

  for (const favorite of favorites[route]) {
    if (favorite.stopId === stop.stopId) {
      favorites[route].splice(iterator, 1);
      saveFavorites();
      return;
    }
    iterator++;
  }

  favorites[route].push({stopId:stop.stopId, title:stop.title});

  saveFavorites();
}

function getFavorites() {
  const data = JSON.parse(localStorage.getItem("favorites"));

  if (data) {
    favorites = data;
  }
  getFavoritesArrivalTimes();
  drawFavorites();
}

function getFavoritesArrivalTimes() {
  if (favorites[route].length === 0) {
    return;
  }

  const queryString = getFavoritesQueryString();

  $.ajax({ url: `http://webservices.nextbus.com/service/publicJSONFeed?command=predictionsForMultiStops&a=seattle-sc${queryString}` }).done(function(data) {

    // If the AJAX call returns one element, convert it into an array for data consistency.
    if (!Array.isArray(data.predictions)) {
      data.predictions = [data.predictions];
    }

    let arrivalTime = "Arriving in ";
    let stopTag = "";

    for (const predictions of data.predictions) {
      stopTag = predictions.stopTag;
      for (const time of predictions.direction.prediction) {
        arrivalTime += `${time.minutes}, `;
      }
      arrivalTime = arrivalTime.slice(0, arrivalTime.length-2);
      arrivalTime += " mins";

      addArrivalTime(stopTag, arrivalTime);

      stopTag = "";
      arrivalTime = "Arriving in ";
    }

    updateFavoritesArrivalTimes();

  }).fail(function() {
    console.error("There was an error retrieving data from the API.");
  });
}

function updateFavoritesArrivalTimes() {
  if (favorites[route].length === 0) {
    return;
  }

  for (const favorite of favorites[route]) {
    $(`#fav-${favorite.stopId} .collapsible-body .arrivalTime`).text(favorite.arrivalTimes);
  }
}

function getFavoritesQueryString() {
  let queryString = "";

  for (const favorite of favorites[route]) {
    queryString += `&stops=${route}|${favorite.stopId}`;
  }

  return queryString;
}

function addArrivalTime(stopTag, arrivalTimes) {
  for (const favorite of favorites[route]) {
    if (favorite.stopId === stopTag) {
      favorite.arrivalTimes = arrivalTimes;
    }
  }
}

function drawFavorites() {
  const $collapsible = $(".collapsible");

  $collapsible.empty();

  if (favorites[route].length === 0) {
    const $stopDiv = $("<div>").addClass("collapsible-header").text("No Favorites Selected");
    $collapsible.append($stopDiv);
    $(".collapsible").collapsible();

    return;
  }

  for (const favorite of favorites[route]) {
    const $collapseLi = $("<li>").attr("id", `fav-${favorite.stopId}`);
    const $stopDiv = $("<div>").addClass("collapsible-header active").text(favorite.title);
    const $stopInfo = $("<div>").addClass("collapsible-body");
    const $bodyUl = $("<ul>");
    const $bodyLiArrivalTimes = $("<li>").addClass("arrivalTime").text(favorite.arrivalTimes);
    const $stopIcon = $("<i>").addClass("material-icons favorite-icon").text("directions_railway");

    $bodyUl.append($bodyLiArrivalTimes);
    $stopInfo.append($bodyUl);
    $stopDiv.append($stopIcon);
    $collapseLi.append($stopDiv, $stopInfo);
    $collapsible.append($collapseLi);
  }

  $(".collapsible").collapsible();
}

function getParams() {
  let queryString = window.location.search.slice(1);

  queryString = queryString.split("=");

  if (queryString[0] === "route") {
    switch (queryString[1]) {
    case "FHS":
      route = "FHS";
      break;
    case "SLU":
      route = "SLU";
      break;
    }
  }
}

getParams();
$(".button-collapse").sideNav();
initMap();
initRoute();
getStreetCarDataInitial();
getFavorites();
setInterval(getFavoritesArrivalTimes, FAVORITES_UPDATE_INTERVAL);
