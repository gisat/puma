Ext.Loader.setConfig({
    enabled: true
            //,disableCaching: false
});

Ext.Loader.setPath('Ext.ux', 'ux');
Ext.Loader.setPath('Gisatlib', 'gisatlib');
Ext.Loader.setPath('Ext', 'extjs-4.1.3/src');
Ext.Loader.setPath('Puma.patch', 'patch');
Ext.Loader.setPath('Puma', '_common');

Ext.application({
    name: 'PumaMain',
    appFolder: '_main',
    controllers: ['Map', 'Store', 'Chart','Area','LocationTheme','Settings','Layers','Select','UserPolygon'],
    enableQuickTips: false,
    requires: ['Puma.controller.Form','Puma.controller.Login','Puma.patch.Main','Ext.tip.QuickTipManager', 'Ext.data.*','PumaMain.view.Main','PumaMain.view.MainAlt'],
    launch: function() {
        //Ext.tip.QuickTipManager.init();
        var width = Ext.getBody().getWidth();
        this.getController('Puma.controller.Form');
        this.getController('Puma.controller.Login');
        Ext.widget(width>1500 ? 'mainviewport':'mainviewportalt');
    }
});

