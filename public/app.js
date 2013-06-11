
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
    
    controllers: ['Analysis','LayerLink','Store','Filter','Management','AttributeSet','Tree','Theme'],
    views: ['MainTabPanel'],
    enableQuickTips: false,
    requires: ['Puma.patch.Main','Ext.container.Viewport','Ext.container.Container','Ext.tip.QuickTipManager','Ext.data.*','Puma.controller.Form','Puma.controller.Login','Puma.view.LoginHeader'],

    launch: function() {
        //Ext.tip.QuickTipManager.init();
        this.getController('Puma.controller.Form');
        this.getController('Puma.controller.Login');
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


