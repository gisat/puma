#!/bin/bash

FROM_CLAUSE="FROM (SELECT table_name FROM adm_propagate ORDER BY table_name) sq"

date;
( cat ./functions.sql;
  #echo "SELECT pg_temp.propagate_sum(table_name, 'worldpop', 'worldpop_state') ${FROM_CLAUSE};"
  #echo "SELECT pg_temp.propagate_sum(table_name, 'guf12m', 'guf12m_state') ${FROM_CLAUSE};"
  #echo "SELECT pg_temp.propagate_sum(table_name, 'gpw_v4', 'gpw_v4_state') ${FROM_CLAUSE};"
  #echo "SELECT pg_temp.propagate_sum(table_name, 'tweet', 'tweet_state') ${FROM_CLAUSE};"
  echo "SELECT pg_temp.propagate_night_light(table_name) ${FROM_CLAUSE};"
) | psql -U geonode -d geonode_data
