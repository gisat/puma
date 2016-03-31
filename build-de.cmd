@echo off
REM Windows build script for Data Exploration
call sencha build -p public\appde.jsb3 -d public
call jsmin <public\appde.all.js >public\appde.min.js
