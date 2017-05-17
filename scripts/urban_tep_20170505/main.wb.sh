#!/bin/bash

# 257 rows

date;
( cat ./functions.sql;
  for OFFSET_NR in {0..257}
  do
    FROM_CLAUSE="FROM (SELECT table_name FROM adm_all WHERE level = 0 ORDER BY table_name LIMIT 1 OFFSET ${OFFSET_NR}) sq"
    #echo "SELECT pg_temp.setup_wb_columns(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.setup_un_columns(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.set_wb_total(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.set_wb_age(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.set_wb_health(table_name) ${FROM_CLAUSE};"
    #echo "SELECT pg_temp.set_wb_urb(table_name) ${FROM_CLAUSE};"
    echo "SELECT pg_temp.set_un_footprint(table_name) ${FROM_CLAUSE};"
  done
) | psql -U geonode -d geonode_data

