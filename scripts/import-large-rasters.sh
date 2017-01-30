#!/usr/bin/env bash

#######################################################
# Imports rasters to PostgreSQL
#
# WARNING: appends data to table, if exists.
#
#######################################################

# configuration
RASTER_DESTINATION="/tmp/worldpop"
SQL_TEMP_DESTINATION="/tmp/sql"
FILE_FILTER_PREFIX=""
NAME="world-pop"

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

# prepare SQL with create table statement
cd ${RASTER_DESTINATION}
raster2pgsql -p -t 200x200 -F ../worldpop/*/*.tif ${NAME} > "${SQL_FILE}"
sed -i -e 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' ${SQL_TEMP_DESTINATION}/${NAME}.sql

# run SQL file
if [[ -e ${SQL_FILE} ]] && [[ -f ${SQL_FILE} ]]; then
    echo "psql: Importing prepare '${SQL_FILE}'"
    PGOPTIONS='--client-min-messages=warning' psql -q -U ${DB_USER} -d ${DB_DATABASE} -f "${SQL_FILE}"
else
    echo "Error: prepare SQL_FILE '${SQL_FILE}' doesn't exist"
    exit 1
fi
printf "\n"


# do raster2pgsql for all rasters
for f in *; do
    if [[ -d ${f} ]] && [[ ${f} == ${FILE_FILTER_PREFIX}* ]]; then
        GEOTIFF="${f}/*.tif"

        # run raster2pgsql
        echo "running raster2pgsql on '${GEOTIFF}'"
        raster2pgsql -a -t 200x200 -F ${GEOTIFF} ${NAME} > "${SQL_FILE}"

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

        # run SQL file
        if [[ -e ${SQL_FILE} ]] && [[ -f ${SQL_FILE} ]]; then
            echo "psql: Importing '${SQL_FILE}'"
            while
                ! PGOPTIONS='--client-min-messages=warning' psql -q -U ${DB_USER} -d ${DB_DATABASE} -f "${SQL_FILE}"
            do
                :
            done
        fi
        printf "\n"
    fi
done

