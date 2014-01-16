Ext.define('PumaMng.view.form.FeatureLayerTemplate', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.featurelayertemplateform',
    requires: [],
    
    model: 'AreaTemplate',
    initComponent: function() {
        
        this.width = 600;
        this.items = [{
                    xtype: 'checkbox',
                    hidden: true,
                    name: 'justVisualization',
                    value: false,
                    allowBlank: false,
                    fieldLabel: 'BBOX'
                },{
                    xtype: 'pumacombo',
                    store: Ext.StoreMgr.lookup('activetopic'),
                    fieldLabel: 'Topic',
                    name: 'topic',
                    itemId: 'topic'
                },{
                    xtype: 'pumacombo',
                    store: Ext.StoreMgr.lookup('layergroup'),
                    fieldLabel: 'Layer group',
                    name: 'layerGroup',
                    allowBlank: true,
                    itemId: 'layerGroup'
                },{
                    xtype: 'itemselector',
                    store: Ext.StoreMgr.lookup('activesymbology'),
                    fieldLabel: 'Symbologies',
                    name: 'symbologies',
                    itemId: 'symbologies',
                    height: 170,
                    autoScroll: false,
                    valueField: '_id',
                    displayField: 'name'
                }];

        this.callParent();
    }
})


