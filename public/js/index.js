const UPDATE_INTERVAL = 2000; // Update interval for streetcar changes
const STOP_UPDATE_INTERVAL = 20000; // Update interval for open info window on a stop
const FAVORITES_UPDATE_INTERVAL = 20000; // Update interval for the favorites bar
const INFO_WINDOW_UPDATE_INTERVAL = 1000; // Update interval for the info window times

let map;
let markers = [];
let stops = [];
var favorites = {FHS:[], SLU:[]};
let lastTime = 0;
let activeWindowTimer; // Used to update stop info windows if they are kept open
let route = "FHS";
let routeId = 1;

function initRoute() {
  $.ajax({ url: `/api/routes/${routeId}` }).done(function(data) {

    let routeCoords = [];

    for (const path of data.route.path) {
      for (const points of path.point) {
        routeCoords.push({lat: Number(points.lat), lng: Number(points.lon)});
      }

      let routeLines = new google.maps.Polyline({
        path: routeCoords,
        geodesic: true,
        strokeColor: "black",
        strokeOpacity: 0.5,
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
          strokeColor: "#2a4f64",
          fillColor: "#2a4f64",
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

function deleteStreetcarMarker(index) {
  markers[index].setMap(null);

  markers.splice(index, 1);
}

function createStreetcarMarker(vehicle) {
  markers.push(new google.maps.Marker(
    {
      map: map,
      label: "",
      duration: 2000,
      easing: "easeInQuad",
      speedMph: convertKmHrToMph(vehicle.speedkmhr),
      markerLastTime: vehicle.updated_at,
      predictable: vehicle.predictable,
      idle: vehicle.idle,
      zIndex: 10,
      optimized: false,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        rotation: 0,
        fillOpacity: 1
      }
    }));

  const currentEle = markers.length - 1;

  markers[currentEle].set("id", vehicle.streetcar_id);
  
  setColor(markers[currentEle]);
  // const fillColor = getIconColor(markers[currentEle].predictable);

  // markers[currentEle].icon.strokeColor = fillColor;
  // markers[currentEle].icon.fillColor = fillColor;

  markers[currentEle].set("infoWindow", new google.maps.InfoWindow({
    content: ""
  }));

  markers[currentEle].addListener("click", function() {
    closeAllInfoWindows();
    this.infoWindow.open(map, this);
  });

  setStreetCarRotation(markers[currentEle], vehicle.heading);
  setStreetCarPosition(markers[currentEle], {lat: Number(vehicle.x), lng: Number(vehicle.y)});

  updateStreetcarInfoWindow(markers[currentEle]);

  return markers[currentEle];
}

function initializeStreetcars() {
  $.ajax({ url: `/api/streetcars/${routeId}` }).done(function(data) {

    // lastTime = data.lastTime.time;
    // let iterator = 0;

    for (const vehicle of data) {
      createStreetcarMarker(vehicle);
    }

    setInterval(updateStreetcars, UPDATE_INTERVAL);
    setInterval(updateAllStreetcarInfoWindows, INFO_WINDOW_UPDATE_INTERVAL);
  }).fail(function(data) {
    console.error("There was an error retrieving data from the API.", data);
  });
}

function updateStreetcars() {
  $.ajax({ url: `/api/streetcars/${routeId}` }).done(function(data) {

    if (!data) {
      return;
    }

    for (const vehicle of data) {
      const coords = {lat: Number(vehicle.x), lng: Number(vehicle.y)};
      let marker = findMarkerById(vehicle.streetcar_id);

      if (!marker) {
        marker = createStreetcarMarker(vehicle);
      }

      marker.set("markerLastTime", vehicle.updated_at);
      marker.set("predictable", vehicle.predictable);
      marker.set("idle", vehicle.idle);
      
      setColor(marker);      
      
      if (vehicle.speedkmhr) { marker.set("speedMph", convertKmHrToMph(vehicle.speedkmhr)); }
      setStreetCarRotation(marker, vehicle.heading);
      setStreetCarPosition(marker, coords);
    }

    checkForOldData();

  }).fail(function(data, status, error) {
    console.error("There was an error retrieving data from the API.", data, status, error);
  });
}

function convertKmHrToMph(speed) {
  return speed === undefined ? "N/A" : Math.round(speed * 0.62137119223733) + " Mph";
}

function checkForOldData() {
  markers.forEach((marker, i) => {
    if ((new Date() - new Date(marker.markerLastTime)) / 1000 > 300) {
      deleteStreetcarMarker(i);
    } 
  });
}

function updateStreetcarInfoWindow(marker) {
  const lat = marker.getPosition().lat().toFixed(6);
  const lng = marker.getPosition().lng().toFixed(6);
  const secsAgo = Math.round((new Date() - new Date(marker.markerLastTime)) / 1000);

  const contentString = `<ul>
    <li>Last Updated: ${secsAgo} seconds ago</li>
    <li>Idle time: ${marker.idle}</li>    
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

function getIconColor(predictable) {
  let fillColor = "red";

  if (predictable) { fillColor = "#276f92"; }

  return fillColor;
}

function setColor(marker) {
  const fillColor = getIconColor(marker.predictable);
  
  marker.icon.strokeColor = fillColor;
  marker.icon.fillColor = fillColor;
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
      routeId = 1;
      break;
    case "SLU":
      route = "SLU";
      routeId = 2;
      break;
    }
  }
}

getParams();
$(".button-collapse").sideNav();
initMap();
initRoute();
initializeStreetcars();
getFavorites();
setInterval(getFavoritesArrivalTimes, FAVORITES_UPDATE_INTERVAL);
