-- states: E=empty, P=processing, F=finished;
-- tbc => to be computed;
CREATE TABLE adm_all (
  table_name varchar NOT NULL,
  country char(3) NOT NULL,
  level integer NOT NULL,
  tbc boolean NOT NULL DEFAULT TRUE,
  canonical_name boolean NOT NULL DEFAULT TRUE,
  worldpop_state char(1) NOT NULL DEFAULT 'E',
  guf12m_state char(1) NOT NULL DEFAULT 'E',
  gpw_state char(1) NOT NULL DEFAULT 'E',
  tweet_state char(1) NOT NULL DEFAULT 'E'.
  night_light_state char(1) NOT NULL DEFAULT 'E');

INSERT INTO adm_all (table_name, country, level)
SELECT
  table_name,
  substring(table_name from 1 for 3),
  substring(table_name from 8 for 1)::integer
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ~ '^[[:alpha:]]{3}_adm[[:digit:]](_[[:digit:]])?$'
ORDER BY table_name;

UPDATE adm_all
SET tbc = FALSE;

UPDATE adm_all
SET tbc = TRUE
FROM (
  SELECT DISTINCT ON (country) country, level
  FROM adm_all
  ORDER BY country, level DESC) t_tbc
WHERE adm_all.country = t_tbc.country AND adm_all.level = t_tbc.level;

UPDATE adm_all
SET canonical_name = (table_name ~ '^[[:alpha:]]{3}_adm[[:digit:]]$');
