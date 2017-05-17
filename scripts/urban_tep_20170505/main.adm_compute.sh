#!/bin/bash

# There is 256 tables with tbc flag.

date;
( cat ./functions.sql;
  for OFFSET_NR in {0..256}
  do
    FROM_CLAUSE="FROM (SELECT table_name FROM adm_compute ORDER BY table_name LIMIT 1 OFFSET ${OFFSET_NR}) sq"
    #echo "SELECT pg_temp.compute_worldpop(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.compute_guf12m(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.compute_gpw_v4(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.compute_tweet(table_name) ${FROM_CLAUSE};"
    echo "SELECT pg_temp.compute_night_light(table_name) ${FROM_CLAUSE};"
  done
) | psql -U geonode -d geonode_data

