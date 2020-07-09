ALTER TABLE "relations"."scopeRelation"
  ADD CONSTRAINT "scopeRelation_parentScopeKey_fkey" FOREIGN KEY ("parentScopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "scopeRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "scopeRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT scopeRelation_parentScopeKey_tagKey_uniq UNIQUE ("parentScopeKey", "tagKey"),
  ADD CONSTRAINT scopeRelation_parentScopeKey_applicationKey_uniq UNIQUE ("parentScopeKey", "applicationKey");

ALTER TABLE "relations"."placeRelation"
  ADD CONSTRAINT "placeRelation_parentPlaceKey_fkey" FOREIGN KEY ("parentPlaceKey") REFERENCES "metadata"."place"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "placeRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "placeRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT placeRelation_parentPlaceKey_tagKey_uniq UNIQUE ("parentPlaceKey", "tagKey"),
  ADD CONSTRAINT placeRelation_parentPlaceKey_applicationKey_uniq UNIQUE ("parentPlaceKey", "applicationKey");

ALTER TABLE "relations"."periodRelation"
  ADD CONSTRAINT "periodRelation_parentPeriodKey_fkey" FOREIGN KEY ("parentPeriodKey") REFERENCES "metadata"."period"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "periodRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "periodRelation_scopeKey_fkey" FOREIGN KEY ("scopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "periodRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT periodRelation_parentPeriodKey_tagKey_uniq UNIQUE ("parentPeriodKey", "tagKey"),
  ADD CONSTRAINT periodRelation_parentPeriodKey_scopeKey_uniq UNIQUE ("parentPeriodKey", "scopeKey"),
  ADD CONSTRAINT periodRelation_parentPeriodKey_applicationKey_uniq UNIQUE ("parentPeriodKey", "applicationKey");

ALTER TABLE "relations"."attributeSetRelation"
  ADD CONSTRAINT "attributeSetRelation_parentAttributeSetKey_fkey" FOREIGN KEY ("parentAttributeSetKey") REFERENCES "metadata"."attributeSet"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "attributeSetRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "attributeSetRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT attributeSetRelation_parentAttributeSetKey_tagKey_uniq UNIQUE ("parentAttributeSetKey", "tagKey"),
  ADD CONSTRAINT attributeSetRelation_parentAttributeSetKey_applicationKey_uniq UNIQUE ("parentAttributeSetKey", "applicationKey");

ALTER TABLE "relations"."attributeRelation"
  ADD CONSTRAINT "attributeRelation_parentAttributeKey_fkey" FOREIGN KEY ("parentAttributeKey") REFERENCES "metadata"."attribute"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "attributeRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "attributeRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT attributeRelation_parentAttributeKey_tagKey_uniq UNIQUE ("parentAttributeKey", "tagKey"),
  ADD CONSTRAINT attributeRelation_parentAttributeKey_applicationKey_uniq UNIQUE ("parentAttributeKey", "applicationKey");

ALTER TABLE "relations"."scenarioRelation"
  ADD CONSTRAINT "scenarioRelation_parentScenarioKey_fkey" FOREIGN KEY ("parentScenarioKey") REFERENCES "metadata"."scenario"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "scenarioRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "scenarioRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT scenarioRelation_parentScenarioKey_tagKey_uniq UNIQUE ("parentScenarioKey", "tagKey"),
  ADD CONSTRAINT scenarioRelation_parentScenarioKey_applicationKey_uniq UNIQUE ("parentScenarioKey", "applicationKey");

ALTER TABLE "relations"."caseRelation"
  ADD CONSTRAINT "caseRelation_parentCaseKey_fkey" FOREIGN KEY ("parentCaseKey") REFERENCES "metadata"."case"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "caseRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "caseRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT caseRelation_parentCaseKey_tagKey_uniq UNIQUE ("parentCaseKey", "tagKey"),
  ADD CONSTRAINT caseRelation_parentCaseKey_applicationKey_uniq UNIQUE ("parentCaseKey", "applicationKey");

ALTER TABLE "relations"."tagRelation"
  ADD CONSTRAINT "tagRelation_parentTagKey_fkey" FOREIGN KEY ("parentTagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "tagRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "tagRelation_scopeKey_fkey" FOREIGN KEY ("scopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "tagRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT tagRelation_parentTagKey_tagKey_uniq UNIQUE ("parentTagKey", "tagKey"),
  ADD CONSTRAINT tagRelation_parentTagKey_scopeKey_uniq UNIQUE ("parentTagKey", "scopeKey"),
  ADD CONSTRAINT tagRelation_parentTagKey_applicationKey_uniq UNIQUE ("parentTagKey", "applicationKey");

ALTER TABLE "relations"."styleRelation"
  ADD CONSTRAINT "styleRelation_parentStyleKey_fkey" FOREIGN KEY ("parentStyleKey") REFERENCES "metadata"."style"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "styleRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "styleRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT styleRelation_parentStyleKey_tagKey_uniq UNIQUE ("parentStyleKey", "tagKey"),
  ADD CONSTRAINT styleRelation_parentStyleKey_applicationKey_uniq UNIQUE ("parentStyleKey", "applicationKey");

ALTER TABLE "relations"."areaTreeRelation"
  ADD CONSTRAINT "areaTreeRelation_parentAreaTreeKey_fkey" FOREIGN KEY ("parentAreaTreeKey") REFERENCES "metadata"."areaTree"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "areaTreeRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "areaTreeRelation_scopeKey_fkey" FOREIGN KEY ("scopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "areaTreeRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT areaTreeRelation_parentAreaTreeKey_tagKey_uniq UNIQUE ("parentAreaTreeKey", "tagKey"),
  ADD CONSTRAINT areaTreeRelation_parentAreaTreeKey_scopeKey_uniq UNIQUE ("parentAreaTreeKey", "scopeKey"),
  ADD CONSTRAINT areaTreeRelation_parentAreaTreeKey_applicationKey_uniq UNIQUE ("parentAreaTreeKey", "applicationKey");

ALTER TABLE "relations"."areaTreeLevelRelation"
  ADD CONSTRAINT "areaTreeLevelRelation_parentAreaTreeLevelKey_fkey" FOREIGN KEY ("parentAreaTreeLevelKey") REFERENCES "metadata"."areaTreeLevel"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "areaTreeLevelRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "areaTreeLevelRelation_areaTreeKey_fkey" FOREIGN KEY ("areaTreeKey") REFERENCES "metadata"."areaTree"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "areaTreeLevelRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT areaTreeLevelRelation_parentAreaTreeLevelKey_tagKey_uniq UNIQUE ("parentAreaTreeLevelKey", "tagKey"),
  ADD CONSTRAINT areaTreeLevelRelation_parentAreaTreeLevelKey_areaTreeKey_uniq UNIQUE ("parentAreaTreeLevelKey", "areaTreeKey"),
  ADD CONSTRAINT areaTreeLevelRelation_parentAreaTreeLevelKey_applicationKey_uniq UNIQUE ("parentAreaTreeLevelKey", "applicationKey");

ALTER TABLE "relations"."layerTemplateRelation"
  ADD CONSTRAINT "layerTemplateRelation_parentLayerTemplateKey_fkey" FOREIGN KEY ("parentLayerTemplateKey") REFERENCES "metadata"."layerTemplate"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "layerTemplateRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "layerTemplateRelation_scopeKey_fkey" FOREIGN KEY ("scopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "layerTemplateRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT layerTemplateRelation_parentLayerTemplateKey_tagKey_uniq UNIQUE ("parentLayerTemplateKey", "tagKey"),
  ADD CONSTRAINT layerTemplateRelation_parentLayerTemplateKey_scopeKey_uniq UNIQUE ("parentLayerTemplateKey", "scopeKey"),
  ADD CONSTRAINT layerTemplateRelation_parentLayerTemplateKey_applicationKey_uniq UNIQUE ("parentLayerTemplateKey", "applicationKey");

ALTER TABLE "relations"."layerTreeRelation"
  ADD CONSTRAINT "layerTreeRelation_parentLayerTreeKey_fkey" FOREIGN KEY ("parentLayerTreeKey") REFERENCES "application"."layerTree"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "layerTreeRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "layerTreeRelation_scopeKey_fkey" FOREIGN KEY ("scopeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT layerTreeRelation_parentLayerTreeKey_scopeKey_uniq UNIQUE ("parentLayerTreeKey", "scopeKey"),
  ADD CONSTRAINT layerTreeRelation_parentLayerTreeKey_applicationKey_uniq UNIQUE ("parentLayerTreeKey", "applicationKey");

ALTER TABLE "relations"."configurationRelation"
  ADD CONSTRAINT "configurationRelation_parentConfigurationKey_fkey" FOREIGN KEY ("parentConfigurationKey") REFERENCES "application"."configuration"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "configurationRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT configurationRelation_parentConfigurationKey_applicationKey_uniq UNIQUE ("parentConfigurationKey", "applicationKey");

ALTER TABLE "relations"."viewRelation"
  ADD CONSTRAINT "viewRelation_parentViewKey_fkey" FOREIGN KEY ("parentViewKey") REFERENCES "views"."view"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "viewRelation_applicationKey_fkey" FOREIGN KEY ("applicationKey") REFERENCES "application"."application"("key") ON DELETE CASCADE,
  ADD CONSTRAINT viewRelation_parentViewKey_applicationKey_uniq UNIQUE ("parentViewKey", "applicationKey");

ALTER TABLE "relations"."esponFuoreIndicatorRelation"
  ADD CONSTRAINT "esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_fkey" FOREIGN KEY ("parentEsponFuoreIndicatorKey") REFERENCES "specific"."esponFuoreIndicator"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "esponFuoreIndicatorRelation_attributeKey_fkey" FOREIGN KEY ("attributeKey") REFERENCES "metadata"."scope"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "esponFuoreIndicatorRelation_viewKey_fkey" FOREIGN KEY ("viewKey") REFERENCES "views"."view"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "esponFuoreIndicatorRelation_scopeKey_fkey" FOREIGN KEY ("scopeKey") REFERENCES "metadata"."attribute"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "esponFuoreIndicatorRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_attributeKey_uniq UNIQUE ("parentEsponFuoreIndicatorKey", "attributeKey"),
  ADD CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_viewKey_uniq UNIQUE ("parentEsponFuoreIndicatorKey", "viewKey"),
  ADD CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_tagKey_uniq UNIQUE ("parentEsponFuoreIndicatorKey", "tagKey"),
  ADD CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_scopeKey_uniq UNIQUE ("parentEsponFuoreIndicatorKey", "scopeKey");

ALTER TABLE "relations"."lpisChangeCaseRelation"
  ADD CONSTRAINT "lpisChangeCaseRelation_parentLpisChangeCaseKey_fkey" FOREIGN KEY ("parentLpisChangeCaseKey") REFERENCES "specific"."lpisChangeCase"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "lpisChangeCaseRelation_viewKey_fkey" FOREIGN KEY ("viewKey") REFERENCES "views"."view"("key") ON DELETE CASCADE,
  ADD CONSTRAINT "lpisChangeCaseRelation_tagKey_fkey" FOREIGN KEY ("tagKey") REFERENCES "metadata"."tag"("key") ON DELETE CASCADE,
  ADD CONSTRAINT lpisChangeCaseRelation_parentLpisChangeCaseKey_viewKey_uniq UNIQUE ("parentLpisChangeCaseKey", "viewKey"),
  ADD CONSTRAINT lpisChangeCaseRelation_parentLpisChangeCaseKey_tagKey_uniq UNIQUE ("parentLpisChangeCaseKey", "tagKey");
