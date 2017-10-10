CREATE TEMPORARY VIEW adm_compute AS
SELECT table_name
FROM adm_all
WHERE tbc;

CREATE TEMPORARY VIEW adm_propagate AS
SELECT *
FROM adm_all
WHERE NOT tbc;

CREATE FUNCTION pg_temp.compute_nightlight(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  RAISE NOTICE 'Computing night light for %.', table_name;
  sql := format('
    WITH
      fid_rasts AS (
        SELECT adm.fid,
               ST_Clip(ng.rast, 1, adm.the_geom, FALSE) AS rast
        FROM %1$I adm
        INNER JOIN %2$I ng ON ST_Intersects(ng.rast, adm.the_geom)),
      fid_stats AS (
        SELECT fid,
               sum((ST_SummaryStats(rast)).sum) AS fsum,
               sum(ST_Count(rast)) AS fcount,
               sum(ST_ValueCount(rast, 0.0)) AS not_aff_count
        FROM fid_rasts
        GROUP BY fid)
    UPDATE %1$I adm
    SET rel_aff_area_light = CASE WHEN fcount = 0 THEN NULL
                                  ELSE 1.0 - (not_aff_count / fcount)
                             END,
        aff_avg_light = CASE WHEN fcount = 0 THEN NULL
                             WHEN fcount = not_aff_count THEN 0
                             ELSE fsum / (fcount - not_aff_count)
                        END
    FROM fid_stats
    WHERE adm.fid = fid_stats.fid;', table_name, 'night_light');
  EXECUTE sql;
END
$$;

CREATE FUNCTION pg_temp.clear_propagated_nightlight(IN table_name varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sql varchar;
BEGIN
  sql := format('UPDATE %1$I
                 SET rel_aff_area_light = NULL,
                     aff_avg_light = NULL;', table_name);
  EXECUTE sql;
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

CREATE FUNCTION pg_temp.propagate_nightlight(IN table_name varchar)
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
    (SELECT s_aff_area / s_adm_area,
            CASE WHEN s_aff_area = 0 THEN 0
                 ELSE s_aff_light / s_aff_area
            END
     FROM (SELECT SUM(c_aff_area) AS s_aff_area,
                  SUM(c_adm_area) AS s_adm_area,
                  SUM(c_aff_avg_light * c_aff_area) AS s_aff_light
           FROM (SELECT ST_Area(geography(computed.the_geom)) AS c_adm_area,
                        computed.rel_aff_area_light * ST_Area(geography(computed.the_geom)) AS c_aff_area,
                        computed.aff_avg_light AS c_aff_avg_light
                 FROM %2$I computed
                 WHERE adm.%3$I = computed.%3$I
                ) c_values
          ) s_values
    );', table_name, computed_table_name, adm_colname);
  EXECUTE sql;
END
$$;
