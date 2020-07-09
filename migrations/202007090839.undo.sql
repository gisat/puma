ALTER TABLE "relations"."scopeRelation"
  DROP CONSTRAINT "scopeRelation_parentScopeKey_fkey",
  DROP CONSTRAINT "scopeRelation_applicationKey_fkey",
  DROP CONSTRAINT "scopeRelation_tagKey_fkey",
  DROP CONSTRAINT scopeRelation_parentScopeKey_tagKey_uniq,
  DROP CONSTRAINT scopeRelation_parentScopeKey_applicationKey_uniq;

ALTER TABLE "relations"."placeRelation"
  DROP CONSTRAINT "placeRelation_parentPlaceKey_fkey",
  DROP CONSTRAINT "placeRelation_applicationKey_fkey",
  DROP CONSTRAINT "placeRelation_tagKey_fkey",
  DROP CONSTRAINT placeRelation_parentPlaceKey_tagKey_uniq,
  DROP CONSTRAINT placeRelation_parentPlaceKey_applicationKey_uniq;

ALTER TABLE "relations"."periodRelation"
  DROP CONSTRAINT "periodRelation_parentPeriodKey_fkey",
  DROP CONSTRAINT "periodRelation_applicationKey_fkey",
  DROP CONSTRAINT "periodRelation_scopeKey_fkey",
  DROP CONSTRAINT "periodRelation_tagKey_fkey",
  DROP CONSTRAINT periodRelation_parentPeriodKey_tagKey_uniq,
  DROP CONSTRAINT periodRelation_parentPeriodKey_scopeKey_uniq,
  DROP CONSTRAINT periodRelation_parentPeriodKey_applicationKey_uniq;

ALTER TABLE "relations"."attributeSetRelation"
  DROP CONSTRAINT "attributeSetRelation_parentAttributeSetKey_fkey",
  DROP CONSTRAINT "attributeSetRelation_applicationKey_fkey",
  DROP CONSTRAINT "attributeSetRelation_tagKey_fkey",
  DROP CONSTRAINT attributeSetRelation_parentAttributeSetKey_tagKey_uniq,
  DROP CONSTRAINT attributeSetRelation_parentAttributeSetKey_applicationKey_uniq;

ALTER TABLE "relations"."attributeRelation"
  DROP CONSTRAINT "attributeRelation_parentAttributeKey_fkey",
  DROP CONSTRAINT "attributeRelation_applicationKey_fkey",
  DROP CONSTRAINT "attributeRelation_tagKey_fkey",
  DROP CONSTRAINT attributeRelation_parentAttributeKey_tagKey_uniq,
  DROP CONSTRAINT attributeRelation_parentAttributeKey_applicationKey_uniq;

ALTER TABLE "relations"."scenarioRelation"
  DROP CONSTRAINT "scenarioRelation_parentScenarioKey_fkey",
  DROP CONSTRAINT "scenarioRelation_applicationKey_fkey",
  DROP CONSTRAINT "scenarioRelation_tagKey_fkey",
  DROP CONSTRAINT scenarioRelation_parentScenarioKey_tagKey_uniq,
  DROP CONSTRAINT scenarioRelation_parentScenarioKey_applicationKey_uniq;

ALTER TABLE "relations"."caseRelation"
  DROP CONSTRAINT "caseRelation_parentCaseKey_fkey",
  DROP CONSTRAINT "caseRelation_applicationKey_fkey",
  DROP CONSTRAINT "caseRelation_tagKey_fkey",
  DROP CONSTRAINT caseRelation_parentCaseKey_tagKey_uniq,
  DROP CONSTRAINT caseRelation_parentCaseKey_applicationKey_uniq;

ALTER TABLE "relations"."tagRelation"
  DROP CONSTRAINT "tagRelation_parentTagKey_fkey",
  DROP CONSTRAINT "tagRelation_applicationKey_fkey",
  DROP CONSTRAINT "tagRelation_scopeKey_fkey",
  DROP CONSTRAINT "tagRelation_tagKey_fkey",
  DROP CONSTRAINT tagRelation_parentTagKey_tagKey_uniq,
  DROP CONSTRAINT tagRelation_parentTagKey_scopeKey_uniq,
  DROP CONSTRAINT tagRelation_parentTagKey_applicationKey_uniq;

ALTER TABLE "relations"."styleRelation"
  DROP CONSTRAINT "styleRelation_parentStyleKey_fkey",
  DROP CONSTRAINT "styleRelation_applicationKey_fkey",
  DROP CONSTRAINT "styleRelation_tagKey_fkey",
  DROP CONSTRAINT styleRelation_parentStyleKey_tagKey_uniq,
  DROP CONSTRAINT styleRelation_parentStyleKey_applicationKey_uniq;

