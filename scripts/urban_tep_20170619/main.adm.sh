#!/bin/bash

ADM_DIR=/mnt/pracovni-archiv-01/projects/UrbanTEP/gadm01.d
WORK_DIR=/mnt/DATA/users/ikratochvil/gisat/urban_tep/work/adm
SCHEMA=public
PUSER=urbantep
PDB=urbantep

function create_adm_all {

  psql -U $PUSER -d $PDB <<"EOF"

-- tbc => to be computed;
CREATE TABLE adm_all (
  table_name varchar NOT NULL,
  country char(3) NOT NULL,
  level integer NOT NULL,
  tbc boolean NOT NULL DEFAULT TRUE,
  canonical_name boolean NOT NULL DEFAULT TRUE);

INSERT INTO adm_all (table_name, country, level)
SELECT
  table_name,
  substring(table_name from 1 for 3),
  substring(table_name from 8 for 1)::integer
FROM information_schema.tables
WHERE table_name ~ '^[[:alpha:]]{3}_adm[[:digit:]](_[[:digit:]])?$'
ORDER BY table_name;

UPDATE adm_all
SET tbc = FALSE;

UPDATE adm_all
SET tbc = TRUE
FROM (
  SELECT DISTINCT ON (country) country, level
  FROM adm_all
  ORDER BY country, level DESC) t_tbc
WHERE adm_all.country = t_tbc.country AND adm_all.level = t_tbc.level;

UPDATE adm_all
SET canonical_name = (table_name ~ '^[[:alpha:]]{3}_adm[[:digit:]]$');

EOF

}

function prepare_adm {
  local f
  local table_name
  local sql_name

  for f in $ADM_DIR/*_adm*.shp
  do
    table_name=$(basename $f | cut -c 1-8)
    sql_name=$WORK_DIR/$table_name.sql
    if [ ! -e $sql_name ]
    then
      shp2pgsql -I -s :4326 -g the_geom $f $SCHEMA.$table_name >$sql_name
    fi
  done
}

function load_adm {
  local f

  for f in $WORK_DIR/*_adm*.sql
  do
    psql -U $PUSER -d $PDB -f $f
  done
}

#prepare_adm
#load_adm
#create_adm_all