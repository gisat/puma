class MellodiesWpsController {
    constructor(app) {
        this._running = [{
            city: 'Prague',
            from: 2016,
            to: 2017,
            started: '23/9/2015',
            finished: '22/10/2015',
            status: 'Success'
        },{
            city: 'Rome',
            from: 2015,
            to: 2016,
            started: '20/8/2015',
            finished: '21/8/2015',
            status: 'Failed'
        },{
            city: 'London',
            from: 2014,
            to: 2016,
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