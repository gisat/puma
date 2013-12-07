Ext.define('Puma.patch.button.Button',{
    override: 'Ext.button.Button',
    
   
    
    initComponent: function() {
        this.persistentPadding = [0,0,0,0];
        this.callParent();
        
    }
    
})


