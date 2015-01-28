var Player = require('./player_cls.js');
var Class = require('./Class.js').Class;
var _ = require('underscore');

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
            var splitData = intel.split('\n');
            var players = [];
            _.each(splitData, function (line) {

                    try {
                        var player = new Player(line);
                        if (player.isPlayer()){ 
                            player.origin='SS';
                            if (isFresh){
                                player.insertDate=new Date();
                            }
                            players.push(player);
                        }else{
                        }
                    } catch (e) {
                        console.log(line);

                    }

            });
            return players;
        },
        getPlayerObjFromDBPlayers: function(dbPlayers){
            var players=[];
            _.each(dbPlayers,function(p0){
                var newP=new Player();
                newP.create(p0.lvl,p0.name,p0.def,p0.eqDef,p0.heroDef);

                newP.insertBy=p0.insertedByGuild;
                newP.insertDate=p0.date;
                newP.origin='R';
                players.push(newP);
            })
            return players;
        },
        getPlayersIntelFromOwnData: function(players){

            var intel=[];
            var p=this.getPlayerObjFromDBPlayers(players);
            var oldIntel=[];
            var newIntel=[];
            var d = new Date();
            d.setDate(d.getDate()-6);

            p = _.sortBy(p, function (player) {
                return player.lvl;
            }).reverse();
            
            _.each(p,function(player){
               // console.log(d,player.insertDate,player.insertDate.getTime(),d.getTime())
                if (player.insertDate.getTime()<=d.getTime()){
                    oldIntel.push(player.toString());
                }else{
                    newIntel.push(player.toString())
                }
            })

            if (newIntel.length!=0){
                intel.push('Fresh intel:');
                intel=intel.concat(newIntel);
            }
            if (oldIntel.length!=0){
                intel.push('Old intel:');
                intel=intel.concat(oldIntel);
            }
            
            return intel.join('\n');
        }

    }
}());

module.exports = function (options) {
    console.log('pre const')
    var md = new Players(options);
    return md;
};



