#!/usr/bin/env bash

# Imports GUF rasters to PostgreSQL

# configuration
RASTER_DESTINATION="/var/lib/tomcat7/webapps/geoserver/data/data/geonode"
SQL_TEMP_DESTINATION="/tmp/guf-sql"

# raster dir doesn't exist
if [[ ! -e ${RASTER_DESTINATION} ]]; then
    echo "Error: RASTER_DESTINATION '${RASTER_DESTINATION}' doesn't exist."
    exit 1
fi

# sql dir doesn't exist
if [[ ! -e ${SQL_TEMP_DESTINATION} ]]; then
    mkdir ${SQL_TEMP_DESTINATION}
fi

# sql dir not dir
if [[ ! -d ${SQL_TEMP_DESTINATION} ]]; then
    echo "Error: SQL_TEMP_DESTINATION '${SQL_TEMP_DESTINATION}' is not a directory."
    exit 1
fi

# do raster2pgsql for all rasters
cd ${RASTER_DESTINATION}
for f in *; do
    if [[ -d ${f} ]] && [[ ${f} == guf_75m_04_* ]]; then
        NAME=${f}
        GEOTIFF="${NAME}/${NAME}.geotiff"

        if [[ -e ${GEOTIFF} ]] && [[ -f ${GEOTIFF} ]]; then
            echo ${GEOTIFF}
            raster2pgsql -c -C -t 200x200 -F ${GEOTIFF} ${NAME} > "${SQL_TEMP_DESTINATION}/${NAME}.sql"
        fi
    fi
done

