#!/bin/bash

NIGHTLIGHT_DIR=/home/docker-share/work
WORK_DIR=/home/docker-share/work
SCHEMA=public
TABLE_NAME=night_light

export PGUSER=geonode
export PGDATABASE=geonode_data


function get_tables {
  local tables

  table_names=$(psql -t -c "SELECT table_name
                            FROM information_schema.tables
                            WHERE table_schema = '$SCHEMA' AND table_name ~* '$1'
                            ORDER BY table_name;")
  echo $table_names
}

function drop_tables {
  local table_ptrn="$1"
  local table_name

  for table_name in $(get_tables "$1")
  do
    echo "Dropping table $table_name..."
    psql -c "DROP TABLE $SCHEMA.${table_name};"
  done
}

function extract_nightlight {
  local f

  for f in $NIGHTLIGHT_DIR/*.tgz
  do
    tar -xv -C $WORK_DIR -zf $f --wildcards --wildcards-match-slash '*_vcm-orm-ntl_*'
  done
}

function prepare_nightlight {
  raster2pgsql -C -I -M -s 4326 -t 1024x1024 $WORK_DIR/*_vcm-orm-ntl_*.tif $SCHEMA.$TABLE_NAME | gzip -c >$WORK_DIR/${TABLE_NAME}.sql.gz
}

function load_nightlight {
  #psql -c "DROP TABLE IF EXISTS ${SCHEMA}.${TABLE_NAME};"
  gunzip -c $WORK_DIR/${TABLE_NAME}.sql | psql
}

function set_nightlight_nodata {
  psql -c "ALTER TABLE ${SCHEMA}.${TABLE_NAME} DROP CONSTRAINT enforce_nodata_values_rast;"
  psql -c "UPDATE ${SCHEMA}.${TABLE_NAME} SET rast = ST_SetBandNoDataValue(rast, -1000);"
  psql -c "ALTER TABLE ${SCHEMA}.${TABLE_NAME} ADD CONSTRAINT enforce_nodata_values_rast CHECK (_raster_constraint_nodata_values(rast) = '{-1000}'::numeric[]);"
}

function add_nightlight_columns {
  for table_name in $(get_tables '_adm')
  do
    echo $table_name
    psql -c "ALTER TABLE $table_name ADD COLUMN rel_aff_area_light real NULL DEFAULT NULL;"
    psql -c "ALTER TABLE $table_name ADD COLUMN aff_avg_light real NULL DEFAULT NULL;"
  done
}

function compute_nightlight {
  for OFFSET_NR in {0..256}
  do
    echo "Computing night light of table ${OFFSET_NR}."
    ((cat ./functions.sql
      echo "SELECT pg_temp.compute_nightlight(table_name)
            FROM (SELECT table_name
                  FROM adm_compute
                  ORDER BY table_name
                  LIMIT 1 OFFSET ${OFFSET_NR}) sq;"
     ) | psql ) >../log/night_light.table_${OFFSET_NR}.log 2>&1 &
    while true
    do
      running=$(jobs -rp | wc -l)
      [[ $running -le 10 ]] && break
      sleep 5
    done
  done
}

function clear_propagated_nightlight {
  echo "Clearing propagated night light."
  (cat ./functions.sql
   echo "SELECT pg_temp.clear_propagated_nightlight(table_name)
         FROM (SELECT table_name FROM adm_propagate) sq;"
  ) | psql >../log/night_light.clear.log 2>&1
}

function propagate_nightlight {
# 482
  for OFFSET_NR in {0..482}
  do
    echo "Propagating night light of table ${OFFSET_NR}."
    (cat ./functions.sql
     echo "SELECT pg_temp.propagate_nightlight(table_name)
           FROM (SELECT table_name
                 FROM adm_propagate
                 ORDER BY country, level DESC
                 LIMIT 1 OFFSET ${OFFSET_NR}) sq;"
    ) | psql >../log/night_light.propagate_${OFFSET_NR}.log 2>&1
  done
}

#extract_nightlight
#prepare_nightlight
#load_nightlight
#set_nightlight_nodata
#add_nightlight_columns
#compute_nightlight
#clear_propagated_nightlight
#propagate_nightlight
