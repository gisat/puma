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
        var creating = false;
        if (formCmp.alwaysCreate) {
            rec = null;
        }
        if (!rec) {
            creating = true;
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
            if (formCmp.showPrecreateMsg) {
                Puma.util.Msg.msg('Record '+rec.get('name')+' '+(creating?'start creating':'start updating'),'');
            }
            rec.save({
                callback: function(record,op) {
                    if (!op.success) {
                        if (creating) {
                            rec.destroy();
                        }
                        if (op.error.response.timedout) {
                            Ext.Msg.alert('Warning','Timed out, process can still be running on server');
                            return;
                        }
                        if (!op.error.response.responseText) {
                            Ext.Msg.alert('Error','Undefined error');
                            return;
                        }
                        var message = JSON.parse(op.error.response.responseText).message
                        message = message.replace(new RegExp('\n','g'),'<br/>');
                        Ext.Msg.alert('Error',message);
                        return;
                    }
                    
                    formCmp.fireEvent('aftersave',formCmp,record,op);
                    if (rec.modelName == 'Puma.model.PerformedAnalysis') {
                        var analysis = Ext.StoreMgr.lookup('analysis').getById(rec.get('analysis'));
                        Puma.util.Msg.msg('Analysis '+analysis.get('name')+' started','');
                    }
                    else {
                        Puma.util.Msg.msg('Record '+rec.get('name')+' '+(creating?'created':'updated'),'');
                    }
                    
                    
                    //Ext.Msg.alert('Message','Record '+(creating?'created':'updated'));
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
                callback: function(record,op) {
                    if (!op.success) {
                        if (!op.error.response.responseText) {
                            Ext.Msg.alert('Error','Undefined');
                            return;
                        }
                        var message = JSON.parse(op.error.response.responseText).message
                        message = message.replace(new RegExp('\n','g'),'<br/>');
                        Ext.Msg.alert('Error',message);
                    }
                    else {
                        if (record.modelName == 'Puma.model.PerformedAnalysis') {
                            var analysis = Ext.StoreMgr.lookup('analysis').getById(record.get('analysis'));
                            Puma.util.Msg.msg('Analysis '+analysis.get('name')+' deleted','');
                        }
                        else {
                            Puma.util.Msg.msg('Record '+record.get('name')+' deleted','');
                            
                        }
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
        //form.unbindRecord();
        form.copying = false;
        
        
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
                form.unselecting = true;
                form.unbindRecord();
                form.unselecting = false;
                if (!form.copying) {
                    form.reset();
                }
            }
            
            deleteBtn.disable();
            copyBtn.disable();
        }
    }
   
});


