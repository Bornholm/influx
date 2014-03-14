# Influx

## Getting started

Install required tools

```
sudo npm install -g bower
sudo npm install -g grunt-cli
```
Then get the source code, initialize & launch
```
git clone https://github.com/Bornholm/influx.git
cd influx
git checkout develop
npm install
bower install
# On linux, type
# bash ./node_modules/grunt-nw/tasks/build-res/linux/libudev-linker.sh
grunt influx:run
```