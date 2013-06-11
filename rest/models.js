var ensureIds = {}

var hooks = {
    'symbology':{
//        create: 'createSymbology',
//        update: 'updateSymbology',
//        remove: 'removeSymbology'
    },
    'layerref': {
        create: 'createLayerRef',
        update: 'updateLayerRef',
        remove: 'removeLayerRef',
    }
}




var refs = {
    'attributeset':{
        'attributes': {coll: 'attribute', canUpdate: true}
    },
    //attribute
    //year
    //areatemplate
    'tree': {
        'levels.fromLayerTemplate': {coll: 'areatemplate', canUpdate: true},
        'levels.toLayerTemplate': {coll: 'areatemplate', canUpdate: true}
    },
    
    'layerref': {
        'location': {coll: 'location', canUpdate: true},
        'columnMap.attribute': {coll: 'attribute', canUpdate: true}
    },
            
    
    'theme': {
        'trees': {coll:'tree', canUpdate: true}
    }
    // pri pridavani atributu overit, ze na zadny k layertemplate neni nic referencovano
    // pri odebirani atributu overit, zdali na nej neni vazana condition v symbologii
}

var collections = ['userpolygon','symbologylayer','scope','analysis','performedanalysis','visualization','location','attributeset','attribute','layertemplate','layertemplateext','tree','symbology','layerref','theme','areatemplate','year','symbologytemplate'];

module.exports = {
    ensureIds: ensureIds,
    hooks: hooks,
    refs: refs,
    collections: collections
}

