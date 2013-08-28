Ext.define('PumaMain.controller.DomManipulation', {
	extend: 'Ext.app.Controller',
	views: [],
	requires: [],
	init: function() {
		$("#sidebar-reports-toggle").on("click", $.proxy(this._onSidebarToggleClick, this));
		$(window).on("resize", $.proxy(this._onWindowResize, this))
		
		this.resizeMap();
	},
	
	renderApp: function() {
		$("body").removeClass("intro").addClass("application");
		this.resizeMap();
	},
	
	renderIntro: function() {
		// zatim neni potreba
	},
	
	resizeMap: function() {
		var w  = $(window).width();
		var h  = $(window).height() - $("#header").outerHeight(true) - $("#footer").outerHeight(true);
		var sl = $("#sidebar-reports").position().left;
		
		if ($("body").hasClass("application") && sl > 0) {
			w = sl;
			h -= $("#toolbar").outerHeight(true);
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
	
	activateMapSplit: function() {
		$("#map-holder").addClass("split");
		this.resizeMap();
	},
	
	deactivateMapSplit: function() {
		$("#map-holder").removeClass("split");
		this.resizeMap();
	},
	
	_onSidebarToggleClick: function() {
		$("#sidebar-reports").toggleClass("hidden");
		this.resizeMap();
	},
	
	_onWindowResize: function() {
		this.resizeMap();
	}
});
