var superagent = require('superagent');

class JsonOsmData {
    constructor(query) {
        this._query = query;
    }

    json() {
        return superagent
                .get("http://linkedgeodata.org/sparql")
                .query({"default-graph-uri": "http://linkedgeodata.org"})
                .query({"query": this._query})
                .query({"format": "application/json"})
                .query({"timeout": 0})
                .query({"debug": "on"})
        .then(response => {
            return response.body.results.bindings;
        })
    }
}

module.exports = JsonOsmData;