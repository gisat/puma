CREATE TEMPORARY VIEW adm_compute AS
SELECT table_name
FROM adm_all
WHERE tbc;

CREATE TEMPORARY VIEW adm_propagate AS
SELECT table_name
FROM adm_all
WHERE NOT tbc;

CREATE FUNCTION pg_temp.setup_columns()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  tname varchar;
BEGIN
  FOR tname IN SELECT table_name FROM adm_all ORDER BY table_name LOOP
    sql := format('
      ALTER TABLE %I
      ADD COLUMN worldpop real NULL DEFAULT NULL,
      ADD COLUMN gpw_v4 real NULL DEFAULT NULL,
      ADD COLUMN guf12m real NULL DEFAULT NULL,
      ADD COLUMN tweet real NULL DEFAULT NULL,
      ADD COLUMN sum_light real NULL DEFAULT NULL,
      ADD COLUMN rel_aff_area_light real NULL DEFAULT NULL,
      ADD COLUMN aff_avg_light real NULL DEFAULT NULL;', tname);
    EXECUTE sql;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.set_state(IN table_name varchar, IN col_name varchar, IN flag char(1))
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  sql := format('UPDATE adm_all SET %I = $1 WHERE table_name = $2;', col_name);
  EXECUTE sql USING flag, table_name;
END
$$;

CREATE FUNCTION pg_temp.list_empty(IN colname varchar)
RETURNS SETOF varchar
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tname varchar;
  sql varchar;
  cnt integer;
BEGIN
  FOR tname IN SELECT table_name FROM adm_all ORDER BY table_name LOOP
    sql := format('
      SELECT COUNT(*) AS cnt
      FROM %1$I
      WHERE %2$I IS NULL;', tname, colname);
    EXECUTE sql INTO cnt;
    IF cnt > 0 THEN
      RETURN NEXT tname;
    END IF;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.propagate_info(IN table_name varchar,
                                       OUT adm_colname varchar,
                                       OUT computed_table_name varchar)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  sql varchar;
  level char(1);
  country varchar;
BEGIN
  level := substring(table_name from 8 for 1);
  adm_colname := 'ID_' || level;
  country := substring(table_name from 1 for 3);
  sql := 'SELECT adm_all.table_name
          FROM adm_all
          WHERE adm_all.country = $1 AND adm_all.tbc AND adm_all.level > $2;';
  EXECUTE sql INTO computed_table_name USING country, level::integer;
END
$$;

CREATE FUNCTION pg_temp.clip(adm_table varchar,
                             raster_table varchar,
                             fid integer)
RETURNS TABLE (rast raster)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  sql varchar;
BEGIN
  sql := format('
    SELECT ST_Clip(raster_table.rast, adm_table.the_geom) AS rast
    FROM %1$I adm_table, %2$I raster_table
    WHERE adm_table.fid = $1
      AND ST_Intersects(raster_table.rast, adm_table.the_geom);', adm_table, raster_table);
  FOR rast IN EXECUTE sql USING fid LOOP
    IF NOT ST_IsEmpty(rast) THEN
      IF NOT ST_BandIsNoData(rast) THEN
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.compute_worldpop(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing worldpop for %.', table_name;
  sql := format('
    UPDATE %1$I adm
    SET worldpop = (SELECT SUM((ST_SummaryStats(rast)).sum)
                    FROM pg_temp.clip(%1$L, %2$L, adm.fid));', table_name, 'worldpop');
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, 'worldpop_state', 'R');
END
$$;

CREATE FUNCTION pg_temp.compute_guf12m(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing guf12m for %.', table_name;
  sql := format('
    UPDATE %1$I adm
    SET guf12m = (SELECT
                    SUM(ST_Area(geography(ST_Envelope(rast))) * ST_ValueCount(rast, 255.0) / ST_Count(rast, FALSE))
                  FROM pg_temp.clip(%1$L, %2$L, adm.fid));', table_name, 'guf12m');
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, 'guf12m_state', 'R');
END
$$;

CREATE FUNCTION pg_temp.compute_gpw_v4(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing gpw_v4 for %.', table_name;
  sql := format('
    UPDATE %1$I adm
    SET gpw_v4 = (SELECT SUM((ST_SummaryStats(rast)).sum)
                  FROM pg_temp.clip(%1$L, %2$L, adm.fid));', table_name, 'gpw_v4');
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, 'gpw_v4_state', 'R');
END
$$;

CREATE FUNCTION pg_temp.compute_tweet(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing tweets for %.', table_name;
  sql := format('
    UPDATE %1$I adm
    SET tweet = (SELECT count(*)
                 FROM tweets
                 WHERE ST_Covers(adm.the_geom, tweets.the_geom));', table_name);
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, 'tweet_state', 'R');
END
$$;

CREATE FUNCTION pg_temp.compute_night_light(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing night light for %.', table_name;
  sql := format('
    UPDATE %1$I adm
    SET (rel_aff_area_light,
         aff_avg_light) =
    (SELECT CASE WHEN a_count IS NULL OR a_not_aff_count IS NULL OR a_count = a_not_aff_count
                 THEN NULL
                 ELSE 1.0 - (a_not_aff_count / a_count)
            END AS rel_aff_area_light,
            CASE WHEN a_count IS NULL OR a_sum IS NULL OR a_not_aff_count IS NULL OR a_count = a_not_aff_count
                 THEN NULL
                 ELSE a_sum / (a_count - a_not_aff_count)
            END AS aff_avg_light
     FROM (SELECT  SUM(c_sum) AS a_sum,
                   SUM(c_count) AS a_count,
                   SUM(c_not_aff_count) AS a_not_aff_count
           FROM (SELECT CAST ((ST_SummaryStats(rast)).sum AS numeric) / 1e12 AS c_sum,
                        CAST ((ST_SummaryStats(rast)).count AS numeric) AS c_count,
                        CAST (ST_ValueCount(rast, 1, 0.0) AS numeric) AS c_not_aff_count
                 FROM pg_temp.clip(%1$L, %2$L, adm.fid) clipped_rast) a_summary) set_values);', table_name, 'night_light');
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, 'night_light_state', 'R');
END
$$;

CREATE FUNCTION pg_temp.propagate_sum(IN table_name varchar,
                                      IN value_colname varchar,
                                      IN status_colname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  adm_colname varchar;
  computed_table_name varchar;
BEGIN
  SELECT (pg_temp.propagate_info(table_name)).* INTO adm_colname, computed_table_name;
  RAISE NOTICE 'Propagating SUM(%) from % into % using %.', value_colname, computed_table_name, table_name, adm_colname;
  sql := format('
    UPDATE %1$I adm
    SET %2$I = (SELECT SUM(%2$I)
                FROM %3$I computed
                WHERE adm.%4$I = computed.%4$I);', table_name, value_colname, computed_table_name, adm_colname);
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, status_colname, 'R');
END
$$;

CREATE FUNCTION pg_temp.propagate_night_light(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  adm_colname varchar;
  computed_table_name varchar;
BEGIN
  SELECT (pg_temp.propagate_info(table_name)).* INTO adm_colname, computed_table_name;
  RAISE NOTICE 'Propagating night_light from % into % using %.', computed_table_name, table_name, adm_colname;
  sql := format('
    UPDATE %1$I adm
    SET (rel_aff_area_light,
         aff_avg_light) =
    (SELECT SUM(c_rel_aff_area) / SUM(c_adm_area),
            SUM(c_aff_avg_light * c_rel_aff_area) / SUM(c_rel_aff_area)
     FROM (SELECT ST_Area(geography(computed.the_geom)) AS c_adm_area,
                  computed.rel_aff_area_light * ST_Area(geography(computed.the_geom)) AS c_rel_aff_area,
                  computed.aff_avg_light AS c_aff_avg_light
           FROM %2$I computed
           WHERE adm.%3$I = computed.%3$I) c_values);', table_name, computed_table_name, adm_colname);
  EXECUTE sql;
  PERFORM pg_temp.set_state(table_name, 'night_light_state', 'R');
END
$$;

CREATE FUNCTION pg_temp.get_wb_years()
RETURNS integer ARRAY
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN ARRAY[1990,
               2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
               2010, 2011, 2012, 2013, 2014, 2015];
END
$$;

CREATE FUNCTION pg_temp.setup_wb_columns(IN tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  wb_year integer;
BEGIN
  RAISE NOTICE 'Adding wb columns for %.', tname;
  FOREACH wb_year IN ARRAY pg_temp.get_wb_years() LOOP
    sql := format('
      ALTER TABLE %I
      ADD COLUMN %I numeric NULL DEFAULT NULL,
      ADD COLUMN %I numeric NULL DEFAULT NULL,
      ADD COLUMN %I numeric NULL DEFAULT NULL,
      ADD COLUMN %I numeric NULL DEFAULT NULL,
      ADD COLUMN %I numeric NULL DEFAULT NULL,
      ADD COLUMN %I numeric NULL DEFAULT NULL;',
        tname,
        'wb_' || wb_year || '_total',
        'wb_' || wb_year || '_0014',
        'wb_' || wb_year || '_1564',
        'wb_' || wb_year || '_65up',
        'wb_' || wb_year || '_health',
        'wb_' || wb_year || '_urb');
    EXECUTE sql;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.set_wb_total(IN dst_tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  country char(3);
  dst_colname varchar;
  src_colname varchar;
  wb_year integer;
BEGIN
  RAISE NOTICE 'Uploading wb_total for %.', dst_tname;
  country := substring(dst_tname from 1 for 3);
  FOREACH wb_year IN ARRAY pg_temp.get_wb_years() LOOP
    src_colname := 'yr' || wb_year;
    dst_colname := 'wb_' || wb_year || '_total';
    sql := format('UPDATE %1$I adm
                   SET %2$I = (SELECT CAST(%3$I AS numeric)
                               FROM import.wb_total wb
                               WHERE wb.wbccode = $1 AND %3$I ~ %4$L
                               LIMIT 1);',
                  dst_tname, dst_colname, src_colname, '^[0-9]+.?[0-9]*$');
    EXECUTE sql USING country;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.set_wb_age(IN dst_tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  age char(4);
  sql varchar;
  country char(3);
  dst_colname varchar;
  src_colname varchar;
  wb_year integer;
BEGIN
  RAISE NOTICE 'Uploading wb_age for %.', dst_tname;
  country := substring(dst_tname from 1 for 3);
  FOREACH wb_year IN ARRAY pg_temp.get_wb_years() LOOP
    FOREACH age IN ARRAY ARRAY['0014', '1564', '65up'] LOOP
      src_colname := 'yr' || wb_year;
      dst_colname := 'wb_' || wb_year || '_' || age;
      sql := format('UPDATE %1$I adm
                     SET %2$I = (SELECT CAST(%3$I AS numeric)
                                 FROM import.wb_age wb
                                 WHERE wb.wbccode = $1
                                   AND lower(seriescode) ~ %4$L
                                   AND %3$I ~ %5$L
                                 LIMIT 1);',
                    dst_tname, dst_colname, src_colname, age, '^[0-9]+.?[0-9]*$');
      EXECUTE sql USING country;
    END LOOP;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.set_wb_health(IN dst_tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  country char(3);
  dst_colname varchar;
  src_colname varchar;
  wb_year integer;
BEGIN
  RAISE NOTICE 'Uploading wb_health for %.', dst_tname;
  country := substring(dst_tname from 1 for 3);
  FOREACH wb_year IN ARRAY pg_temp.get_wb_years() LOOP
    src_colname := 'yr' || wb_year;
    dst_colname := 'wb_' || wb_year || '_health';
    sql := format('UPDATE %1$I adm
                   SET %2$I = (SELECT CAST(%3$I AS numeric)
                               FROM import.wb_health wb
                               WHERE wb.wbccode = $1 AND %3$I ~ %4$L
                               LIMIT 1);',
                  dst_tname, dst_colname, src_colname, '^[0-9]+.?[0-9]*$');
    EXECUTE sql USING country;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.set_wb_urb(IN dst_tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  country char(3);
  dst_colname varchar;
  src_colname varchar;
  wb_year integer;
  wb_years integer ARRAY := ARRAY[1990, 2000, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015];
BEGIN
  RAISE NOTICE 'Uploading wb_urb for %.', dst_tname;
  country := substring(dst_tname from 1 for 3);
  FOREACH wb_year IN ARRAY wb_years LOOP
    src_colname := 'yr' || wb_year;
    dst_colname := 'wb_' || wb_year || '_urb';
    sql := format('UPDATE %1$I adm
                   SET %2$I = (SELECT CAST(%3$I AS numeric)
                               FROM import.wb_urb wb
                               WHERE wb.wbccode = $1 AND %3$I ~ %4$L
                               LIMIT 1);',
                  dst_tname, dst_colname, src_colname, '^[0-9]+.?[0-9]*$');
    EXECUTE sql USING country;
  END LOOP;
END
$$;
  
CREATE FUNCTION pg_temp.setup_un_columns(IN tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  un_year integer;
  un_years integer ARRAY := ARRAY[2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010];
BEGIN
  RAISE NOTICE 'Adding un columns for %.', tname;
  FOREACH un_year IN ARRAY un_years LOOP
    sql := format('
      ALTER TABLE %I
      ADD COLUMN %I numeric NULL DEFAULT NULL;',
        tname,
        'un_' || un_year || '_footprint');
    EXECUTE sql;
  END LOOP;
END
$$;

CREATE FUNCTION pg_temp.set_un_footprint(IN dst_tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
  country char(3);
  dst_colname varchar;
  src_colname varchar;
  un_year integer;
  un_years integer ARRAY := ARRAY[2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010];
BEGIN
  RAISE NOTICE 'Uploading un_footprint for %.', dst_tname;
  country := substring(dst_tname from 1 for 3);
  FOREACH un_year IN ARRAY un_years LOOP
    src_colname := '_' || un_year;
    dst_colname := 'un_' || un_year || '_footprint';
    sql := format('UPDATE %1$I adm
                   SET %2$I = (SELECT CAST(%3$I AS numeric)
                               FROM import.un_footprint un
                               WHERE un.unccode = $1 AND %3$I ~ %4$L
                               LIMIT 1);',
                  dst_tname, dst_colname, src_colname, '^[0-9]+.?[0-9]*$');
    EXECUTE sql USING country;
  END LOOP;
END
$$;
  
CREATE TEMPORARY VIEW guf_nets_tables AS
SELECT f_table_name::varchar AS table_name
FROM geometry_columns
WHERE f_table_schema = 'public'
  AND f_table_name ~ '^[A-Z]{3}_75m_binConnectivity_10km_5km_3km_2_km_1km$';

CREATE FUNCTION pg_temp.setup_guf_nets_columns(IN tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
    sql := format('
      ALTER TABLE %I
      ADD COLUMN tweet real NULL DEFAULT NULL,
      ADD COLUMN rel_aff_area_light real NULL DEFAULT NULL,
      ADD COLUMN aff_avg_light real NULL DEFAULT NULL;', tname);
    EXECUTE sql;
END
$$;

CREATE FUNCTION pg_temp.compute_guf_nets_tweet(IN tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing guf_nets tweets for %.', tname;
  sql := format('
    UPDATE %1$I gn_adm
    SET tweet = (SELECT count(*)
                 FROM tweets
                 WHERE ST_Covers(gn_adm.the_geom, tweets.the_geom));', tname);
  EXECUTE sql;
END
$$;

CREATE FUNCTION pg_temp.compute_guf_nets_light(IN tname varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing guf_nets night_light for %.', tname;
  sql := format('
    UPDATE %1$I gn_adm
    SET (rel_aff_area_light, aff_avg_light) =
        (SELECT
           sum(CASE WHEN (stvc).value > 0 THEN (stvc).count ELSE 0 END)::real
             / sum((stvc).count) AS rel_aff_area_light,
           avg(CASE WHEN (stvc).value > 0 THEN (stvc).value ELSE NULL END) AS aff_avg_light
         FROM (SELECT ST_ValueCount(rast) AS stvc
               FROM pg_temp.clip(%1$L, %2$L, gn_adm.fid)) sq_stvc);', tname, 'night_light');
  EXECUTE sql;
END
$$;

\timing
