#!/usr/bin/env bash

# Imports rasters to PostgreSQL to separate tables
# Iterates RASTER_DESTINATION directory. Imports all rasters from each iteration to one table.

# configuration
RASTER_DESTINATION="/tmp/worldpop"
SQL_TEMP_DESTINATION="/tmp/sql"

ITERATION_FILTER_PREFIX_INCLUDE="" # skip directories without this prefix
ITERATION_FILTER_PREFIX_EXCLUDE="" # skip directories with this prefix

FILE_FILTER="*.tif"

TABLE_NAME_PREFIX="worldpop_pop10_"

DB_USER="geonode"
DB_DATABASE="geonode_data"



# raster dir doesn't exist
if [[ ! -e ${RASTER_DESTINATION} ]]; then
    echo "############### Error: RASTER_DESTINATION '${RASTER_DESTINATION}' doesn't exist."
    exit 1
fi

# sql dir doesn't exist
if [[ ! -e ${SQL_TEMP_DESTINATION} ]]; then
    mkdir ${SQL_TEMP_DESTINATION}
fi

# sql dir not dir
if [[ ! -d ${SQL_TEMP_DESTINATION} ]]; then
    echo "############### Error: SQL_TEMP_DESTINATION '${SQL_TEMP_DESTINATION}' is not a directory."
    exit 1
fi

# do raster2pgsql for all rasters
cd ${RASTER_DESTINATION}
echo "Iterating ${RASTER_DESTINATION}:"
for f in *; do
    printf "\n\n"
    echo "------${f}------"

    NAME="${TABLE_NAME_PREFIX}${f}"
    NAME="$(tr [A-Z] [a-z] <<< "$NAME")" # change to lower case

    if [[ ${NAME} == "" ]]; then
        echo "  ############### ERROR: NAME is empty."
        continue
    fi

    if [[ ! -d ${f} ]] && [[ ! -f ${f} ]]; then
        echo "  Item is not file or directory"
        continue
    fi

    if [[ ${f} != "${ITERATION_FILTER_PREFIX_INCLUDE}"* ]]; then
        echo "  File doesn't match ITERATION_FILTER_PREFIX (${ITERATION_FILTER_PREFIX_INCLUDE})"
        continue
    fi

    if [[ ! -z ${ITERATION_FILTER_PREFIX_EXCLUDE} ]] && [[ ${f} == "${ITERATION_FILTER_PREFIX_EXCLUDE}"* ]]; then
        echo "  File matches ITERATION_FILTER_PREFIX_NEGATIVE (${ITERATION_FILTER_PREFIX_EXCLUDE})"
        continue
    fi
    
    psql -q -v "ON_ERROR_STOP=1" -U ${DB_USER} -d ${DB_DATABASE} -c "SELECT FROM \"${NAME}\" LIMIT 1";
    if [[ $? == 0 ]]; then
        echo "  ##### WARNING: table '${NAME}' already exist. Skipping."
        continue
    else
        echo "  ^don't worry, just testing table existence"
    fi


    SQL_FILE="${SQL_TEMP_DESTINATION}/${NAME}.sql"

    echo "  raster2pgsql: running on '${f}/${FILE_FILTER}' ${NAME} > ${SQL_FILE}"
    raster2pgsql -c -C -t 200x200 -F ${f}/${FILE_FILTER} ${NAME} > "${SQL_FILE}"

    # file doesn't exist
    if [[ ! -e ${SQL_FILE} ]]; then
        echo "  ############### ERROR: SQL file '${SQL_FILE}' doesn't exist."
        continue
    fi

    # file not file
    if [[ ! -f ${SQL_FILE} ]]; then
        echo "  ############### ERROR: SQL file '${SQL_FILE}' is not a file."
        continue
    fi

    # file has no data
    if [[ ! -s ${SQL_FILE} ]]; then
        echo "  ############### ERROR: SQL file '${SQL_FILE}' has no data."
        continue
    fi

    # run SQL files
    if [[ -e ${SQL_FILE} ]] && [[ -f ${SQL_FILE} ]]; then
        echo "  psql: Importing TABLE '${NAME}' from FILE '${SQL_FILE}'"
        PGOPTIONS='--client-min-messages=warning' psql -q -v "ON_ERROR_STOP=1" -U ${DB_USER} -d ${DB_DATABASE} -f "${SQL_FILE}"
        if [[ $? == 0 ]]; then
          rm ${SQL_FILE}
        else
          echo "  ############### ERROR. PostgreSQL failed to import file '${SQL_FILE}'"
        fi
    fi
    printf "\n"


done

