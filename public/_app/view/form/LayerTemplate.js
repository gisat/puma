Ext.define('PumaMng.view.form.LayerTemplate', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.layertemplatejustvizform',
    requires: [],
    model: 'AreaTemplate',
    initComponent: function() {
        
        
        this.items = [{
                    xtype: 'checkbox',
                    hidden: true,
                    name: 'justVisualization',
                    value: true,
                    allowBlank: false
                },{
                    xtype: 'pumacombo',
                    store: Ext.StoreMgr.lookup('activetopic'),
                    fieldLabel: 'Topic',
                    name: 'topic',
                    itemId: 'topic'
                },{
                    xtype: 'itemselector',
                    store: Ext.StoreMgr.lookup('activesymbology'),
                    fieldLabel: 'Symbologies',
                    name: 'symbologies',
                    itemId: 'symbologies',
                    valueField: '_id',
                    displayField: 'name'
                }];

        this.callParent();
    }
})


