Ext.define('PumaMain.view.CommonSaveForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.commonsaveform',
    frame: true,
    initComponent: function() {
        this.items = [{
            xtype: 'textfield',
            fieldLabel: 'Name',
            name: 'name',
            itemId: 'name',
            allowBlank: false
        }]
        this.buttons = [{
                text: 'Save',
                itemId: 'save'
            }]
        this.callParent();

    }
})

