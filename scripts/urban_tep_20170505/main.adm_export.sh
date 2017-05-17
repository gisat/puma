#!/bin/sh

DST=/home/docker-share/gadm

psql -U geonode -d geonode_data -t -c "SELECT table_name FROM adm_all WHERE level <= 1 ORDER BY table_name;" \
 | while read tname
do
  tname=$(echo -n $tname | sed 's/[[:blank:]]//g')
  if [ -n "$tname" ]
  then
    echo Exporting ${tname}
    pgsql2shp -u geonode -f ${DST}/${tname} geonode_data public.${tname}
  fi
done
