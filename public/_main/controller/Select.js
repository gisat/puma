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
        debugger;
        if (!this.actualColor) return;
        if (this.task) {
            this.task.cancel();
        }
        this.task = new Ext.util.DelayedTask();
        this.task.delay(hover ? 100 : 1,this.selectInternal,this,arguments);
    },
        
    onToggleHover: function(btn,value) {
        var selectInMap = Ext.ComponentQuery.query('initialbar #selectinmapbtn')[0];
        var infoControls1 = this.getController('Map').map1.infoControls;
        var infoControls2 = this.getController('Map').map2.infoControls;
        this.getController('Area').hovering = value;
        this.getController('Chart').hovering = value;
        if (selectInMap.pressed && value) {
            infoControls1.hover.activate();
            infoControls2.hover.activate();
        }
        else {
            infoControls1.hover.deactivate();
            infoControls2.hover.deactivate();
        }
        if (this.hoverMap.length) {
            this.hoverMap = [];
            this.selectInternal([],true,false);
        }
        
    },
        
    onToggleSelectInMap: function(btn,value) {
        var hoverBtn = Ext.ComponentQuery.query('initialbar #hoverbtn')[0];
        var infoControls1 = this.getController('Map').map1.infoControls;
        var infoControls2 = this.getController('Map').map2.infoControls;
        var fn1 = value ? infoControls1.click.activate : infoControls1.click.deactivate;
        fn1.call(infoControls1.click);
        var fn2 = value ? infoControls2.click.activate : infoControls2.click.deactivate;
        fn2.call(infoControls2.click);
        if (hoverBtn.pressed && value) {
            infoControls1.hover.activate();
            infoControls2.hover.activate();
        }
        else {
            infoControls1.hover.deactivate();
            infoControls2.hover.deactivate();
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
                    return this.gid === b.gid && this.at === b.at && this.loc === b.loc
                }
            }
            newSel = areas;
        }
        else {
            for (var i=0;i<areas.length;i++) {
                areas[i].equals = function(b) {
                    return this.gid === b.gid && this.at === b.at && this.loc === b.loc
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
                clone[j].equals = clone[j].equals || function(b) {
                    return this.gid === b.gid && this.at === b.at && this.loc === b.loc
                }
                    
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
    
    refreshSelection: function() {
        var allMap = this.getController('Area').allMap;
        var changed = false;
        for (var color in this.selMap) {
            var selsToRemove = []
            for (var i=0;i<this.selMap[color].length;i++) {
                var sel = this.selMap[color][i];
                if (allMap[sel.loc] && allMap[sel.loc][sel.at] && Ext.Array.contains (allMap[sel.loc][sel.at],sel.gid)) {}
                else {
                    selsToRemove.push(sel);
                    changed = true;
                }
            }
            this.selMap[color] = Ext.Array.difference(this.selMap[color],selsToRemove);
        }
        if (changed) {
            this.colorMap = this.prepareColorMap();
//            this.getController('Area').colourTree(this.colorMap);
//            this.getController('Layers').colourMap(this.colorMap); 
        }
    },
    prepareColorMap: function() {
        var resultMap = {};
        for (var color in this.selMap) {
            var actual = this.selMap[color];
            for (var i=0;i<actual.length;i++) {
                var area = actual[i];
                resultMap[area.loc] = resultMap[area.loc] || {};
                resultMap[area.loc][area.at] = resultMap[area.loc][area.at] || {};
                resultMap[area.loc][area.at][area.gid] = color;               
            }
        }
        for (var i=0;i<this.hoverMap.length;i++) {
            var area = this.hoverMap[i];
            resultMap[area.loc] = resultMap[area.loc] || {};
            resultMap[area.loc][area.at] = resultMap[area.loc][area.at] || {};
            resultMap[area.loc][area.at][area.gid] = this.actualColor;
        }
        return resultMap;
    }
    
    
});

