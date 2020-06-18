CREATE SEQUENCE "various"."errorLogs_key_seq" AS INT MINVALUE -2147483648 CYCLE;

CREATE TABLE "various"."errorLogs"(
    "key" INT NOT NULL PRIMARY KEY DEFAULT nextval('various."errorLogs_key_seq"'),
    "data" JSONB
);

ALTER SEQUENCE "various"."errorLogs_key_seq" OWNED BY "various"."errorLogs"."key";
