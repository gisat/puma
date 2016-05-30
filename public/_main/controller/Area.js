Ext.define('PumaMain.controller.Area', {
	extend: 'Ext.app.Controller',
	views: [],
	requires: [],
	init: function() {
		this.control({
			"#areatree": {
				beforeselect: this.onBeforeSelect,
				itemclick: this.onItemClick,
				itemmouseenter: this.onItemMouseEnter,
				itemexpand: this.onNodeExpanded,
				itemcollapse: this.onNodeCollapsed
			},
			'#areatree #areacollapse': {
				click: this.onCollapseAll
			},
			"chartbar chartcmp": {
				beforeselect: this.onBeforeSelect,
				itemclick: this.onItemClick,
				itemmouseenter: this.onItemMouseEnter
			},
			'#areaslider':{
				changecomplete: this.onSliderSlide,
				beforechange: this.onBeforeSliderSlide
			},
			'#areamoredetails':{
				click: this.onShowMoreDetailed
			},
			'#arealessdetails':{
				click: this.onShowLessDetailed
			}
		});
		this.areaMap = {};
		this.areaTemplates = [];
		this.areaTemplateMap = {};
		this.allAreas = {};
		this.lowestAreas = {};
		this.highestAreas = {};
		this.oldSliderVal = 0;
		//this.filterActive = true;
	},
   
		
		
	getLocationObj: function() {
		var locObjId =  Ext.ComponentQuery.query('#sellocation')[0].getValue();
		var rec = Ext.StoreMgr.lookup('location4init').getById(locObjId);
		return {
			location: rec ? rec.get('location') : null,
			locGid: rec ? rec.get('locGid') : null,
			at: rec ? rec.get('at') : null,
			bbox: rec ? rec.get('bbox') : null,
			obj: rec
		};
	},
	
	onShowMoreDetailed: function() {
		var toExpand = {};
		var needQuery = false;
		var needChange = false;
		this.getController('DomManipulation').activateLoadingMask();
		var tree = Ext.ComponentQuery.query('#areatree')[0];
		tree.suspendEvents();
		var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
		
		var lastAt = null;
		for (var loc in this.lowestMap) {
			for (var at in this.lowestMap[loc]) {
				lastAt = at;
				break;
			}
			break;
		}
		if (!lastAt) {
			this.getController('DomManipulation').deactivateLoadingMask();
			return;
		}
		areaRoot.cascadeBy(function(node) {
			var at = node.get('at');
			if (node.get('leaf') || at!=lastAt || !node.parentNode.get('expanded')) return;
			needChange = true;
			if (!node.get('loaded')) {
				node.set('loaded',true);
				var loc = node.get('loc');
				var gid = node.get('gid');
				toExpand[loc] = toExpand[loc] || {};
				toExpand[loc][at] = toExpand[loc][at] || [];
				toExpand[loc][at].push(gid);
				needQuery = true;
			}
			node.suppress = true;
			node.expand();
			node.suppress = false;
		});
		tree.resumeEvents();
		
		if (needQuery) {
			this.detailLevelParents = toExpand;
			this.getController('LocationTheme').onYearChange({itemId:'detaillevel'});
			this.detailLevelParents = null;
			
		} else if (needChange) {
			this.scanTree();
			this.getController('DomManipulation').deactivateLoadingMask();
			this.getController('Chart').reconfigureAll();
			this.getController('Layers').reconfigureAll();
		} else {
			this.getController('DomManipulation').deactivateLoadingMask();
		}
		
	},
   
		
	onShowLessDetailed: function() {
		
		var nodesToCollapse = [];
		var tree = Ext.ComponentQuery.query('#areatree')[0];
		tree.suspendEvents();
		var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
		var lastAt = null;
		for (var loc in this.lowestMap) {
			for (var at in this.lowestMap[loc]) {
				lastAt = at;
				break;
			}
			break;
		}
		if (!lastAt) {
			return;
		}

		this.getController('DomManipulation').activateLoadingMask();
		areaRoot.cascadeBy(function(node) {
			var at = node.get('at');
			if (at!=lastAt || !node.parentNode.get('expanded') || !node.parentNode.get('gid')){
				return;
			}
			nodesToCollapse.push(node.parentNode);
		});
		for (var i=0;i<nodesToCollapse.length;i++) {
			nodesToCollapse[i].suppress = true;
			nodesToCollapse[i].collapse();
			nodesToCollapse[i].suppress = false;
		}
		tree.resumeEvents();
		if (nodesToCollapse.length) {
			this.afterCollapse(tree);
			this.getController('DomManipulation').deactivateLoadingMask();
		} else {
			this.getController('DomManipulation').activateLoadingMask();
		}
	},

	onCollapseAll: function() {
		var tree = Ext.ComponentQuery.query('#areatree')[0];
		tree.suspendEvents();
		var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
		var nodes = areaRoot.childNodes;
		for (var i=0;i<nodes.length;i++) {
			nodes[i].suppress = true;
			nodes[i].collapse();
			nodes[i].suppress = false;
		}
		tree.resumeEvents();
		this.afterCollapse(tree);
	},

	afterCollapse: function(tree) {
		tree.view.refresh();
		this.scanTree();
		var selController = this.getController('Select');
		this.colourTree(selController.colorMap);
		this.getController('Layers').colourMap(selController.colorMap);
		this.getController('Chart').reconfigureAll();
		this.getController('Layers').reconfigureAll();
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
		};
		if (from==null) {
			this.areaFilter = null;
		}
		this.getController('LocationTheme').onYearChange({itemId:'filter'});
	},

	zoomToLocation: function() {
		var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
		var locObj = this.getLocationObj();
		var loc = locObj.location;
		if (locObj.bbox){
			var bounds = new OpenLayers.Bounds(locObj.bbox.split(","))
			bounds = bounds.transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"));
			this.getController('Map').zoomToExtent(bounds);
			return;
		}
		var locGid = locObj.locGid;
		var areas = [];
		for (var i=0;i<areaRoot.childNodes.length;i++) {
			var node = areaRoot.childNodes[i];
			if (!loc || (node.get('loc')==loc && node.get('gid')==locGid)) {
				areas.push(node);
			}
		}
		if (areas.length) {
			this.getController('Map').onZoomSelected(null,areas);
		}
	},
			
	getArea: function(area) {
		var store = Ext.StoreMgr.lookup('area');
		var foundNode = store.getRootNode().findChildBy(function(node) {
			return (node.get('at')==area.at && node.get('loc')==area.loc && node.get('gid')==area.gid);
		},this,true);
		return foundNode;
	},

	onBeforeSelect: function() {
		return false;
	},
		
	getExpandedAndFids: function() {
			var expanded = {};
			var loaded = {};
			var fids = {};
			var root = Ext.StoreMgr.lookup('area').getRootNode();
			root.cascadeBy(function(node) {
				if (node==root) return;
				var loc = node.get('loc');
				var at = node.get('at');
				var gid = node.get('gid');
				if (node.isLoaded()) {
					loaded[loc] = loaded[loc] || {};
					loaded[loc][at] = loaded[loc][at] || [];
					loaded[loc][at].push(gid);
				}
				if (node.isExpanded()) {
					expanded[loc] = expanded[loc] || {};
					expanded[loc][at] = expanded[loc][at] || [];
					expanded[loc][at].push(gid);
				}
				fids[loc] = fids[loc] || {};
				fids[loc][at] = fids[loc][at] || [];
				fids[loc][at].push(gid);
			});
			return {expanded:expanded, fids: fids, loaded: loaded};
	},

	onItemClick: function(tree,rec,item,index,evt) {
		var selected = [{at:rec.get('at'),gid:rec.get('gid'),loc:rec.get('loc')}];
		var add = evt.ctrlKey;
		var hover = false;
		if (tree.xtype=='gridview') {
			this.getController('Select').fromChart = true;
		}
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
			var loc = node.get('loc');
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
		});
	},
	 
	onBeforeLoad: function(store, options) {
		var node = options.node;
		var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
		var dataset = Ext.ComponentQuery.query('#seldataset')[0].getValue();
		if (!years || !years.length) {
			return;
		}
		if (this.areaFilter) {
			options.params['filter'] = JSON.stringify(this.areaFilter);
		}

		var gid = node.get('gid');
		var loc = node.get('loc');
		var at = node.get('at');
		var parentGids = {};
		parentGids[loc] = {};
		parentGids[loc][at] = [gid];
		options.params['refreshAreas'] = true;
		options.params['dataset'] = dataset;
		options.params['years'] = JSON.stringify(years);
		options.params['parentgids'] = JSON.stringify(parentGids);
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
		if (!node.isLoaded() || !node.childNodes.length || node.suppress) {
			return;
		}
		this.scanTree();
		var locThemeController = this.getController('LocationTheme');
		if (locThemeController.locationChanged) {
			this.zoomToLocation();
			var selController = this.getController('Select');
			this.colourTree(selController.colorMap);
			this.getController('Layers').colourMap(selController.colorMap); 
			locThemeController.locationChanged = false;
		}
		this.getController('Chart').reconfigure('expand');
		this.getController('Layers').reconfigureAll();


	},
	onNodeCollapsed: function(node) {
		if (!node.isLoaded() || !node.get('at') || node.suppress) {
			return;
		}
		this.scanTree();
		var selController = this.getController('Select');
		this.colourTree(selController.colorMap);
		this.getController('Layers').colourMap(selController.colorMap); 
		this.getController('Chart').reconfigure('expand');
		this.getController('Layers').reconfigureAll();
	},

	getTreeLocations: function() {
		var locations = [];
		var locNodes = Ext.StoreMgr.lookup('area').getRootNode().childNodes;
		for (var i=0;i<locNodes.length;i++) {
			Ext.Array.include(locations,locNodes[i].get('loc'));
		}
		return locations;
	},
	scanTree: function() {
		var me = this;

		var root = Ext.StoreMgr.lookup('area').getRootNode();
		var areaTemplates = [];
		var leafMap = {};
		var allMap = {};
		var lowestMap = {};
		var lastMap = {};
		var highestMap = {};
		var parent = null;
		var lowestCount = 0;
		var containsLower = false;
		var lowestNoLeafs = true;
		var locObj = this.getLocationObj();
		var changeLocToCustom = false;
		var atLeastOneLoc = false;
		var maxDepth = 0;
		this.placeNode = null;
		root.cascadeBy(function(node) {
			var at = node.get('at');
			var loc = node.get('loc');
			if (!at || !loc || !node.isVisible() || node==root){
				return;
			}
			
			var depth = node.getDepth();
			maxDepth = Math.max(depth,maxDepth);
			if (node.parentNode==root) {
				if (root.childNodes.length==1) {
					parent = node;
				} else {
					highestMap[loc] = highestMap[loc] || {};
					highestMap[loc][at] = highestMap[loc][at] || [];
					highestMap[loc][at].push(gid);
				}
				if (node.isExpanded()) {
					if (at!=locObj.at || loc!=locObj.location || (!node.get('definedplace') && node.get('gid')!=locObj.locGid)) {
						if (locObj.obj && locObj.obj.get('dataset')) {
							changeLocToCustom = true;
						}
					} else {
						me.placeNode = node;
						atLeastOneLoc = true;
					}
				}
				if (node.isLeaf() && at==locObj.at && loc==locObj.location && (node.get('definedplace') || node.get('gid')==locObj.locGid)) {
					me.placeNode = node;
					atLeastOneLoc = true;
				}

			} else {
				containsLower = true;
			}
			if (parent && node.parentNode==parent) {
				highestMap[loc] = highestMap[loc] || {};
				highestMap[loc][at] = highestMap[loc][at] || [];
				highestMap[loc][at].push(gid);
			}
			Ext.Array.include(areaTemplates,at);
			var gid = node.get('gid');
			if (!node.isExpanded() || !node.hasChildNodes()) {
				lastMap[loc] = lastMap[loc] || {};
				lastMap[loc][at] = lastMap[loc][at] || [];
				lastMap[loc][at].push(gid);
			}
			allMap[loc] = allMap[loc] || {};
			allMap[loc][at] = allMap[loc][at] || [];
			allMap[loc][at].push(gid);
			if (!node.isLeaf()) {
				leafMap[loc] = leafMap[loc] || {};
				leafMap[loc][at] = false;
			}
		});
		if (this.initialized && (changeLocToCustom || !atLeastOneLoc)) {
			var locStore = Ext.StoreMgr.lookup('location4init');
			var customRec = locStore.getById('custom');
			if (!customRec) {
				//customRec = new (locStore.model)({id:'custom',name:'Custom'});
				//locStore.add(customRec);
			}
			Ext.ComponentQuery.query('#sellocation')[0].setValue('Custom');
		}
		this.initialized = true;
		this.areaTemplates = areaTemplates;
		if (areaTemplates.length) {
			var lastAreaTemplate = areaTemplates[areaTemplates.length-1];
			
			for (var loc in allMap) {
				if (!allMap[loc][lastAreaTemplate]){
					continue;
				}
				lowestCount += allMap[loc][lastAreaTemplate].length;
				lowestMap[loc] = lowestMap[loc] || {};
				lowestMap[loc][lastAreaTemplate] = Ext.Array.clone(allMap[loc][lastAreaTemplate]);
				if (leafMap[loc] && leafMap[loc][lastAreaTemplate]===false) {
					lowestNoLeafs = false;
				}
			}
		}
		this.getController('Map').updateGetFeatureControl();
		this.lowestCount = lowestCount;
		this.allMap = allMap;
		this.lowestMap = lowestMap;
		this.highestMap = highestMap;
		this.lastMap = lastMap;
		var selPlaceObj = this.getLocationObj().obj;
		var selPlace = selPlaceObj ? selPlaceObj.get('id') : null;
		var showMore = Ext.ComponentQuery.query('#areamoredetails')[0];
		var showLess = Ext.ComponentQuery.query('#arealessdetails')[0];
		
		showMore.setDisabled(lowestCount>100 || (lowestNoLeafs && areaTemplates.length>1) || !Object.keys(leafMap).length);
		showLess.setDisabled(!containsLower || (selPlace && maxDepth<3));
  
		var selMap = this.getController('Select').selMap;
		var outerCount = 0;
		var overallCount = 0;
		for (var color in selMap) {
			var objsToRemove = [];
			for (var i=0;i<selMap[color].length;i++) {
				var obj = selMap[color][i];
				overallCount++;
				
				if (lowestMap[obj.loc] && lowestMap[obj.loc][obj.at] && Ext.Array.contains(lowestMap[obj.loc][obj.at],obj.gid)) {
				} else if (allMap[obj.loc] && allMap[obj.loc][obj.at] && Ext.Array.contains(allMap[obj.loc][obj.at],obj.gid)) {
					outerCount++;
				} else {
					Ext.Array.include(objsToRemove,obj);
				}
			}
			selMap[color] = Ext.Array.difference(selMap[color],objsToRemove);
		}
		this.getController('Select').prepareColorMap();
		this.getController('Select').overallCount = overallCount;
		this.getController('Select').outerCount = outerCount;
		if (overallCount==0) {
			this.getController('Select').switchToAllAreas();
		}
		var onlySel = Ext.ComponentQuery.query('#areapager #onlySelected')[0].pressed;
		var count = onlySel ? (overallCount) : (lowestCount+outerCount);
		Ext.StoreMgr.lookup('paging').setCount(count);
		
		this.getController('Layers').refreshOutlines();
		this.getController('Filter').reconfigureFiltersCall();
		
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


