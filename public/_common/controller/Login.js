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
        var me = this
        $('.login').click(function() {
            me.onLoginClicked();
        })
        $('.signup').click(function() {
            if ($(this).html()=='Log out') {
                me.onLogoutClicked();
            }
            else {
                window.open(Config.signupAddress, "_blank")
            }
        })
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
            url: Config.url+'/api/login/login',
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
            url: Config.url+'/api/login/logout',
            method: 'POST',
            success: function(response) {
                Config.auth = null;
                me.onChangeLoginState(false);
            }
        })
    },
    checkLogin: function(fromLogin) {
        var me = this;
        Ext.Ajax.request({
            url: Config.url+'/api/login/getLoginInfo',
            method: 'POST',
            success: function(response) {
                var response = JSON.parse(response.responseText);
                if (fromLogin && !response.data) {
                    Ext.Msg.alert('Error', 'Bad credentials');
                    Ext.ComponentQuery.query('loginwindow #password')[0].setValue('');
                    return;
                }
                Config.auth = response.data || null;
                me.onChangeLoginState(response.data ? true : false);
            }
        })
    },
    onChangeLoginState: function(loggedIn) {

        var cmp = Ext.ComponentQuery.query('loginheader #logintext')[0]
        if (!cmp) {
            var window = Ext.WindowManager.get('loginwindow');
            if (window) {
                window.close();
            }
            $('.login').html(Config.auth ? Config.auth.userName : 'Log in')
            $('.signup').html(Config.auth ? 'Log out' : 'Sign up')
            this.application.fireEvent('login', loggedIn);
            return;
        }
        var text = 'Not logged in'
        if (loggedIn) {
            text = 'Logged in as ' + Config.auth.userName;
            var window = Ext.WindowManager.get('loginwindow');
            if (window) {
                window.close();
            }
        }

        Ext.ComponentQuery.query('loginheader #logintext')[0].update(text);
        Ext.ComponentQuery.query('loginheader #loginbtn')[0].setVisible(!loggedIn)
        Ext.ComponentQuery.query('loginheader #logoutbtn')[0].setVisible(loggedIn);
        this.application.fireEvent('login', loggedIn);
    }
});


