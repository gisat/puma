Ext.define('Puma.controller.Login', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Ext.window.MessageBox','Puma.view.LoginWindow'],
    init: function() {
        this.control({
            'loginheader': {
                loginclick: this.onLoginClicked,
                logoutclick: this.onLogoutClicked
            },
            'loginwindow #loginbtn': {
                click: this.onLoginSubmit
            }
        })
        this.checkLogin();
    },
    onLoginClicked: function(btn) {
        var window = Ext.WindowManager.get('loginwindow');
        if (!window) {
            window = Ext.widget('loginwindow', {
                id: 'loginwindow'
            })
        }
        Ext.ComponentQuery.query('#password',window)[0].setValue('');
        window.show();
        
    },

    onLoginSubmit: function(btn) {
        var form = btn.up('form');
        var userName = form.getComponent('username').getValue();
        var pass = form.getComponent('password').getValue();
        var me = this;
        Ext.Ajax.request({
            url: Cnst.url+'/api/login/login',
            params: {
                username: userName,
                password: pass
            },
            success: function(response) {
                me.checkLogin(true)
            }
        })
    },
    
    onLogoutClicked: function() {
        var me = this;
        Ext.Ajax.request({
            url: Cnst.url+'/api/login/logout',
            success: function(response) {
                Cnst.auth = null;
                me.onChangeLoginState(false);
            }
        })
    },
    checkLogin: function(fromLogin) {
        var me = this;
        Ext.Ajax.request({
            url: Cnst.url+'/api/login/getLoginInfo',
            success: function(response) {
                var response = JSON.parse(response.responseText);
                if (fromLogin && !response.data) {
                    Ext.Msg.alert('Error', 'Bad credentials');
                    Ext.ComponentQuery.query('loginwindow #password')[0].setValue('');
                    return;
                }
                Cnst.auth = response.data || null;
                me.onChangeLoginState(response.data ? true : false);
            }
        })
    },
    onChangeLoginState: function(loggedIn) {
        var text = 'Not logged in'
        if (loggedIn) {
            text = 'Logged in as ' + Cnst.auth.userName;
            var window = Ext.WindowManager.get('loginwindow');
            if (window) {
                window.close();
            }
        }
        
        Ext.ComponentQuery.query('loginheader #logintext')[0].update(text);
        Ext.ComponentQuery.query('loginheader #loginbtn')[0].setVisible(!loggedIn)
        Ext.ComponentQuery.query('loginheader #logoutbtn')[0].setVisible(loggedIn);
        this.application.fireEvent('login',loggedIn);
    }
});


