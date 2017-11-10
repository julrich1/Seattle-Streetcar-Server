# Seattle Streetcar Tracker

## Live versions: 
  * Web: http://sc-dev.shadowline.net
  * Android: http://sc-build.surge.sh/app-debug.apk
  * iOS: Needs to be built/signed from the repo - https://github.com/julrich1/Streetcar-iOS
  
## Repo Links:
  * Web app/API Server: https://github.com/julrich1/Seattle-Streetcar-Server
  * Android app: https://github.com/julrich1/Streetcar-Android
  * iOS app: https://github.com/julrich1/Streetcar-iOS

## Description
* What is it?
  * A multi-platform application to track the real-time locations of the Seattle Streetcar along both routes (South Lake Union & First Hill). Clients available for web, iOS, and Android.
* What problem does it solve?
  * By exposing data to the end user and calculating things like idle-times, people can make more informed decisions regarding estimated arrivals.
* What web APIs did it use?
  * I started using OneBusAway's API but I found their streetcar tracking data to be very inaccurate. OBA seems to be estimating arrival times instead of utilizing the GPS reporting that is available. NextBus has relatively accurate streetcar tracking that uses GPS coordinates so I ended up switching to their API.
  The Node server abstracts all API requests from Nextbus and also calculates idle times for each streetcar.
* What technologies did it use?
  * Google Maps JavaScript API
  * Google Maps Android API
  * Google Maps iOS API
  * Node
  * Java (Android Studio)
  * Swift (Xcode)
  * PostgreSQL
  * JavaScript
