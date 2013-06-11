Ext.define('PumaMng.view.form.Theme', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.themeform',
    requires: ['Ext.ux.CheckColumn'],
    model: 'Theme',
    initComponent: function() {
        
        this.width = 700;
        this.items = [{
            xtype: 'pumacombo',
            store: Ext.StoreMgr.lookup('activedataset'),
            name: 'dataset',
            itemId: 'dataset',
            fieldLabel: 'Dataset'
        },{
            xtype: 'itemselector',
            store: Ext.StoreMgr.lookup('activetopic'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Topics',
            name: 'topics',
            itemId: 'topics',
        },
        {
            xtype: 'itemselector',
            store: Ext.StoreMgr.lookup('activeyears'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Years',
            name: 'years',
            itemId: 'years',
        },
        {
            xtype: 'pumacombo',
            store: Ext.StoreMgr.lookup('featurelayer4theme'),
            name: 'minFeatureLayer',
            itemId: 'minFeatureLayer',
            fieldLabel: 'Min. feature layer'
        },
        {
            xtype: 'itemselector',
            store: Ext.StoreMgr.lookup('attributeset4theme'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Min attribute sets',
            name: 'minAttributeSets',
            itemId: 'minAttributeSets'
        },
        {
            xtype: 'itemselector',
            store: Ext.StoreMgr.lookup('analysis'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Analysis',
            name: 'analysis',
            itemId: 'analysis'
        }
        ]
            this.callParent();
    }

});


