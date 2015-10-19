Ext.require([
    'Ext.button.Button',
    'Ext.grid.property.Grid'
]);

Ext.onReady(function(){
    // simulate updating the grid data via a button click
    Ext.create('Ext.button.Button', {
        renderTo: 'button-container',
        text: 'Update source',
        handler: function(){
            propsGrid.setSource({
                '(name)': 'Property Grid',
                grouping: false,
                autoFitColumns: true,
                productionQuality: true,
                created: new Date(),
                tested: false,
                version: 0.8,
                borderWidth: 2
            });
        }
    });
    
    Ext.create('Ext.button.Button', {
        renderTo: 'button-container',
        text: 'New data source',
        margin: '0 0 0 10',
        handler: function(){
            propsGrid.setSource({
                firstName: 'Mike',
                lastName: 'Bray',
                dob: new Date(1986, 3, 15),
                color: 'Red',
                score: null
            }, {
                firstName: {
                    displayName: 'First Name'
                },
                lastName: {
                    displayName: 'Last Name'
                },
                dob: {
                    displayName: 'D.O.B'
                },
                color: {
                    displayName: 'Color',
                    editor: new Ext.form.field.ComboBox({
                        store: ['Red', 'Green', 'Blue'],
                        forceSelection: true
                    }),
                    renderer: function(v){
                        var lower = v.toLowerCase();
                        return Ext.String.format('<span style="color: {0};">{1}</span>', lower, v);
                    }
                }, 
                score: {
                    displayName: 'Score',
                    type: 'number'
                }
            });
        }    
    });
    
    var propsGrid = Ext.create('Ext.grid.property.Grid', {
        width: 300,
        renderTo: 'grid-container',
        source: {
            "(name)": "Properties Grid",
            "grouping": false,
            "autoFitColumns": true,
            "productionQuality": false,
            "created": Ext.Date.parse('10/15/2006', 'm/d/Y'),
            "tested": false,
            "version": 0.01,
            "borderWidth": 1
        },
        sourceConfig: {
            borderWidth: {
                displayName: 'Border Width'
            },
            tested: {
                displayName: 'QA'
            }
        }
    });
});
