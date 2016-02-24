PUMA – Platform for Urban Management and Analysis
=================================================

TODO
----

Mimo GitHub
-----------
- config.js
- node_modules/...
- public/config.js
- public/Ext...
- public/lib/... (Highcharts, OpenLayers, jQuery)
- public/devlib/... (OpenLayers, Rico)

Build
-----
 0. cd to /public
 1. zakomentovat řádek `'Puma.patch.Main',` v *requires* v *appde.js*
 2. build příkazem `sencha build -p appde.jsb3 -d .`
 3. minifikace příkazem `jsmin <appde.all.js >appde.min.js`
 4. odkomentovat řádek `'Puma.patch.Main',` v *requires* v *appde.js*

Build administrace obdobně, jen *appmng* místo *appde*.

Příprava appde.jsb3 / appmng.jsb3
---------------------------------
1. odkomentovat řádek `'Puma.patch.Main',` v *requires* v *appde.js*
2. pustit server na lokálu s devel skripty
3. příkaz `sencha create jsb -a` adresa, kde je spuštěn `-p appde.jsb3`
4. úpravy appde.jsb3:
	- název, copyright
	- *all-classes.js* přepsat na *appde.all.js / appmng.all.js*
	- na konci zrušit *app-all.js* a místo toho jen přidat k ostatním *appde.js / appmng.js*
	- najít a vymazat *patch.Main.js*
