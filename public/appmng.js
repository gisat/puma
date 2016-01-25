
Ext.Loader.setConfig({
	enabled:true
	//,disableCaching: false
});

Ext.Loader.setPath('Ext.ux','ux');
Ext.Loader.setPath('Gisatlib','gisatlib');
Ext.Loader.setPath('Ext','extjs-4.1.3/src');
Ext.Loader.setPath('Puma.patch','patch');
Ext.Loader.setPath('Puma','_common');

Ext.application({

	name: 'PumaMng',

	appFolder: '_app',
	
	controllers: ['Analysis','LayerLink','Store','Management','Theme','Login','Socket'],
	views: ['MainTabPanel'],
	enableQuickTips: false,
	requires: [
		'Puma.patch.Main', // JJJ zakomentovat při buildu, odkomentovat při sencha create jsb a pak ho z .jsb3 vymazat
		// 'Ext.data.reader.Json','Ext.data.reader.Reader',
		'Puma.util.Msg','Ext.container.Viewport','Ext.container.Container','Ext.tip.QuickTipManager','Ext.data.*','Puma.controller.Form','Puma.controller.Login','Puma.view.LoginHeader'],

	launch: function() {
		//Ext.tip.QuickTipManager.init();
		
		
		Ext.Ajax.method = 'POST';
		this.getController('Puma.controller.Form');
		this.getController('Puma.controller.Login');
		Puma.util.Msg.init();
		Ext.create('Ext.container.Viewport', {
			layout: 'border',
			minWidth: 1260,
			minHeight: 670,
			autoScroll: true,
			items: [{
				xtype: 'loginheader',
				weight: 100,
				region: 'north',
				height: 40
			},{
				xtype: 'maintabpanel',
				region: 'center',
				deferredRender: false
			}]
		});
	}
});


