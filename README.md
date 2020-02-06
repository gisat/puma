# Panther architecture V 3.0

## Structure

The Panther is a web application combining multiple standalone solutions to provide the users with a combination of the
charts and the map component in an interactive manner.

The application consists of several key components. Dependencise developed outside of the
scope of the application.
- PostgreSQL + PostGIS Database
- GeoServer (http://geoserver.org/)

Developed as a part of the Panther itself
- Backend application (https://github.com/gisat/puma)
- Frontend application (https://github.com/gisat/panther-front-office/)

![Diagram representing the structure and components of the application](https://gisat-panther.s3.eu-central-1.amazonaws.com/Panther+Deployment+Diagram.png)

### Backend

#### Node.JS Version

It runs on the server and client applications connect to the application using its API. Technologically it is written
in JavaScript on the Node platform. It is a web application with exposed REST API. The main framework for the web part
 of the solution is Express (http://expressjs.com/).

The application is built around the concept of attributes, visualized layers, layer of analytical units and metadata.
The metadata describes under which combination will certain data layer be displayed. The metadata are explained below.

Metadata

- Application - The key concept. The Panther deployment can contain many applications. Each application specify separate
combination of the data and the interactive tools associated with it.
- Scope – The Scope represents the geographical scope the data is associated with.
- Place – It represents specific place. It is possible to link other concepts to Place
- Period –  Basically it links the data and other metadata to the specific time or interval in time.
- Area trees – It is possible to structure the data in the area trees. Like Continents -> Countries -> Regions
- Attribute Set – Link of the attributes in the higher order groups.
- Attribute – Link of the specific piece of the data e.g. column in a table.
- Tag - Possible for organization of the concepts and searching in them.
- Permission – This is main concept with respect to authorization toward different resources in the application.
- User – User of the application. He has its credentials and information such as email and name and it is possible to
assign permissions to it. It is also possible to assign it into the groups and then group permissions are added on top
of the user permissions.
- Group – It is possible to group users in the application. There are three default groups, which represents guest
(Someone who isn’t logged in the system), user (Someone who is logged in the system) and admin (Administrator of the
application with full rights). Other than that, the user can specify any other groups and assign users to them.

The full extent of all the metadata available in the application are available in a separate document:
https://github.com/gisat/puma/blob/ptr3-fuore-import-update/endpoints-documentation.md

The Diagram representing classes and dependencies is in the full form available here: https://gisat-panther.s3.eu-central-1.amazonaws.com/Panther-Backend.png
![Backend schema of Panther](https://gisat-panther.s3.eu-central-1.amazonaws.com/Panther-Backend.png)

Include the database schema.

##### Dependencies

- Node.JS (https://nodejs.org/en/) - Environment required for running
- Express (https://expressjs.com/) - Minimalist web framework for Node.js
- Turf (https://turfjs.org/) - Advanced geospatial analysis for browsers and Node.js

To find a full list of dependencies consult current package.json (https://github.com/gisat/puma/blob/dev/package.json)

#### Python version

To be done later together with the packages available there.

### Frontend

The Frontend Application is from the user point of view separated in multiple applications. Every application has its 
own User Interface which is focused on specific user needs. In the further part of the chapter we outline the possible 
building pieces and example applications. 

#### Maps

One of the key functionalities is the possibility to display the different types of data on the different types of
maps. The Framework supports internal style configuration for specifying the visuals of the layers and vector
features displayed. 

![Map with point style](https://gisat-panther.s3.eu-central-1.amazonaws.com/points1.png)

To simplify the visual comparison of different points, layers and statistical information the Panther provides 
the possibility to put any number of maps alongside with different pieces of information. 

![Multiple Maps](https://gisat-panther.s3.eu-central-1.amazonaws.com/multipleMaps.png)

In many cases statistical information needs to be displayed on the map. We support the display as 
choropleth as well as the point layer. The Choropleth layers are good choice for the display of the proportional 
information while the pointed layers are good for displaying absolute information. 

![Point Layer](https://gisat-panther.s3.eu-central-1.amazonaws.com/PointLayer.png)

It is possible for us to integrate with multiple map frameworks respecting different user needs. By default we integrate
with a simple 2D framework Leaflet and a more complex 3D Web World Wind framework. The Web World Wind framework is 
open source framework developed by NASA, which allows the users to understand and analyze the information using the
detailed information about the terrain in the 3D. 

#### Charts

There is a wide variety of different charts available for display of the statistical information. Each of the 
different types of the charts is proper for different types of information. 

##### Line Chart

The Line Chart is a default type of the Chart useful for most situations. Whenever you want to show progression in the data, 
this is a good default. 

![Standard Line Chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/lineChart.png)

In the application the behavior of the chart changes based n the selection and amount of the units selected in the 
chart. If there are more than 10 items in it the lines are grayed and only the focused one is in color. 

![Grayed Line Chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/lineChartGreyed.png)

If there is too many items to display every piece of the information the information is instead displayed in the 
chart with three lines. The lines show minimum, average and maximum among the data. 

![Aggregated line chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/averageMinMax.png)

##### Bar Chart

The Bar Chart belongs among the standard tools in the utility belt of the data analysts and visualization of the results.

![Bar chart Colored](https://gisat-panther.s3.eu-central-1.amazonaws.com/columnChartColor.png)

In the app the chart behaviour differs based on the amount of the units to display. As long as the amount is low
enough the data are displayed separately in a column per unit. Once you get past the threshold instead of column
per piece you will see a line of color showing the distribution of the values among the units. On hover you 
can see which units belong to what part of the area. 

![Aggregated bar Chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/AggregatedColumnChart.png)

The Stacked bar chart is effective when you want to show distribution of the units. For example a distribution
of Land use / land cover classes in certain city. 

![Stacked bar Chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/stackedBar.png)

The diverging bar chart shows that different units can have a different evolution even below zero. This is usually 
used together with the stacked chart where different classes have different structure of change. 

![Diverging Bar Chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/DivergingColumnChart.png)

##### Scatter Chart

The Scatter Chart is indispensable in case you have two or three dimensions to the data, which you want to display 
side by side and the dimensions vary so it isn't possible to show in for example bar chart. 

![Scatter chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/scatterChart.png)

##### Aster Chart

This type of chart allows for simple comparison of more than three dimensions. 

![Aster chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/asterWithLegend.png)

##### Sankeye Chart

The best chart there is for analysis of the flows through the time. One of the great usages is to analyse and visualize
the land use / land cover flows as you can see in the following figure. 

![Sankeye chart](https://gisat-panther.s3.eu-central-1.amazonaws.com/sankeyChart.png)

#### Application

- Fuore (http://fuore.eu/)
- EO4SD Storylines (https://urban-tep.eu/visat/scudeoStories19)
- Urban Environment Ecosystem Accounting (https://urban-tep.eu/visat/unseea)

#### Dependencies

- React (https://reactjs.org/) - Lightweight library for building User interfaces
- Redux (https://redux.js.org/) - Predictable state container for JS Apps
- Leaflet (https://leafletjs.com/) - Simple 2D map framework
- Web World Wind (https://worldwind.arc.nasa.gov/web/) - Complex map framework combining the 3D view and 2D view.
- d3 (https://d3js.org/) - Library for manipulation of the documents based on the data.
- Webpack (https://webpack.js.org/) - Bundler

To find a full list of dependencies consult current package.json
(https://github.com/gisat/panther-front-office/blob/master/package.json)

### GeoServer

GeoServer is a Java-based software server that allows users to view and edit geospatial data. Using open standards set
forth by the Open Geospatial Consortium (OGC), GeoServer allows for great flexibility in map creation and data sharing.
The GeoServer application is written using the Spring (https://spring.io/) and Wicket (https://wicket.apache.org/)
frameworks.

#### Open and Share Your Spatial Data
GeoServer allows you to display your spatial information to the world. Implementing the Web Map Service (WMS) standard,
GeoServer can create maps in a variety of output formats.  GeoServer is built on GeoTools, an open source Java GIS toolkit.

There is much more to GeoServer than nicely styled maps. GeoServer conforms to the Web Feature Service (WFS) standard,
and Web Coverage Service (WCS) standard which permits the sharing and editing of the data that is used to generate the
maps. GeoServer also uses the Web Map Tile Service standard to split your published maps into tiles for ease of use by
web mapping and mobile applications.

GeoServer is a modular application with additional functionality added via extensions. An extensions for Web Processing Service open up a wealth of processing options, you can even write your own!
Enable others to incorporate your data into their websites and applications, freeing your data and permitting greater transparency.

#### Use Free and Open Source Software
GeoServer is free software. This significantly lowers the financial barrier to entry when compared to proprietary GIS
products. In addition, not only is GeoServer available free of charge, it is also open source. Bug fixes and feature
improvements in open source software occur in a transparent manner, often at an accelerated pace compared to closed
software solutions. Leveraging GeoServer in your organization also prevents software lock-in, saving costly support
contracts down the road.

#### Dependencies

- Java/Tomcat 8 - Runtime environment plus application server
- Spring (https://spring.io/) - Framework for application building in Java
- Wicket (https://wicket.apache.org/) - Component web based UI framework.

## Deployment

### General structure

The whole VISAT comprises from quite some amount of the components. The components
are utilized differently and as such it is important to be able to run some of
them in clusters, while others are fine to be run one at the time.

The key components are:
- Load Balancer
- Database (PostgreSQL with PostGIS extension.)
- GeoServer cluster
  - ActiveMQ (Integration for running the servers)
- Panther Backend (Node.js application)
- Panther Frontend (Static web application)

The most resource consuming parts are Panther Backend and GeoServer Cluster. As
such it is most important to scale properly these two components.

### Components

#### Load Balancer (Nginx container)

The Load Balancer is the Nginx container. It is the standard Nginx Docker
container. The configuration of the Nginx container contains the information
on the servers in the clusters. The key configuration file is nginx.conf
located in the /etc/nginx/

There are two approaches for handling the configuration files. One is to provide
the configuration files on the Docker host and link them inside as volume. The second
is to open the bash in the container from the host and change the files directly
in the container.

When adding a new Server for the specific Load Balancing
  - Add it to the configuration of relevant Load Balancer and then Restart the
    container

##### The configuration with Volume

Run the container: ```docker run -it -v /home/ec2-user/environment/config:/etc/nginx:ro --network=host --name nginx-container nginx:latest```

##### The configuration without volume

Run the container: ```docker run -it --network=host --name nginx-container nginx:latest```

Open the bash in the running container: ```docker exec -it nginx-container bash```

##### The configuration

```
upstream geoserver {
    ip_hash;
    server 35.165.149.22:8080;
    server 52.37.70.209:8080;
}

server {
    listen       80;
    server_name  localhost;

    location / {
        proxy_pass      http://geoserver;
    }
}
```

In the upstream block you need to add paths to the new servers in the cluster. The
example of the configuration is in the directory nginx.

#### Database

The database contains the container for the Database Server itself and for the
PgAdmin designed to control and administer the databases.

##### PostgreSQL container

###### Build

Before building the container take a look at the files in the directory postgres.
The pg_hba.conf and postgresql.conf there represents a working example. You may
need to update the configuration based on the networking options.

To build the container run: `docker build -t postgres:postgres ./postgres/`

###### Run

The container is started locally using the local network and as such is exposed
publicly on the port 5432. The provided configuration accepts the connections
from any IP address. You will probably want to limit it to the networks for
GeoServers and Backend.

Run the PostgreSQL with transient volumes and containers.
`docker run -p 5432:5432 --name postgres-container postgres:postgres`

To make sure that you don't loose the data run the container with the volumes.
`docker run -it -v ./postgres-data:/var/lib/postgresql/data --network=host --name postgres-container-v2 postgres:postgres`
The ./postgres-data path represents the path on the host container.

##### PgAdmin

The container starts on local port 5050 this way in the container but is exposed
via the port 80. It is ok to expose it via another port. The port depends on what
machine and in which network configuration it will run on. Email and Password
needs to be provided and then sent to us so we can login and manage the database
remotely.

```
docker run -p 5050:80
  -e "PGADMIN_DEFAULT_EMAIL=user@domain.com"
  -e "PGADMIN_DEFAULT_PASSWORD=SuperSecret"
  -d dpage/pgadmin4
```

#### GeoServers

##### ActiveMQ Container

Messaging Queue instance. There is no configuration needed. Only the URL to the
ActiveMQ container needs to be provided into the geoserver/cluster.properties

```docker run -it --network=host --name activemq-container activemq:activemq```

##### GeoServer itself

The container starts on the local port 8080. The configuration needs to lead to
the ActiveMQ instance and must have network access.

The servers in the cluster share the information via the messaging queue.
It isn't possible to exchange the data this way and as such it is important
that the data are stored externally or that the instances in the GeoServer Cluster
shares the same directory via network file system.

1) The GeoServer data directory is shared via sharing a filesystem. In this case
   it is necessary to run the GeoServer container with volume pointing to the
   networking file system.
2) The data directory isn't stored. Then all the data needs to be external.
   The raster data could be stored for example on S3 and vector data should
   be stored in the external PostgreSQL+PostGIS database.

##### Build

To build the container run: `docker build -t geoserver:geoserver ./geoserver/`

##### Run

If the data are stored externally then this is enough to start the container
`docker run -it -p 8080:8080 --name geoserver-container geoserver:geoserver`

If the data are stored on the shared directory then you need to mount the volume
to all instances of GeoServer docker.
`docker run -it -p 8080:8080 -v ./geoserver-data:/mnt/volume-panther/geoserver-data --name geoserver-container geoserver:geoserver`

#### Backend container

##### Build

Before building the container update the configuration files in the directory.
The key file is config.js. The key properties follow.

```
// Port under which does the backend run
localPort       : 3000,

// The address under which the VISAT will be visible to the outside world.
remoteAddress   : "urban-tep.eu/visat/",
// The protocol that is used remotely
remoteProtocol  : "http",

/*
Connection String split to pieces for the PostgreSQL.
 */
pgDataUser: 'geonode',
pgDataPassword: 'geonode',
pgDataDatabase: 'geonode_data',
pgDataHost: 'localhost',
pgDataPort: '5432'
```

To build the container run: `docker build -t backend:backend ./backend/`

##### Run

The backend application runs on the port, which is specified in the configuration.

```docker run -it -p 3000:3000 --name backend-container backend:backend```

#### FrontEnd container

##### Build

Before building the container update the configuration files in the directory.
The key file is rewrites.js. The key properties follow.

```
// Protocol to use from outside to server the GeoServer data.
apiGeoserverWFSProtocol: 'https',
apiGeoserverWMSProtocol: 'https',

// Protocol to connect from outside to the Backend.
apiBackendProtocol: 'https',

// Base URL (Host) for GeoServer. It is possible to have different GeoServer for
// WFS and WMS.
apiGeoserverWFSHost: 'urban-tep.eu/visat',
apiGeoserverWMSHost: 'urban-tep.eu/visat',

// Base URL (Host) for Backend.
apiBackendHost: 'urban-tep.eu/visat',

// Path to the WFS request on the server.
apiGeoserverWFSPath: 'backend/geoserver/geonode/wfs',
```

To build the container run: `docker build -t frontend:frontend ./frontend/`

##### Run

```docker run -it -p 5060:5060 --name backend-container backend:backend```
