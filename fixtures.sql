BEGIN;
-- groups:
-- guest: 52ddabec-d01a-49a0-bb4d-5ff931bd346e
-- user: e56f3545-57f5-44f9-9094-2750a69ef67e

TRUNCATE "user"."users", "user"."groups", "user"."permissions" CASCADE;

INSERT INTO "user"."users"
  ("key", "email", "password", "phone", "name")
VALUES
  ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', null, null, null, 'guest'),
  -- all have password: test
  ('7c5acddd-3625-46ef-90b3-82f829afb258', 'test@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null, null),
  ('2bf6c1da-991a-4592-acc1-b10192db9363', 'testWithGroups@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null, null),
  ('e2f5d20e-2784-4690-a3f0-339c60b04245', 'testWithPhone@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', '+420123456789', null),
  ('3e3f4300-1336-4043-baa3-b65a025c2d83', 'testWithPermissions@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null, null),
  -- this user should not have permissions with NOT NULL resourceKey
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', 'admin@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null, null),
  -- this user should not have permissions with NULL resourceKey
  ('39ed471f-8383-4283-bb8a-303cb05cadef', 'specificPermsAdmin@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null, null);

INSERT INTO "user"."groups"
  ("key", "name")
VALUES
  ('52ddabec-d01a-49a0-bb4d-5ff931bd346e', 'guest'),
  ('e56f3545-57f5-44f9-9094-2750a69ef67e', 'user'),
  ('742b6f3f-a77e-4267-8e96-1e4cea96dec3', 'test');

INSERT INTO "user"."userGroups"
  ("userKey", "groupKey")
VALUES
  -- user: guest
  -- groups: guest, user
  ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', '52ddabec-d01a-49a0-bb4d-5ff931bd346e'),
  ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', 'e56f3545-57f5-44f9-9094-2750a69ef67e'),
  -- user: testWithGroups@example.com
  -- groups: guest, user
  ('2bf6c1da-991a-4592-acc1-b10192db9363', '52ddabec-d01a-49a0-bb4d-5ff931bd346e'),
  ('2bf6c1da-991a-4592-acc1-b10192db9363', 'e56f3545-57f5-44f9-9094-2750a69ef67e'),
  -- user: -- testWithPermissions@example.com
  -- groups: test
  ('3e3f4300-1336-4043-baa3-b65a025c2d83', '742b6f3f-a77e-4267-8e96-1e4cea96dec3');

INSERT INTO "user"."permissions"
  ("key", "resourceKey", "resourceType", "permission")
VALUES
  ('0da66083-77ad-4e66-9338-0c8344de9eba', null, 'case', 'create'),
  ('42e8bdf8-19c8-4658-aded-b1c724539072', null, 'case', 'update'),
  ('820c4a94-9588-4926-8ba0-2df7abe2eb7f', null, 'scope', 'delete'),
  ('6a7df854-4dc0-4093-b8a0-15e2e0a91ed0', null, 'place', 'delete'),
  ('6897b1fc-a3e3-4195-a41a-f492d4a9df2a', null, 'user', 'create'),
  ('913e3bae-e5dd-4600-a854-ca7b65199bbf', null, 'user', 'update'),
  ('9ac648e7-00d0-4196-be44-9ae2d7cfb598', null, 'user', 'delete'),
  ('828af8c1-5438-475b-9f91-af432745e83f', null, 'user', 'view'),
  ('f2ead234-6402-4a6e-9374-b243647edc44', '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8', 'user', 'view'),
  ('4f2b3dc7-9b3f-4624-82c0-93d139e19baa', '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8', 'user', 'update'),
  ('e84dfa30-f2fc-4a1f-988c-b7f4e2489f2f', '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8', 'user', 'delete'),
  ('432348bc-6adf-4fd3-ac44-48a15f7d8ac6', '7c5acddd-3625-46ef-90b3-82f829afb258', 'user', 'view');

INSERT INTO "user"."userPermissions"
  ("userKey", "permissionKey")
VALUES
  -- testWithPermissions@example.com     ,  case:create
  ('3e3f4300-1336-4043-baa3-b65a025c2d83', '0da66083-77ad-4e66-9338-0c8344de9eba'),
  -- user: admin@example.com             ,  users:view
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', '828af8c1-5438-475b-9f91-af432745e83f'),
  -- user: admin@example.com             ,  users:create
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', '6897b1fc-a3e3-4195-a41a-f492d4a9df2a'),
  -- user: admin@example.com             ,  users:update
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', '913e3bae-e5dd-4600-a854-ca7b65199bbf'),
  -- user: admin@example.com             ,  users:delete
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', '9ac648e7-00d0-4196-be44-9ae2d7cfb598'),
  -- user: specificPermsAdmin@example.com, users[key]:update
  ('39ed471f-8383-4283-bb8a-303cb05cadef', '4f2b3dc7-9b3f-4624-82c0-93d139e19baa'),
  -- user: specificPermsAdmin@example.com, users[key]:delete
  ('39ed471f-8383-4283-bb8a-303cb05cadef', 'e84dfa30-f2fc-4a1f-988c-b7f4e2489f2f'),
  -- user: specificPermsAdmin@example.com, users[key]:view
  ('39ed471f-8383-4283-bb8a-303cb05cadef', '432348bc-6adf-4fd3-ac44-48a15f7d8ac6'),
  ('39ed471f-8383-4283-bb8a-303cb05cadef', 'f2ead234-6402-4a6e-9374-b243647edc44');

INSERT INTO "user"."groupPermissions"
  ("groupKey", "permissionKey")
VALUES
  -- test                                , case:update
  ('742b6f3f-a77e-4267-8e96-1e4cea96dec3', '42e8bdf8-19c8-4658-aded-b1c724539072'),
  -- guest                               , case:update
  ('52ddabec-d01a-49a0-bb4d-5ff931bd346e', '42e8bdf8-19c8-4658-aded-b1c724539072'),
  -- test                                , scope:delete
  ('742b6f3f-a77e-4267-8e96-1e4cea96dec3', '820c4a94-9588-4926-8ba0-2df7abe2eb7f');

COMMIT;
