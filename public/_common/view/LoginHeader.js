Ext.define('Puma.view.LoginHeader', {
    extend: 'Ext.container.Container',
    alias: 'widget.loginheader',
    
    initComponent: function() {
        this.style = {
             backgroundColor: '#ddddff'
        };
        this.layout = {
            type: 'hbox',
            align: 'middle',
            pack: 'start'
        };
        this.defaults = {
            margin: '0 0 0 13'
        };
        this.items = [{
            xtype: 'component',
            itemId: 'logintext',
            html: 'Not logged in'
        },{
            xtype: 'component',
            cls: 'loginbtn',
            itemId: 'loginbtn',
            hidden: false,
            html: '<a href="">Login</a>'
        },{
            xtype: 'component',
            cls: 'logoutbtn',
            itemId: 'logoutbtn',
            hidden: true,
            html: '<a href="">Logout</a>'
        }];

        this.callParent();
        
        this.addEvents({
            loginclick: true,
            logoutclick: true
        });
        var me = this;
        $('.loginbtn a').live('click',function() {
            me.fireEvent('loginclick');
            return false;
        });
        $('.logoutbtn a').live('click',function() {
            me.fireEvent('logoutclick');
            return false;
        })
    }
});


