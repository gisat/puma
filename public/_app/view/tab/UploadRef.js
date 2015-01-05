Ext.define('PumaMng.view.tab.UploadRef', {
    extend: 'Ext.form.Panel',
    alias: 'widget.uploadrefview',
    url: Config.url + '/api/upload/uploadRefTable',
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


