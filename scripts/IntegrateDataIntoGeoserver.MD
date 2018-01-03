## Integracni API Geoserveru pres Curl. 
curl -u admin:geoserver -XPOST -H "Content-type: application/json" -d @twitterImport.json -F name=twitterdens28 -F filedata=@twitterdens28.tif "https://urban-tep.eo.esa.int/puma/geoserver/rest/imports?async=true&exec=true"

curl -u admin:geoserver -XPOST -H "Content-type: application/json" -d @twitterImport.json "https://urban-tep.eo.esa.int/puma/geoserver/rest/imports"

curl -u admin:geoserver -XPOST -H "Content-type: application/json" -d @import.json "https://urban-tep.eo.esa.int/puma/geoserver/rest/imports"

curl -u admin:geoserver -F name=twitter28 -F filedata=@twitterdens28.tif "https://urban-tep.eo.esa.int/puma/geoserver/rest/imports/1/tasks"

curl -u admin:geoserver -XPOST "http://localhost:8080/geoserver/rest/imports/1"

## Import rasteru do databaze.
raster2pgsql -s 4326 -I -C -M *.tif -F -t 512x512 public.jmenoFinalniTabulky