#!/usr/bin/env bash

####### configuration

# set array of layers, e.g: layers=("srb_gadm_adm2_b3" "ubt_gadm_adm2_b3" "jlb_gadm_adm2_b3")
layers=("gadm_test")

#######




for ((i=0; i < ${#layers[@]}; i++))
do
  printf "\n\n===== ${layers[$i]} =====\n"

  PGOPTIONS='--client-min-messages=warning' psql -q -U geonode -d geonode_data <<EOF
BEGIN;

-- 1 ALTER TABLE - add columns
DO \$\$
  BEGIN
    BEGIN
      ALTER TABLE "${layers[$i]}" ADD COLUMN gufstat_km double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_km already exists.';
    END;
  END;
\$\$;

-- 2 UPDATE - add data
UPDATE "${layers[$i]}" au
  SET
    gufstat_km = CASE
      WHEN gufStats.v255sum IS NULL THEN 0
      WHEN gufStats.v255sum::NUMERIC = 0 THEN 0
      ELSE (ST_Area(geography(au.the_geom))/1000000) * (gufStats.v255sum::NUMERIC / (gufStats.v255sum::NUMERIC + gufStats.v0sum::NUMERIC))
    END
  FROM (
    SELECT
      gsau.the_geom AS the_geom,
      SUM(ST_ValueCount(ST_Clip(gsguf.rast, gsau.the_geom), 0.0)) AS v0sum,
      SUM(ST_ValueCount(ST_Clip(gsguf.rast, gsau.the_geom), 255.0)) AS v255sum
      FROM "${layers[$i]}" gsau
        INNER JOIN guf_75m_04 gsguf ON ST_Intersects(gsguf.rast, gsau.the_geom)
      GROUP BY gsau.the_geom
  ) AS gufStats
  WHERE au.the_geom = gufStats.the_geom;

COMMIT;
EOF

done
