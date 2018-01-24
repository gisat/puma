PUMA – Platform for Urban Management and Analysis
=================================================

# Deployment

Deployment is currently handled using Docker. 

# New relic monitoring

To monitor correctly using New Relic, it is necessary to update the config.js to contain appName with the name which will be displayed in the panel. 

# Scope level options

There are multiple options. First of them is toggles, which decides which parts of the configuration will be available.
Second option is the basic background map.  

## Toggles

### 2dmap

It disables 2D map and starts in the 3D map mode. 

### evaluationTool

It disables Evaluation tool. 

### mapTools

It disables map tools. 

### savedViews

It disables saved Views.

### visualisation

It disables visualisation related content. 

### snapshots

It disables options for snapshoting.

### context-help

It disables context help. 

### scope

It disables the option to change Scope. 

### theme

It disables the option to change Theme. 

### areas

It disables the option to show areas. 

## activeBackgroundMap

It contains keys to decide what background layer should be set by default for the scope:
osm, cartoDb, bingAerial, landsat

## disabledLayers

It contains keys representing the background layers, which won't be available. The options: 
osm, cartoDb, bingAerial, landsat

## aggregated

It is used to handle cases for too many analytical units.

## layerOptions

### ordering

The option topBottomPanel changes ordering to use the ordering in the panel instead of the last is on the
top which is default.   

# URL Options

## needLogin

This options asks user to log in before moving further unless the user is already logged in. 

## lang

This options changes the language of the texts in the application. 

# Changelog

## 2.4 

The components are versioned. It is possible to get the versions on the endpoint /rest/fo/version, /rest/bo/version and
/rest/backend/version. To allow this it is necessary to update build to produce version.txt in the relevant 
directories. 

## 2.5

It is now possible to update users and groups with all the permissions using one call. It isn't possible
anymore to use the old approach with adding and removing permissions. 