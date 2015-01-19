

var querystring = require('querystring');
var http = require('http');
var conn = require('../common/conn');

function getLoginInfo(params,req,res,callback) {
    var data = {
        userId: req.userId,
        groups: req.groups,
        userName: req.userName
    }
    res.data = req.userId ? data : null;
    callback();
}

function login(params,req,res,callback) {
    geonodeCom(params,true,callback,function(res1) {
        var cookies = res1.headers['set-cookie']
        var ssid = null;
        for (var i=0;i<cookies.length;i++) {
            var cookieRow = cookies[i].split(';')[0];
            var name = cookieRow.split('=')[0];
            if (name == 'sessionid') {
                ssid = cookieRow.split('=')[1];
            }
        }
        if (!ssid) {
            return callback(new Error('badLogin'))
        }
        res.cookie('ssid',ssid,{httpOnly: true})
        callback();
    })    
        
}

function logout(params,req,res,callback) {
    geonodeCom(params,false,callback,function() {
        res.clearCookie('ssid');
        callback();
    })
}


var geonodeCom = function(params,isLogin,generalCallback,specificCallback) {
    
    var options1 = {
        host: conn.getGeonodeServer(),
        path: '/',
        method: 'GET'
    };      
    
    conn.request(options1,null,function(err,output,res1) {
        if (err) return generalCallback(err);
        var csrf = res1.headers['set-cookie'][0].split(';')[0].split('=')[1];
        var postData = {
                username: params.username,
                password: params.password,
                csrfmiddlewaretoken: csrf,
                next: ''
            };
        if (isLogin) {
            postData['username'] = params.username;
            postData['password'] = params.password;
        }
        postData = querystring.stringify(postData);
        var options2 = {
            host: conn.getGeonodeServer(),
            path: isLogin ? '/accounts/login/' : '/accounts/logout/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Cookie':'csrftoken='+csrf
            }
        };
        conn.request(options2,postData,function(err,output,res2) {
            if (err) return generalCallback(err);
            return specificCallback(res2);
        })
    })
    
}



module.exports = {
    login: login,
    logout: logout,
    getLoginInfo: getLoginInfo
}




