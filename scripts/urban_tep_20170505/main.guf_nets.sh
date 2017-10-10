#!/bin/bash

# 250 rows

PSQL_HOST="192.168.2.49"

function drop_tables {
  psql -h $PSQL_HOST -U geonode -d geonode_data -t \
       -c "SELECT table_name
           FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name ~* '^[a-z]{3}_'
           ORDER BY table_name;" | \
  xargs -L 1 | \
  while read tname
  do
    echo $tname
    echo "DROP TABLE ${tname};" | psql -h $PSQL_HOST -U geonode -d geonode_data
  done
}

function load_tables {
  for f in ./*.shp
  do
    country=$(echo $f | cut -c 3-5)
    country=$(echo "$country" | tr '[:upper:]' '[:lower:]')
    tname=${country}_guf2012_nets
    shp2pgsql -I -s 4326 -g the_geom $f public.$tname \
      | sed "s/'-nan'/NULL/g" \
      | psql -h $PSQL_HOST -U geonode -d geonode_data
  done
}
  
function export {
  shp2pgsql -I -s 4326 -g the_geom ./ABW_75m_binConnectivity_10km_5km_3km_2_km_1km.shp public.abw_nets
}


date;
( cat ./functions.sql;
  for OFFSET_NR in {0..250}
  do
    date
    FROM_CLAUSE="FROM (SELECT table_name FROM guf_nets_tables ORDER BY table_name LIMIT 1 OFFSET ${OFFSET_NR}) sq"
    #echo "SELECT pg_temp.setup_guf_nets_columns(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.compute_guf_nets_tweet(table_name) ${FROM_CLAUSE};"
    echo "SELECT pg_temp.compute_guf_nets_light(table_name) ${FROM_CLAUSE};"
  done
) | psql -U geonode -d geonode_data

