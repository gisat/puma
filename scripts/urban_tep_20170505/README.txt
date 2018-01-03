Intro
-----

There are ad-hoc scripts for generating statistics for UrbanTep.
The scripts were utilized for 20170505 UTEP prezentation.


Computing
---------

Run all night job:

 1. edit OFFSET_NR in the script.

 2. # nohup bash ./main.adm_compute.sh >./nohup.log 2>&1


Checking the rasters
--------------------

SELECT ST_SummaryStatsAgg(rast, 1, TRUE) FROM night_light;
SELECT DISTINCT ST_NumBands(rast) FROM night_light;
SELECT DISTINCT ST_BandNoDataValue(rast) FROM night_light;


Monitoring
----------

Show all tables where there are NULLS only in results, ex. for worldpop:

  SELECT table_name FROM adm_list GROUP BY table_name HAVING SUM(worldpop) IS NULL;

Show all tables where there are NULLs and computed values mixed in results, ex. for worldpop:

  SELECT DISTINCT table_name FROM adm_list WHERE worldpop IS NULL AND table_name IN (SELECT DISTINCT table_name FROM adm_list WHERE worldpop IS NOT NULL);


Import TIFs
-----------

  # raster2pgsql -a -I -M -C -F -s 4326 -t 1024x1024 *.tif public.night_light | gzip -c >night_light.psql


TODO
----

* there are some adm broken, must be reimported:
** can_adm?;
** rus_adm?;
* night_light must be recomputed while there are wrong results;

