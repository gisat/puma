Ext.Loader.setConfig({
	enabled: true
	,disableCaching: false
});

Ext.Loader.setPath('Ext.ux', 'ux');
Ext.Loader.setPath('Gisatlib', 'gisatlib');
Ext.Loader.setPath('Ext', 'extjs-4.1.3/src');
Ext.Loader.setPath('Puma.patch', 'patch');
Ext.Loader.setPath('Puma', '_common');

Ext.application({
	name: 'PumaMain',
	appFolder: '_main',
	controllers: ['Export','DomManipulation','Render','Store','Map','LocationTheme','Area','Layers','Screenshot','AttributeConfig','Help','Filter','ViewMng','Login','Select','Chart'],
	enableQuickTips: true,
	requires: [
		'Puma.patch.Main', // JJJ zakomentovat při buildu, odkomentovat při sencha create jsb a pak ho z .jsb3 vymazat
		'Ext.data.reader.Json','Ext.util.Point','Ext.Layer','Ext.window.Window','Ext.data.ArrayStore','Ext.data.proxy.Memory','Ext.data.reader.Array','Ext.util.Grouper','Ext.PluginManager','Ext.ComponentLoader','Ext.layout.Context','Ext.resizer.Resizer','Ext.panel.Tool','Ext.util.CSS','Ext.layout.component.Body','Ext.Img','Ext.menu.Menu','Ext.data.Batch','Ext.selection.RowModel','Ext.selection.CellModel','Ext.selection.CheckboxModel','Ext.grid.PagingScroller','Ext.grid.header.Container','Ext.grid.column.Column','Ext.grid.Lockable','Ext.view.TableLayout','Ext.view.TableChunker','Ext.data.Request','Ext.grid.column.Number','Ext.layout.container.Accordion','Ext.picker.Color','Ext.tree.Panel','Ext.grid.column.Action','Ext.grid.plugin.DragDrop','Ext.layout.container.Table','Ext.form.field.Checkbox','Ext.ux.grid.FiltersFeature','PumaMain.view.Chart','PumaMain.view.VisualizationForm','Puma.view.CommonForm','Puma.view.CommonGrid','Gisatlib.form.HiddenStoreField','Ext.form.field.Hidden','PumaMain.view.ChartPanel','Ext.ux.grid.menu.ListMenu','Ext.ux.grid.menu.RangeMenu','Ext.ux.grid.filter.BooleanFilter','Ext.picker.Date','Ext.ux.grid.filter.DateTimeFilter','Ext.picker.Month','Ext.ux.grid.filter.ListFilter'],
	launch: function() {

		// replace protocol with no-ssl http when loading chart or map in Phantomjs
		if(location.protocol=="http:"){
			var originalUrl = Config.url;
			Config.url = Config.url.replace("https://", "http://");
			if(originalUrl != Config.url){
				console.log("Config.url replaced:", originalUrl, " -> ", Config.url);
			}
		}

		window.location.origin = window.location.origin || (window.location.protocol+'//'+window.location.hostname+ (window.location.port ? (':'+window.location.port) : ''));
		Ext.Ajax.method = 'POST';
		if (Config.exportPage) {
			this.getController('Export').initConf();
			return;
		}
		Ext.tip.QuickTipManager.init();

		Ext.apply(Ext.tip.QuickTipManager.getQuickTip(), {
			cls: 'standardqtip'
		});
		Ext.window.Window.prototype.resizable = false;
		
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

