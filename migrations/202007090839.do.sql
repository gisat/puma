ALTER TABLE "relations"."scopeRelation"
  ADD CONSTRAINT "scopeRelation_parentScopeKey_fkey" FOREIGN KEY ("parentScopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "scopeRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "scopeRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE;

ALTER TABLE "relations"."scopeRelation" ADD CONSTRAINT scopeRelation_parentScopeKey_tagKey_uniq UNIQUE ("parentScopeKey", "tagKey");
