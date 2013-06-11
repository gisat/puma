Ext.define('PumaMng.controller.Tree',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
  
    init: function() {
        this.control({
            'treecontainer #treegrid' : {
                selectionchange: this.onSelectionChange
            },
            'treecontainer #fromLayerTemplate': {
                change: this.onFromLayerTemplateChange
            }
        })
    },
    
    onSelectionChange: function(model, selection) {
        var container = model.view.up('treecontainer');
        var levelForm = Ext.ComponentQuery.query('#levelform', container)[0];
        var levelGrid = Ext.ComponentQuery.query('#levelgrid', container)[0];
        levelForm.setDisabled(!selection.length);
        levelGrid.setDisabled(!selection.length);
        if (!selection.length) {
            levelForm.getForm().reset();
        }
    },
        
    onFromLayerTemplateChange: function(combo,value) {
//        var layerTemplateStore = Ext.StoreMgr.lookup('layertemplate');
//        var attrStore = Ext.StoreMgr.lookup('attribute4level');
//        var layerTemplate = layerTemplateStore.getById(value);
//        
//        
//        attrStore.clearFilter(true);
//        if (!layerTemplate) {
//            attrStore.filter([function() {return false;}]);
//            return;
//        }
//        var attrSetId = layerTemplate.get('attributeSet');
//        attrStore.filter([function(rec) {
//            return rec.get('attributeSet') == attrSetId;
//        }])
//        var attrField = Ext.ComponentQuery.query('treecontainer #parentAttribute')[0];
//        attrField.reset();
        
    }
})


