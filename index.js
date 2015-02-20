var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
if (typeof process.env['TOKEN'] == 'undefined') {
    env(__dirname + '/.env');
}

// local configuration read from env.
const TOKEN = process.env['TOKEN']; // your groupme api token
const GROUPS = process.env['GROUPS']; // the room you want to join
const ADMIN_GROUP = process.env['ADMIN_GROUP'];
const NAME = process.env['NAME']; // the name of your bot
const URL = process.env['URL']; // the domain you're serving from, should be accessible by Groupme.
const AVATAR = process.env['AVATAR'];
const CONFIG = {token: TOKEN, name: NAME, url: URL, adminGroup: ADMIN_GROUP, avatar_url: AVATAR, port: process.env.PORT || 5000};


var whenConnected=function(){
    console.log('mongo is connected');
    require('./modules/botsmanager.js')(CONFIG);

};

var mongoData = require('./modules/data/mongoData.js')(process.env['MONGOLAB_URI'],false);
mongoData.on('mongoConnected',whenConnected);
mongoData.connect();


