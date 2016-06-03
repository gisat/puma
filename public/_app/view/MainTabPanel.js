Ext.define('PumaMng.view.MainTabPanel' ,{
    extend: 'Ext.tab.Panel',
    alias : 'widget.maintabpanel',
    requires: ['Ext.container.Container','PumaMng.view.tab.Analysis','PumaMng.view.tab.PerformedAnalysis','PumaMng.view.tab.Management','PumaMng.view.tab.LayerLink'],

    initComponent: function() {
        this.items = [{
        //    xtype: 'container',
        //    itemId: 'welcome',
        //    title: 'Welcome'
        //}, {
            xtype: 'managementtab',
            disabled: true,
            title: 'Objects management'
        }, {
            xtype: 'layerlinktab',
            disabled: true,
            title: 'Layer linking'
        }, {
            xtype: 'analysistab',
            disabled: true,
            title: 'Analysis'
        }, {
            xtype: 'performedanalysistab',
            disabled: true,
            title: 'Performed Analysis'
        }
//        ,
//        {
//            xtype: 'locationtab',
//            disabled: true,
//            title: 'Location'
//        },
//        {
//            xtype: 'attributesettab',
//            disabled: true,
//            title: 'Attr+Attr set'
//        },
//        {
//            xtype: 'yeartab',
//            disabled: true,
//            title: 'Year'
//        },
//        {
//            xtype: 'areatemplatetab',
//            disabled: true,
//            title: 'Area template'
//        },
//        {
//            xtype: 'treetab',
//            disabled: true,
//            title: 'Tree'
//        },
//        {
//            xtype: 'layertemplatetab',
//            disabled: true,
//            title: 'Layer template',
//            hidden: true
//        },{
//            xtype: 'symbologytemplatetab',
//            disabled: true,
//            title: 'Symbology template',
//            hidden: true
//        },{
//            xtype: 'symbologytab',
//            disabled: true,
//            title: 'Symbology',
//            hidden: true
//        },
//        {
//            xtype: 'layerreftab',
//            disabled: true,
//            title: 'Layer ref'
//        },{
//            xtype: 'themetab',
//            disabled: true,
//            title: 'Theme'
//        }
    ];
        this.callParent();
    }
});

