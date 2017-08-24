# Seattle Streetcar Tracker

* What's the name of your project?
  * Seattle Streetcar Tracker
* What problem does it solve?
  * Current streetcar apps do not expose all of the data points available to commuters and are often innacurate in the arrival time estimates.
* Who has this problem?
  * Any commuter that uses the streetcar.
* How does your project solve this problem?
  * By exposing all of the data points available, a user can see a near real-time status of each streetcar along the routes.
* What web APIs did it use?
  * I started using OneBusAway's API but I found their streetcar tracking data to be very inaccurate. OBA seems to be estimating arrival times instead of utilizing the GPS reporting that is available. NextBus has relatively accurate streetcar tracking that uses GPS coordinates so I ended up switching to their API.
* What technologies did it use?
  * Google Maps JavaScript API
  * JavaScript
  * jQuery
  * jQuery Easing
  * Marker-Animate-Unobtrusive (a library created for the purpose of animating Google Map markers)
  * Materialize CSS
* What was the most valuable piece of Customer feedback you received?
  * Exposing the favorite stop arrival times on page load to see the information immediately.
* What was the biggest challenge you had to overcome?
  * I spent a lot of time trying to make the OneBusAway API work and troubleshooting location issues before switching to NextBus.