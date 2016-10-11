var LodEnhancedTable = require('./LodEnhancedTable');
var WpsT2Process = require('./WpsT2Process');

class WpsController {
    constructor(app, pgPool) {
        this._running = [{
            name: 'Praha',
            from: 2016,
            to: 2017,
            started: '23/9/2015',
            finished: '22/10/2015',
            status: 'Success'
        },{
            name: 'české Budějovice',
            from: 2015,
            to: 2016,
            started: '20/8/2015',
            finished: '21/8/2015',
            status: 'Failed'
        },{
            name: 'Brno',
            from: 2014,
            to: 2016,
            started: '20/8/2015',
            finished: '',
            status: 'Running'
        }];

        app.get('/wps/mellodies/status', this.status.bind(this));
        app.post('/wps/mellodies/run', this.run.bind(this));

        this._pgPool = pgPool;
    }

    run(request, response, next) {
        request.body.started = "20/9/2016";
        request.body.status = "Running";

        // Starts the Lod process.
        new LodEnhancedTable(this._pgPool, 'public', 'prague_ua2012', 'fid').update().then(() => {
            return new WpsT2Process();
        }).then().catch(err => {

        });

        this._running.push(request.body);

        response.json({status: 'Ok'});
    }

    status(request, response, next) {
        response.json(this._running);
    }
}

module.exports = WpsController;