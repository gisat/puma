Ext.define('PumaMng.controller.Analysis',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMng.view.analysis.SpatialAggregation','PumaMng.view.analysis.FidAggregation'],
  
    init: function() {
        this.control({
            'analysistab #analysistypegrid': {
                selectionchange: this.onAnalysisTypeSelected
            },
            'performedanalysistab #reloadbtn': {
                click: this.onPerformedAnalysisReload
            },
            'spatialaggform #attributeSet': {
                change: this.onAttrSetChanged
            },
            'spatialaggform #groupAttributeSet': {
                change: this.onGroupAttrSetChanged
            },
            'fidaggform #attributeSets': {
                change: this.onAttrSetsChanged
            }, 
            'fidaggform #fillbtn': {
                click: this.onFill
            } 
        })
    },
        
    onFill: function(btn) {
       var store = btn.up('grid').store;
       var first = store.getAt(0);
       store.each(function(rec) {
           rec.set('type',rec.get('type') || first.get('type'));
           rec.set('normAttributeSet',rec.get('normAttributeSet') || first.get('normAttributeSet'));
           rec.set('normAttribute',rec.get('normAttribute') || first.get('normAttribute'));
       })
       
       
    },
        
    onPerformedAnalysisReload: function() {
        Ext.StoreMgr.lookup('performedanalysis').load();
    },
    
    onAttrSetChanged: function(combo,val) {
        var attributeSet = Ext.StoreMgr.lookup('attributeset').getById(val);
        if (!attributeSet) return;
        var attributes = attributeSet.get('attributes');
        var recsToAdd = [];
        for (var i=0;i<attributes.length;i++) {
            var attribute = attributes[i];
            var rec = Ext.create('Puma.model.AggregationMap',{
                attribute: attribute
            })
            recsToAdd.push(rec)
        }
        Ext.StoreMgr.lookup('spatialaggmap').loadData(recsToAdd);
    },
            
            
    onGroupAttrSetChanged: function(combo,val) {
        var attributeSet = Ext.StoreMgr.lookup('attributeset').getById(val);
        if (!attributeSet) return;
        var attributes = attributeSet.get('attributes');
        var store = Ext.StoreMgr.lookup('attribute4spatialagg')
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(attributes,rec.get('_id'))
        }])
    },
        
    onAttrSetsChanged: function(selector,val) {
        var attributeSets = val;
        var attrSetStore = Ext.StoreMgr.lookup('attributeset');
        var fidAggStore = Ext.StoreMgr.lookup('fidaggmap')
        var currentAttributeSets = fidAggStore.collect('attributeSet');
        var attrSetsToAdd = Ext.Array.difference(attributeSets, currentAttributeSets);
        var attrSetsToRemove = Ext.Array.difference(currentAttributeSets, attributeSets);
        var recsToAdd = [];
        var recsToRemove = [];
        for (var i = 0; i < attrSetsToAdd.length; i++) {
            var attributeSet = attrSetStore.getById(attrSetsToAdd[i]);
            var attributes = attributeSet.get('attributes');
            for (var j = 0; j < attributes.length; j++) {
                var attr = attributes[j];
                var rec = Ext.create('Puma.model.AggregationMap', {
                    attribute: attr,
                    attributeSet: attrSetsToAdd[i]
                })
                recsToAdd.push(rec);
            }
        }
        for (var i=0;i<attrSetsToRemove.length;i++) {
            var attrSet = attrSetsToRemove[i];
            var recs = fidAggStore.query('attributeSet',attrSet).getRange();
            recsToRemove = Ext.Array.merge(recs,recsToRemove);
        }
        fidAggStore.remove(recsToRemove);
        fidAggStore.add(recsToAdd);
        
    },
    
    onAnalysisTypeSelected: function(model,selection) {
        
        var objectsGrid = Ext.ComponentQuery.query('analysistab #analysisgrid')[0];
        var form = objectsGrid.nextSibling();
        var parent = objectsGrid.ownerCt;
        if (!selection.length) {
            if (form) {
                parent.remove(form)
            }
            return;
        }
        if (form) {
            parent.remove(form)
        }
        var rec = selection[0];
        var type = rec.get('type');
        parent.add({
            xtype: type+'form'
        })
        var store = Ext.StoreMgr.lookup('analysismng');
        store.clearFilter(true);
        store.filter([function(rec) {
            return rec.get('type') == type
        }])
        Ext.ComponentQuery.query(type+'form #type')[0].setValue(type);
    }
})


