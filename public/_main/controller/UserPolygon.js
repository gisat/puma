Ext.define('PumaMain.controller.UserPolygon', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            'initialbar #addpolygonbtn': {
                toggle: this.onAddPolygonToggle
            },
            'initialbar #addpointbtn': {
                toggle: this.onAddPointToggle
            },
            'initialbar #deleteareabtn': {
                toggle: this.onDeleteAreaToggle
            }
        })
    },
    onAddPolygonToggle: function(btn, toggled) {
        var mc = this.getController('Map');
        toggled ? mc.drawPolygonControl.activate() : mc.drawPolygonControl.deactivate();
        var me = this;
        mc.drawPolygonControl.featureAdded = function(feature) {
            me.onFeatureAdded(feature);
        }
    },
    onAddPointToggle: function(btn, toggled) {
        var mc = this.getController('Map');
        toggled ? mc.drawPointControl.activate() : mc.drawPointControl.deactivate();
        var me = this;
        mc.drawPointControl.featureAdded = function(feature) {
            me.onFeatureAdded(feature);
        }
    },
    onDeleteAreaToggle: function(btn, toggled) {
        var mc = this.getController('Map');
        toggled ? mc.selectControl.activate() : mc.selectControl.deactivate();
        toggled ? mc.dragControl.deactivate() : mc.dragControl.activate();
        var me = this;
        mc.selectControl.highlight = function(feature) {
            me.onFeatureRemoved(feature)
        }
    },
    onFeatureAdded: function(feature) {
        var format = new OpenLayers.Format.WKT();
        var geom = format.write(feature);
        Ext.Ajax.request({
            url: Config.url + '/api/userpolygon/userPolygon',
            params: {
                geom: geom,
                method: 'create'
            },
            feature: feature,
            scope: this,
            success: this.onFeatureAddedCallback
        })
    },
    onFeatureAddedCallback: function(response) {
        var feature = response.request.options.feature;
        feature.gid = JSON.parse(response.responseText).data;
        var treeBtn = Ext.ComponentQuery.query('initialbar #treecontainer button[pressed=true]')[0];
        var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
        var theme = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0].objId;
        if (!treeBtn || treeBtn.objId != -1)
            return;
        var themeObj = Ext.StoreMgr.lookup('theme').getById(theme);
        var analysis = themeObj.get('analysis');
        var me = this;
        this.getController('LocationTheme').checkUserPolygons([year], analysis, function() {
            me.getController('Area').reinitializeTree(true);
        })

    },
    onFeatureDragged: function(feature) {
        var format = new OpenLayers.Format.WKT();
        var geom = format.write(feature);
        //console.log(feature.gid)
        Ext.Ajax.request({
            url: Config.url + '/api/userpolygon/userPolygon',
            params: {
                geom: geom,
                id: feature.gid,
                method: 'update'
            },
            feature: feature,
            scope: this,
            success: this.onFeatureDraggedCallback
        })
    },
    onFeatureDraggedCallback: function(response) {
        var treeBtn = Ext.ComponentQuery.query('initialbar #treecontainer button[pressed=true]')[0];
        var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
        var theme = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0].objId;
        if (!treeBtn || treeBtn.objId != -1)
            return;
        var me = this;
        var themeObj = Ext.StoreMgr.lookup('theme').getById(theme);
        var analysis = themeObj.get('analysis');
        this.getController('LocationTheme').checkUserPolygons([year], analysis, function() {
            me.getController('Chart').reconfigureAll();
            var store = Ext.StoreMgr.lookup('layers');
            var root = store.getRootNode();
            root.cascadeBy(function(node) {
                var at = node.get('at');
                if (at==-1 || node.get('layerName') == 'areaoutline') {
                    node.get('layer').redraw();
                }

            })
        })
    },
    onFeatureRemoved: function(feature) {
        feature.layer.removeFeatures([feature]);
        Ext.Ajax.request({
            url: Config.url + '/api/userpolygon/userPolygon',
            params: {
                id: feature.gid,
                method: 'delete'
            },
            feature: feature,
            scope: this,
            success: this.onFeatureRemovedCallback
        })

    },
    onFeatureRemovedCallback: function(response) {
        var treeBtn = Ext.ComponentQuery.query('initialbar #treecontainer button[pressed=true]')[0];
        if (!treeBtn || treeBtn.objId != -1)
            return;
        this.getController('Area').reinitializeTree(true);
    },
})


