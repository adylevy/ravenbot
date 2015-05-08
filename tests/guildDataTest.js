var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
var roomPrefs = require('./../modules/data/roomPrefs.js');
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
var guildData = require('../modules/data/guildData.js');


var Bot = require('./../modules/bot.js');
var whenConnected=function(){
    console.log('mongo is connected');
    guildData.getSimilarGuilds('bigdaddys killers').then(function(guilds){
        _.each(guilds,function(guild){console.log(guild.name,guild.dist);});
    })
};

var mongoData = require('./../modules/data/mongoData.js');
mongoData.on('mongoConnected',whenConnected);
mongoData.connect();
