var ensureIds = {}

var hooks = {
    'symbology':{
//        create: 'createSymbology',
//        update: 'updateSymbology',
//        remove: 'removeSymbology'
    },
    'layerref': {
        create: 'createLayerRef',
        precreate: 'precreateLayerRef',
        update: 'updateLayerRef',
        remove: 'removeLayerRef',
    }
}




var refs = {
    'attributeset':{
        'attributes': {coll: 'attribute', canUpdate: true},
        'topic': {coll:'topic', canUpdate: true},
        'featureLayers': {coll:'areatemplate', canUpdate: true}
    },
    'areatemplate':{
        'symbologies': {coll:'symbology', canUpdate: true},
        'topic': {coll:'topic', canUpdate: true},
        'layerGroup': {coll:'layergroup', canUpdate: true},
    },
    'symbology':{
        'topic': {coll:'topic', canUpdate: true},
    },
    'scope':{
        'datasets': {coll:'dataset', canUpdate: true}
    },
    'dataset':{
        'featureLayers': {coll:'areatemplate', canUpdate: true}
    },
    'location':{
        'dataset': {coll:'dataset', canUpdate: true}
    },
    'layerref': {
        'location': {coll: 'location', canUpdate: true},
        'year': {coll: 'year', canUpdate: true},
        'attributeSet': {coll: 'attributeset', canUpdate: true},
        'areaTemplate': {coll: 'areatemplate', canUpdate: true},
        'columnMap.attribute': {coll: 'attribute', canUpdate: true}
    },
    'analysis': {
        'topics': {coll:'topic',canUpdate:true},
        'areaTemplate': {coll:'areatemplate',canUpdate:true},
        'attributeSet': {coll:'attributeset',canUpdate:true},
        'attributeSets': {coll:'attributeset',canUpdate:true},
        'groupAttributeSet': {coll:'attributeset',canUpdate:true},
        'groupAttribute': {coll:'attribute',canUpdate:true},
        'attributeMap.attribute': {coll:'attribute',canUpdate:true},
        'attributeMap.calcAttributeSet': {coll:'attributeset',canUpdate:true},
        'attributeMap.calcAttribute': {coll:'attribute',canUpdate:true},
        'attributeMap.normAttributeSet': {coll:'attributeset',canUpdate:true},
        'attributeMap.normAttribute': {coll:'attribute',canUpdate:true},
    },   
    'performedanalysis': {
        'location': {coll:'location',canUpdate:true},
        'year': {coll:'year',canUpdate:true},
        'dataset': {coll:'dataset',canUpdate:true},
        'analysis': {coll:'analysis',canUpdate:true},
    },
    
    'theme': {
        'years': {coll:'year', canUpdate: true},
        'dataset': {coll:'dataset', canUpdate: true},
        'topics': {coll:'topic', canUpdate: true},
        'analysis': {coll:'analysis', canUpdate: true},
        'visualizations': {coll:'visualization', canUpdate: true},
        'minFeatureLayer': {coll:'areatemplate', canUpdate: true},
        'minAttributeSets': {coll:'attributeset', canUpdate: true},
        
    }
}

var collections = ['layergroup','dataview','chartcfg','viewcfg','userpolygon','dataset','scope','topic','analysis','performedanalysis','visualization','location','attributeset','attribute','symbology','layerref','theme','areatemplate','year'];

module.exports = {
    ensureIds: ensureIds,
    hooks: hooks,
    refs: refs,
    collections: collections
}

