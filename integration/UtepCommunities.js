const _ = require('lodash');
const logger = require('../common/Logger').applicationWideLogger;
const superagent = require('superagent');

class UtepCommunities {
    constructor(apiKey, pgGroups) {
        logger.info(`UtepCommunities#constructor ApiKey: ${apiKey}`);
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
        logger.info(`UtepCommunities#loadForUser Id: ${id} Email: ${email}`);
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
        logger.info(`UtepCommunities#loadForUser Communities: `, communities.map(community => community.identifier));

        // Identifiers of the groups.
        const addUserToGroups = _.differenceBy(communities, internalGroupsOfUser, 'identifier');
        const removeUserFromGroups = _.differenceBy(internalGroupsOfUser, communities, 'identifier');

        const existingGroups = this.pgGroups.onlyExistingGroups(addUserToGroups);
        const groupsToCreate = _.differenceBy(communities, existingGroups, 'identifier');
        logger.info(`UtepCommunities#loadForUser 
            AddTo: `, addUserToGroups.map(community => community.identifier), ` 
            RemoveFrom: `, removeUserFromGroups.map(community => community.identifier), ` 
            Create: `, groupsToCreate.map(community => community.identifier));

        // Create nonexistent groups
        groupsToCreate.map(community => {
            // Crated by internal system process
            this.pgGroups.add(community.Name, community.identifier, 0);
        });

        const addMemberTo = await this.pgGroups.onlyExistingGroups(addUserToGroups);
        logger.info(`UtepCommunities#laodForUser AddMemberTo: `, addMemberTo.map(community => community.identifier));
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