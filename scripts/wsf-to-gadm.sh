#!/usr/bin/env bash

####### configuration

function get_tables {
  local tables

  table_names=$(psql -t -c "SELECT table_name
                            FROM information_schema.tables
                            WHERE table_schema = 'public' AND table_name ILIKE '____adm%'
                            ORDER BY table_name;")
  echo $table_names
}


for table_name in $(get_tables "%adm%")
do
  printf "\n\n===== ${table_name} =====\n"

  PGOPTIONS='--client-min-messages=warning' psql -q -U geonode -d geonode_data <<EOF
BEGIN;

-- 1 ALTER TABLE - add columns
DO \$\$
  BEGIN
    BEGIN
      ALTER TABLE "${table_name}" ADD COLUMN urban_2015_km double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column urban_2015_km already exists.';
    END;
  END;
\$\$;

-- 2 UPDATE - add data
UPDATE "${table_name}" au
  SET
    urban_2015_km = CASE
      WHEN gufStats.v255sum IS NULL THEN 0
      WHEN gufStats.v255sum::NUMERIC = 0 THEN 0
      ELSE (ST_Area(geography(au.the_geom))/1000000) * (gufStats.v255sum::NUMERIC / (gufStats.v255sum::NUMERIC + gufStats.v0sum::NUMERIC))
    END
  FROM (
    SELECT
      gsau.the_geom AS the_geom,
      SUM(ST_ValueCount(ST_Clip(gsguf.rast, gsau.the_geom), 0.0)) AS v0sum,
      SUM(ST_ValueCount(ST_Clip(gsguf.rast, gsau.the_geom), 255.0)) AS v255sum
      FROM "${table_name}" gsau
        INNER JOIN wsf2015_pr2018 gsguf ON ST_Intersects(gsguf.rast, gsau.the_geom)
      GROUP BY gsau.the_geom
  ) AS gufStats
  WHERE au.the_geom = gufStats.the_geom;

COMMIT;
EOF

done
