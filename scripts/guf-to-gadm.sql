-- replace ____autable____ with the table name (5x)

-- 1 ALTER TABLE - add columns
DO $$
  BEGIN
    BEGIN
      ALTER TABLE ____autable____ ADD COLUMN gufstat_uf double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_uf already exists.';
    END;
  END;
$$;
DO $$
  BEGIN
    BEGIN
      ALTER TABLE ____autable____ ADD COLUMN gufstat_all double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_all already exists.';
    END;
  END;
$$;
DO $$
  BEGIN
    BEGIN
      ALTER TABLE ____autable____ ADD COLUMN gufstat_ratio double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_uf already exists.';
    END;
  END;
$$;

-- 2 UPDATE - add data
UPDATE ____autable____ au
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
      FROM ____autable____ gsau
        INNER JOIN guf_75m_04 gsguf ON ST_Intersects(gsguf.rast, gsau.the_geom)
      WHERE ST_Intersects(rast, gsau.the_geom)
      GROUP BY gsau.the_geom
  ) AS gufStats
  WHERE au.the_geom = gufStats.the_geom;

