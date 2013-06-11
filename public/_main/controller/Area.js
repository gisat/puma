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
                }
                })
        this.areaMap = {};
        this.areaTemplates = [];
        this.areaTemplateMap = {};
        this.allAreas = {};
        this.lowestAreas = {}
    },
        
    getArea: function(at,gid) {
        return this.areaMap[at][gid]   
    },
    onBeforeSelect: function() {
        return false;
    },
    onItemClick: function(tree,rec,item,index,evt) {
        var selected = [{at:rec.get('at'),gid:rec.get('gid')}];
        var add = evt.ctrlKey;
        var hover = false;
        this.getController('Select').select(selected,add,hover);
    },
    onItemMouseEnter: function(tree,rec,item,index,evt) {
        if (!this.hovering) return;
        var selected = [{at:rec.get('at'),gid:rec.get('gid')}];
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
            if (!at) return;
            var gid = node.get('gid');
            var hasColor = selectMap[at] && selectMap[at][gid];
            if (!hasColor && oldCls!='') {
                node.data['cls'] = '';
                view.onUpdate(node.store,node);
            }
            
            if (hasColor && oldCls!='select_'+selectMap[at][gid]) {
                node.data['cls'] = 'select_'+selectMap[at][gid];
                view.onUpdate(node.store,node);
            }
        })
    },

      
    
    onBeforeLoad: function(store, options) {
        var node = options.node;
        
        var yearBtn = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0];
        var treeBtn = Ext.ComponentQuery.query('initialbar #treecontainer button[pressed=true]')[0];
        if (!treeBtn || !yearBtn) {
            return;
        }
        if (treeBtn.isTree) {
            options.params['tree'] = treeBtn.objId
            options.params['areaTemplate'] = node.get('at');
        }
        else {
            options.params['areaTemplate'] = treeBtn.objId
        }
        options.params['year'] = yearBtn.objId;
        var gid = node.get('gid');
        options.params['gid'] = gid!='root' ? gid : '';
        
        
    },
    onLoad: function(store,node,records) {
        for (var i=0;i<records.length;i++) {
            var rec = records[i];
            var at = rec.get('at');
            var gid = rec.get('gid');
            this.areaMap[at] = this.areaMap[at] || {};
            this.areaMap[at][gid] = rec;
        }
        
        
    },
        
    onNodeExpanded: function(node) {
        if (!node.isLoaded() || !node.childNodes.length) {
            return;
        }
        this.scanTree();
        this.getController('Chart').reconfigure();

    },
    onNodeCollapsed: function(node) {
        if (!node.isLoaded() || !node.get('at')) {
            return;
        }
        this.scanTree();
        this.getController('Chart').reconfigure();
        
    },
    scanTree: function() {
        var node = Ext.StoreMgr.lookup('area').getRootNode();
        var areaTemplates = [];
        
        var allMap = {};
        var lowestMap = {};
        var location = Ext.Ajax.extraParams ? Ext.Ajax.extraParams['location'] : null;
        node.cascadeBy(function(node) {
            var at = node.get('at');
            if (!at || !node.isVisible())
                return;
            Ext.Array.include(areaTemplates,at);
            var gid = node.get('gid');
            allMap[at] = allMap[at] || [];
            allMap[at].push(gid);
        })
        this.areaTemplates = areaTemplates;
        if (areaTemplates.length) 
        {
            var lastAreaTemplate = areaTemplates[areaTemplates.length-1];
            lowestMap[lastAreaTemplate] = Ext.Array.clone(allMap[lastAreaTemplate]);
        }
        this.getController('Map').updateGetFeatureControl();
        this.allMap = allMap;
        this.lowestMap = lowestMap;
        this.getController('Layers').checkVisibilityAndStyles(true,false);
        
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


