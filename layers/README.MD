There are three types of layers so far. First type is represented by the layers stored in the Geonode. The information about these layers is retrieved from the geonode with every user request.
 
Second type of the layers are duplicates of the Geonode layers. They share the same core data layer but they can be mapped to different metadata concepts in the application. 
 
Third type of layers are WMS layers. These layers are internally stored in the PostgreSql database and basically are just a URL which we can use to query the map data. These layers doesn't have any attributes. 
  
It is possible to specify permissions separately for WMS layers and Geonode Layers. Both is done in the Permissions tab of the application.  