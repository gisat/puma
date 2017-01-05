This package should contain most of the security related code. It is mainly focused on the authorization of the users
coming into the system.

Architecture:
For each request we need to make sure that either the resource could be accessed without authentication, with
authentication with restrictions per user or only as administrator.

Authentication:
Authentication is solved via session bassed information for logged in user. In the session we store the information
about currently logged users.

Authorization:
Certain resourcs might require authorization in order to be shown to the user. There are two main places, where the
resources will be shown only based on the authentication. First is FrontOffice. Second is BackOffice.
The Main resources used to receive the rights and privileges are Scope and Place. With respect to that you as a user can
see only these resources which you have rights toward.
This limitation is currently limited to the REST like API.

We will create custom solution, which doesn't touch other resources than place and scope. Possibly in future it will also touch the dependent resources. For now there are nearly no such resources.
This solution has two parts. Make sure that all REST endpoints ignore the scope, place and dependant metadata complexes the user doesn't have right to.
There is a concept of users and groups. Users can be assigned to groups. Groups or users can have access towards Scopes and Places.
  Places and Scopes I don't have right to will not be displayed neither in FrontOffice nor in BackOffice
  Themes are dependent resources upon Scope - If I don't have rights toward the scope, I don't have rights toward these.
  Performed analysis is dependent on Location - If I don't have rights toward the location, i don't have rights toward the performed analysis either.

Database - PostgreSQL
Table - permissions
  userId int
  resourceId int
  resourceType text - scope, place
  permission text - GET, POST, PUT, DELETE
Table - group_permissions, group ALL for those who actually have the permissions.
  groupId int
  resourceType text
  resourceId int
  permissions text
Table - group
  id int;
  name text;

API
This part needs to be managed. Therefore there must be a way to assign a permission to user
 - /security/authorization/:userId/:resourceType/:resourceId
 - Example: /security/authorization/1/scope/1
   - POST creates rights toward resource unless already existed
   - DELETE removes rights toward resource

 - Who has right towards specific resource?
 - GET /security/authorization/:resourceType/:resourceId
   {users: [{id: 1, permissions: [GET, POST]}]}

 - Towards what resources does given user has rights
 - GET /security/authorization/user/:userId
   {scopes: [{id: 1, permissions: [PUT, POST]}, {id: 2, permissions: [GET]}], places: [{id: 1, permissions: [PUT, POST]}]}
 - GET /security/authorization/group/:groupId
   {scopes: [{id: 1, permissions: [PUT, POST]}, {id: 2, permissions: [GET]}], places: [{id: 1, permissions: [PUT, POST]}]}

Changes needed in the current API:
 - ScopeController, ThemeController, LocationController, PerformedAnalysisControler will consult the permissions for the current user.
 - Which means that actually instead of just setting up id of the user in the session we will update it with relevant
   permissions as well.
 - User object will then contain method to verify whether the user has access to the permission. This means method
   hasPermission(resourceType, resourceId)
   
Every user of the system must have some basic rights, it might be necessary to assign him to some group like for example full user.