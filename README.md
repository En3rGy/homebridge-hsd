[![GitHub version](https://img.shields.io/github/package-json/v/En3rGy/homebridge-hsd?label=GitHub)](https://github.com/En3rGy/homebridge-hsd)
[![npm version](https://img.shields.io/npm/v/homebridge-hsd?color=%23cb3837&label=npm)](https://www.npmjs.com/package/homebridge-hsd)
![GitHub License](https://img.shields.io/github/license/En3rGy/homebridge-hsd)


# Introduction

Homebridge-hsd is a plugin for [Homebridge.io](https://homebridge.io/). It accesses KNX via the [Gira HomeSever URL endpoints](https://partner.gira.com/en/service/software-tools/developer.html).

## Glossary

| Term             | Definition              |
| ---------------- | ----------------------- |
| Platform | Requiered by Homebridge. A "platform" in Homebridge represents a plugin that can control multiple devices (accessories). These platform plugins are able to automatically discover and add new devices to HomeKit, often for specific brands or ecosystems. For example, a Philips Hue Bridge plugin could be considered a "platform" because it allows the management of multiple Hue bulbs (accessories). |
| Accessory | Requiered by Homebridge. An "Accessory" in Homebridge is a single device. This can be a lamp, a switch, a sensor or any other device that can be controlled with HomeKit. An accessory is typically enabled by a plugin that takes over the communication and control of the device. |
| Service | Requiered by Homebridge. A "service" in Homebridge defines the specific functions or capabilities of an accessory. For example, a light accessory could have services for switching on/off, brightness and color temperature. Each service corresponds to a group of functionalities that HomeKit understands and can control. |
| Characteristic | Requiered by Homebridge. A "characteristic" is a specific property within a service. These are the individual attributes or settings that a service can control. For example, a light service could have the characteristics "On/Off status", "Brightness" and "Color temperature". Characteristics are the actual data points that are read or written by HomeKit. |
| Endpoints | Gira HomeServer URL Endpoints. The interface of the Gira HomeServer to KNX, mirroring KNX Group Addresses. |

## Helpful Links
* [Gira HomeServer URL Endpoint Documentation](https://partner.gira.com/en/service/software-tools/developer.html): \HS ICD\URL Endpoint\documentation\de
* [Homebridge KNX Plugin](https://github.com/kodmax/homebridge-knx-eib) as template
* [Homebridge Service Types](https://developers.homebridge.io/#/service)

# Strategy

From KNX point of view:
* KNX Group Addresses resp. URL Endpoints represent unique functions, a combination of Endpoints realises _characteristics_
* Accessories are entry gates to different device categories, realising multiple services. Each Homebridge is limited by max. 150 Accessories. A good approach is to combine single functions in rooms or trades as Accessories.
* Services are usually devices providing multiple functions (e.g. on/off, dimm).
* Characteristics are the smallest unit und realsied by one or few group addresses (e.g. on/off with get GA and set GA)

# Available Servies and Characteristics Configuration
Check [Homebridge.io docuemntation](https://developers.homebridge.io/#/service) for descriptions of Homebridge _Services_ and **required** or **optional** _Characteristics_. The following services and characteristics are implemented in this plug-in. 

## Services
### Garage Door Opener
Check required Homebridge characteristics for [Garage Door Opener Service](https://developers.homebridge.io/#/service/GarageDoorOpener).

The plugin implemented the following characteristics:
- [Current Door State](#current-door-state)
- [Target Door State](#target-door-state)
- [Obstruction Detection](#obstruction-detected)

### Lightbulb
Check required Homebridge characteristics for [Lightbulb Service](https://developers.homebridge.io/#/service/Lightbulb).

The plugin implemented the following characteristics:
- [On](#on)
- [Brightness](#brightness) 

### Outlet
Check required Homebridge characteristics for [Outlet Service](https://developers.homebridge.io/#/service/Outlet).
The plugin implemented the following characteristics:
- [On](#on)

### Switch
Check required Homebridge characteristics for [Switch Service](https://developers.homebridge.io/#/service/Switch).
The plugin implemented the following characteristics:
- [On](#on)

### Temperature Sensor
Check required Homebridge characteristics for [Temperature Sensor Service](https://developers.homebridge.io/#/service/TemperatureSensor).
The plugin implemented the following characteristics:
- [Current Temperature](#current-temperature)

### Window
Check required Homebridge characteristics for [Window Service](https://developers.homebridge.io/#/service/Window).

The plugin implemented the following characteristics:
- [Current Door State](#current-door-state)
- [Target Door State](#target-door-state)
- [Obstruction Detected](#obstruction-detected)


## Characteristics

### Brightness
- Endpoint 1: Set URL Endpoint
- Endpoint 2: Get URL Endpoint

### Current Door State
- Endpoint 1: Get URL endpoint

### Current Position
- Endpoint 1: Get URL Endpoint

### Current Temperature
- Endpoint 1: Get URL endpoint

### Lock Current State
- Endpoint 1: Set URL Endpoint
- Endpoint 2: Get URL Endpoint

### Lock Target State
- Endpoint 1: Set URL Endpoint
- Endpoint 2: Get URL Endpoint

### Obstruction Detected
- Endpoint 1: Get URL endpoint

### On
- Endpoint 1: Set URL Endpoint
- Endpoint 2: Get URL Endpoint

### Position State
- Endpoint 1: Get URL endpoint

### Target Door State
- Endpoint 1: Set URL endpoint
- Endpoint 2: Get URL endpoint

### Target Position
- Endpoint 1: Set URL endpoint
- Endpoint 2: Get URL endpoint

# Background

## Homebridge Platform Plugin Template

This plugin is based on a template [Homebridge dynamic platform plugin](https://github.com/homebridge/homebridge-plugin-template).

The template should be used in conjunction with the [developer documentation](https://developers.homebridge.io/). A full list of all supported service types, and their characteristics is available on this site.

### Setup Development Environment

To develop Homebridge plugins you must have Node.js 18 or later installed, and a modern code editor such as [VS Code](https://code.visualstudio.com/). This plugin template uses [TypeScript](https://www.typescriptlang.org/) to make development easier and comes with pre-configured settings for [VS Code](https://code.visualstudio.com/) and ESLint. If you are using VS Code install these extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

### Install Development Dependencies

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```shell
$ npm install
```

### Update package.json

Open the [`package.json`](./package.json) and change the following attributes:

- `name` - this should be prefixed with `homebridge-` or `@username/homebridge-`, is case-sensitive, and contains no spaces nor special characters apart from a dash `-`
- `displayName` - this is the "nice" name displayed in the Homebridge UI
- `repository.url` - Link to your GitHub repo
- `bugs.url` - Link to your GitHub repo issues page

When you are ready to publish the plugin you should set `private` to false, or remove the attribute entirely.

### Update Plugin Defaults

Open the [`src/settings.ts`](./src/settings.ts) file and change the default values:

- `PLATFORM_NAME` - Set this to be the name of your platform. This is the name of the platform that users will use to register the plugin in the Homebridge `config.json`.
- `PLUGIN_NAME` - Set this to be the same name you set in the [`package.json`](./package.json) file. 

Open the [`config.schema.json`](./config.schema.json) file and change the following attribute:

- `pluginAlias` - set this to match the `PLATFORM_NAME` you defined in the previous step.

### Build Plugin

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```shell
$ npm run build
```

### Link To Homebridge

Run this command so your global installation of Homebridge can discover the plugin in your development environment:

```shell
$ npm link
```

You can now start Homebridge, use the `-D` flag, so you can see debug log messages in your plugin:

```shell
$ homebridge -D
```

### Watch For Changes and Build Automatically

If you want to have your code compile automatically as you make changes, and restart Homebridge automatically between changes, you first need to add your plugin as a platform in `~/.homebridge/config.json`:
```
{
...
    "platforms": [
        {
            "name": "Config",
            "port": 8581,
            "platform": "config"
        },
        {
            "name": "<PLUGIN_NAME>",
            //... any other options, as listed in config.schema.json ...
            "platform": "<PLATFORM_NAME>"
        }
    ]
}
```

and then you can run:

```shell
$ npm run watch
```

This will launch an instance of Homebridge in debug mode which will restart every time you make a change to the source code. It will load the config stored in the default location under `~/.homebridge`. You may need to stop other running instances of Homebridge while using this command to prevent conflicts. You can adjust the Homebridge startup command in the [`nodemon.json`](./nodemon.json) file.

### Customise Plugin

You can now start customising the plugin template to suit your requirements.

- [`src/platform.ts`](./src/platform.ts) - this is where your device setup and discovery should go.
- [`src/platformAccessory.ts`](./src/platformAccessory.ts) - this is where your accessory control logic should go, you can rename or create multiple instances of this file for each accessory type you need to implement as part of your platform plugin. You can refer to the [developer documentation](https://developers.homebridge.io/) to see what characteristics you need to implement for each service type.
- [`config.schema.json`](./config.schema.json) - update the config schema to match the config you expect from the user. See the [Plugin Config Schema Documentation](https://developers.homebridge.io/#/config-schema).

### Versioning Your Plugin

Given a version number `MAJOR`.`MINOR`.`PATCH`, such as `1.4.3`, increment the:

1. **MAJOR** version when you make breaking changes to your plugin,
2. **MINOR** version when you add functionality in a backwards compatible manner, and
3. **PATCH** version when you make backwards compatible bug fixes.

You can use the `npm version` command to help you with this:

```shell
# major update / breaking changes
$ npm version major

# minor update / new features
$ npm version update

# patch / bugfixes
$ npm version patch
```

### Publish Package

When you are ready to publish your plugin to [npm](https://www.npmjs.com/), make sure you have removed the `private` attribute from the [`package.json`](./package.json) file then run:

```shell
$ npm publish
```

If you are publishing a scoped plugin, i.e. `@username/homebridge-xxx` you will need to add `--access=public` to command the first time you publish.

#### Publishing Beta Versions

You can publish *beta* versions of your plugin for other users to test before you release it to everyone.

```shell
# create a new pre-release version (eg. 2.1.0-beta.1)
$ npm version prepatch --preid beta

# publish to @beta
$ npm publish --tag=beta
```

Users can then install the  *beta* version by appending `@beta` to the install command, for example:

```shell
$ sudo npm install -g homebridge-example-plugin@beta
```

### Best Practices
Consider creating your plugin with the [Homebridge Verified](https://github.com/homebridge/verified) criteria in mind. This will help you to create a plugin that is easy to use and works well with Homebridge.
You can then submit your plugin to the Homebridge Verified list for review.
The most up-to-date criteria can be found [here](https://github.com/homebridge/verified#requirements).
For reference, the current criteria are:

- The plugin must successfully install.
- The plugin must implement the [Homebridge Plugin Settings GUI](https://github.com/oznu/homebridge-config-ui-x/wiki/Developers:-Plugin-Settings-GUI).
- The plugin must not start unless it is configured.
- The plugin must not execute post-install scripts that modify the users' system in any way.
- The plugin must not contain any analytics or calls that enable you to track the user.
- The plugin must not throw unhandled exceptions, the plugin must catch and log its own errors.
- The plugin must be published to npm and the source code available on GitHub.
  - A GitHub release - with patch notes - should be created for every new version of your plugin.
- The plugin must run on all [supported LTS versions of Node.js](https://github.com/homebridge/homebridge/wiki/How-To-Update-Node.js), at the time of writing this is Node.js v16 and v18.
- The plugin must not require the user to run Homebridge in a TTY or with non-standard startup parameters, even for initial configuration.
- If the plugin needs to write files to disk (cache, keys, etc.), it must store them inside the Homebridge storage directory.


