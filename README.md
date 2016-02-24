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

Build na Windows
----------------
Je potřeba Sencha Command 2.0

Tool i stará backoffice skriptem:
 1. zakomentovat řádek `'Puma.patch.Main',` v *requires* v [*public\appde.js*](https://github.com/gisat/puma/blob/master/public/appde.js#L18)
 2. zakomentovat řádek `'Puma.patch.Main',` v *requires* v [*public\appmng.js*](https://github.com/gisat/puma/blob/master/public/appmng.js#L23)
 3. Spustit /build.cmd
 4. odkomentovat řádek `'Puma.patch.Main',` v *requires* v *public\appde.js*
 5. odkomentovat řádek `'Puma.patch.Main',` v *requires* v *public\appmng.js*
 
Nebo ručně:
 1. cd to /public
 2. zakomentovat řádek `'Puma.patch.Main',` v *requires* v [*appde.js*](https://github.com/gisat/puma/blob/master/public/appde.js#L18)
 3. build příkazem `sencha build -p appde.jsb3 -d .`
 4. minifikace příkazem `jsmin <appde.all.js >appde.min.js`
 5. odkomentovat řádek `'Puma.patch.Main',` v *requires* v *appde.js*
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
