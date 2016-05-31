Sass way to compile Panther CSS 
===============================

There is an endpoint **/app.css**, served be *server.js* route using GetCSS function at */common/get-css.js*.
It depends on node-sass npm package.
Project specific styles can be imported at */common/get-css.js*.
Small chunks of CSS rules can be set up as toggled CSS at */scss/_toggles.scss*.
Each toggle should have its default at */scss/_toggles-defaults.scss*.
Config variables to be passed to Sass compiler have to be specified in */common/get-css.js*.

TODOS
=====

 - Separate passing config variables to app.css from */common/get-css.js*
 - Better handling of project specific stylesheets
 - Complete this guide