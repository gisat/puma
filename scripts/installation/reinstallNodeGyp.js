const cmd = require('cmd-promise');

cmd('npm config set python python2.7').then(() => {
    return cmd('npm config set msvs_version 2015');
}).then(() => {
    return cmd('npm install node-gyp@latest');
}).then(() => {
    return cmd('npm remove node-sass');
}).then(() => {
    return cmd('npm install node-sass');
}).then(() => {
    return cmd('npm install');
}).catch(err => {
    console.log('err =', err)
});