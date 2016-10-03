class MellodiesWpsController {
    constructor(app) {
        this._running = [{
            name: 'Prague',
            year: 2016,
            started: '23/9/2015',
            finished: '22/10/2015',
            status: 'Success'
        },{
            name: 'Rome',
            year: 2015,
            started: '20/8/2015',
            finished: '21/8/2015',
            status: 'Failed'
        },{
            name: 'London',
            year: 2016,
            started: '20/8/2015',
            finished: '',
            status: 'Running'
        }];

        app.get('/wps/mellodies/status', this.status.bind(this));
        app.post('/wps/mellodies/run', this.run.bind(this));
    }

    run(request, response, next) {
        request.body.started = "20/9/2016";
        request.body.status = "Running";

        this._running.push(request.body);

        response.json({status: 'Ok'});
    }

    status(request, response, next) {
        response.json(this._running);
    }
}

module.exports = MellodiesWpsController;