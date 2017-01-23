-- 1 ALTER TABLE - add columns

ALTER TABLE gadm_test ADD COLUMN gufstat_uf double precision;
ALTER TABLE gadm_test ADD COLUMN gufstat_all double precision;
ALTER TABLE gadm_test ADD COLUMN gufstat_ratio double precision;


-- 2 UPDATE - add data

UPDATE gadm_test au
  SET
    gufstat_uf = gufStats.v255sum,
    gufstat_all = gufStats.v255sum + gufStats.v0sum,
    gufstat_ratio = CASE
      WHEN (gufStats.v255sum + gufStats.v0sum) <> 0 THEN (gufStats.v255sum::NUMERIC / (gufStats.v255sum::NUMERIC + gufStats.v0sum::NUMERIC))
      ELSE 0
    END
  FROM (
    SELECT
      gsau.the_geom AS the_geom,
      SUM(ST_ValueCount(ST_Clip(gsguf.rast, gsau.the_geom), 0.0)) AS v0sum,
      SUM(ST_ValueCount(ST_Clip(gsguf.rast, gsau.the_geom), 255.0)) AS v255sum
      FROM gadm_test gsau
        INNER JOIN guf_75m_04 gsguf ON ST_Intersects(gsguf.rast, gsau.the_geom)
      WHERE ST_Intersects(rast, gsau.the_geom)
      GROUP BY gsau.the_geom
  ) AS gufStats
  WHERE au.the_geom = gufStats.the_geom;

