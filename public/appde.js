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
    enableQuickTips: true,
    requires: ['Puma.patch.Main'],
    launch: function() {
        Ext.tip.QuickTipManager.init();

        Ext.apply(Ext.tip.QuickTipManager.getQuickTip(), {
            cls: 'standardqtip'     
        });
        this.getController('Puma.controller.Login');
        var search = window.location.search.split('?')[1];
        var afterId = search ? search.split('id=')[1] : null;
        var id = afterId ? afterId.split('&')[0] : null;
        Config.dataviewId = id;
        if (id) {
            this.getController('DomManipulation').renderApp();
            this.getController('Render').renderApp();
            
            this.getController('Render').renderMap();
        }
        else {
            this.getController('Render').renderIntro();
        }
        
    }
});

