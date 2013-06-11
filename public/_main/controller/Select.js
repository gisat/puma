Ext.define('PumaMain.controller.Select', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            'initialbar #hoverbtn': {
                toggle: this.onToggleHover
            },
            'initialbar #selectinmapbtn': {
                toggle: this.onToggleSelectInMap
            },
            'initialbar #selectcolorpicker': {
                select: this.onChangeColor
            }
        })
        this.selMap = {'FF0000':[]};
        this.colorMap = {};
        this.hoverMap = [];
        this.actualColor = 'FF0000';
    },
        
    select: function(areas,add,hover) {
        if (!this.actualColor) return;
        if (this.task) {
            this.task.cancel();
        }
        this.task = new Ext.util.DelayedTask();
        this.task.delay(hover ? 100 : 1,this.selectInternal,this,arguments);
    },
        
    onToggleHover: function(btn,value) {
        var selectInMap = Ext.ComponentQuery.query('initialbar #selectinmapbtn')[0];
        var infoControls = this.getController('Map').infoControls;
        this.getController('Area').hovering = value;
        this.getController('Chart').hovering = value;
        if (selectInMap.pressed && value) {
            infoControls.hover.activate();
        }
        else {
            infoControls.hover.deactivate();
        }
        if (this.hoverMap.length) {
            this.hoverMap = [];
            this.selectInternal([],true,false);
        }
        
    },
        
    onToggleSelectInMap: function(btn,value) {
        var hoverBtn = Ext.ComponentQuery.query('initialbar #hoverbtn')[0];
        var infoControls = this.getController('Map').infoControls;
        var fn = value ? infoControls.click.activate : infoControls.click.deactivate;
        fn.call(infoControls.click);
        if (hoverBtn.pressed && value) {
            infoControls.hover.activate();
        }
        else {
            infoControls.hover.deactivate();
        }
    },
    
    onChangeColor: function(picker,value) {
        this.actualColor = value;
        this.selMap[value] = this.selMap[value] || [];
        if (this.hoverMap.length) {
            this.hoverMap = [];
            this.selectInternal([],true,false);
        }
    },
    
    selectInternal: function(areas,add,hover) {
        if (!hover) {
            var sel = this.selMap[this.actualColor];
        }
        else {
            var sel = this.hoverMap;
        }
        var newSel = [];
        if (!add || hover) {
            
            areas = areas.concat([]);
            for (var i=0;i<areas.length;i++) {
                areas[i].equals = function(b) {
                    return this.gid === b.gid && this.at === b.at
                }
            }
            newSel = areas;
        }
        else {
            for (var i=0;i<areas.length;i++) {
                areas[i].equals = function(b) {
                    return this.gid === b.gid && this.at === b.at
                }
            }
            var diff = this.arrDifference(sel,areas);
            var add = this.arrDifference(areas,sel);
            newSel = Ext.Array.merge(diff,add);
        }
        var colorsToChange = [this.actualColor];
        // 
        for (var color in this.selMap) {
            if (color==this.actualColor) continue;
            var selLength = this.selMap[color].length;
            this.selMap[color] = this.arrDifference(this.selMap[color],newSel);
            if (this.selMap[color].length!=selLength) {
                colorsToChange.push(color);
            }
        }
        
        if (!hover) {
            this.selMap[this.actualColor] = newSel;
        }
        else {
            this.hoverMap = newSel;
        }
        this.colorMap = this.prepareColorMap();
        this.callControllers();         
    },
      
    // taken from Ext.Array
    arrDifference: function(arrayA, arrayB) {
        var clone = Ext.Array.slice(arrayA,0),
                ln = clone.length,
                i, j, lnB;
        for (i = 0, lnB = arrayB.length; i < lnB; i++) {
            for (j = 0; j < ln; j++) {
                //if (clone[j] === arrayB[i]) {
                if (clone[j].equals(arrayB[i])) {
                    Ext.Array.erase(clone, j, 1);
                    j--;
                    ln--;
                }
            }
        }

        return clone;
    },
        
    callControllers: function() {
        var selectMap = this.colorMap;
        this.getController('Area').colourTree(selectMap);
        this.getController('Layers').colourMap(selectMap); 
        this.getController('Chart').reconfigure(true);
    },
    clearSelections: function() {
        this.selMap = {'FF0000':[]};
        this.hoverMap = [];
        this.colorMap = {};
        this.callControllers();
    },
    
    
    prepareColorMap: function() {
        var resultMap = {};
        for (var color in this.selMap) {
            var actual = this.selMap[color];
            for (var i=0;i<actual.length;i++) {
                var area = actual[i];
                resultMap[area.at] = resultMap[area.at] || {};
                resultMap[area.at][area.gid] = color;               
            }
        }
        for (var i=0;i<this.hoverMap.length;i++) {
            var area = this.hoverMap[i];
            resultMap[area.at] = resultMap[area.at] || {};
            resultMap[area.at][area.gid] = this.actualColor;
        }
        return resultMap;
    }
    
    
        
    
    
    
});

