#! /bin/bash

git pull
npm run build
cd ../...
cd .homebridge
npm install ~/homebridge-hsd
