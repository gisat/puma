@echo off
REM Windows build script
echo.
echo First, comment out Puma.patch.Main lines at requires at public\appde.js and public\appmng.js
echo.
pause
call build-de.cmd
call build-mng.cmd
echo.
echo Now, uncomment 'Puma.patch.Main' lines
echo.
pause
