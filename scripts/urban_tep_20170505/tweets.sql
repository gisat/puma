CREATE TABLE tweets (
  fid serial PRIMARY KEY,
  msg_txt varchar(255) NULL DEFAULT NULL,
  timestamp_txt varchar(30) NULL DEFAULT NULL,
  easting_txt varchar(30) NULL DEFAULT NULL,
  northing_txt varchar(30) NULL DEFAULT NULL,
  easting double precision NULL DEFAULT NULL,
  northing double precision NULL DEFAULT NULL);

-- gunzip -c ./world_tweets.csv.zip >world_tweets.tsv
--
-- \copy tweets (msg_txt, timestamp_txt, easting_txt, northing_txt) from './world_tweets.tsv' with delimiter as E'\t'
--
-- rm ./world_tweets.tsv

SELECT AddGeometryColumn ('public', 'tweets', 'the_geom', 4326, 'POINT', 2);

UPDATE tweets SET easting = CAST(easting_txt AS double precision);
UPDATE tweets SET northing = CAST(northing_txt AS double precision);

SELECT count(*) FROM tweets WHERE easting IS NULL;
SELECT count(*) FROM tweets WHERE northing IS NULL;
SELECT count(*) FROM tweets WHERE easting = 0;
SELECT count(*) FROM tweets WHERE northing = 0;

UPDATE tweets SET the_geom = ST_SetSRID(ST_MakePoint(easting, northing), 4326);

--ALTER TABLE tweets DROP COLUMN msg_txt;
--ALTER TABLE tweets DROP COLUMN timestamp_txt;
ALTER TABLE tweets DROP COLUMN easting_txt;
ALTER TABLE tweets DROP COLUMN northing_txt;
ALTER TABLE tweets DROP COLUMN easting;
ALTER TABLE tweets DROP COLUMN northing;

VACUUM FULL tweets;
