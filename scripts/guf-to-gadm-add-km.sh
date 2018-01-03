#!/usr/bin/env bash

# Adds GUF absolute km2 value gufstat_km column to previously computed AU tables with gufstat_ratio column.

####### configuration

# set array of layers, e.g: layers=("srb_gadm_adm2_b3" "ubt_gadm_adm2_b3" "jlb_gadm_adm2_b3")
layers=("gadm_test")

#######




for ((i=0; i < ${#layers[@]}; i++))
do
  printf "\n\n===== ${layers[$i]} =====\n"

  PGOPTIONS='--client-min-messages=warning' psql -q -U geonode -d geonode_data <<EOF
BEGIN;

-- 1 ALTER TABLE - add column
DO \$\$
  BEGIN
    BEGIN
      ALTER TABLE "${layers[$i]}" ADD COLUMN gufstat_km double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_km already exists.';
    END;
  END;
\$\$;

-- 2 UPDATE - compute data
UPDATE "${layers[$i]}" au
  SET
    gufstat_km = CASE
      WHEN gufstat_ratio = 0 THEN 0
      WHEN gufstat_ratio IS NULL THEN 0
      ELSE (ST_Area(geography(the_geom))/1000000) * gufstat_ratio
    END;

COMMIT;
EOF

done
