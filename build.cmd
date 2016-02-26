@echo off
REM Windows build script
echo.
echo First, comment out Puma.patch.Main lines at requires at public\appde.js and public\appmng.js
echo.
pause
call sencha build -p public\appde.jsb3 -d public
call jsmin <public\appde.all.js >public\appde.min.js
call sencha build -p public\appmng.jsb3 -d public
call jsmin <public\appmng.all.js >public\appmng.min.js
echo.
echo Now, uncomment 'Puma.patch.Main' lines
echo.
pause
