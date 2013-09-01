Ext.define('PumaMain.view.NormalizeForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.normalizeform',
    frame: true,
    initComponent: function() {
        this.attrStore = Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            autoLoad: true,
            filters: [function(rec) {
                    return false;
            }],
            model: 'Puma.model.Attribute'
        })
        this.items = [{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('normalization4chart'),
                fieldLabel: 'Norm type',
                name: 'normType',
                valueField: 'type',
                itemId: 'normType'
            }, {
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('attributeset2choose'),
                fieldLabel: 'Norm Attr set',
                name: 'normAttributeSet',
                hidden: true,
                itemId: 'normAttributeSet'
            },{
                xtype: 'pumacombo',
                store: this.attrStore,
                fieldLabel: 'Norm Attribute',
                name: 'normAttribute',
                hidden: true,
                itemId: 'normAttribute'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('year4sel'),
                fieldLabel: 'Norm year',
                name: 'normYear',
                itemId: 'normYear'
            }]
        this.buttons = [{
                text: 'Normalize',
                itemId: 'normalize'
            }, {
                text: 'Dont normalize',
                itemId: 'dontnormalize'
            }, {
                text: 'Back',
                itemId: 'back'
            }]
        this.callParent();

    }
})


