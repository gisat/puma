Ext.define('Puma.model.Area', {
    extend: 'Ext.data.TreeModel',
    fields: [

    'gid','name','tree','at','lr','initialized','extent','id','loc','joingid','filterAttrs','code'
    ],
    //idProperty: 'gid',
    proxy: {
        type: 'ajax',
        url : Config.url+'/api/theme/getThemeYearConf',
        reader: {
            type: 'json',
            root: 'data'
        }
    }
});


