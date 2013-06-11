Ext.define('Puma.controller.Form',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
  
    init: function() {
        this.control({
            'commonform #savebtn': {
                click: this.onSave
            },
            'commonform #resetbtn': {
                click: this.onReset
            },
            'commonform #reloadbtn': {
                click: this.onReload
            },
            'commongrid #deletebtn': {
                click: this.onDelete
            },
            'commongrid #copybtn': {
                click: this.onCopy
            },
            'commongrid #createbtn': {
                click: this.onCreate
            },
            'commongrid': {
                selectionchange: this.onSelectionChange
            }
            
        })
    },
        
    
    onSave: function(btn) {
        var formCmp = btn.up('commonform')
        var form = formCmp.getForm();
        var rec = form.getRecord();
        
        var grid = formCmp.previousSibling('commongrid');
        // muze se stat ze pouzivame jiny nez commongrid, pak je potreba resit ukladani na jinem miste
        if (!grid && !formCmp.store) return;
        var store = grid ? grid.store : formCmp.store;
        var ret = true;
        if (!rec) {
            rec = Ext.create('Puma.model.'+formCmp.model,formCmp.modelDef || {});
            form.updateRecord(rec);
            ret = formCmp.fireEvent('beforesave',formCmp,rec)
            if (ret) {
                
                store.addWithSlaves(rec);
            }
            else {
                rec.destroy();
            }
                
        }
        else {
            form.updateRecord(rec);
            ret = formCmp.fireEvent('beforesave',formCmp,rec)
        }
        if (ret) {       
            rec.save({
                callback: function(record,operation) {
                    formCmp.fireEvent('aftersave',formCmp,record,operation)
                }
            });
        }
        
    },
        
    onReset: function(btn) {
        var formCmp = btn.up('form');
        formCmp.getForm().reset();
    },
        
    onReload: function(btn) {
        var formCmp = btn.up('form')
        var form = formCmp.getForm();
        var rec = form.getRecord();
        if (rec) {
            form.loadRecord(rec);
        }
    },
    
    onDelete: function(btn) {
        var container = btn.up('commongrid');
        var selected = container.getSelectionModel().getSelection();
        if (selected.length) {
            selected[0].destroy({
                callback: function(records,op) {
                    if (!op.success) {
                        if (!op.error.response.responseText) {
                            Ext.Msg.alert('Error','Undefined');
                            return;
                        }
                        var message = JSON.parse(op.error.response.responseText).message
                        message = message.replace(new RegExp('\n','g'),'<br/>');
                        Ext.Msg.alert('Error',message);
                    }
                }
            });
        }
    },
        
    onCopy: function(btn) {
        var grid = btn.up('commongrid');
        var form = grid.nextSibling('commonform')
        if (!form) return;
        form = form.getForm();
        form.copying = true;
        grid.getSelectionModel().deselectAll();
        form.copying = false;
        form.unbindRecord();
        
    },

    onCreate: function(btn) {
        var grid = btn.up('commongrid');
        var form = grid.nextSibling('commonform')
        if (!form) return;
        form = form.getForm();
        grid.getSelectionModel().deselectAll();
        form.unbindRecord();
    },
  
    
    onSelectionChange: function(model,selection) {
        var grid = model.view.up('commongrid')
        var form = grid.nextSibling('commonform')
        var deleteBtn = Ext.ComponentQuery.query('#deletebtn',grid)[0];
        var copyBtn = Ext.ComponentQuery.query('#copybtn',grid)[0];
        if (selection.length) {
            form = form.getForm();
            form.loadRecord(selection[0]);
            deleteBtn.enable();
            copyBtn.enable();
        }
        else {
            if (form) {
                form = form.getForm();
                form.unbindRecord();
                if (!form.copying) {
                    form.reset();
                }
            }
            
            deleteBtn.disable();
            copyBtn.disable();
        }
    }
   
});


