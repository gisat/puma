Ext.define('PumaMng.view.tab.LayerLink' ,{
    extend: 'Ext.panel.Panel',
    alias : 'widget.layerlinktab',
    requires: ['PumaMng.view.form.LayerRef'],
    padding: 30,
    autoScroll: true,

    initComponent: function() {
        
        var grid = {
            xtype: 'grid',
            itemId: 'layerrefgrid',
            flex: 1,
            store: Ext.StoreMgr.lookup('blank'),
            columns: [{
                dataIndex: 'name',
                header: ''
            }],
            buttons: [{
                text: 'Delete',
                itemId: 'deletebtn'
            },{
                text: 'Copy',
                itemId: 'copybtn'
            },{
                text: 'Activate',
                itemId: 'activatebtn'
            }]
        }
        var submit = {
            xtype: 'container',
                    margin: 10,
            
            layout: {
                type: 'hbox',
                pack: 'center',
                align: 'stretch'
            },
            items: [{
                xtype: 'radiogroup',
                itemId: 'rowsFor',
                columns: 4,
                
                width: 450,
                items: [{
                    boxLabel: 'Location', name: 'rowsFor',inputValue: 'location',checked: true,
                },{
                    boxLabel: 'Year', name: 'rowsFor', inputValue:'year'
                },{
                    boxLabel: 'Layer template', name: 'rowsFor', inputValue:'areaTemplate'
                },{
                    boxLabel: 'Attribute set', name: 'rowsFor', inputValue:'attributeSet'
                }]
            },{
                xtype: 'button',
                itemId: 'submitbtn',
                text: 'Submit'
            }]
        }
        var selects = {
            xtype: 'container',
                    
                margin: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center',
                align: 'stretch'
            },
            items: [ {
                xtype: 'radiogroup',
                itemId: 'refType',
                columns: 3,
                width: 390,
                items: [{
                    boxLabel: 'Layer visualization', name: 'refType',inputValue: 'layer', checked: true
                },{
                    boxLabel: 'Layer analysis', name: 'refType', inputValue:'featurelayer'
                },{
                    boxLabel: 'Tables', name: 'refType', inputValue:'table'
                }]
            }]
        }
        
        var gridForms = {
            xtype: 'container',
            flex: 1
        }
        this.layout = {
            type: 'vbox',
            align: 'stretch',
            pack: 'center'
        }
        
        gridForms.layout = {
            type: 'hbox',
            align: 'stretch',
            pack: 'start'
        }
        gridForms.defaults = {
           flex: 1,
           //height: 350,
           margin: '0 30 0 0',
           padding: 5,
           frame: true
        }
        gridForms.items = [{
            xtype: 'grid',
            store: Ext.StoreMgr.lookup('location4layerref'),
            itemId: 'locationgrid',
            frame: true,
            columns: [{
                    dataIndex: 'name',
                    flex: 1,
                    header: 'Location'
            }],
            selModel: {
                mode: 'MULTI'
            }
        },{
            xtype: 'grid',
            store: Ext.StoreMgr.lookup('year4layerref'),
            itemId: 'yeargrid',
            frame: true,
            columns: [{
                    dataIndex: 'name',
                    flex: 1,
                    header: 'Year'
            }],
            selModel: {
                mode: 'MULTI'
            },
        },{
            xtype: 'grid',
            store: Ext.StoreMgr.lookup('areatemplate4layerref'),
            itemId: 'areatemplategrid',
            frame: true,
            columns: [{
                    dataIndex: 'name',
                    flex: 1,
                    header: 'Layer template'
            }],
            selModel: {
                mode: 'MULTI'
            },
        },{
            xtype: 'grid',
            store: Ext.StoreMgr.lookup('attributeset4layerref'),
            itemId: 'attributesetgrid',
            disabled: true,
            frame: true,
            columns: [{
                    dataIndex: 'name',
                    flex: 1,
                    header: 'Attribute set'
            }],
            selModel: {
                mode: 'MULTI'
            }
        },{
            xtype: 'layerrefform',
            disabled: true,
            autoScroll: true,
            margin: 0,
            flex: 2
        }]
        this.items = [selects, gridForms,submit,grid]
        this.callParent();
    }
})



