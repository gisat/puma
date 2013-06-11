Ext.define('Puma.util.Color', {
    requires: ['Ext.draw.Color'],
    statics: {
        determineColorRange: function(color) {
            var hsl = Ext.draw.Color.fromString(color).getHSL();
            var fromColor = Ext.draw.Color.fromHSL(hsl[0], 0.8+0.2*hsl[1], 0.95+0.05*hsl[2]).toString();
            var toColor = Ext.draw.Color.fromHSL(hsl[0], 0.8+0.2*hsl[1], 0.25+0.1*hsl[2]).toString();
            return [fromColor, toColor];
        },
        determineColorFromRange: function(colorFrom, colorTo, ratio) {
            var rgbFrom = Ext.draw.Color.fromString(colorFrom).getRGB();
            var rgbTo = Ext.draw.Color.fromString(colorTo).getRGB();
            var rgbRatio = [rgbFrom[0] + ratio * (rgbTo[0] - rgbFrom[0]), rgbFrom[1] + ratio * (rgbTo[1] - rgbFrom[1]), rgbFrom[2] + ratio * (rgbTo[2] - rgbFrom[2])];

            return new Ext.draw.Color(rgbRatio[0], rgbRatio[1], rgbRatio[2]).toString();
        }
    }
});


