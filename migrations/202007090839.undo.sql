ALTER TABLE "relations"."scopeRelation"
  DROP CONSTRAINT "scopeRelation_parentScopeKey_fkey",
  DROP CONSTRAINT "scopeRelation_applicationKey_fkey",
  DROP CONSTRAINT "scopeRelation_tagKey_fkey";

ALTER TABLE "relations"."scopeRelation" DROP CONSTRAINT scopeRelation_parentScopeKey_tagKey_uniq;
