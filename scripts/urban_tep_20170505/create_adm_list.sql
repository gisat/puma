DROP VIEW IF EXISTS adm_list;
DROP FUNCTION IF EXISTS adm_list_base();
DROP TYPE IF EXISTS adm_list_type;

CREATE TYPE adm_list_type AS (
  table_name varchar,
  fid integer,
  id_0 integer,
  id_1 integer,
  id_2 integer,
  id_3 integer,
  id_4 integer,
  id_5 integer,
  worldpop real,
  gpw_v4 real,
  guf12m real,
  tweet real,
  sum_light real,
  rel_aff_area_light real,
  aff_avg_light real);

CREATE FUNCTION adm_list_base()
RETURNS SETOF adm_list_type
LANGUAGE plpgsql
AS $$
DECLARE
  maxlevel integer := 5;
  sql varchar;
  tname varchar;
  ilevel integer;
  tlevel integer;
BEGIN
  FOR tname, tlevel in SELECT table_name, level FROM adm_all LOOP
    sql := format('SELECT %L::varchar, fid', tname);
    FOR ilevel IN 0..tlevel LOOP
      sql := concat(sql, format(', %I::integer', concat('ID_', ilevel)));
    END LOOP;
    FOR ilevel in (tlevel + 1)..maxlevel LOOP
      sql := concat(sql, ', NULL::integer');
    END LOOP;
    sql := concat(sql, ', worldpop, gpw_v4, guf12m, tweet, sum_light, rel_aff_area_light, aff_avg_light');
    sql := concat(sql, format(' FROM %I;', tname));
    RETURN QUERY EXECUTE sql;
  END LOOP;
  RETURN;
END
$$;

CREATE VIEW adm_list AS
SELECT *
FROM adm_all
INNER JOIN adm_list_base() AS adm_list USING (table_name);
