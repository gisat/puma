Ext.define('PumaMain.controller.Area', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                "#areatree": {
                    beforeselect: this.onBeforeSelect,
                    itemclick: this.onItemClick,
                    itemmouseenter: this.onItemMouseEnter,
                    itemexpand: this.onNodeExpanded,
                    itemcollapse: this.onNodeCollapsed
                },
                "chartbar chartcmp": {
                    beforeselect: this.onBeforeSelect,
                    itemclick: this.onItemClick,
                    itemmouseenter: this.onItemMouseEnter
                },
                '#areaslider':{
                    changecomplete: this.onSliderSlide,
                    beforechange: this.onBeforeSliderSlide
                }
                })
        this.areaMap = {};
        this.areaTemplates = [];
        this.areaTemplateMap = {};
        this.allAreas = {};
        this.lowestAreas = {};
        this.highestAreas = {};
        this.oldSliderVal = 0;
    },
    
    applyTestFilter: function(from,to) {
        
        this.areaFilter = {
            areaTemplates: {
                281: true
            },
            filters: [{
                as: 321,
                attr: 299,
                normType: 'area',
                min: from,
                max: to
            }]
        }
        if (from==null) {
            this.areaFilter = null;
        }
        this.getController('LocationTheme').onYearChange({itemId:'filter'})
    },        
            
            
    getArea: function(area) {
        var store = Ext.StoreMgr.lookup('area');
        var foundNode = store.getRootNode().findChildBy(function(node) {
            return (node.get('at')==area.at && node.get('loc')==area.loc && node.get('gid')==area.gid)
        },this,true);
        
        return foundNode
    },
    onBeforeSelect: function() {
        return false;
    },
        
    getExpandedAndFids: function() {
            var expanded = {};
            var fids = {};
            var root = Ext.StoreMgr.lookup('area').getRootNode();
            root.cascadeBy(function(node) {
                if (node==root) return;
                var loc = node.get('loc');
                var at = node.get('at');
                var gid = node.get('gid');
                if (node.isLoaded()) {
                    expanded[loc] = expanded[loc] || {};
                    expanded[loc][at] = expanded[loc][at] || [];
                    expanded[loc][at].push(gid);
                }
                fids[loc] = fids[loc] || {};
                fids[loc][at] = fids[loc][at] || [];
                fids[loc][at].push(gid);
            })
            return {expanded:expanded, fids: fids};
    },
    onItemClick: function(tree,rec,item,index,evt) {
        var selected = [{at:rec.get('at'),gid:rec.get('gid'),loc:rec.get('loc')}];
        var add = evt.ctrlKey;
        var hover = false;
        this.getController('Select').select(selected,add,hover);
    },
    onItemMouseEnter: function(tree,rec,item,index,evt) {
        if (!this.hovering) return;
        var selected = [{at:rec.get('at'),gid:rec.get('gid'),loc:rec.get('loc')}];
        var add = false;
        var hover = true;
        this.getController('Select').select(selected,add,hover);
    },
    
    
    
    colourTree: function(selectMap) {
        var areaTree = Ext.ComponentQuery.query('#areatree')[0];
        var view = areaTree.getView();
        areaTree.getRootNode().cascadeBy(function(node) {
            var oldCls = node.get('cls');
            var at = node.get('at');
            var loc = node.get('loc')
            if (!at || !loc) return;
            var gid = node.get('gid');
            var hasColor = selectMap[loc] && selectMap[loc][at] && selectMap[loc][at][gid];
            if (!hasColor && oldCls!='') {
                node.data['cls'] = '';
                view.onUpdate(node.store,node);
            }
            
            if (hasColor && oldCls!='select_'+selectMap[loc][at][gid]) {
                node.data['cls'] = 'select_'+selectMap[loc][at][gid];
                view.onUpdate(node.store,node);
            }
        })
    },
     
    onBeforeSliderSlide: function(slider,newVal,oldVal,opts) {
        console.log(newVal,slider.getValue())    
        if (opts.index>0 || newVal>slider.getValue()+1) return false;
    },
    
    onSliderSlide: function(slider,newVal) {
        var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
        var needLoad = false;
        var parentMap = {};
        
        var tree = Ext.ComponentQuery.query('#areatree')[0];
        tree.suspendEvents();
        areaRoot.cascadeBy(function(node) {
            var depth = node.get('depth');
            if (depth==newVal+1) {
                node.collapse(true);
            }
            if (depth==newVal) {
                if (node.loaded) {
                    node.expand();
                }
                else {
                    needLoad = true;
                    var loc = node.get('loc');
                    var at = node.get('at');
                    var gid = node.get('gid')
                    parentMap[loc] = parentMap[loc] || {};
                    parentMap[loc][at] = parentMap[loc][at] || {};
                    parentMap[loc][at][gid] = true;
                }
            }
        });
        tree.resumeEvents();    
        tree.view.refresh();
        if (needLoad) {
            
        }
        else {
            this.scanTree();  
        }
          
        
    },
        
    expandToLevel: function(level) {
        
    },
    
    collapseLowestLevel: function(level) {
        var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
        areaRoot.cascadeBy(function(node) {
            var depth = node.get('depth');
            
        })
        var tree = Ext.ComponentQuery.query('#areatree')[0];
        tree.resumeEvents();    
        tree.view.refresh();
        this.scanTree();
    },
      
    
    onBeforeLoad: function(store, options) {
        var node = options.node;
        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        var dataset = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        if (!years.length) {
            return;
        }
        if (this.areaFilter) {
            options.params['filter'] = JSON.stringify(this.areaFilter);
        }
        
        var gid = node.get('gid');
        var loc = node.get('loc');
        var at = node.get('at')
        var parentGids = {};
        parentGids[loc] = {};
        parentGids[loc][at] = [gid];
        options.params['refreshAreas'] = true;
        options.params['dataset'] = dataset;
        options.params['years'] = JSON.stringify(years);
        options.params['parentgids'] = JSON.stringify(parentGids)
    },
    onLoad: function(store,node,records) {
        for (var i=0;i<records.length;i++) {
            var rec = records[i];
            var at = rec.get('at');
            var gid = rec.get('gid');
            var loc = rec.get('loc');
            this.areaMap[loc] = this.areaMap[loc] || {};
            this.areaMap[loc][at] = this.areaMap[loc][at] || {};
            this.areaMap[loc][at][gid] = rec;
        }     
    },
        
    onNodeExpanded: function(node) {
        if (!node.isLoaded() || !node.childNodes.length) {
            return;
        }
        this.scanTree();
        this.getController('Chart').reconfigure();
        this.getController('Layers').reconfigureAll();

    },
    onNodeCollapsed: function(node) {
        if (!node.isLoaded() || !node.get('at')) {
            return;
        }
        this.scanTree();
        this.getController('Chart').reconfigure();
        this.getController('Layers').reconfigureAll();
    },
        
    getTreeLocations: function() {
        var locations = [];
        var locNodes = Ext.StoreMgr.lookup('area').getRootNode().childNodes;
        for (var i=0;i<locNodes.length;i++) {
            Ext.Array.include(locations,locNodes[i].get('loc'))
        }
        return locations;
    },
    scanTree: function() {
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        var areaTemplates = [];
        
        var allMap = {};
        var lowestMap = {};
        var lastMap = {};
        var highestMap = {};
        var parent = null;
        root.cascadeBy(function(node) {
            var at = node.get('at');
            var loc = node.get('loc')
            if (!at || !loc || !node.isVisible() || node==root)
                return;
            if (node.parentNode==root) {
                if (root.childNodes.length==1) {
                    parent = node;
                }
                else {
                    highestMap[loc] = highestMap[loc] || {}
                    highestMap[loc][at] = highestMap[loc][at] || [];
                    highestMap[loc][at].push(gid);
                }
            }
            if (parent && node.parentNode==parent) {
                highestMap[loc] = highestMap[loc] || {}
                highestMap[loc][at] = highestMap[loc][at] || [];
                highestMap[loc][at].push(gid);
            }
            Ext.Array.include(areaTemplates,at);
            var gid = node.get('gid');
            if (!node.isExpanded() || !node.hasChildNodes()) {
                lastMap[loc] = lastMap[loc] || {}
                lastMap[loc][at] = lastMap[loc][at] || [];
                lastMap[loc][at].push(gid);
            }
            allMap[loc] = allMap[loc] || {}
            allMap[loc][at] = allMap[loc][at] || [];
            allMap[loc][at].push(gid);
        })
        this.areaTemplates = areaTemplates;
        if (areaTemplates.length) 
        {
            var lastAreaTemplate = areaTemplates[areaTemplates.length-1];
            for (var loc in allMap) {
                if (!allMap[loc][lastAreaTemplate]) continue;
                
                lowestMap[loc] = lowestMap[loc] || {};
                lowestMap[loc][lastAreaTemplate] = Ext.Array.clone(allMap[loc][lastAreaTemplate]);
            }
        }
        this.getController('Map').updateGetFeatureControl();
        this.allMap = allMap;
        this.lowestMap = lowestMap;
        this.highestMap = highestMap;
        this.lastMap = lastMap;
        
        this.getController('Select').refreshSelection();
        this.getController('Layers').refreshOutlines();
        //this.getController('Layers').checkVisibilityAndStyles(true,false);
        
    },
    
    
    
    
    reinitializeTree: function(preserveSelection) {
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        
        root.removeAll(false);
        root.collapse();
        root.loaded = false;
        root.set('loaded',false);
        root.initialized = true;
        root.expand();
        //if (!preserveSelection) {
            this.getController('Select').clearSelections();
        //}
            
    }
});


