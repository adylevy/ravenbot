var Player = require('./player.js');
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
            console.log('players constructor')
        },
        getPlayers: function (intel) {
            var splitData = intel.split('\n');
            var players = [];
            _.each(splitData, function (line) {
                if (line.split(' ')[0] == '' || _.isNaN(Number(line.split(' ')[0]))) {

                } else {
                    try {
                        var player = new player(line);
                        if (player.isPlayer()) players.push(player);
                    } catch (e) {
                        console.log(line);

                    }
                }
            });
            return players;
        },
        getPlayerObjFromDBPlayers: function(dbPlayers){
            var players=[];
            _.each(dbPlayers,function(dbplayer){
                var newP=new player();
                newP.create(p0.lvl,p0.name,p0.def,p0.eqDef,p0.heroDef);
                newP.insertBy=dbplayer.insertedByGuild;
                newP.insertDate=dbplayer.date;
                players.push(player);
            })
            return players;
        },
        getPlayersIntelFromOwnData: function(players){
            var intel=[];
            var p=this.getPlayerObjFromDBPlayers(players);
            _.each(p,function(player){
                intel.push(player.toString());
                
            })
            return intel.join('\n');
        }

    }
}());

module.exports = function (options) {
    console.log('pre const')
    var md = new Players(options);
    return md;
};



