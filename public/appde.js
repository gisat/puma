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
    controllers: ['DomManipulation','Render','Store','Map','LocationTheme','Area','Layers','Screenshot','AttributeConfig','Help','Filter','ViewMng','Login'],
    enableQuickTips: false,
    requires: ['Puma.patch.Main'],
    launch: function() {
        this.getController('Puma.controller.Login');
        this.getController('Render').renderIntro();
    }
});

