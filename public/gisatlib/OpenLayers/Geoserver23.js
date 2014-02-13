OpenLayers.Format.SLD.Geoserver23 = OpenLayers.Class(OpenLayers.Format.SLD.v1_0_0_GeoServer, {
    /**
     * Property: namespaces
     * {Object} Mapping of namespace aliases to namespace URIs.
     */
    namespaces: {
        sld: "http://www.opengis.net/sld",
        ogc: "http://www.opengis.net/ogc",
        gml: "http://www.opengis.net/gml",
        xlink: "http://www.w3.org/1999/xlink",
        xsi: "http://www.w3.org/2001/XMLSchema-instance"
    },
    writeOgcExpression: function(value, node, props) {
        if (value instanceof OpenLayers.Filter.Function) {
            var child = this.writeNode("ogc:Function", value, node);;
            
            node.appendChild(child);
            return node;
        } else {
            return this.writers.sld._OGCExpression.call(
                    this, null, value, props, node
                    )
       }

    },
        
      getFilterType: function(filter) {
        var filterType = this.filterMap[filter.type];
        if(!filterType) {
            return 'ogc:Function'
        }
        return filterType;
    },
    
    writers: OpenLayers.Util.applyDefaults({
        "sld": OpenLayers.Util.applyDefaults({
            "_OGCExpression": function(nodeName, value, props, node) {
                // only the simplest of ogc:expression handled
                // {label: "some text and a ${propertyName}"}


                if (!node && props) {
                    node = this.createElementNSPlus(nodeName, props);
                }
                else if (!node) {
                    node = this.createElementNSPlus(nodeName);
                }
                var tokens = typeof value == "string" ?
                        value.split("${") :
                        [value];
                var item, last;
                if (tokens.length > 1) {
                    item = tokens[1];
                    last = item.indexOf("}");
                        this.writeNode(
                                "ogc:PropertyName",
                                {property: item.substring(0, last)},
                                node
                                );
                }
                else {
                        // no ending }, so this is a literal ${
                        node.appendChild(this.createElementNSPlus("ogc:Literal", {value: value}));
                }
                return node;
            },
            "PointSymbolizer": function(obj) {
                 var node = this.createElementNSPlus("sld:PointSymbolizer");
                 this.writeNode("Graphic", obj, node);
                 if (obj.geometry) {
                    this.writeNode("Geometry", obj.geometry, node);
                    
                 }
                 return node;
            },
            "CssParameter": function(obj) {
                // not handling ogc:expressions for now
                var nodeProps = {
                    attributes: {name: this.getCssProperty(obj.key)}
                }
                if (!(obj.symbolizer[obj.key] instanceof OpenLayers.Filter.Function)) {
                    return this.writers.sld._OGCExpression.call(
                        this, "sld:CssParameter", obj.symbolizer[obj.key], nodeProps
                        );
                }
                else {
                    var node = this.createElementNSPlus("sld:CssParameter", nodeProps);
                    var child = this.writeNode("ogc:Function", obj.symbolizer[obj.key], node);
                    node.appendChild(child);
                    return node;
                }
            },
            "Radius": function(value) {
                var node = null
                if (!(value instanceof OpenLayers.Filter.Function)) {
                    node = this.writers.sld._OGCExpression.call(
                        this, "sld:Radius", value
                        );
                }
                else {
                    var node = this.createElementNSPlus("sld:Radius");
                    var child = this.writeNode("ogc:Function", value, node);
                    node.appendChild(child);
                }

                return node;
            },
            "Label": function(label) {
                var node = null
                if (!(label instanceof OpenLayers.Filter.Function)) {
                    node = this.writers.sld._OGCExpression.call(
                            this, "sld:Label", label
                            );
                }
                else {
                    var node = this.createElementNSPlus("sld:Label");
                    var child = this.writeNode("ogc:Function", label, node);
                    node.appendChild(child);
                }

                return node
            },
            "Size": function(value) {
                var node = null
                if (!(value instanceof OpenLayers.Filter.Function)) {
                    node = this.writers.sld._OGCExpression.call(
                        this, "sld:Size", value
                        );
                }
                else {
                    var node = this.createElementNSPlus("sld:Size");
                    var child = this.writeNode("ogc:Function", value, node);
                    node.appendChild(child);
                }

                return node;
            },
            "Rotation": function(value) {
                var node = null
                if (!(value instanceof OpenLayers.Filter.Function)) {
                    node = this.writers.sld._OGCExpression.call(
                        this, "sld:Rotation", value
                        );
                }
                else {
                    var node = this.createElementNSPlus("sld:Rotation");
                    var child = this.writeNode("ogc:Function", value, node);
                    node.appendChild(child);
                }

                return node;
            },
            "Graphic": function(symbolizer) {
                var node = this.createElementNSPlus("sld:Graphic");
                if (symbolizer.externalGraphic != undefined) {
                    this.writeNode("ExternalGraphic", symbolizer, node);
                } else {
                    this.writeNode("Mark", symbolizer, node);
                }

                if (symbolizer.graphicOpacity != undefined) {
                    this.writeNode("Opacity", symbolizer.graphicOpacity, node);
                }
                if (symbolizer.pointRadius != undefined) {
                    this.writeNode("Size", symbolizer.pointRadius, node);
                } else if (symbolizer.graphicWidth != undefined) {
                    this.writeNode("Size", symbolizer.graphicWidth, node);
                }
                if (symbolizer.rotation != undefined) {
                    this.writeNode("Rotation", symbolizer.rotation, node);
                }
                return node;
            }
            
            




        }, OpenLayers.Format.SLD.v1.prototype.writers.sld),
        "ogc": OpenLayers.Util.applyDefaults({
//            "Filter": function(filter) {
//                var node = this.createElementNSPlus("ogc:Filter");
//                if (filter.type === "FID") {
//                    OpenLayers.Format.Filter.v1.prototype.writeFeatureIdNodes.call(this, filter, node);
//                } 
//                else if (filter instanceof OpenLayers.Filter.Function) {
//                    this.writeNode("ogc:Function", filter, node);
//                } else {
//                    this.writeNode(this.getFilterType(filter), filter, node);
//                }
//                return node;
//            },
            "Function": function(filter) {

                var node = null;
                if (filter.name in {Div: true, Sub: true, Add: true, Mul: true}) {
                    node = this.createElementNSPlus("ogc:" + filter.name);
                }
                else {
                    node = this.createElementNSPlus("ogc:Function", {
                        attributes: {
                            name: filter.name
                        }
                    })
                }
                ;
                var params = filter.params;
                for (var i = 0, len = params.length; i < len; i++) {
                    this.writeOgcExpression(params[i], node);
                }
                return node;
            },
            
            "PropertyIsNull": function(filter) {
                var node = this.createElementNSPlus("ogc:PropertyIsNull");
                this.writeNode("PropertyName", filter, node);
                return node;
            }
        },OpenLayers.Format.SLD.v1.prototype.writers.ogc)
    }, OpenLayers.Format.SLD.v1.prototype.writers),
    CLASS_NAME: "OpenLayers.Format.SLD.Geoserver23"

});

OpenLayers.Format.Filter.v1.prototype.filterMap['NULL'] = "PropertyIsNull"

