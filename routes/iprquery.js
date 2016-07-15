var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');

module.exports = function (app) {

    app.post("/iprquery", function (req, res) {

        var searchValue = req.body.search;
        var searchSelect = req.body.source;

        var url = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/urban-ontology?query=";
        var url2 = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/ipr-datasets?query=";
        url += encodeURIComponent(searchValue);
        url2 += encodeURIComponent(searchValue);

        if (searchSelect == 1) {
            console.log(url);
        } else {
            console.log(url2);
        }

        request((searchSelect == 1 ? url : url2), function (iprerr, iprres, iprbody) {
            var jsonRes = {};
            var body = "";
            if (!iprerr && iprres.statusCode == 200) {
                /*var datasets = iprbody.split(/(?:\r\n|\r|\n)/g);
                var fields = datasets[0].split(",");

                datasets.splice(0, 1);
                datasets.splice(-1, 1);

                body += "<table cellpadding='5px' cellspacing='5px' style='text-align: left;'>";
                body += "<tr style='font-weight: bold;'>";

                for (var fID in fields) {
                    body += "<td>" + fields[fID] + "</td>";
                }

                body += "</tr>";

                for (var dataset of datasets) {
                    var matches = dataset.match(/(".*")/g);
                    if( matches != null ) {
                        dataset = dataset.replace(/".*"/g, matches[0].replace(/,/g, '&#44;'));
                        console.log(dataset);
                    }
                    dataset = dataset.split(",");
                    body += "<tr>";

                    for (var dID in dataset) {
                        body += "<td>" + dataset[dID] + "</td>";
                    }

                    body += "</tr>";
                }

                body += "</table>";
                body += "<script>$( \"tr:odd\" ).css( \"background-color\", \"#bbbbff\" );</script>";
                jsonRes['body'] = body;*/
                jsonRes['body'] = iprbody;
                console.log(iprbody);
            } else {
                jsonRes['body'] = iprbody;
            }
            res.status(200).json(jsonRes);
        });
    });
};