Ext.define('PumaMain.controller.Render', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Puma.view.form.DefaultComboBox','Ext.form.CheckboxGroup','PumaMain.view.TopTools','PumaMain.view.Tools','PumaMain.view.ChartBar'],
    init: function() {},
    renderItems: function() {
        Ext.widget('pumacombo',{
            store: 'dataset',
            renderTo: 'app-toolbar-scope',
            width: 120
        })
        Ext.widget('pumacombo',{
            store: 'theme',
            renderTo: 'app-toolbar-theme',
            width: 120
        })
        Ext.widget('pumacombo',{
            store: 'visualization',
            renderTo: 'app-toolbar-visualization',
            width: 120
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-share',
            text: 'Share',
            width: '100%',
            height: '100%'
        })
        Ext.widget('checkboxgroup',{
            renderTo: 'app-toolbar-year',
            defaults: {
                margin: '0 5 0 0'
            },
            items: [
                { boxLabel: '2000', name: 'rb', inputValue: '2000' },
                { boxLabel: '2012', name: 'rb', inputValue: '2012' },
                
            ]
        })
        Ext.widget('multislider',{
            renderTo: 'app-toolbar-level',
            minValue: 0,
            values: [0,2],
            maxValue: 4,
            width: '100%'
        })
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
        Ext.widget('toptoolspanel',{
            renderTo: 'app-tools-actions'
        })
        Ext.widget('toolspanel',{
            renderTo: 'app-tools-actions'
        })
        Ext.widget('chartbar',{
            renderTo: 'app-reports-accordeon'
        })
    
    }
    })


