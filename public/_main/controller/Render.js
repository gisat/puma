Ext.define('PumaMain.controller.Render', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Puma.view.form.DefaultComboBox','Ext.form.CheckboxGroup','PumaMain.view.TopTools','PumaMain.view.Tools','PumaMain.view.ChartBar','Gisatlib.container.StoreContainer','Ext.slider.Multi'],
    init: function() {
        if (location.search.search('admin=1')>-1) {
            Ext.get('toolbar-logo').setStyle({display:'none'})
            Ext.get('login-widget').setStyle({display:'block'})
        }
    },
    renderApp: function() {
        
        
        
        Ext.widget('pumacombo',{
            store: 'scope',
            itemId: 'selscope',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-scope'
        })
        Ext.widget('pumacombo',{
            store: Ext.StoreMgr.lookup('dataset4sel'),
            itemId: 'seldataset',
            valueField: '_id',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-teritory'
        })
        Ext.widget('pumacombo',{
            store: 'theme',
            itemId: 'seltheme',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-theme'
        })
        Ext.widget('storecontainer',{
            renderTo: 'app-toolbar-year',
            store: Ext.StoreMgr.lookup('year'),
            forceSelection: true,
            itemId: 'selyear',
            multiCtrl: true,
            multi: true
            ,type: 'checkbox'
        })
//        Ext.widget('pumacombo',{
//            store: 'visualization4sel',
//            itemId: 'selvisualization',
//            cls: 'custom-combo',
//            listConfig: {
//                cls: 'custom-combo-list',
//            },
//            renderTo: 'app-toolbar-visualization'
//        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-visualization-save',
            text: 'Save',
            itemId: 'savevisualization',
            width: '100%',
            height: '100%',
            hidden: !Config.auth || !Config.auth.isAdmin,
            cls: 'custom-button btn-visualization-save'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-share',
            text: 'Share data view',
            itemId: 'sharedataview',
            width: '100%',
            height: '100%',
            hidden: !Config.auth,
            icon: 'images/icons/share.png',
            cls: 'custom-button btn-share'
        })
        
        
//        Ext.widget('slider',{
//            renderTo: 'app-toolbar-level',
//            itemId: 'areaslider',
//            minValue: 0,
//            value: 0,
//            maxValue: 2,
//            width: '100%'
//        })
        
     
        
        Ext.widget('button',{
            renderTo: 'app-toolbar-level-more',
            itemId: 'areamoredetails',
            text: '+',
            width: '100%',
            height: '100%',
            cls: 'custom-button'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-level-less',
            itemId: 'arealessdetails',
            text: '-',
            width: '100%',
            height: '100%',
            cls: 'custom-button'
        })
    
        Ext.widget('button',{
            renderTo: 'app-toolbar-manage',
            itemId: 'managedataview',
            hidden: !Config.auth,
            icon: 'images/icons/settings.png',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-manage'
        })
//        Ext.widget('button',{
//            renderTo: 'app-toolbar-visualization-manage',
//            itemId: 'managevisualization',
//            hidden: !Config.auth || !Config.auth.isAdmin,
//            icon: 'images/icons/settings.png',
//            width: '100%',
//            height: '100%',
//            cls: 'custom-button btn-visualization-manage'
//        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-save',
            itemId: 'savedataview',
            hidden: !Config.auth,
            text: 'Save view',
            icon: 'images/icons/save.png',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-save'
        })
        
        Ext.widget('toptoolspanel',{
            renderTo: 'app-tools-actions'
        })
        Ext.widget('toolspanel',{
            renderTo: 'app-tools-accordeon'
        })
        Ext.widget('chartbar',{
            renderTo: 'app-reports-accordeon'
        })
        Ext.widget('pagingtoolbar',{
            renderTo: 'app-reports-paging',
            itemId: 'areapager',
            displayInfo: true,
            cls: 'paging-toolbar',
            store: Ext.StoreMgr.lookup('paging')
        })
        Ext.ComponentQuery.query('#screenshotpanel')[0].collapse();
        
    },
    
    renderMap: function() {
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
    },        
            
    renderIntro: function() {
        this.renderMap();
        Ext.widget('pumacombo',{
            renderTo: 'app-intro-scope',
            initial: true,
            allowBlank: false,
            store: Ext.StoreMgr.lookup('scope'),
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            itemId: 'initialscope'
        })
        Ext.widget('pumacombo',{
            renderTo: 'app-intro-teritory',
            initial: true,
            //hidden: true,
            store: Ext.StoreMgr.lookup('dataset4sel'),
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            itemId: 'initialdataset'
        })
        Ext.widget('pumacombo',{
            renderTo: 'app-intro-theme',
            initial: true,
            //hidden: true,
            itemId: 'initialtheme',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            store: Ext.StoreMgr.lookup('theme')
        })
        Ext.widget('button',{
            renderTo: 'app-intro-confirm',
            itemId: 'initialconfirm',
            text: 'Confirm',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-confirm'
        })
        
    }
    })


