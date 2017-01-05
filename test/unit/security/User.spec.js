let should = require('should');

let User = require('../../../security/User');

describe('User', () => {
    describe('#hasPermission', ()=>{
        it('returns true when permission is present', () => {
            let user = new User(1, [{
                resourceType: 'scope',
                resourceId: 10,
                permission: 'PUT'
            },{
                resourceType: 'place',
                resourceId: 5,
                permission: 'GET'
            }]);

            let result = user.hasPermission('place', 'GET', 5);
            should(result).be.exactly(true);
        });

        it("returns false when permission isn't present", () => {
            let user = new User(1, [{
                resourceType: 'scope',
                resourceId: 10,
                permission: 'PUT'
            },{
                resourceType: 'place',
                resourceId: 5,
                permission: 'GET'
            }]);

            let result = user.hasPermission('place', 'PUT', 5);
            should(result).be.exactly(false);
        });
    })
});