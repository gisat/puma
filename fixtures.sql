BEGIN;
-- groups:
-- guest: 52ddabec-d01a-49a0-bb4d-5ff931bd346e
-- user: e56f3545-57f5-44f9-9094-2750a69ef67e

TRUNCATE "user"."users", "user"."groups", "user"."permissions" CASCADE;

INSERT INTO "user"."users"
  ("key", "email", "password", "phone")
VALUES
  -- all have password: test
  ('7c5acddd-3625-46ef-90b3-82f829afb258', 'test@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null),
  ('2bf6c1da-991a-4592-acc1-b10192db9363', 'testWithGroups@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null),
  ('e2f5d20e-2784-4690-a3f0-339c60b04245', 'testWithPhone@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', '+420123456789'),
  ('3e3f4300-1336-4043-baa3-b65a025c2d83', 'testWithPermissions@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null),
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', 'admin@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS', null);

INSERT INTO "user"."groups"
  ("key", "name")
VALUES
  ('52ddabec-d01a-49a0-bb4d-5ff931bd346e', 'guest'),
  ('e56f3545-57f5-44f9-9094-2750a69ef67e', 'user'),
  ('742b6f3f-a77e-4267-8e96-1e4cea96dec3', 'test');

INSERT INTO "user"."userGroups"
  ("userKey", "groupKey")
VALUES
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
  ('6897b1fc-a3e3-4195-a41a-f492d4a9df2a', null, 'users', 'create'),
  ('913e3bae-e5dd-4600-a854-ca7b65199bbf', null, 'users', 'update');

INSERT INTO "user"."userPermissions"
  ("userKey", "permissionKey")
VALUES
  -- testWithPermissions@example.com     ,  case:create
  ('3e3f4300-1336-4043-baa3-b65a025c2d83', '0da66083-77ad-4e66-9338-0c8344de9eba'),
  -- user: admin@example.com             ,  users:create
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', '6897b1fc-a3e3-4195-a41a-f492d4a9df2a'),
  -- user: admin@example.com             ,  users:update
  ('2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', '913e3bae-e5dd-4600-a854-ca7b65199bbf');

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
