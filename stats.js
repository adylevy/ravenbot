var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
var appSettings = require('./modules/data/appsettings.js');
var guildData = require('./modules/data/guildData.js');


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
    appSettings.getSettings().then(function(prefs){
        console.log(prefs.guilds);
        
        guildData.getAllGuilds().then(function(guilds){
            var submittedGuild={};
            var submittedPlayer={};
            _.each(guilds,function(guild){
                _.each(guild.players,function(player){
                    if (submittedGuild[player.insertedByGuild]==undefined){
                        submittedGuild[player.insertedByGuild]=0;
                    }
                    if (submittedPlayer[player.insertedByUser]==undefined){
                        submittedPlayer[player.insertedByUser]=0;
                    }
                    submittedGuild[player.insertedByGuild] = submittedGuild[player.insertedByGuild]+1;
                    submittedPlayer[player.insertedByUser] = submittedPlayer[player.insertedByUser]+1;
                })
            });
            _.each(submittedGuild,function(ctr,idx){
                //console.log(ctr,idx);
                //console.log(prefs);
                var guildPref=_.findWhere(prefs.guilds,{roomId:Number(idx)});
                if (guildPref==undefined){
                    console.log(idx,ctr);
                }else {
                    console.log(guildPref.guildName + ' ' + guildPref.guildId + ' : ' + ctr);
                }
            });
            var submittedPlayersCnt=0;
            _.each(submittedPlayer,function(ctr,idx){
                if (ctr>20){
                 //   console.log(idx,ctr);
                }
                submittedPlayersCnt++;
            })
            console.log('total players - ',submittedPlayersCnt)
            
    })
       
     // console.log();
  })
};

var mongoData = require('./modules/data/mongoData.js');
mongoData.on('mongoConnected',whenConnected);
mongoData.connect();
