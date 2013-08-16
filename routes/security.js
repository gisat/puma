var auth = require('../common/auth')




module.exports = function(app) {
    
    app.post('/rest/*',auth.auth,auth.adminUser);
    app.put('/rest/*',auth.auth,auth.adminUser);
    app.del('/rest/*',auth.auth,auth.adminUser);
    app.get('/rest/*',auth.auth);
    app.all('/api/urlview/saveChart',auth.auth)
    app.all('/api/urlview/saveView',auth.auth,auth.anyUser)
    app.all('/api/*',auth.auth)
}


