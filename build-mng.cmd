@echo off
REM Windows build script for old Backoffice
call sencha build -p public\appmng.jsb3 -d public
call jsmin <public\appmng.all.js >public\appmng.min.js
