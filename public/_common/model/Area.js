Ext.define('Puma.model.Area', {
    extend: 'Ext.data.TreeModel',
    fields: [

    'gid','name','tree','at','lr','initialized','extent','id','loc','definedplace'
    ],
    //idProperty: 'gid',
    proxy: {
        type: 'ajax',
        actionMethods: {create: 'POST', read: 'POST', update: 'POST', destroy: 'POST'},
        url : Config.url+'/api/theme/getThemeYearConf',
        reader: {
            type: 'json',
            root: 'data'
        }
    }
});


