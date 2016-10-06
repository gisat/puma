var superagent = require('superagent');
var util = require('util');
var config = require('../config');
var LodEnhancedTable = require('./LodEnhancedTable');

class WpsController {
    constructor(app, pgPool) {
        this._running = [{
            name: 'Prague',
            from: 2016,
            to: 2017,
            started: '23/9/2015',
            finished: '22/10/2015',
            status: 'Success'
        },{
            name: 'Rome',
            from: 2015,
            to: 2016,
            started: '20/8/2015',
            finished: '21/8/2015',
            status: 'Failed'
        },{
            name: 'London',
            from: 2014,
            to: 2016,
            started: '20/8/2015',
            finished: '',
            status: 'Running'
        }];

        this._pgPool = pgPool;

        app.get('/wps/mellodies/lod', this.lod.bind(this));
    }

    lod(request, response, next) {
        var lodEnhanced = new LodEnhancedTable(this._pgPool, 'public', 'prague_ua2012', 'fid');
        lodEnhanced.update();

        response.json({status: 'Ok'});
    }

    run(request, response, next) {
        var processToStart = request.body;



        return superagent
            .get('http://10.15.27.32:8080/wps/WebProcessingService?dataInputs=')
            .query({service: "wps"})
            .query({version: "1.0.0"})
            .query({request: "Execute"})
            .query({identifier: "com.terradue.wps_oozie.process.OozieAbstractAlgorithm"})
            .query({"ResponseDocument": "result_distribution@application/xml;result_osd@application/xml"})
            .query({storeExecuteResponse: true})
            .query({status: true})
            .query({dataInputs: util.format('region=%s;start=%s-01-01;end=%s-12-31;lcm=1000;xres=20;yres=20;validpixels=70;ndvi=130;ndwi=100;confidence=50;', processToStart.name, processToStart.from, processToStart.to)})
            .set('Accept', '*/*')
            .set('Content-Type', 'application/json; charset=utf-8')
            .then(function(){

        });
        request.body.started = "20/9/2016";
        request.body.status = "Running";

        this._running.push(request.body);

        response.json({status: 'Ok'});
    }

    status(request, response, next) {
        response.json(this._running);
    }
}

module.exports = WpsController;