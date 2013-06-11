Ext.define('Puma.view.container.Common', {
    extend: 'Ext.container.Container',
    alias: 'widget.commoncontainer',
    frame: false,
    border: 0,
    requires: [],
    initComponent: function() {
        this.layout = {
            type: 'hbox',
            align: 'stretchmax',
            pack: 'center'
        }
        this.callParent();
    }
});

