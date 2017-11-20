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