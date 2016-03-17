PUMA – Platform for Urban Management and Analysis
=================================================

Frontoffice and old backoffice build on Windows
-----------------------------------------------
Sencha Command 2.0 is required

Frontoffice (Data Exploration Tool) and old backoffice using batch:
 1. comment row `'Puma.patch.Main',` in *requires* at [*public\appde.js*](https://github.com/gisat/puma/blob/master/public/appde.js#L18)
 2. comment row `'Puma.patch.Main',` in *requires* at [*public\appmng.js*](https://github.com/gisat/puma/blob/master/public/appmng.js#L23)
 3. Run /build.cmd, or /build-de.cmd to build frontoffice only, or /build-mng.cmd to buil old backoffice only
 4. uncomment row `'Puma.patch.Main',` in *requires* at *public\appde.js*
 5. uncomment row `'Puma.patch.Main',` in *requires* at *public\appmng.js*
 
Or manually:
 1. cd to /public
 2. comment row `'Puma.patch.Main',` in *requires* at [*appde.js*](https://github.com/gisat/puma/blob/master/public/appde.js#L18)
 3. run command to build `sencha build -p appde.jsb3 -d .`
 4. run command to minify `jsmin <appde.all.js >appde.min.js`
 5. uncomment row `'Puma.patch.Main',` in *requires* at *appde.js*
Old backoffice similarly, but *appmng* instead of *appde*.

appde.jsb3 / appmng.jsb3 creation
---------------------------------
1. ensure the row `'Puma.patch.Main',` in *requires* at *appde.js* is uncommented
2. run server on localhost with development scripts (appde.js instead of appde.min.js, ...)
3. run command `sencha create jsb -a http://localhost/tool -p appde.jsb3` http\://localhost/tool or the app address
4. edit appde.jsb3:
    - name, copyright
    - change *all-classes.js* to *appde.all.js / appmng.all.js*
    - remove *app-all.js* on the end of the file and add to others *appde.js / appmng.js* instead
    - find and remove *patch.Main.js*
Old backoffice similarly, but *appmng* instead of *appde*.

Apache configuration example
----------------------------
\#\#\#\# Allow CORS - cross domain requests
Header set Access-Control-Allow-Origin "*"

ServerName ...
ServerAdmin ...
DocumentRoot /var/www/geonode/
ErrorLog /var/log/apache2/error-https.log
LogLevel warn
CustomLog /var/log/apache2/access-https.log combined

ProxyPreserveHost On

WSGIProcessGroup geonode
WSGIPassAuthorization On
WSGIScriptAlias / /var/www/geonode/wsgi/geonode.wsgi

Alias /intro /var/www/puma-intro
Alias /downloads /var/www/puma-intro/index.php/downloads
Alias /static /var/www/geonode/static/
Alias /help /var/www/panther-app/public/help/
Alias /uploaded /var/www/geonode/uploaded/
Alias /robots.txt /var/www/geonode/robots.txt
Alias /favicon.ico /var/www/geonode/static/favicon.ico

<Directory "/var/www/puma-intro/">
    AllowOverride All
</Directory>
<Directory "/var/www/panther-app/public/help/">
    DirectoryIndex PUMA%20webtool%20help.html
</Directory>
<Directory "/var/www/geonode/">
    Order allow,deny
    Options Indexes FollowSymLinks
    Allow from all
    IndexOptions FancyIndexing
</Directory>
<Directory "/var/www/geonode/uploaded/documents/">
    Order allow,deny
    Deny from all
</Directory>

<Proxy *>
    Order allow,deny
    Allow from all
</Proxy>


\#\#\#\# /tool/* static routing
RedirectMatch 301 ^/tool$ /tool/

AliasMatch ^/tool/$ /var/www/panther-app/public/data-exploration.html
Alias /tool/css /var/www/panther-app/public/css
Alias /tool/ux /var/www/panther-app/public/ux
Alias /tool/_main /var/www/panther-app/public/_main
Alias /tool/_common /var/www/panther-app/public/_common
Alias /tool/images /var/www/panther-app/public/images
Alias /tool/devlib /var/www/panther-app/public/devlib
Alias /tool/lib /var/www/panther-app/public/lib
Alias /tool/gisatlib /var/www/panther-app/public/gisatlib
Alias /tool/extjs-4.1.3 /var/www/panther-app/public/extjs-4.1.3

ProxyPassMatch ^/tool/?$ !
ProxyPass /tool/css !
ProxyPass /tool/ux !
ProxyPass /tool/_main !
ProxyPass /tool/_common !
ProxyPass /tool/images !
ProxyPass /tool/devlib !
ProxyPass /tool/lib !
ProxyPass /tool/gisatlib !
ProxyPass /tool/extjs-4.1.3 !

\#\#\#\# /tool* non-static routing (and some minor static, not covered by above code)
ProxyPass /tool http\://localhost:3000
ProxyPassReverse /tool http\://localhost:3000


\#\#\#\# new backoffice ProxyPass
ProxyPass /backoffice http\://localhost:5542
ProxyPassReverse /backoffice http\://localhost:5542

\#\#\#\# geoserver proxyPass
ProxyPass /geoserver http\://localhost:8080/geoserver
ProxyPassReverse /geoserver http\://localhost:8080/geoserver

\#\#\#\# geoserver i2 proxyPass
ProxyPass /geoserver_i2 http\://localhost:8080/geoserver_i2
ProxyPassReverse /geoserver_i2 http\://localhost:8080/geoserver_i2