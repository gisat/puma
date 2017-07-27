let superagent = require('superagent');
let _ = require('lodash');

let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

let CsvParser = require('../../format/csv/CsvParser');

class IPRDatasets {
	constructor(keywords, type) {
		this._datasetEndpoint = "http://onto.fel.cvut.cz:7200/repositories/ipr_datasets";
		this._keywords = keywords;
		this._type = '||';
		this._keywordsReference = `jedno nebo více klíčových slov`;
		if (type === 'and'){
			this._type = '&&';
            this._keywordsReference = `všechna klíčová slova`;
		}

		this._prefixes = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> 
			PREFIX owl: <http://www.w3.org/2002/07/owl#> 
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/> 
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/> `;
		}

	getFilters(name){
        let filter = [];
        let labelFilter = [];
        let commentsFilter = [];
        let definitionsFilter = [];

        this._keywords.adjustedEN.map((value) => {
            value = utils.removeWordEnding(value);
            filter.push(`regex(str(?${name}), "${value}", "i")`);
        });
        filter = 'FILTER((' + filter.join(' ' + this._type + ' ') + ') && !(regex(str(?subject), "_:node", "i")))';

        this._keywords.adjustedCZ.map((value) => {
            value = utils.removeWordEnding(value);
            labelFilter.push(`regex(str(?${name}Label), "${value}", "i")`);
        });
        labelFilter = 'FILTER((' + labelFilter.join(' ' + this._type + ' ') + ') && !(regex(str(?subject), "_:node", "i")))';

        this._keywords.adjustedCZ.map((value) => {
            value = utils.removeWordEnding(value);
            commentsFilter.push(`regex(str(?${name}Comment), "${value}", "i")`);
        });
        commentsFilter = 'FILTER((' + commentsFilter.join(' ' + this._type + ' ') + ') && !(regex(str(?subject), "_:node", "i")))';

        this._keywords.adjustedCZ.map((value) => {
            value = utils.removeWordEnding(value);
            definitionsFilter.push(`regex(str(?${name}Definition), "${value}", "i")`);
        });
        definitionsFilter = 'FILTER((' + definitionsFilter.join(' ' + this._type + ' ') + ') && !(regex(str(?subject), "_:node", "i")))';

        return {
        	uri: filter,
            label: labelFilter,
            comment: commentsFilter,
            definition: definitionsFilter
		}
	}

	searchingInDatasets() {
        let query = this._datasetEndpoint + `?query=`;
        let filter = this.getFilters("dataset");

		let sparql = this._prefixes + `
			SELECT DISTINCT ?datasetLabel ?dataset
				WHERE {{ ?dataset rdf:type common:Dataset.
					?dataset rdfs:label ?datasetLabel.
					?subject common:isInContextOfDataset ?dataset.
					${filter.uri}
				} UNION {
					?dataset rdf:type common:Dataset.
					?dataset rdfs:label ?datasetLabel.
					?subject common:isInContextOfDataset ?dataset.
					${filter.label}
				} UNION {
					?dataset rdf:type common:Dataset.
					?dataset rdfs:label ?datasetLabel.
					?dataset rdfs:comment ?datasetComment.
					?subject common:isInContextOfDataset ?dataset.
					${filter.comment}
				}} `;

		logger.info(`INFO IPRDatasets#searchingInDatasets sparql: ` + sparql);
		logger.info(`INFO IPRDatasets#searchingInDatasets full query: ` + query + sparql);

		return query + encodeURIComponent(sparql);
	}

	searchingInTerms(){
        let query = this._datasetEndpoint + `?query=`;
        let filter = this.getFilters("subject");

        let sparql = this._prefixes + `
			SELECT DISTINCT ?dataset ?datasetLabel ?datasetComment ?subject ?subjectLabel ?subjectComment ?subjectDefinition ?predicateLabel
				WHERE {{
					?subject common:isInContextOfDataset ?dataset.
					common:isInContextOfDataset rdfs:label ?predicateLabel.
					?dataset rdfs:label ?datasetLabel.
					?subject rdfs:label ?subjectLabel.
					${filter.uri}
				} UNION {
					?subject common:isInContextOfDataset ?dataset.
					common:isInContextOfDataset rdfs:label ?predicateLabel.
					?dataset rdfs:label ?datasetLabel.
					?subject rdfs:label ?subjectLabel
					${filter.label}
				} UNION {
					?subject common:isInContextOfDataset ?dataset.
					common:isInContextOfDataset rdfs:label ?predicateLabel.
					?dataset rdfs:label ?datasetLabel.
					?subject rdfs:label ?subjectLabel.
					?subject rdfs:comment ?subjectComment
					${filter.comment}
                }
                UNION {
                    ?subject common:isInContextOfDataset ?dataset.
                    common:isInContextOfDataset rdfs:label ?predicateLabel.
                    ?dataset rdfs:label ?datasetLabel.
                    ?subject rdfs:label ?subjectLabel.
                    ?subject common:ma_definici ?subjectDefinition
                    ${filter.definition}
                }
            } `;

        logger.info(`INFO IPRDatasets#searchingInTerms sparql: ` + sparql);
        logger.info(`INFO IPRDatasets#searchingInTerms full query: ` + query + sparql);

        return query + encodeURIComponent(sparql);
	}

