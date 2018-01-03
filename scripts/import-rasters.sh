#!/usr/bin/env bash

# Imports rasters to PostgreSQL

# configuration
RASTER_DESTINATION="/var/lib/tomcat7/webapps/geoserver/data/data/geonode"
SQL_TEMP_DESTINATION="/tmp/sql"
FILE_FILTER_PREFIX="guf_75m_04_"
#FILE_FILTER_PREFIX="guf_75m_04_e16" #### Testing Filter. Testing only on few files.
NAME="guf_75m_04_all"

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

SQL_FILE="${SQL_TEMP_DESTINATION}/${NAME}.sql"

# do raster2pgsql for all rasters in ${RASTER_DESTINATION}/${NAME}/${NAME}.geotiff
cd ${RASTER_DESTINATION}
raster2pgsql -c -C -t 200x200 -F ./*/${FILE_FILTER_PREFIX}* ${NAME} > "${SQL_FILE}"

# import SQL file

# file doesn't exist
if [[ ! -e ${SQL_FILE} ]]; then
		echo "Error: SQL file '${SQL_FILE}' doesn't exist."
		exit 1
fi

# file not file
if [[ ! -f ${SQL_FILE} ]]; then
		echo "Error: SQL file '${SQL_FILE}' is not a file."
		exit 1
fi

# file has no data
if [[ ! -s ${SQL_FILE} ]]; then
		echo "Error: SQL file '${SQL_FILE}' has no data."
		exit 1
fi

# run SQL file
# NOTE: adding constraint 'same_alignment' will fail here.
if [[ -e ${SQL_FILE} ]] && [[ -f ${SQL_FILE} ]]; then
		echo "psql: Importing '${SQL_FILE}'"
		PGOPTIONS='--client-min-messages=warning' psql -q -U ${DB_USER} -d ${DB_DATABASE} -f "${SQL_FILE}"
fi


