Ext.define('Gisatlib.slider.DiscreteTimeline', {
    extend: 'Ext.slider.Multi',
    alias: 'widget.discretetimeline',
    requires: ['Gisatlib.slider.DiscreteThumb'],
    mixins: ['Ext.util.Bindable','Ext.form.field.Field'],
    clickToChange: false,
    initComponent: function() {
        this.fieldSubTpl[0] = '<div class="timeline-labels"></div>'+this.fieldSubTpl[0];
        
        
        this.displayField = this.displayField || 'name';
        this.valueField = this.valueField || '_id';
        
        this.callParent();
        if (this.store) {
            this.bindStore(this.store);
        }
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
        
        var value = this.getValue();
        var presentValues = this.store.collect(this.valueField);
        var newValues = Ext.Array.intersect(value,presentValues);
        if (!newValues.length && !this.allowBlank) {
            newValues.push(presentValues[presentValues.length-1]);
        }
        var years = this.store.collect(this.displayField);
        years = Ext.Array.map(years,function(v) {
            return parseInt(v);
        })
        years = Ext.Array.sort(years);
        //this.setVisible(years.length>0);
        if (years.length<1) return;
        var min = years[0];
        var max = years[years.length-1];
        var valOffset = (max-min)*0.09;
        this.setMinValue(years.length>1 ? years[0]-valOffset : years[0]-1);
        this.setMaxValue(years.length>1 ? years[years.length-1]+valOffset : years[0]+1);
        this.syncThumbCount(years);
        
        var valueChanged = Ext.Array.difference(value,newValues).length || Ext.Array.difference(newValues,value).length
        this.setValue(newValues,!valueChanged);
        //Ext.slider.Multi.prototype.setValue.call(this,years);
        window.setTimeout(function() {
            me.updateLabels();
        },1)
        
        
        
//        labelEl.setHTML(value);
//        var offset = 0;
//        
//        labelEl.alignTo(thumb.el,"b-t",[0,0]);
//        if (isFirst && labelEl.dom.offsetLeft<2) {
//            offset = 2 - labelEl.dom.offsetLeft
//        }
//        else if (labelEl.dom.offsetParent && labelEl.dom.offsetLeft+labelEl.dom.offsetWidth>labelEl.dom.offsetParent.offsetWidth-2){
//            offset = -(labelEl.dom.offsetLeft+labelEl.dom.offsetWidth-labelEl.dom.offsetParent.offsetWidth+2);
//        }
//        if (offset) {
//            labelEl.alignTo(thumb.el,"b-t",[offset,0]);   
//        }
        
    },
    syncThumbCount: function(values) {
        var thumbCount = this.thumbs.length
        for (var i=0;i<thumbCount;i++) {
            var thumb = this.thumbs[i];
            if (thumb.labelEl) thumb.labelEl.destroy();
            thumb.el.destroy();
        }
        this.thumbs = [];
        for (var i=0;i<values.length;i++) {
            this.addThumb(values[i]);
        }

    },
        
    addThumb: function(value) {
        if (!this.store || !this.store.isStore) {
            return;
        }
        
        var rec = this.store.findRecord(this.displayField,value);
        var recValue = rec ? rec.get(this.valueField) : null;
        
        var me = this,
            thumb = new Gisatlib.slider.DiscreteThumb({
                ownerCt     : me,
                ownerLayout : me.getComponentLayout(),
                value       : value,
                recValue    : recValue,
                slider      : me,
                index       : me.thumbs.length,
                constrain   : me.constrainThumbs,
                disabled    : !!me.readOnly
            });

        me.thumbs.push(thumb);
        //render the thumb now if needed
        if (me.rendered) {
            thumb.render();
        }

        return thumb;
    },
        
    updateLabels: function() {
        var cont = this.el.down('.timeline-labels');
        cont.update('');
        for (var i=0;i<this.thumbs.length;i++) {
            var thumb = this.thumbs[i];
            var labelEl = Ext.get(Ext.DomHelper.createDom({cls:'timeline-label',tag:'span',html:thumb.value}));
            cont.appendChild(labelEl);
            var offset = 0;
        
            labelEl.alignTo(thumb.el,"b-t",[0,0]);
            if (i==0 && labelEl.dom.offsetLeft<2) {
                offset = 2 - labelEl.dom.offsetLeft
            }
            else if (labelEl.dom.offsetParent && labelEl.dom.offsetLeft+labelEl.dom.offsetWidth>labelEl.dom.offsetParent.offsetWidth-2){
                offset = -(labelEl.dom.offsetLeft+labelEl.dom.offsetWidth-labelEl.dom.offsetParent.offsetWidth+2);
            }
            if (offset) {
                labelEl.alignTo(thumb.el,"b-t",[0,0]);   
            }
            thumb.labelEl = labelEl;
        }
    },
    
    getValue: function() {
        var value = [];
        for (var i=0;i<this.thumbs.length;i++) {
            var thumb = this.thumbs[i];
            if (thumb.el && thumb.el.hasCls(Ext.baseCSSPrefix + 'slider-thumb-drag')) {
                value.push(thumb.recValue);
            }
        }
        return value;
    },
    setValue: function(value,disableChange) {
        value = Ext.isArray(value) ? value : [value];
        var changed = false;
        for (var i=0;i<this.thumbs.length;i++) {
            var thumb = this.thumbs[i];
            if (Ext.Array.contains(value,thumb.recValue)) {
                thumb.el.addCls(Ext.baseCSSPrefix + 'slider-thumb-drag');
                changed = true;
            }
            else {
                thumb.el.removeCls(Ext.baseCSSPrefix + 'slider-thumb-drag');
                changed = true;
            }
            
        }
        
        if (!disableChange) {
            this.fireEvent('change',this,this.getValue());
        }
        return value;
    },  
    
    
})


