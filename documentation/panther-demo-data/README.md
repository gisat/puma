Panther Demo Data
=================

Demo data for Panther front end.

Initial application load
------------------------

* [101-rest-location.json](101-rest-location.json) - GET rest/location
* [102-rest-theme.json](102-rest-theme.json) - GET rest/theme
* [103-rest-layergroup.json](103-rest-layergroup.json) - GET rest/layergroup
* [104-rest-attributeset.json](104-rest-attributeset.json) - GET rest/attributeset
* [105-rest-attribute.json](105-rest-attribute.json) - GET rest/attribute
* [106-rest-visualization.json](106-rest-visualization.json) - GET rest/visualization
* [107-rest-year.json](107-rest-year.json) - GET rest/year
* [108-rest-scope.json](108-rest-scope.json) - **unused** - GET rest/scope
* [109-rest-areatemplate.json](109-rest-areatemplate.json) - GET rest/areatemplate
* [110-rest-symbology.json](110-rest-symbology.json) - GET rest/symbology
* [111-rest-dataset.json](111-rest-dataset.json) - GET rest/dataset
* [112-rest-topc.json](112-rest-topc.json) - GET rest/topic
* [113-rest-dataview.json](113-rest-dataview.json) - GET rest/dataview
* [114-api-getLocationConf.json](114-api-getLocationConf.json) - POST api/theme/getLocationConf (no form data)
* [115-api-getLoginInfo-logged-in.json](115-api-getLoginInfo-logged-in.json) - POST api/login/getLoginInfo with beeing logged in (no form data)
* [116-api-getLoginInfo-logged-out.json](116-api-getLoginInfo-logged-out.json) - POST api/login/getLoginInfo without beeing logged in (no form data)

Load application after selecting Scope and Theme 
------------------------------------------------

* [201req-api-getThemeYearConf.json](201req-api-getThemeYearConf.json) > [201-api-getThemeYearConf.json](201-api-getThemeYearConf.json) - POST api/theme/getThemeYearConf - first call has empty response data
* [202req-api-getThemeYearConf.json](202req-api-getThemeYearConf.json) > [202-api-getThemeYearConf.json](202-api-getThemeYearConf.json) - POST api/theme/getThemeYearConf - second call
* [203req-api-getChart.json](203req-api-getChart.json) > [203-api-getChart.json](203-api-getChart.json) - POST api/chart/getChart - Chart example
* [204req-api-saveSld.json](204req-api-saveSld.json) > [204-api-saveSld.json](204-api-saveSld.json) - POST api/proxy/saveSld - Example of client-side generating SLD for choropleth