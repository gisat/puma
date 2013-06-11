Ext.define('PumaMng.view.form.Theme', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.themeform',
    requires: ['Ext.ux.CheckColumn'],
    model: 'Theme',
    initComponent: function() {
        
        this.width = 700;
        var editing = Ext.create('Gisatlib.grid.plugin.CustomEditorPlugin');
        this.items = [{
            xtype: 'pumacombo',
            store: Ext.StoreMgr.lookup('scope'),
            name: 'scope',
            itemId: 'scope',
            fieldLabel: 'Scope'
        },{
            xtype: 'itemselector',
            store: Ext.StoreMgr.lookup('tree4theme'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Trees',
            name: 'treesAndAreas',
            itemId: 'treesAndAreas',
        },
        {
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
            store: Ext.StoreMgr.lookup('analysis'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Analysis',
            name: 'analysis',
            itemId: 'analysis',
        }
        ]
            this.callParent();
    }

});


