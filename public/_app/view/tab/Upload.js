Ext.define('PumaMng.view.tab.Upload', {
    extend: 'Ext.form.Panel',
    alias: 'widget.uploadview',
    url: Config.url + '/api/upload/uploadTable',
    frame: true,
    padding: 10,
    width: 600,
    initComponent: function() {
        this.items = [{
            xtype: 'filefield',
            name: 'file',
            allowBlank: false,
            width: 550,
            fieldLabel: 'File'
        },{
            xtype: 'textfield',
            name: 'tablename',
             width: 550,
            allowBlank: false,
            fieldLabel: 'Table name'
        }];
        this.buttons = [{
            text: 'Submit',
            formBind: true,
            handler: function(){
                this.up('form').getForm().submit();
            }
        }]
        this.callParent();
        
    }
})


