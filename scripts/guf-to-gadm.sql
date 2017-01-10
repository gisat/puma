-- 1 ALTER TABLE - add columns

ALTER TABLE gadm_test ADD COLUMN test1 double precision;


-- 2 UPDATE - add data

UPDATE gadm_test au
  SET test1 = gufStats.v255sum
  FROM (
    SELECT
      au.the_geom AS the_geom,
      SUM(ST_ValueCount(ST_Clip(guf.rast, au.the_geom), 0.0)) AS v0sum,
      SUM(ST_ValueCount(ST_Clip(guf.rast, au.the_geom), 255.0)) AS v255sum
      FROM gadm_test au
        INNER JOIN guf_75m_04 guf ON ST_Intersects(guf.rast, au.the_geom)
      WHERE ST_Intersects(rast, au.the_geom)
      GROUP BY au.the_geom
  ) AS gufStats
  WHERE au.the_geom = gufStats.the_geom;

