Ext.define('PumaMng.controller.Management',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMng.view.form.Attribute','PumaMng.view.form.LayerGroup','PumaMng.view.form.Theme','PumaMng.view.form.AttributeSet','PumaMng.view.form.FeatureLayerTemplate','PumaMng.view.form.LayerTemplate','PumaMng.view.form.Location','PumaMng.view.form.Scope','PumaMng.view.form.Symbology','PumaMng.view.form.Dataset','PumaMng.view.form.Topic','PumaMng.view.form.Year'],
  
    init: function() {
        this.control({
            'managementtab #objecttypegrid': {
                selectionchange: this.onObjectTypeSelected
            },
            'managementtab #getfromserverbtn': {
                click: this.onGetFromServer
            },
            'managementtab themeform #addlayerbtn': {
                click: this.onAddLayer
            },
            'managementtab themeform #removelayerbtn': {
                click: this.onRemoveLayer
            }
        })
    },
   
    onAddLayer: function(btn) {
        var grid = btn.up('grid');
        var sel = grid.getSelectionModel().getSelection();
        if (!sel || !sel.length)
            return;
        var recsToAdd = [];
        for (var i = 0; i < sel.length; i++) {
            var at = sel[i];
            var rec = Ext.create('Puma.model.LayerMap', {
                areaTemplate: at.get('_id')
            })
            recsToAdd.push(rec);
        }
        var addedGrid = Ext.ComponentQuery.query('managementtab themeform #addedgrid')[0]
        addedGrid.store.add(recsToAdd);

    },
    onRemoveLayer: function(btn) {
        var grid = btn.up('grid');
        var sel = grid.getSelectionModel().getSelection();
        grid.store.remove(sel);
    },
    
    onGetFromServer: function(btn) {
        debugger;
        Ext.Ajax.request({
            url: Config.url+'/api/layers/getSymbologiesFromServer',
            success: function(response) {
                Ext.StoreMgr.lookup('symbology').load()
            }
        })
    },
    
    onObjectTypeSelected: function(model,selection) {
        var objectsGrid = Ext.ComponentQuery.query('managementtab #objectgrid')[0];
        var form = objectsGrid.nextSibling();
        var parent = objectsGrid.ownerCt;
        if (!selection.length) {
            if (form) {
                parent.remove(form)
            }
            objectsGrid.reconfigure(Ext.StoreMgr.lookup('blank'));
            return;
        }
        if (form) {
            parent.remove(form)
        }
        var rec = selection[0];
        var type = rec.get('type');
        Ext.ComponentQuery.query('#getfromserverbtn',objectsGrid)[0].setVisible(type=='symbology');
        objectsGrid.reconfigure(Ext.StoreMgr.lookup(type+'mng'));
        parent.add({
            xtype: type+'form'
        })
    }
})


