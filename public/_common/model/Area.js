Ext.define('Puma.model.Area', {
    extend: 'Ext.data.TreeModel',
    fields: [

    'gid','name','tree','at','lr','initialized','extent'
    ],
    //idProperty: 'gid',
    proxy: {
        type: 'ajax',
        url : Cnst.url+'/api/layers/getAreas',
        reader: {
            type: 'json',
            root: 'data'
        }
    }
});


