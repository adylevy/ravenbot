var Player = require('./player_cls.js');
var Class = require('./Class.js').Class;
var _ = require('underscore');
var moment=require('moment');

var Players = Class.extend(function () {
    function parseIntel(intel) {

        var resultString = '';

        var players = getPlayers(intel);
        players = _.sortBy(players, function (player) {
            return player.lvl;
        }).reverse();
        _.each(players, function (player) {
            resultString += player.toString();
        });
        return resultString;
    }


    return {
        /* options :
         {
         "bot_id": "1234567890",
         "group_id": "1234567890",
         "name": "hal9000",
         "avatar_url": "http://i.groupme.com/123456789",
         "callback_url": "http://example.com/bots/callback"
         }
         */
        init: function (options) {
         //   console.log('players constructor')
        },
        getPlayers: function (intel,isFresh) {
            var players = [];

            try {
                var splitData = intel.split('\n');
                _.each(splitData, function (line) {

                    try {
                        var player = new Player(line);
                        if (player.isPlayer()) {
                            player.origin = 'SS';
                            if (isFresh) {
                                player.insertDate = new Date();
                            } else {
                                var d = new Date();
                                d.setDate(d.getDate() - 30);
                                player.insertDate = d;

                            }
                            players.push(player);
                        } else {
                        }
                    } catch (e) {
                        console.log('------->', e, line);

                    }

                });
            }
            catch(e){
                console.log('---->',e);
            }
            return players;
        },
        getPlayerObjFromDBPlayers: function(dbPlayers){
            var players=[];
            _.each(dbPlayers,function(p0){
                var newP=new Player();
                newP.create(p0.lvl,p0.name,p0.def,p0.eqDef,p0.heroDef);

                newP.insertedByGuild=p0.insertedByGuild;
                newP.insertedByUser=p0.insertedByUser;
                newP.insertDate=p0.date;
                newP.origin='R';
                players.push(newP);
            })
            return players;
        },
        getPlayersIntelFromOwnData: function(players,lineBreak,showOldIntel){
            lineBreak = lineBreak || '\n';
            showOldIntel = (typeof showOldIntel=='undefined') ? true : showOldIntel;
            var intel=[];
            var p=this.getPlayerObjFromDBPlayers(players);
            var oldIntel=[];
            var newIntel=[];
            var d = new Date();
            d.setDate(d.getDate()-6);

            var historical = new Date();
            historical.setDate(historical.getDate()-21);

            p = _.sortBy(p, function (player) {
                return player.lvl;
            }).reverse();

            var lastUpdated=historical;

            _.each(p,function(player){
               // console.log(d,player.insertDate,player.insertDate.getTime(),d.getTime())
                if (player.insertDate.getTime()<=d.getTime()){
                    if (player.insertDate.getTime()>=historical.getTime())
                    oldIntel.push(player.toString());
                }else{
                    if (player.insertDate.getTime()>lastUpdated.getTime()){
                        lastUpdated=player.insertDate;
                    }
                    newIntel.push(player.toString())
                }
            })

            if (newIntel.length!=0){
                var lastUpdateTime = moment(lastUpdated);
                intel.push('Fresh intel (last update - '+lastUpdateTime.fromNow()+') :');
                intel=intel.concat(newIntel);
            }
            if (oldIntel.length!=0 && showOldIntel){
                if (newIntel.length!=0) {
                    intel.push('');
                }
                intel.push('Old intel:');
                intel=intel.concat(oldIntel);
            }
            
            return intel.join(lineBreak);
        }

    }
}());

module.exports = function (options) {
    var md = new Players(options);
    return md;
};



