#!/usr/bin/env bash

# Imports rasters to PostgreSQL to separate tables
# Iterates RASTER_DESTINATION directory. Imports all rasters from each iteration to one table.

# configuration
RASTER_DESTINATION="/tmp/worldpop"
SQL_TEMP_DESTINATION="/tmp/sql"

ITERATION_FILTER_PREFIX=""
FILE_FILTER="*/*.tif"

TABLE_NAME_PREFIX="worldpop_pop10_"

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
    if [[ -d ${f} ]] && [[ ${f} == ${ITERATION_FILTER_PREFIX}* ]]; then
        NAME="${TABLE_NAME_PREFIX}${f}"
        NAME="$(tr [A-Z] [a-z] <<< "$NAME")" # change to lower case
        SQL_FILE="${SQL_TEMP_DESTINATION}/${NAME}.sql"

        # run raster2pgsql
        if [[ -e ${FILE_FILTER} ]] && [[ -f ${FILE_FILTER} ]]; then
            echo "running raster2pgsql on '${FILE_FILTER}'"
            raster2pgsql -c -C -t 200x200 -F ${FILE_FILTER} ${NAME} > "${SQL_FILE}"
        else
        		continue
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
            PGOPTIONS='--client-min-messages=warning' psql -q -U ${DB_USER} -d ${DB_DATABASE} -f "${SQL_FILE}"
        fi
        printf "\n"
    fi
done

