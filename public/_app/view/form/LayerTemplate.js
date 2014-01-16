Ext.define('PumaMng.view.form.LayerTemplate', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.layertemplatejustvizform',
    requires: [],
    model: 'AreaTemplate',
    initComponent: function() {
        
        this.width = 600;
        this.items = [{
                    xtype: 'checkbox',
                    hidden: true,
                    name: 'justVisualization',
                    checked: true,
                    value: true,
                    allowBlank: false
                },{
                    xtype: 'pumacombo',
                    store: Ext.StoreMgr.lookup('activetopic'),
                    fieldLabel: 'Topic',
                    name: 'topic',
                    allowBlank: false,
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
                    valueField: '_id',
                    displayField: 'name'
                }];

        this.callParent();
    }
})


