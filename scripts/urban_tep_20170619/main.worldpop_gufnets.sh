#!/bin/bash

WORLDPOP_DIRS=/home/docker-share/worldpop
GUFNETS_DIR=/home/docker-share/gufnets
WORK_DIR=/home/docker-share/work
GUFNETS_COUNTRIES="CRI ECU HTI KEN MEX MMR NAM NPL THA TZA VNM"
SCHEMA=public


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
  local table_name
  for table_name in $(get_tables $1)
  do
    echo "Dropping table $table_name..."
    psql -c "DROP TABLE $SCHEMA.${table_name};"
  done
}

function prepare_gufnets {
  local c
  local f
  local country
  local table_name

  for c in $GUFNETS_COUNTRIES
  do
    f=$GUFNETS_DIR/$c*.shp
    country=$(basename $f | cut -c 1-3 | tr '[:upper:]' '[:lower:]')
    table_name=${country}_gufnets
    echo "Preparing gufnets table $table_name..."
    shp2pgsql -I -s :4326 -g the_geom $f $SCHEMA.$table_name | \
    sed -r "s/'(-nan|inf)'/NULL/g" >$WORK_DIR/$table_name.sql
  done
}

function load_gufnets {
  local f

  for f in $WORK_DIR/*_gufnets.sql
  do
    echo "Loading $f"
    psql -f $f
  done
}

function alter_gufnets {
  local country

  for country in $GUFNETS_COUNTRIES
  do
    psql -c "ALTER TABLE \"${country}_75m_binConnectivity_10km_5km_3km_2_km_1km\" ADD COLUMN worldpop real NULL DEFAULT NULL;"
  done
}

function prepare_worldpops {
  local d
  local f
  local country
  local table_name

  for d in $WORLDPOP_DIRS
  do
    for f in $d/*.tif
    do
      country=$(basename $f | cut -c 1-3 | tr '[:upper:]' '[:lower:]')
      table_name=${country}_worldpop
      echo "Preparing worldpop table $table_name..."
      raster2pgsql -C -s 4326 -t 1024x1024 -I -M $f $SCHEMA.$table_name >$WORK_DIR/$table_name.sql
    done
  done
}

function load_worldpops {
  local f

  for f in $WORK_DIR/*_worldpop.sql
  do
    psql -f $f
  done
}

function add_worldpop_columns {
  local table_name

  for table_name in $(get_tables _gufnets)
  do
    psql -c "ALTER TABLE $SCHEMA.${table_name} ADD COLUMN worldpop real NULL DEFAULT NULL;"
  done
}

function compute_worldpop {
  local country
  local adm_table_name
  local wp_table_name

  for country in $GUFNETS_COUNTRIES
  do
    adm_table_name="${country}_75m_binConnectivity_10km_5km_3km_2_km_1km"
    country=$(echo $country | tr '[:upper:]' '[:lower:]')
    wp_table_name="${country}_worldpop"
    echo "Computing worldpop for ${adm_table_name} from ${wp_table_name}."
    psql -c "UPDATE \"${adm_table_name}\" adm
             SET worldpop = (SELECT sum((ST_SummaryStats(ST_Clip(wp.rast, 1, adm.the_geom, FALSE))).sum)
                             FROM ${wp_table_name} wp
                             WHERE ST_Intersects(wp.rast, adm.the_geom));" 1>${country}.out.log 2>${country}.err.log
  done
}

cd $WORK_DIR
#drop_tables _gufnets
#prepare_gufnets
#load_gufnets
#alter_gufnets
#drop_tables _worldpop
#prepare_worldpops
#load_worldpops
#add_worldpop_columns
#compute_worldpop
