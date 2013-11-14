Ext.define('PumaMain.controller.DomManipulation', {
	extend: 'Ext.app.Controller',
	views: [],
	requires: [],
	init: function() {
		if (Config.exportPage) {
			return;
		}
		$("#sidebar-reports-toggle").on("click", $.proxy(this._onSidebarToggleClick, this));
		$(window).on("resize", $.proxy(this._onWindowResize, this))
		this.control({
			"toolspanel panel" : {
				resize   : this.onToolPanelResize,
				expand   : this.onToolPanelExpand,
				collapse : this.onToolPanelCollapse
			}
		});
		this.resizeMap();
		this.resizeSidebars();
	},
	
	onToolPanelResize: function(panel) {
		this.resizeTools();
	},
	
	onToolPanelExpand: function(panel) {
		this.resizeTools();
	},
	
	onToolPanelCollapse: function(panel) {
		this.resizeTools();
	},
	
	renderApp: function() {
		$("body").removeClass("intro").addClass("application");
		this.resizeMap();
		this.resizeSidebars();
	},
	
	renderIntro: function() {
		// zatim neni potreba
	},
	
	resizeMap: function() {
		var availableSize = this.getContentAvailableSize();
		
		var w  = availableSize.width;
		var h  = availableSize.height;
		var sl = $("#sidebar-reports").position().left;
		
		if ($("body").hasClass("application") && sl > 0) {
			w = sl;
		}
		
		$("#map-holder").css({width : w, height : h});
		
		var map = Ext.ComponentQuery.query('#map')[0];
		var map2 = Ext.ComponentQuery.query('#map2')[0];
		if (map) {
			this.getController('Map').onResize(map);
		}
		if (map2) {
			this.getController('Map').onResize(map2);
		}
	},
	
	resizeSidebars: function() {
		this.resizeTools();
		this.resizeReports();
	},
	
	resizeTools: function() {
		var availableSize = this.getContentAvailableSize();
		var accordeonMaxH = availableSize.height - $("#app-tools-actions").outerHeight(true) - $("#sidebar-tools-colors").outerHeight(true);
		
		$("#sidebar-tools").css("max-height", availableSize.height);
		$("#app-tools-accordeon").css("max-height", "none");
		$("#app-tools-accordeon").css("max-height", accordeonMaxH);
	},
	
	resizeReports: function() {
		var availableSize = this.getContentAvailableSize();
		$("#sidebar-reports").height(availableSize.height);
		$("#app-reports-accordeon").height(availableSize.height - $("#app-reports-paging").outerHeight(true));
	},
	
	activateMapSplit: function() {
		$("#map-holder").addClass("split");
		this.resizeMap();
	},
	
	deactivateMapSplit: function() {
		$("#map-holder").removeClass("split");
		this.resizeMap();
	},
	
	getContentAvailableSize: function() {
		var w  = $(window).width();
		var h  = $(window).height() - $("#header").outerHeight(true) - $("#footer").outerHeight(true);
		
		if ($("body").hasClass("application")) {
			h -= $("#toolbar").outerHeight(true);
		}
		return { width  : w, height : h };
	},
	
	activateLoadingMask: function() {
		$("#loading-mask-shim, #loading-mask").show();
	},
	
	deactivateLoadingMask: function() {
		$("#loading-mask-shim, #loading-mask").hide();
	},
	
	_onSidebarToggleClick: function() {
		$("#sidebar-reports").toggleClass("hidden");
		this.resizeMap();
	},
	
	_onWindowResize: function() {
		this.resizeMap();
		this.resizeSidebars();
	}
});
