Ext.define('Gisatlib.container.StoreContainer', {
    extend: 'Ext.container.Container',
    alias: 'widget.storecontainer',
    mixins: ['Ext.util.Bindable','Ext.form.field.Field'],
    initComponent: function() {
        if (this.store) {
            this.bindStore(this.store);
        }
        this.layout = {
            type: 'hbox'
        }
        this.defaults = {
            margin: '0 2 0 0'
        }
        this.displayField = this.displayField || 'name';
        this.valueField = this.valueField || '_id';
        this.type = this.type || 'button';
        this.callParent();
        this.addEvents('change');
    },
    
    getStoreListeners: function() {
        return {
            datachanged: this.refresh
        }
    },
    refresh: function() {
        var me = this;
        if (!me.store) {
            return;
        }
        var recs = this.store.getRange();
        var presentRecs = [];
        var cmpsToDelete = [];
        var cmpsToAdd = [];
        var changed = false;
        var containsPressed = false;
        
        this.items.each(function(cmp) {
            var value = me.type == 'button' ? cmp.pressed : cmp.value
            if (!Ext.Array.contains(recs,cmp.rec)) {
                cmpsToDelete.push(cmp);
                if (value) {
                    changed = true;
                }
            }
            else {
                presentRecs.push(cmp.rec);
                if (value) {
                    containsPressed = true;
                }
            }
        
        })
        for (var i=0;i<cmpsToDelete.length;i++) {
            this.remove(cmpsToDelete[i])
        }
        this.store.each(function(rec,i) {
            if (!Ext.Array.contains(presentRecs,rec)) {
                var cmp = me.createCmp(rec);
                me.insert(i,cmp)
            }
        })
        
        if (this.forceSelection && !containsPressed) {
            var cmp = this.items.getAt(0);
            if (cmp) {
                this.setCmpValue(cmp,true);
                changed = true;
                
            }
        }
        if (changed) {
            this.fireEvent('change',this,this.getValue());
        }
        
    },
    
    getValue: function() {
        var recs = this.getRecords();
        var ids = [];
        for (var i=0;i<recs.length;i++) {
            ids.push(recs[i].get(this.valueField))
        }
        return ids;
    },
    getRecords: function() {
        var recs = [];
        var me = this;
        this.items.each(function(cmp) {
            var value = me.type == 'button' ? cmp.pressed : cmp.value;
            if (value) {
                recs.push(cmp.rec)
            }
        })
        return recs;
    },
    setValue: function(value) {
        value = Ext.isArray(value) ? value : [value];
        var me = this;
        var changed = false;
        this.items.each(function(cmp) {
            var cmpValue = me.type == 'button' ? cmp.pressed : cmp.value;
            var desiredValue = Ext.Array.contains(value,cmp.rec.get(me.valueField));
            if (cmpValue!=desiredValue) {
                me.setCmpValue(cmp,desiredValue);
                changed = true;
            }
            
        })
        if (changed) {
            this.fireEvent('change',this,this.getValue());
        }
    },    
    
    
    createCmp: function(rec) {
        var cmp = null;
        var me = this;
        if (this.type=='button') {
            cmp = Ext.widget('button',{
                text: rec.get(this.displayField),
                rec: rec,
                enableToggle: true
            })
            cmp.on('toggle',me.onChange,me);
            cmp.onClick = function(e) {
                me.e = e;
                this.__proto__.onClick.apply(this,arguments)
            }
        }
        else {
            cmp = Ext.widget('checkbox',{
                boxLabel: rec.get('name'),
                rec: rec,
                inputValue: rec.get(this.valueField)
            })
            cmp.onBoxClick = function(e) {
                me.e = e;
                this.__proto__.onBoxClick.apply(this,arguments)
            }
            cmp.on('change',me.onChange,me);
        }
        return cmp;
    },
        
    setCmpValue: function(cmp,val) {
        cmp.suspendEvents();
        if (this.type=='button') {
            cmp.toggle(val);
        }
        else {
            cmp.setValue(val);
        }
        cmp.resumeEvents();
    },
        
    onChange: function(cmp,val) {
        var me = this;
        var changed = false;
        var multiValue = this.getValue();
        // single mode
        if ((!this.multi || (this.multiCtrl && !me.e.ctrlKey))) {
            // select just one item from already selected
            if (this.multi && !val && multiValue.length) {
                this.items.each(function(item) {
                    if (item == cmp) {
                        me.setCmpValue(item, true);
                    }
                    else {
                        me.setCmpValue(item, false);
                    }  
                })
                changed = true;
            } 
            // select unselected item
            else if (val) {
                this.items.each(function(item) {
                    if (item == cmp)
                        return;
                    me.setCmpValue(item, false);
                })
                changed = true;
            }
            // unselect last item
            else {
                me.setCmpValue(cmp, true);
            }

        }
        // multi mode
        else {
            
            if (!multiValue.length) {
                me.setCmpValue(cmp, true);
            }
            else {
                changed = true;
            }
        }
        if (changed) {
            this.fireEvent('change',this,this.getValue());
        }
        
    }
})


