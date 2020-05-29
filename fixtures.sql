-- groups:
-- guest: 52ddabec-d01a-49a0-bb4d-5ff931bd346e
-- user: e56f3545-57f5-44f9-9094-2750a69ef67e

INSERT INTO "user"."users"
  ("key", "email", "password")
VALUES
  -- all have password: test
  ('7c5acddd-3625-46ef-90b3-82f829afb258', 'test@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS'),
  ('2bf6c1da-991a-4592-acc1-b10192db9363', 'testWithGroups@example.com', '$2a$04$iDjo0YV1HpIVGFqN1xFrUeuduvBdRs.o8HR5RVsRIz8OOLi/uOezS');

INSERT INTO "user"."userGroups"
  ("userKey", "groupKey")
VALUES
  -- user: testWithGroups@example.com
  -- groups: guest, user
  ('2bf6c1da-991a-4592-acc1-b10192db9363', '52ddabec-d01a-49a0-bb4d-5ff931bd346e'),
  ('2bf6c1da-991a-4592-acc1-b10192db9363', 'e56f3545-57f5-44f9-9094-2750a69ef67e');
