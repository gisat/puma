#!/usr/bin/env bash

# Imports GUF rasters to PostgreSQL

# configuration
RASTER_DESTINATION="/var/lib/tomcat7/webapps/geoserver/data/data/geonode"
SQL_TEMP_DESTINATION="/tmp/guf-sql"
GUF_FILE_PREFIX="guf_75m_04_"

DB_USER="geonode"
DB_DATABASE="geonode_data"



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
    if [[ -d ${f} ]] && [[ ${f} == ${GUF_FILE_PREFIX}* ]]; then
        NAME=${f}
        GEOTIFF="${NAME}/${NAME}.geotiff"
        SQL_FILE="${SQL_TEMP_DESTINATION}/${NAME}.sql"

        # run raster2pgsql
        if [[ -e ${GEOTIFF} ]] && [[ -f ${GEOTIFF} ]]; then
            echo "running raster2pgsql on '${GEOTIFF}'"
            raster2pgsql -c -C -t 200x200 -F ${GEOTIFF} ${NAME} > "${SQL_FILE}"
        fi

        # file doesn't exist
        if [[ ! -e ${SQL_FILE} ]]; then
            echo "Error: SQL file '${SQL_FILE}' doesn't exist."
            continue
        fi

        # file not file
        if [[ ! -f ${SQL_FILE} ]]; then
            echo "Error: SQL file '${SQL_FILE}' is not a file."
            continue
        fi

        # file has no data
        if [[ ! -s ${SQL_FILE} ]]; then
            echo "Error: SQL file '${SQL_FILE}' has no data."
            continue
        fi

        # run SQL files
        if [[ -e ${SQL_FILE} ]] && [[ -f ${SQL_FILE} ]]; then
            echo "psql: Importing '${SQL_FILE}'"
            psql -U ${DB_USER} -d ${DB_DATABASE} -f "${SQL_FILE}"
        fi
    fi
done

