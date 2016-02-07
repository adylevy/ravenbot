var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
var appSettings = require('./modules/data/appsettings.js');
//var sheetsData = require('./modules/sheets.js');
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
var moment=require('moment');
var guildData = require('./modules/data/guildData.js');


var getOldPlayers=function(){
    console.log('mongo is connected');
        guildData.getAllGuilds(false).then(function(guilds){
            var submittedGuild={};
            var submittedPlayer={};
            var dt=new Date();
            dt.setDate(dt.getDate()-30);
            _.each(guilds,function(guild){
                var newPlayers=[];
                _.each(guild.players,function(player){
                    if (player.date==undefined || player.date.getTime()<=dt.getTime()){
                        return;
                    }
                    newPlayers.push(player);
                });
                console.log(guild.name,'before:', guild.players.length);
                guild.players=newPlayers;
                console.log('after:', guild.players.length);
                guild.save();
            });


        })

};

var mongoData = require('./modules/data/mongoData.js');

mongoData.on('mongoConnected',getOldPlayers);
mongoData.connect();
