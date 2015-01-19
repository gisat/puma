Ext.define('PumaMng.controller.LayerLink', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            'layerlinktab #submitbtn': {
                click: this.onSubmit
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
            },
            'layerlinktab #dataset': {
                change: this.onDatasetChange
            },
            'layerlinktab #theme': {
                change: this.onThemeChange
            }
            
        })
        var me = this;
        $('a.noref,a.ref,a.cannotref').live('click',function() {
            me.onAnchorClicked(this);
            
            return false;
        })
    },
    onDatasetChange: function(combo,val) {
        var themeCombo = Ext.ComponentQuery.query('layerlinktab #theme')[0];
        var locationCombo = Ext.ComponentQuery.query('layerlinktab #location')[0];
        if (!val) {
            themeCombo.disable();
            locationCombo.disable();
            return;
        }
        var themeStore = Ext.StoreMgr.lookup('theme4layerref');
        var locationStore = Ext.StoreMgr.lookup('location4layerref');
        
        themeStore.clearFilter(true);
        locationStore.clearFilter(true);
        themeStore.filter([function(rec) {
            return rec.get('dataset')==val;
        }])
        locationStore.filter([function(rec) {
            return rec.get('dataset')==val;
        }])
        themeCombo.enable();
        locationCombo.enable();
    },
    onThemeChange: function(combo,val) {
        var yearCombo = Ext.ComponentQuery.query('layerlinktab #year')[0]
        if (!val) {
            yearCombo.disable();
            return
        }
        var theme = Ext.StoreMgr.lookup('theme').getById(val);
        var store = Ext.StoreMgr.lookup('year4layerref');
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(theme.get('years'),rec.get('_id'))
        }]) 
        yearCombo.enable();
        
    },
            
            
    onDelete: function(btn) {
        var layerRefId = $('.editedref').attr('layerref');
        
        if (!layerRefId || $('.editedref').hasClass('refanalysis')) return;
        var layerRef = Ext.StoreMgr.lookup('layerref').getById(parseInt(layerRefId));
        var me = this;
        Puma.util.Msg.msg('Record start deleting','');
        layerRef.destroy({
                callback: function(records,op) {
                     if (!op.success) {
                        if (!op.error.response.responseText) {
                            Ext.Msg.alert('Error','Undefined');
                            return;
                        }
                        var message = JSON.parse(op.error.response.responseText).message
                        message = message.replace(new RegExp('\n','g'),'<br/>');
                        Ext.Msg.alert('Error',message);
                    }
                    else {
                        Puma.util.Msg.msg('Record deleted','');
                    }
                    me.onSubmit();
                }
            });
    },

    onActivate: function(btn) {
        var layerRefId = $('.editedref').attr('layerref');
        if (!layerRefId) return;
        var params = this.getParams();
        params['id'] = layerRefId;
        Ext.Ajax.request({
            url: Config.url+'/api/layers/activateLayerRef',
            params: params,
            success: function(response) {
                var data = JSON.parse(response.responseText).data;
                var grid = Ext.ComponentQuery.query('layerlinktab #layerrefgrid')[0]
                grid.store.loadData(data);
                var form = Ext.ComponentQuery.query('layerlinktab layerrefform')[0];
                form.disable();
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
            url: Config.url + '/api/layers/getLayerDetails',
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
        var format = new OpenLayers.Format.WFSDescribeFeatureType();
        data = format.read(data);
        
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
        stringData.push({
            column: 'name'
        })
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
        
        var location = rec.get('location') 
        var areaTemplate = rec.get('areaTemplate') 
        var year = rec.get('year') 
        var attributeSet = id ? parseInt(id) : null;
        var isData = attributeSet ? true : false;
        var isFeatureLayer = Ext.Array.contains(Ext.StoreMgr.lookup('featurelayertemplatemng').data.keys,areaTemplate)
        
        
        var refType = isData ? 'table' : null;    
        refType = refType || (isFeatureLayer ? 'featurelayer' : 'layer')
        
        this.onRefTypeChange(refType);
        if (layerRefId) {
            var layerRef = Ext.StoreMgr.lookup('layerref').getById(parseInt(layerRefId));          
            if ($(elem).hasClass('refanalysis')) {
                form.disable();
                return;
            }
            else {         
                form.enable();
            }
            form.getForm().loadRecord(layerRef);         
            return;
        }     
        
        
        form.getComponent('location').setValue(location);
        form.getComponent('year').setValue(year);
        form.getComponent('attributeSet').setValue(attributeSet);
        form.getComponent('areaTemplate').setValue(areaTemplate);
        form.getComponent('isData').setValue(isData);
        var refType = null;
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
        
    onRefTypeChange: function(refType) {
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
        
    },
    getParams: function() {
        var vals = {
            location: Ext.ComponentQuery.query('layerlinktab #location')[0].getValue(),
            year: Ext.ComponentQuery.query('layerlinktab #year')[0].getValue(),
            theme: Ext.ComponentQuery.query('layerlinktab #theme')[0].getValue(),
        }
        
        return vals;
    },
    
    onSubmit: function() {
        var vals = this.getParams();
        if (!vals.location || !vals.year || !vals.theme) {
            return;
        }
        var form = Ext.ComponentQuery.query('layerlinktab layerrefform')[0];
        form.disable();
        Ext.StoreMgr.lookup('layerref').load();
        Ext.Ajax.request({
            url: Config.url+'/api/layers/getLayerRefTable',
            params: vals,
            success: function(response) {
                
                var grid = Ext.ComponentQuery.query('layerlinktab #layerrefgrid')[0]
                grid.store.loadData(JSON.parse(response.responseText).data)
            }
        })
    
    }
})
    


