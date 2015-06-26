var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
var appSettings = require('./modules/data/appsettings.js');
var sheetsData = require('./modules/sheets.js');
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

var listGuilds=function() {
    console.log('mongo is connected');
    appSettings.getSettings().then(function (prefs) {
        // console.log(prefs.guilds);
        var g=[];
        guildData.getAllGuilds().then(function (guilds) {
            _.each(guilds,function(guild) {
                g.push({id:guild.id,name:guild.name,players:((guild.players ||[])),entity:guild});
            });
            var sorted= _.sortBy(g,function(gg){
                return gg.name;
            });
var exists= 0,notexists=0;

            sheetsData.getAllGuilds(null).then(function(guilds){
                _.each(sorted,function(guild){
                    guild.existsInSS = _.find(guilds,function(p){
                       var found=false;
                        try {
                            found = p.guildName.toLowerCase() == guild.name.toLowerCase();
                        }
                        catch(e){console.warn(p,guild,e);}
                        return found;
                    })!=undefined;

                    if (guild.existsInSS) {
                        exists++;
                      //  console.log(guild);
                    }else{
                        if (guild.players.length<=8){
                            notexists++;
                            console.warn(guild.name, guild.players.length);
                           guild.entity.remove();
                        }else{

                        }

                        var gname = ''+guild.name;
                      /*  guildData.getSimilarGuilds(gname).then(function(similar){
                            console.log(gname,similar);
                        })*/
                    }
                });
                console.log('total guilds in SS and in Raven : '+exists+' not in SS : '+notexists);
              /*  console.log('exists :')
                _.each(sorted,function(guild){
                    if (guild.existsInSS){
                        console.log(guild.id+' '+guild.name+' - with '+guild.players.length+' players.');
                    }
                })*/
                var historical = new Date();
                historical.setDate(historical.getDate()-31);
                console.log('not exists :');
                var ctr=0;
                _.each(sorted,function(guild){
                    if (!guild.existsInSS){
                        var lastUpdated=historical;
                        _.each(guild.players,function(player){
                             try {
                                 if (player.date.getTime() > lastUpdated.getTime()) {
                                     lastUpdated = player.date;
                                 }
                             }catch(e){}
                        });
                        var lastUpdateTime = moment(lastUpdated);
                        if (lastUpdateTime.date()>4) {
                            ctr++;

                         //   console.log(guild.id + ' ' + guild.name + ' - with ' + guild.players.length + ' players. last update - ' + lastUpdateTime.fromNow());
                           // guild.entity.remove();
                        }
                    }
                });
                console.log('total - '+ctr);
            })

        }.bind(this));

    }.bind(this))
};

var whenConnected=function(){
    console.log('mongo is connected');
    appSettings.getSettings().then(function(prefs){
        // console.log(prefs.guilds);

        guildData.getAllGuilds().then(function(guilds){
            var submittedGuild={};
            var submittedPlayer={};
            var dt=new Date();
            dt.setDate(dt.getDate()-8);
            _.each(guilds,function(guild){
                _.each(guild.players,function(player){
                    if (player.date==undefined || player.date.getTime()<=dt.getTime()){
                        return;
                    }
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
            var stats=[];
            _.each(submittedGuild,function(ctr,idx){
                //console.log(ctr,idx);
                //console.log(prefs);
                var guildPref=_.findWhere(prefs.guilds,{roomId:Number(idx)});
                if (guildPref==undefined){
                    console.log(idx,ctr);
                }else {
                    stats.push({name:guildPref.guildName, id:guildPref.guildId,ctr:ctr, roomId:Number(idx)});
                    // console.log(guildPref.guildName + ' ' + guildPref.guildId + ' : ' + ctr);
                }
            });

            _.each(prefs.guilds,function(guild){
                var roomId = guild.roomId;
                var stat= _.findWhere(stats,{roomId:roomId});
                if (stat==undefined){
                    console.warn('NO CONTRIBUTION: '+guild.roomId+' - '+ guild.guildId+' '+guild.guildName);
                }
            })
            stats=_.sortBy(stats, function (s) { return s.ctr });
            _.each(stats,function(stat){
                console.log(stat.name+' '+stat.id+' total:'+stat.ctr);
            })
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


var getOldPlayers=function(){
    console.log('mongo is connected');
    appSettings.getSettings().then(function(prefs){
        // console.log(prefs.guilds);

        guildData.getAllGuilds().then(function(guilds){
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

        // console.log();
    })
};


var mongoData = require('./modules/data/mongoData.js');

mongoData.on('mongoConnected',getOldPlayers);
mongoData.connect();
