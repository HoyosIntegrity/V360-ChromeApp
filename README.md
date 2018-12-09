# V360-WebApp
This repository contains a node.js webserver which will allow controlling the camera. 
Right now the supported functionality is:
* Turning on the Camera via Bluetooth
* Switching the Camera USB connection mode between the 3 supported modes (They are remembered even upon power down of the camera):
  * Charging only
  * Mass Storage (Access to SD Card)
  * Reverse Tethering (Access camera network via USB) (see instructions below)

## Requirements:
Right now for this to work you must have:
* [Node.js installed](https://nodejs.org/en/download/)
* web browser that supports web-bluetooth (like chrome)
* Following network ports free:
  * tcp/8059
  * tcp/8053
  * if the ports are blocked they can be change on [server.js](server.js) and [setvars.js](setvars.js)
  * if you are having troubel changing them open a github Issue and we will add a method to specify the network port
Once installed execute in a command prompt or console terminal the following inside of this directory
```
node server.js
```
This will start two web servers using the following TCP network ports: 
"http://localhost:8059"
"http://localhost:8053"

## Usage
Once the webserver is started you can open a web browser pointing to http://localhost:8059
This website will guide you by the steps needed to obtain a video streaming URL. 
After you complete all steps and press start streaming you will receive the network URL's required to open the video on 
* [Quicktime Windows or Mac](https://support.apple.com/kb/DL837?locale=en_US) (File -> Open Location)
* [VLC](https://www.videolan.org/index.html)
* mplayer
* ffmpeg

### 8503 port usage
The http://localhost:8053 is a http proxy used to forward network request to the camera while bypassing CORS restrictions on web browsers.

## Known Issues:
* Login Token not saved 
  * If you obtain a logging token (In step 5) and refresh the website it will be erased upon refresh. This will cause the camera to deny any further login request until you restart it completely. 
  Workaround for now is to copy and paste the token after logging in and paste it back in if you have to refresh the website.
* IP Address obtained from the camera will be incorrect if you are using reverse tethering USB mode.
  * If you have USB set to reverse tethering access adb shell netcfg to obtain the IP address of the camera.
