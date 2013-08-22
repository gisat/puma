Ext.define('PumaMain.controller.Render', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Puma.view.form.DefaultComboBox','Ext.form.CheckboxGroup','PumaMain.view.TopTools','PumaMain.view.Tools','PumaMain.view.ChartBar','Gisatlib.container.StoreContainer'],
    init: function() {},
    renderApp: function() {
        Ext.widget('pumacombo',{
            store: 'dataset',
            itemId: 'seldataset',
            renderTo: 'app-toolbar-scope',
            width: 120
        })
        Ext.widget('pumacombo',{
            store: 'theme4sel',
            itemId: 'seltheme',
            renderTo: 'app-toolbar-theme',
            width: 120
        })
        Ext.widget('storecontainer',{
            renderTo: 'app-toolbar-year',
            store: Ext.StoreMgr.lookup('year4sel'),
            forceSelection: true,
            itemId: 'selyear',
            multiCtrl: true,
            multi: true
            ,type: 'checkbox'
        })
        Ext.widget('pumacombo',{
            store: 'visualization4sel',
            itemId: 'selvisualization',
            renderTo: 'app-toolbar-visualization',
            width: 120
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-share',
            text: 'Share',
            width: '100%',
            height: '100%'
        })
        
        
        Ext.widget('slider',{
            renderTo: 'app-toolbar-level',
            itemId: 'areaslider',
            minValue: 0,
            value: 0,
            maxValue: 2,
            width: '100%'
        })
        Ext.widget('toptoolspanel',{
            renderTo: 'app-tools-actions'
        })
        Ext.widget('toolspanel',{
            renderTo: 'app-tools-actions'
        })
        Ext.widget('chartbar',{
            renderTo: 'app-reports-accordeon'
        })
        Ext.widget('pagingtoolbar',{
            renderTo: 'app-reports-paging',
            itemId: 'areapager',
            displayInfo: true,
            store: Ext.StoreMgr.lookup('paging')
        })
        
    },
        
    renderIntro: function() {
        Ext.widget('component',{
            renderTo: 'app-map',
            itemId: 'map',
            width: 1920,
            height: 900
        })
        Ext.widget('component',{
            renderTo: 'app-map2',
            itemId: 'map2',
            hidden: true,
            width: 1920,
            height: 900
        })
        Ext.widget('storecontainer',{
            renderTo: 'app-intro-scope',
            store: Ext.StoreMgr.lookup('dataset'),
            itemId: 'initialdataset'
        })
    
        Ext.widget('storecontainer',{
            renderTo: 'app-intro-theme',
            itemId: 'initialtheme',
            store: Ext.StoreMgr.lookup('theme4sel')
        })
        
    }
    })


