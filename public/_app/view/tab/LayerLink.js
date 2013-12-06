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
            store: Ext.create('Ext.data.Store',{
                    fields: ['location','year','areaTemplate','value','value2']
                }),
            columns: [{
                dataIndex: 'value',
                width: 250,
                maxWidth: 1500,
                header: 'Layer'
            },{
                dataIndex: 'value2',
                flex: 1,
                header: 'Attribute set'
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
                xtype: 'displayfield',
                value: 'Dataset:',
                margin: '0 5 0 0'
            },{
                xtype: 'pumacombo',
                itemId: 'dataset',
                margin: '0 10 0 0',
                store: Ext.StoreMgr.lookup('activedataset')
            },{
                xtype: 'displayfield',
                value: 'Location:',
                margin: '0 5 0 0'
            },{
                xtype: 'pumacombo',
                itemId: 'location',
                disabled: true,
                margin: '0 10 0 0',
                store: Ext.StoreMgr.lookup('location4layerref')
            },{
                xtype: 'displayfield',
                value: 'Theme:',
                margin: '0 5 0 0'
            },{
                xtype: 'pumacombo',
                itemId: 'theme',
                disabled: true,
                margin: '0 10 0 0',
                store: Ext.StoreMgr.lookup('theme4layerref')
            },{
                xtype: 'displayfield',
                value: 'Year:',
                margin: '0 5 0 0'
            },{
                xtype: 'pumacombo',
                itemId: 'year',
                disabled: true,
                margin: '0 10 0 0',
                store: Ext.StoreMgr.lookup('year4layerref')
            },{
                xtype: 'button',
                itemId: 'submitbtn',
                text: 'Submit'
            }]
        }
        
        var gridForms = {
            xtype: 'container',
            margin: '0 0 30 0'
        }
        this.layout = {
            type: 'vbox',
            align: 'stretch',
            pack: 'center'
        }
        
        gridForms.layout = {
            type: 'hbox',
            align: 'stretch',
            pack: 'center'
        }
        gridForms.defaults = {
           //flex: 1,
           //height: 350,
           //margin: '0 30 0 0',
           padding: 5,
           frame: true
        }
        gridForms.items = [{
            xtype: 'layerrefform',
            disabled: true,
            width: 550,
            autoScroll: true,
            margin: 0
        }]
        this.items = [selects, gridForms,grid];
        
        this.callParent();
    }
})



