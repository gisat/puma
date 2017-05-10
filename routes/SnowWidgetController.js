var request = require('request');

var SnowConfigurationTable = require('../snow/SnowConfigurationsTable');

/**
 * It contains endpoints relevant for getting and saving of snow portal configurations
 */
class SnowWidgetController {
    constructor(app, pgPool) {
        this._snowCfgTable = new SnowConfigurationTable(pgPool, "snow_configurations");

        app.get('/rest/snow/getconfigurations', this.getConfigurations.bind(this));
        app.post('/rest/snow/saveconfigurations', this.saveConfigurations.bind(this));
        app.post('/rest/snow/deleteconfiguration', this.deleteConfiguration.bind(this));
    }

    getConfigurations(request, response){
        var userId = request.session.user.id;

        this._snowCfgTable.selectByUser({
            user_id: userId
        }).then(function(result){
            if (result.status == "OK"){
                response.send(result);
            } else {
                response.send({
                    status: "Error"
                })
            }
        });
    }

    saveConfigurations(request, response){
        var url = request.body.url;
        var userId = request.session.user.id;

        this._snowCfgTable.insert({
            url: url,
            user_id: userId
        }).then(function(result){
            if (result.status == "OK"){
                response.send(result);
            } else {
                response.send({
                    status: "Error"
                })
            }
        });
    }

    deleteConfiguration(request, response){
        var uuid = request.body.uuid;

        this._snowCfgTable.deleteRecord({
            id: uuid
        }).then(function(result){
            if (result.status == "OK"){
                response.send(result);
            } else {
                response.send({
                    status: "Error",
                    message: result.message
                })
            }
        });
    }
}

module.exports = SnowWidgetController;