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
    enableQuickTips: false,
    requires: [],
    launch: function() {
         Ext.define('User', {
     extend: 'Ext.data.Model',
     fields: [
         {name: 'id', type: 'int'},
         {name: 'text',  type: 'string'}
     ]
 });
        
        Ext.widget('combobox',{
            store: Ext.create('Ext.data.Store',{
                field: ['id','text'],
                model: 'User',
                proxy: 'memory',
                data: [{id:1,text:'A'},{id:2,text:'B'}]
            }),
            valueField: 'id',
            displayField: 'text',
            renderTo:'rendering',
            width: 200,
            height: 50
        })
    }
});