ALTER TABLE "relations"."areaTreeRelation"
  DROP CONSTRAINT "areaTreeRelation_parentAreaTreeKey_fkey",
  DROP CONSTRAINT "areaTreeRelation_applicationKey_fkey",
  DROP CONSTRAINT "areaTreeRelation_scopeKey_fkey",
  DROP CONSTRAINT "areaTreeRelation_tagKey_fkey",
  DROP CONSTRAINT areaTreeRelation_parentAreaTreeKey_tagKey_uniq,
  DROP CONSTRAINT areaTreeRelation_parentAreaTreeKey_scopeKey_uniq,
  DROP CONSTRAINT areaTreeRelation_parentAreaTreeKey_applicationKey_uniq;

ALTER TABLE "relations"."areaTreeLevelRelation"
  DROP CONSTRAINT "areaTreeLevelRelation_parentAreaTreeLevelKey_fkey",
  DROP CONSTRAINT "areaTreeLevelRelation_applicationKey_fkey",
  DROP CONSTRAINT "areaTreeLevelRelation_areaTreeKey_fkey",
  DROP CONSTRAINT "areaTreeLevelRelation_tagKey_fkey",
  DROP CONSTRAINT areaTreeLevelRelation_parentAreaTreeLevelKey_tagKey_uniq,
  DROP CONSTRAINT areaTreeLevelRelation_parentAreaTreeLevelKey_areaTreeKey_uniq,
  DROP CONSTRAINT areaTreeLevelRelation_parentAreaTreeLevelKey_applicationKey_uniq;

ALTER TABLE "relations"."layerTemplateRelation"
  DROP CONSTRAINT "layerTemplateRelation_parentLayerTemplateKey_fkey",
  DROP CONSTRAINT "layerTemplateRelation_applicationKey_fkey",
  DROP CONSTRAINT "layerTemplateRelation_scopeKey_fkey",
  DROP CONSTRAINT "layerTemplateRelation_tagKey_fkey",
  DROP CONSTRAINT layerTemplateRelation_parentLayerTemplateKey_tagKey_uniq,
  DROP CONSTRAINT layerTemplateRelation_parentLayerTemplateKey_scopeKey_uniq,
  DROP CONSTRAINT layerTemplateRelation_parentLayerTemplateKey_applicationKey_uniq;

ALTER TABLE "relations"."layerTreeRelation"
  DROP CONSTRAINT "layerTreeRelation_parentLayerTreeKey_fkey",
  DROP CONSTRAINT "layerTreeRelation_applicationKey_fkey",
  DROP CONSTRAINT "layerTreeRelation_scopeKey_fkey",
  DROP CONSTRAINT layerTreeRelation_parentLayerTreeKey_scopeKey_uniq,
  DROP CONSTRAINT layerTreeRelation_parentLayerTreeKey_applicationKey_uniq;

ALTER TABLE "relations"."configurationRelation"
  DROP CONSTRAINT "configurationRelation_parentConfigurationKey_fkey",
  DROP CONSTRAINT "configurationRelation_applicationKey_fkey",
  DROP CONSTRAINT configurationRelation_parentConfigurationKey_applicationKey_uniq;

ALTER TABLE "relations"."viewRelation"
  DROP CONSTRAINT "viewRelation_parentViewKey_fkey",
  DROP CONSTRAINT "viewRelation_applicationKey_fkey",
  DROP CONSTRAINT viewRelation_parentViewKey_applicationKey_uniq;

ALTER TABLE "relations"."esponFuoreIndicatorRelation"
  DROP CONSTRAINT "esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_fkey",
  DROP CONSTRAINT "esponFuoreIndicatorRelation_attributeKey_fkey",
  DROP CONSTRAINT "esponFuoreIndicatorRelation_viewKey_fkey",
  DROP CONSTRAINT "esponFuoreIndicatorRelation_scopeKey_fkey",
  DROP CONSTRAINT "esponFuoreIndicatorRelation_tagKey_fkey",
  DROP CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_attributeKey_uniq,
  DROP CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_viewKey_uniq,
  DROP CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_tagKey_uniq,
  DROP CONSTRAINT esponFuoreIndicatorRelation_parentEsponFuoreIndicatorKey_scopeKey_uniq;

ALTER TABLE "relations"."lpisChangeCaseRelation"
  DROP CONSTRAINT "lpisChangeCaseRelation_parentLpisChangeCaseKey_fkey",
  DROP CONSTRAINT "lpisChangeCaseRelation_viewKey_fkey",
  DROP CONSTRAINT "lpisChangeCaseRelation_tagKey_fkey",
  DROP CONSTRAINT lpisChangeCaseRelation_parentLpisChangeCaseKey_viewKey_uniq,
  DROP CONSTRAINT lpisChangeCaseRelation_parentLpisChangeCaseKey_tagKey_uniq;
