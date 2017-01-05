let should = require('should');

let Group = require('../../../security/Group');

describe('Group', () => {
    describe('#hasPermission', ()=>{
        it('returns true when permission is present', () => {
            let group = new Group(1, [{
                resourceType: 'scope',
                resourceId: 10,
                permission: 'PUT'
            },{
                resourceType: 'place',
                resourceId: 5,
                permission: 'GET'
            }]);

            let result = group.hasPermission('place', 'GET', 5);
            should(result).be.exactly(true);
        });

        it("returns false when permission isn't present", () => {
            let group = new Group(1, [{
                resourceType: 'scope',
                resourceId: 10,
                permission: 'PUT'
            },{
                resourceType: 'place',
                resourceId: 5,
                permission: 'GET'
            }]);

            let result = group.hasPermission('place', 'PUT', 5);
            should(result).be.exactly(false);
        });
    })
});