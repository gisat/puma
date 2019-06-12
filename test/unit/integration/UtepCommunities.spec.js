const UtepCommunities = require('../../../integration/UtepCommunities');

describe('UtepCommunities', () => {
    describe('#loadForUser', () => {
        it('Loads', function(done) {
            this.setTimeout(6000000);

            let called = 0;
            let key = 'wrongKey';
            const communities = new UtepCommunities(key, {
                forUser: () => {
                    return [{
                        id: 1,
                        name: 'Visualization and analytics toolbox',
                        identifier: 'visutoolbox'
                    }, {
                        id: 2,
                        name: 'World Bank Group',
                        identifier: 'wbg'
                    }, {
                        id: 3,
                        name: 'Group to remove from',
                        identifier: 'groupToRemoveFrom'
                    }]
                }, onlyExistingGroups: () => {
                    if (called === 0) {
                        called++;
                        return [{
                            id: 1,
                            identifier: 'visutoolbox'
                        }];
                    } else {
                        return [{
                            id: 1,
                            name: 'Visualization and analytics toolbox',
                            identifier: 'visutoolbox'
                        }, {
                            id: 2,
                            name: 'World Bank Group',
                            identifier: 'wbg'
                        }]
                    }
                }, addMember: (userId, groupId) => {
                    console.log(`Add: ${userId} ${groupId}`);
                    return Promise.resolve(true);
                }, removeMember: (userId, groupId) => {
                    console.log(`Remove: ${userId} ${groupId}`);
                    return Promise.resolve(true)
                }, add: (name, identifier, userId) => {
                    console.log(`Add Group: ${name} ${identifier} ${userId}`);
                    return Promise.resolve(true)
                }});

            communities.loadForUser(3,'chkrat315@gmail.com').then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
    })
});