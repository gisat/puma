Ext.define('PumaMng.view.form.Topic', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.topicform',
    requires: [],
    model: 'Topic',
    initComponent: function() {
        
        
        this.items = [{
            fieldLabel: 'Requires full ref.',
            xtype: 'checkbox',
            name: 'requiresFullRef',
            checked: false,
            defaultValue: false,
            itemId: 'requiresFullRef'
        }];

        this.callParent();
    }
})


