Ext.define('PumaMng.view.form.FeatureLayerTemplate', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.featurelayertemplateform',
    requires: [],
    
    model: 'AreaTemplate',
    initComponent: function() {
        
        this.width = 600;
        this.items = [{
                    xtype: 'checkbox',
                    hidden: true,
                    name: 'justVisualization',
                    value: false,
                    allowBlank: false,
                    fieldLabel: 'BBOX'
                }];

        this.callParent();
    }
})


