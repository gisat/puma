const _ = require('lodash');
const superagent = require('superagent');

class UtepCommunities {
    constructor(apiKey, pgGroups) {
        this.apiKey = apiKey;

        this.pgGroups = pgGroups;
    }

    /**
     * It loads all communities in the T2 Portal for given User and based on this information synchronizes the
     * information in our groups store.
     * @param id {Number} Id of the user for which we want to load the data. Our internal id
     * @param email {Text} String representing the email of the user under which it is known in the T2 portal store.
     * @returns {Promise<void>}
     */
    async loadForUser(id, email) {
        // Load internal groups for the user. id, name, identifier
        const internalGroupsOfUser = await this.pgGroups.forUser(id);

        // Load communities for the user.
        const communitiesOfUser = await superagent.post('https://urban-tep.eu/t2api/private/visat/community')
            .send({
                apikey: this.apiKey,
                username: email
            })
            .set('Accept', 'application/json')
            .set('Content-Type','application/json');

        const communities = communitiesOfUser.body.map(community => {
            community.identifier = community.Identifier;

            return community;
        });

        // Identifiers of the groups.
        const addUserToGroups = _.differenceBy(communities, internalGroupsOfUser, 'identifier');
        const removeUserFromGroups = _.differenceBy(internalGroupsOfUser, communities, 'identifier');

        const existingGroups = this.pgGroups.onlyExistingGroups(addUserToGroups);
        const groupsToCreate = _.differenceBy(communities, existingGroups, 'identifier');
        // Create nonexistent groups
        groupsToCreate.map(community => {
            // Crated by internal system process
            this.pgGroups.add(community.Name, community.identifier, 0);
        });

        const addMemberTo = this.pgGroups.onlyExistingGroups(addUserToGroups);
        const addMembers = addMemberTo.map(group => {
            // I don't actually have the id of the group here.
            return this.pgGroups.addMember(id, group.id, 0);
        });

        const removeMembers = removeUserFromGroups.map(group => {
            return this.pgGroups.removeMember(id, group.id);
        });

        await Promise.all(_.flattenDeep([addMembers, removeMembers]));
        console.log('Members properly handled');
    }
}

module.exports = UtepCommunities;