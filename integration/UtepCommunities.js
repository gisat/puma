const superagent = require('superagent');

const Group = require('../security/Group');

class UtepCommunities {
    constructor(apiKey, pgGroups) {
        this.apiKey = apiKey;
        this.pgGroups = pgGroups;

        this.loadAll = this.loadAll.bind(this);
    }

    loadForUser(userName) {
        return superagent.post('https://urban-tep.eu/t2api/private/visat/community')
            .send({
                apikey: this.apiKey,
                username: userName
            })
            .set('Accept', 'application/json')
            .set('Content-Type','application/json')
            .then(response => {
                // These are the communities this user is part of?
                response.body.forEach(community => {

                });

                return response.body;
            })
    }

    loadAll() {
        let utepGroups = [];
        let internalGroups = [];

        superagent.post('https://urban-tep.eu/t2api/private/visat/community')
            .send({
                apikey: this.apiKey
            })
            .set('Accept', 'application/json')
            .set('Content-Type','application/json')
            .then(response => {
                utepGroups = response.body.map(community => {

                });
                // These are the communities this user is part of?
                response.body.forEach(community => {
                    // Make sure that the communities and PgGroups work together.
                });

                const toAdd = [];
                const toUpdate = [];

                this.pgGroups.json().then(groups => {

                });

                return response.body;
            })
    }

    schedule() {
        if(this.timer) {
            this.unschedule();
        }
        this.timer = setInterval(this.loadAll, 1000 * 60 * 60) // Reload all communities every hour.
    }

    unschedule() {
        clearInterval(this.timer);
        this.timer = null;
    }

    // Load all communities every day to create new groups based on the provided information.
}

module.exports = UtepCommunities;