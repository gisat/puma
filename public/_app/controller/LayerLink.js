Ext.define('PumaMng.controller.LayerLink', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            'layerlinktab #submitbtn': {
                click: this.onSubmit
            },
            'layerlinktab #refType': {
                change: this.onRefTypeChange
            },
            'layerrefform #layer': {
                change: this.onLayerChange
            },
            layerrefform : {
                aftersave: this.onSubmit
            },
            'layerlinktab #deletebtn': {
                click: this.onDelete
            },
            'layerlinktab #activatebtn': {
                click: this.onActivate
            },
            'layerlinktab #copybtn': {
                click: this.onCopy
            }
        })
        var me = this;
        $('a.noref,a.ref,a.cannotref').live('click',function() {
            me.onAnchorClicked(this);
            
            return false;
        })
    },
        
    onDelete: function(btn) {
        var layerRefId = $('.editedref').attr('layerref');
        
        if (!layerRefId || $('.editedref').hasClass('refanalysis')) return;
        var layerRef = Ext.StoreMgr.lookup('layerref').getById(parseInt(layerRefId));
        var me = this;
        layerRef.destroy({
                callback: function(records,op) {
                    me.onSubmit();
                }
            });
    },

    onActivate: function(btn) {
        var layerRefId = $('.editedref').attr('layerref');
        if (!layerRefId) return;
        var params = this.getParams().params;
        params['id'] = layerRefId;
        Ext.Ajax.request({
            url: Cnst.url+'/api/layers/activateLayerRef',
            params: params,
            success: function(response) {
                var data = JSON.parse(response.responseText).data;
                var grid = Ext.ComponentQuery.query('layerlinktab #layerrefgrid')[0]
                grid.store.loadData(data);
            }
        })
        
    },

    onCopy: function(btn) {
        var anchor = $('.editedref');
        var clone = anchor.clone();
        clone.removeAttr('layerref')
                .removeClass('ref refanalysis refnoactive refnoavailable editedref')
                .addClass('noref')
                .insertAfter(anchor).before(' ');
    },
        
    refreshColumnGrid: function() {
        var grid = Ext.ComponentQuery.query('layerlinktab #columngrid')[0];
        var form = Ext.ComponentQuery.query('layerlinktab layerrefform')[0];
        var recs = grid.store.getRange();
        for (var i=0;i<recs.length;i++) {
            var rec = recs[i];
            var store = form.getEditor(rec).store;
            var obj = store.find('column',rec.get('column'));
            if (obj==-1) {
                rec.set('column',null);
            }
        }  
    },
    
    onLayerChange: function(combo, value) {
        var wmsAddress = Ext.ComponentQuery.query('layerrefform #wmsAddress')[0];
        var wmsLayers = Ext.ComponentQuery.query('layerrefform #wmsLayers')[0];
        wmsAddress.setDisabled(value!='WMS');
        wmsLayers.setDisabled(value!='WMS')
        wmsAddress.validate();
        wmsLayers.validate();
        if (value == 'WMS') {
            return;
        }
        Ext.Ajax.request({
            url: Cnst.url + '/api/layers/getLayerDetails',
            params: {
                layer: value
            },
            scope: this,
            success: this.onLayersDetailsReceived,
            failure: this.onLayersDetailsReceived
        })

    },
    
    onLayersDetailsReceived: function(response) {
        var data = null;
        try {
            data = JSON.parse(response.responseText).data;
        }
        catch (e) {}
        
        if (!data || !data.featureTypes) {
            Ext.StoreMgr.lookup('columnnumber').loadData([]);
            Ext.StoreMgr.lookup('columnstring').loadData([]);
            return;
        }
        var props = data.featureTypes[0].properties;
        var numberData = [];
        var stringData = [];
        var numTypes = ['int','bigint','float','double','real','long']
        for (var i=0;i<props.length;i++) {
            if (props[i].type.split(':')[0]=='gml') {
                continue;
            }
            var isNumType = Ext.Array.contains(numTypes,props[i].localType)
            var storeData = isNumType ? numberData : stringData;
            storeData.push({
                column: props[i].name
            })
        }
        Ext.StoreMgr.lookup('columnnumber').loadData(numberData);
        Ext.StoreMgr.lookup('columnstring').loadData(stringData);
        this.refreshColumnGrid();
    },
            
            
    onAnchorClicked: function(elem) {
        if ($(elem).hasClass('cannotref')) return;
        
        $('a.noref,a.ref').removeClass('editedref')
        $(elem).addClass('editedref');
        
        var tr = $(elem).closest('tr');
        var view = Ext.ComponentQuery.query('layerlinktab #layerrefgrid')[0].getView();
        var rec = view.getRecord(tr[0]);
        var id = $(elem).attr('objid');
        var layerRefId = $(elem).attr('layerref');
        var form = Ext.ComponentQuery.query('layerlinktab layerrefform')[0];
        if (layerRefId) {
            var layerRef = Ext.StoreMgr.lookup('layerref').getById(parseInt(layerRefId));          
            if ($(elem).hasClass('refanalysis')) {
                form.disable()
            }
            else {         
                form.enable();
            }
            form.getForm().loadRecord(layerRef);         
            return;
        }     
        var location = rec.get('location') ? parseInt(rec.get('location')) : parseInt(id);
        var areaTemplate = rec.get('areaTemplate') ?  parseInt(rec.get('areaTemplate')) : parseInt(id);
        var year = rec.get('year') ? parseInt(rec.get('year')) : parseInt(id);
        var attributeSet = rec.get('attributeSet') || parseInt(id);
        if (attributeSet=='blank') {
            attributeSet = null;
        }   
        else {
            attributeSet = parseInt(attributeSet);
        }
        
        var isData = attributeSet ? true : false;
        form.getComponent('location').setValue(location);
        form.getComponent('year').setValue(year);
        form.getComponent('attributeSet').setValue(attributeSet);
        form.getComponent('areaTemplate').setValue(areaTemplate);
        form.getComponent('isData').setValue(isData);
        
        if (isData) {
            var columnStore = Ext.StoreMgr.lookup('columnmapstore');
            var recs = columnStore.getRange();
            var presentAttrs = columnStore.collect('attribute');
            var attributeSet = Ext.StoreMgr.lookup('attributeset').getById(attributeSet);
            var attributes = attributeSet.get('attributes');
            var attrsToAdd = Ext.Array.difference(attributes,presentAttrs);
            var attrsToRemove = Ext.Array.difference(presentAttrs,attributes);
            var recsToAdd = [];
            var recsToRemove = [];
            for (var i=0;i<recs.length;i++) {
                var attr = recs[i].get('attribute');
                if (Ext.Array.contains(attrsToRemove,attr)) {
                    recsToRemove.push(recs[i]);
                }
            }
            for (var i=0;i<attrsToAdd.length;i++) {
                var attr = attrsToAdd[i];
                var rec = Ext.create('Puma.model.ColumnMap',{
                    attribute: attr
                })
                recsToAdd.push(rec);
            }
            columnStore.remove(recsToRemove);
            columnStore.add(recsToAdd);
        }
        
        form.enable();
        form.getForm().unbindRecord();
        this.refreshColumnGrid();
        
    },
        
    onRefTypeChange: function(group,val) {
        var refType = val['refType'];
        var fidColumn = Ext.ComponentQuery.query('layerrefform #fidColumn')[0];
        var nameColumn = Ext.ComponentQuery.query('layerrefform #nameColumn')[0];
        var parentColumn = Ext.ComponentQuery.query('layerrefform #parentColumn')[0];
        var columnGrid = Ext.ComponentQuery.query('layerrefform #columngrid')[0];
        var wmsAddress = Ext.ComponentQuery.query('layerrefform #wmsAddress')[0];
        var wmsLayers = Ext.ComponentQuery.query('layerrefform #wmsLayers')[0];
        fidColumn.setVisible(refType!='layer');
        nameColumn.setVisible(refType=='featurelayer');
        parentColumn.setVisible(refType=='featurelayer');
        columnGrid.setVisible(refType=='table');
        wmsAddress.setVisible(refType=='layer');
        wmsLayers.setVisible(refType=='layer');
        fidColumn.setDisabled(refType=='layer');
        fidColumn.validate();
        if (refType=='layer') {
            fidColumn.setValue(null);
        }
        if (refType!='featurelayer') {
            nameColumn.setValue(null);
            parentColumn.setValue(null);
        }
        if (refType!='layer') {
            wmsAddress.setValue(null);
            wmsLayers.setValue(null);
        }
        if (refType!='table') {     
            columnGrid.store.loadData([]);
        }
            
        var areaTemplateStore = Ext.StoreMgr.lookup('areatemplate4layerref');
        areaTemplateStore.clearFilter(true);
        if (refType=='layer') {
            areaTemplateStore.filter([function(rec) {
                return rec.get('justVisualization')
            }])
        }
        else {
            areaTemplateStore.filter([function(rec) {
                return !rec.get('justVisualization')
            }])
        }
        var attrSetGrid = Ext.ComponentQuery.query('layerlinktab #attributesetgrid')[0]
        attrSetGrid.setDisabled(refType!='table');
        var form = Ext.ComponentQuery.query('layerlinktab layerrefform')[0];
        form.disable();
        var grid = Ext.ComponentQuery.query('layerlinktab #layerrefgrid')[0];
        grid.store.loadData([]);
    },
    getParams: function() {
        var vals = {
            location: Ext.ComponentQuery.query('layerlinktab #locationgrid')[0].getSelectionModel().getSelection(),
            attributeSet: Ext.ComponentQuery.query('layerlinktab #attributesetgrid')[0].getSelectionModel().getSelection(),
            year: Ext.ComponentQuery.query('layerlinktab #yeargrid')[0].getSelectionModel().getSelection(),
            areaTemplate: Ext.ComponentQuery.query('layerlinktab #areatemplategrid')[0].getSelectionModel().getSelection()
        }
        var rowsFor = Ext.ComponentQuery.query('layerlinktab #rowsFor')[0].lastValue.rowsFor;
        var attrSets = Ext.Array.pluck(Ext.Array.pluck(vals.attributeSet,'data'),'_id');
        var refType = Ext.ComponentQuery.query('layerlinktab #refType')[0].getValue()['refType']
        
        var params = {
            locations: JSON.stringify(Ext.Array.pluck(Ext.Array.pluck(vals.location,'data'),'_id')),
            attributeSets: refType=='table' ? JSON.stringify(attrSets) : null,
            years: JSON.stringify(Ext.Array.pluck(Ext.Array.pluck(vals.year,'data'),'_id')),
            layerTemplates: JSON.stringify(Ext.Array.pluck(Ext.Array.pluck(vals.areaTemplate,'data'),'_id')),
            toRows: rowsFor
        }
        return {
            params: params,
            vals: vals
        }
    },
    
    onSubmit: function() {
        var rowsFor = Ext.ComponentQuery.query('layerlinktab #rowsFor')[0].lastValue.rowsFor;
        var refType = Ext.ComponentQuery.query('layerlinktab #refType')[0].getValue()['refType']
        var res = this.getParams()
        var params = res.params;
        var vals = res.vals;
        var objsNeeded = ['location','attributeSet','year','areaTemplate'];
        objsNeeded = Ext.Array.difference(objsNeeded,[rowsFor]);
        var objsToRemove = [];
        for (var i=0;i<objsNeeded.length;i++) {
            var obj = objsNeeded[i];
            if (vals[obj].length<2) {
                objsToRemove.push(obj);
            }
        }
        objsNeeded = Ext.Array.difference(objsNeeded,objsToRemove);
        if (refType!='table') {
            objsNeeded = Ext.Array.difference(objsNeeded,['attributeSet']);
        }
        var form = Ext.ComponentQuery.query('layerlinktab layerrefform')[0];
        form.disable();
        Ext.StoreMgr.lookup('layerref').load();
        Ext.Ajax.request({
            url: Cnst.url+'/api/layers/getLayerRefTable',
            params: params,
            success: function(response) {
                
                
                var store = Ext.create('Ext.data.Store',{
                    fields: ['location','attributeSet','year','areaTemplate','value'],
                    data: JSON.parse(response.responseText).data
                })
                var columns = []
                for (var i=0;i<objsNeeded.length;i++) {
                    var obj = objsNeeded[i]
                    columns.push({
                        dataIndex: obj,
                        width: obj=='year' ? 60 : 140,
                        renderer: function(val,metadata,rec,rowIndex,colIndex) {
                            var objStore = Ext.StoreMgr.lookup(objsNeeded[colIndex].toLowerCase())
                            return objStore.getById(val).get('name')
                        }
                    })
                }
                columns.push({
                    dataIndex: 'value',
                    flex: 1
                })
                var grid = Ext.ComponentQuery.query('layerlinktab #layerrefgrid')[0]
                grid.reconfigure(store,columns)
            }
        })
    
    }
})
    