    searchingInTermsParents(){
        let query = this._datasetEndpoint + `?query=`;
        let filter = this.getFilters("subjectParent");

        let sparql = this._prefixes + `
			SELECT DISTINCT ?dataset ?datasetLabel ?subjectParent ?subjectParentLabel ?subjectParentComment ?subjectParentDefinition
                WHERE {{
                    ?subject common:isInContextOfDataset ?dataset.
                    ?subject rdfs:subClassOf  ?subjectParent.
                    ?dataset rdfs:label ?datasetLabel.
                    ${filter.uri}
                } UNION {
                    ?subject common:isInContextOfDataset ?dataset.
                    ?subject rdfs:subClassOf  ?subjectParent.
                    ?dataset rdfs:label ?datasetLabel.
                    ?subjectParent rdfs:label ?subjectParentLabel
                    ${filter.label}
                } UNION {
                    ?subject common:isInContextOfDataset ?dataset.
                    ?subject rdfs:subClassOf  ?subjectParent.
                    ?dataset rdfs:label ?datasetLabel.
                    ?subjectParent rdfs:label ?subjectParentLabel.
                    ?subjectParent rdfs:comment ?subjectParentComment
                    ${filter.comment}
                } UNION {
                    ?subject common:isInContextOfDataset ?dataset.
                    ?subject rdfs:subClassOf  ?subjectParent.
                    ?dataset rdfs:label ?datasetLabel.
                    ?subjectParent rdfs:label ?subjectParentLabel.
                    ?subjectParent common:ma_definici ?subjectParentDefinition
                    ${filter.definition}
                }
            }`;

        logger.info(`INFO IPRDatasets#searchingInTermsParents sparql: ` + sparql);
        logger.info(`INFO IPRDatasets#searchingInTermsParents full query: ` + query + sparql);

        return query + encodeURIComponent(sparql);
    }

	json() {
	    let results = [];
		return superagent.get(this.searchingInDatasets()).then(result => {
			return new CsvParser(result.text).objects();
		}).then(objects => {
            results = results.concat(objects);
            return superagent.get(this.searchingInTerms()).then(result => {
                return new CsvParser(result.text).objects();
            });
		}).then(objects2 => {
            results = results.concat(objects2);
            return superagent.get(this.searchingInTermsParents()).then(result => {
                return new CsvParser(result.text).objects();
            });
        }).then(objects3 => {
            results = results.concat(objects3);
            return this.prepareData(results);
        });
	}

	prepareData(results){
        let datasets = this.getUniqueDatasets(results);
        results.map(record => {
           let dataset = _.find(datasets, function(ds) { return ds.dataset === record.dataset; });

           // TODO only the last value of the property is used now
           if (record.predicateLabel){
               if (!dataset.sources.attribute){
                   dataset.sources["attribute"] = {};
               }

               if (record.subjectComment.length){
                   dataset.sources.attribute["subjectComment"] = {
                       info: `Nalezen přes vazbu "Pojem ${record.subjectLabel} ${record.predicateLabel} ${record.datasetLabel}", kde komentář k pojmu (rdfs:comment) obsahuje ${this._keywordsReference}.`
                   }
               } else if (record.subjectDefinition.length){
                   dataset.sources.attribute["subjectDefinition"] = {
                       info: `Nalezen přes vazbu "Pojem ${record.subjectLabel} ${record.predicateLabel} ${record.datasetLabel}", kde definice pojmu (common:ma_definici) obsahuje ${this._keywordsReference}.`
                   }
               } else {
                   dataset.sources.attribute["subject"] = {
                       info: `Nalezen přes vazbu "Pojem ${record.subjectLabel} ${record.predicateLabel} ${record.datasetLabel}", kde URI nebo štítek pojmu (rdfs:label) obsahuje ${this._keywordsReference}.`
                   }
               }
           } else if (record.subjectParent){
               if (!dataset.sources.related){
                   dataset.sources["related"] = {};
               }

               if (record.subjectParentComment.length){
                   dataset.sources.related["subjectParentComment"] = {
                       info: `Nalezen přes vazbu "Pojem je podtřídou (rdfs:subClassOf) třídy ${record.subjectParentLabel}", kde komentář ke třídě (rdfs:comment) obsahuje ${this._keywordsReference}.`
                   }
               } else if (record.subjectParentDefinition.length){
                   dataset.sources.related["subjectParentDefinition"] = {
                       info: `Nalezen přes vazbu "Pojem je podtřídou (rdfs:subClassOf) třídy ${record.subjectParentLabel}", kde definice třídy (common:ma_definici) obsahuje ${this._keywordsReference}.`
                   }
               } else {
                   dataset.sources.related["subjectParent"] = {
                       info: `Nalezen přes vazbu "Pojem je podtřídou (rdfs:subClassOf) třídy ${record.subjectParentLabel}", kde URI nebo štítek třídy (rdfs:label) obsahuje ${this._keywordsReference}.`
                   }
               }
           } else {
               if (!dataset.sources.dataset){
                   dataset.sources["dataset"] = {};
               }
               dataset.sources.dataset["info"] = `URI nebo štítek datasetu (rdfs:label) obsahuje ${this._keywordsReference}.`
           }
        });
        return datasets;
    }

    /**
     * Get unique list of datasets
     * @param records {Array} list of all records
     * @returns {Array} unique collection of datasets
     */
    getUniqueDatasets(records){
        let datasetsList = [];
        records.map(record => {
            let dataset = _.pick(record, ['dataset', 'datasetLabel']);
            dataset["sources"] = {};
            datasetsList.push(dataset);
        });

        return _.uniqWith(datasetsList, _.isEqual);
    }
}

module.exports = IPRDatasets;