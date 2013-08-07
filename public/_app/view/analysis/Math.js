Ext.define('PumaMng.view.analysis.Math', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.mathform',
    width: 650,
    requires: [],
    initComponent: function() {
        var me = this;
        this.store = Ext.StoreMgr.lookup('analysis');
        this.model = 'Analysis'
        this.items = [{
                name: 'type',
                allowBlank: false,
                itemId: 'type',
                xtype: 'hiddenfield'
            }, {
                name: 'name',
                allowBlank: false,
                fieldLabel: 'Name',
                itemId: 'name',
                xtype: 'textfield'
            },
            {
                xtype: 'itemselector',
                name: 'topics',
                itemId: 'topics',
                displayField: 'name',
                valueField: '_id',
                height: 170,
                store: Ext.StoreMgr.lookup('activetopic'),
                allowBlank: false,
                fieldLabel: 'Topics'
            },
            {
                xtype: 'itemselector',
                height: 170,
                displayField: 'name',
                valueField: '_id',
                name: 'attributeSets',
                itemId: 'attributeSets',
                store: Ext.StoreMgr.lookup('attributeset4math'),
                allowBlank: false,
                fieldLabel: 'Attribute sets'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('attributeset4math'),
                fieldLabel: 'Result',
                allowBlank: false,
                name: 'attributeSet',
                itemId: 'attributeSet'
            },{
                fieldLabel: 'Use sum',
                xtype: 'checkbox',
                name: 'useSum',
                checked: false,
                defaultValue: false,
                itemId: 'useSum'
        }
        ]

        this.callParent();
    }
})


