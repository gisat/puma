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

Main classes:
 - User - It must contain information about the permissions.
 - Permission - Establishes user's right toward a resource. The right can be for either Create, Read, Update or Delete.
   - Permission must be stored in durable way. Probably in the PostgreSQL database.
   - Permission establishes information about id of the resource, is of the user, type of the resource and type of the
     permission
 -
