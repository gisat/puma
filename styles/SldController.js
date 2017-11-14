let logger = require('../common/Logger').applicationWideLogger;

class SldController {
    constructor(app, pgPool) {
        this._pgPool = pgPool;

        app.get('/rest/sld/choropleth', this.createChoroplethSld);
    }

    /**
     * It retrieves min and max values for the relevant attribute from all relevant base layers. Based on that and the
     * amount of categories the SLD will be generated and returned back to be used for the server calls.
     * @param request
     * @param response
     */
    createChoroplethSld(request, response) {
        logger.info(`SldController#createChoroplethSld Attribute Set: `, request.params.attributeSet, ` Attribute: `,
            request.params.attribute, ` Layers: `, request.params.layers);

        response.json({
            sld: "<sld:StyledLayerDescriptor xmlns:sld=\"http://www.opengis.net/sld\" version=\"1.0.0\"" +
            "                           xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"" +
            "                           xsi:schemaLocation=\"http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd\"" +
            "                           xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:gml=\"http://www.opengis.net/gml\">" +
            "    <sld:Name>Choropleth style</sld:Name>" +
            "    <sld:Title>Choropleth style</sld:Title>" +
            "    <sld:NamedLayer>" +
            "        <sld:Name>Choropleth</sld:Name>" +
            "        <sld:UserStyle>" +
            "            <sld:FeatureTypeStyle>" +
            "                <sld:Rule>" +
            "                    <sld:PolygonSymbolizer>" +
            "                        <sld:Fill>" +
            "                            <sld:CssParameter name=\"fill\">" +
            "                                <ogc:Function xmlns:ogc=\"http://www.opengis.net/ogc\" name=\"Categorize\">" +
            "                                    <ogc:Mul>" +
            "                                        <ogc:PropertyName>#attr#</ogc:PropertyName>" +
            "                                        <ogc:Literal>1</ogc:Literal>" +
            "                                    </ogc:Mul>" +
            "                                    <ogc:Literal>#f7fef3</ogc:Literal>" +
            "                                    <ogc:Literal>#val_1#</ogc:Literal>" +
            "                                    <ogc:Literal>#c6e3b8</ogc:Literal>" +
            "                                    <ogc:Literal>#val_2#</ogc:Literal>" +
            "                                    <ogc:Literal>#96c87e</ogc:Literal>" +
            "                                    <ogc:Literal>#val_3#</ogc:Literal>" +
            "                                    <ogc:Literal>#65ac43</ogc:Literal>" +
            "                                    <ogc:Literal>#val_4#</ogc:Literal>" +
            "                                    <ogc:Literal>#349108</ogc:Literal>" +
            "                                </ogc:Function>" +
            "                            </sld:CssParameter>" +
            "                        </sld:Fill>" +
            "                        <sld:Stroke>" +
            "                            <sld:CssParameter name=\"stroke\">" +
            "                                <ogc:Literal xmlns:ogc=\"http://www.opengis.net/ogc\">#000000</ogc:Literal>" +
            "                            </sld:CssParameter>" +
            "                            <sld:CssParameter name=\"stroke-width\">" +
            "                                <ogc:Literal xmlns:ogc=\"http://www.opengis.net/ogc\">1</ogc:Literal>" +
            "                            </sld:CssParameter>" +
            "                        </sld:Stroke>" +
            "                    </sld:PolygonSymbolizer>" +
            "                </sld:Rule>" +
            "            </sld:FeatureTypeStyle>" +
            "        </sld:UserStyle>" +
            "    </sld:NamedLayer>" +
            "</sld:StyledLayerDescriptor>"
        });
    }
}

module.exports = SldController;