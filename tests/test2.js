var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
if (typeof process.env['TOKEN'] == 'undefined') {
    env(__dirname + '/.env');
}

// local configuration read from env.
const TOKEN = process.env['TOKEN']; // your groupme api token
const GROUPS = process.env['GROUPS']; // the room you want to join
const ADMIN_NAME = process.env['ADMIN_NAME'];
const NAME = process.env['NAME']; // the name of your bot
const URL = process.env['URL']; // the domain you're serving from, should be accessible by Groupme.
const AVATAR = process.env['AVATAR'];
const CONFIG = {token: TOKEN, groups: GROUPS, name: NAME, url: URL, adminName: ADMIN_NAME, avatar_url: AVATAR, port: process.env.PORT || 5000};

//
//require('./modules/botsmanager.js')(CONFIG);

function timeout(){
    var deferred = Q.defer();
    
    setTimeout(function(){
        console.log('me done.')
        deferred.resolve();
        
    }.bind(this),Math.random()*1000)
    
    return deferred.promise;
}

var ar=[];
for(var i=0;i<10;i++) {
    ar.push(timeout());
}
console.log(Math.random()*100);
console.log(ar);
Q.all(ar).then(function(){
    console.log('all done.');
})

