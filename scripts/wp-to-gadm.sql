-- replace ____autable____ with the table name (5x)

-- 1 ALTER TABLE - add columns
DO $$
  BEGIN
    BEGIN
      ALTER TABLE ____autable____ ADD COLUMN wpstat_uf double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_uf already exists.';
    END;
  END;
$$;
DO $$
  BEGIN
    BEGIN
      ALTER TABLE ____autable____ ADD COLUMN wpstat_all double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_all already exists.';
    END;
  END;
$$;
DO $$
  BEGIN
    BEGIN
      ALTER TABLE ____autable____ ADD COLUMN wpstat_ratio double precision;
    EXCEPTION
      WHEN duplicate_column THEN RAISE WARNING 'column gufstat_uf already exists.';
    END;
  END;
$$;

-- TODO which columns?

-- 2 UPDATE - add data
UPDATE ____autable____ au
  SET

    --wpstat_uf = wpStats.v255sum,
    --wpstat_all = wpStats.v255sum + wpStats.v0sum,
    --wpstat_ratio = CASE
    --  WHEN (wpStats.v255sum + wpStats.v0sum) <> 0 THEN (wpStats.v255sum::NUMERIC / (wpStats.v255sum::NUMERIC + wpStats.v0sum::NUMERIC))
    --  ELSE 0
    --END

    -- TODO computations

  FROM (
    SELECT
      wsau.the_geom AS the_geom,
      SUM(ST_ValueCount(ST_Clip(wswp.rast, wsau.the_geom), 0.0)) AS v0sum,
      SUM(ST_ValueCount(ST_Clip(wswp.rast, wsau.the_geom), 255.0)) AS v255sum
      FROM ____autable____ wsau
        INNER JOIN "world-pop" wswp ON ST_Intersects(wswp.rast, wsau.the_geom)
      WHERE ST_Intersects(rast, wsau.the_geom)
      GROUP BY wsau.the_geom
  ) AS wpStats
  WHERE au.the_geom = wpStats.the_geom;

