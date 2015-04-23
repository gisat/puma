Ext.define('PumaMain.view.AddAttributeTree', {
	// JJJ TIP: tristavove checkboxy, Ext je asi neumi
	//          http://www.sencha.com/forum/showthread.php?138664-Ext.ux.form.TriCheckbox&p=619810
	//          ve stromu to bude asi slozitejsi, tak nic...
    extend: 'Ext.tree.Panel',
    alias: 'widget.addattributetree',
    border: false,
    autoScroll: true,
	rootVisible: false,
	title: 'Select attributes to add',
    requires: ['Ext.ux.CheckColumn','Ext.ux.grid.filter.StringFilter'],
    initComponent: function() {
		this.hideHeaders = true;
        this.store = Ext.StoreMgr.lookup('attributes2choose'); // store se jmenuje stejne, ale je predelan na treestore
        this.columns = [{
			xtype: 'treecolumn',
            dataIndex: 'treeNodeText',
			sortable: false,
            menuDisabled: true,
			flex: 1
        }]

        this.buttons = [{
            itemId: 'add',
            text: 'Add'
        },{
            itemId: 'back',
            text: 'Back'
        }]
        this.callParent();
    }
})


