Ext.define('Puma.model.Area', {
    extend: 'Ext.data.TreeModel',
    fields: [

    'gid','name','tree','at','lr','initialized','extent','id','loc'
    ],
    //idProperty: 'gid',
    proxy: {
        type: 'ajax',
        url : Cnst.url+'/api/theme/getAreas',
        reader: {
            type: 'json',
            root: 'data'
        }
    }
});


