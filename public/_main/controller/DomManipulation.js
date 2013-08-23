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
		var w = $(window).width();
		var h = $(window).height() - $("#header").outerHeight(true) - $("#footer").outerHeight(true);
		
		if ($("body").hasClass("application")) {
			w = $("#sidebar-reports").position().left;
		}
		
		$("#map-holder").css({width : w, height : h});
	},
	
	_onSidebarToggleClick: function() {
		$("#sidebar-reports").toggleClass("hidden");
		this.resizeMap();
	},
	
	_onWindowResize: function() {
		this.resizeMap();
	}
});
