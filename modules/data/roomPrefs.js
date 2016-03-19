/**
 * Created by Ady on 2/20/2015.
 */

var mongoose = require('mongoose');
var Q = require('q');
var _ = require('underscore');
require('./mongoData.js');

var NodeCache = require("node-cache");
var myCache = new NodeCache({stdTTL: 300, useClones: false}); //5m default cache time

module.exports = function () {

    var RoomPrefs = mongoose.model('RoomPrefs', {
        roomId: Number,
        guildId: String,
        warData: {
            inWar: Boolean,
            guildName: String,
            warTime: Date

        },
        playersPrefs: [{
            id: Number,
            mini: String,
            minis: [{player: String, idx: Number}],
            risk: {type: Number, default: 0}
        }],
        settings: [],
        matches: [{
            guildName: String,
            warTime: Date,
            warResult: String
        }]
    });

    var createRoomPrefs = function (roomId) {
        var r = new RoomPrefs({
            roomId: roomId,
            warData: {
                inWar: false,
                guildName: '',
                warTime: null
            },
            playersPrefs: [],
            settings: [],
            matches: []

        });
        return r;
    }

    var updateMini = function (minis, idx, mini) {
        minis = _.filter(minis, function (el) {
            return el.idx != idx;
        });
        minis.push({
            idx: idx,
            player: mini
        })
        return minis;
    };

    return {
        getRoomPrefs: function (roomId, deepObj) {
            deepObj = deepObj === undefined ? false : deepObj;
            var defered = Q.defer();
            var cacheKey = 'room_' + roomId;
            var cacheItem = myCache.get(cacheKey);
            if (cacheItem && deepObj === false) {
                //  console.log('room pref from cache');
                defered.resolve(cacheItem);
            } else {
                //  console.log('no cache',cacheItem)
                var query =
                    RoomPrefs.find({roomId: roomId});
                if (deepObj===false){
                    query.lean();
                }
                query.exec(function (err, rooms) {
                    var item;
                    if (rooms.length == 0) {
                        item = createRoomPrefs(roomId);
                    } else {
                        item = rooms[0];
                    }

                    if (deepObj === false) {
                        myCache.set(cacheKey, item, 600);
                        defered.resolve(item);
                    }
                    else {
                        item._save = item.save;
                        item._cacheKey = cacheKey;
                        item.save = function (cb) {
                            // console.log('SAVING !!!', this);
                            myCache.set(this._cacheKey, this, 600);
                            this._save(cb);
                        };
                        defered.resolve(item);
                    }

                });
            }
            return defered.promise;
        },
        getAllRoomPrefs: function () {
            var defered = Q.defer();
            RoomPrefs.find({'warData.inWar': true}).lean().exec(function (err, rooms) {
                //myCache.set(rooms.toObject(),item,600);
                //  var myrooms = JSON.parse(JSON.stringify(rooms))
                defered.resolve(rooms);
            });
            return defered.promise;
        },
        getRoomPlayer: function (roomId, userId) {
            var defered = Q.defer();
            this.getRoomPrefs(roomId).then(function (roomPref) {
                var player = this.getRoomPlayerFromRoomPref(roomPref, userId);
                defered.resolve(player);
            }.bind(this));
            return defered.promise;
        },
        getRoomPlayerFromRoomPref: function (roomPref, userId) {
            var players = roomPref.playersPrefs || [];
            var player = _.find(players, function (p) {
                return p.id == userId;
            });
            if (player == undefined) {
                player = {
                    id: Number(userId),
                    minis: [],
                    risk: 0
                }
            }
            if (player.mini != undefined && player.mini != '') {
                player.minis = [];
                if (player.mini != undefined && player.mini != '') {
                    player.minis.push({
                        idx: 1,
                        player: player.mini
                    });
                    player.mini = undefined;
                    delete player.mini;
                }
            }
            return player;
        }, updatePlayerRisk: function (roomId, userId, name, risk) {
            var defered = Q.defer();
            this.getRoomPrefs(roomId, true).then(function (roomPref) {

                    var player = this.getRoomPlayerFromRoomPref(roomPref, userId);
                    var players = _.filter(roomPref.playersPrefs || [], function (el) {
                        return el.id != userId;
                    });
                    player.risk = risk;
                    players.push(player);

                    roomPref.playersPrefs = players;
                    roomPref.save();
                    defered.resolve('updated risk for ' + name + ' to ' + risk);
                }.bind(this)
            );
            return defered.promise;
        },
        addUpdateMini: function (roomId, userId, idx, miniPlayer) {
            var defered = Q.defer();
            this.getRoomPrefs(roomId, true).then(function (roomPref) {
                var player = this.getRoomPlayerFromRoomPref(roomPref, userId);
                var players = _.filter(roomPref.playersPrefs || [], function (el) {
                    return el.id != userId;
                });
                var playerMinis = (player == undefined) ? [] : player.minis || [];
                playerMinis = updateMini(playerMinis, idx, miniPlayer);
                player.minis = playerMinis;
                players.push(player);

                roomPref.playersPrefs = players;

                roomPref.save();
                defered.resolve('updated Mini #' + idx + ' : ' + miniPlayer);
            }.bind(this))
            ;
            return defered.promise;
        }
        ,
        getRoomSettingFromRoomPref: function (roomPref, settingName) {
            var settings = roomPref.settings || [];
            var setting = _.find(settings, function (s) {
                return s.key == settingName;
            });

            return setting == undefined ? null : setting.val;
        },
        setRoomSetting: function (roomPref, settingName, settingVal) {
            var settings = roomPref.settings || [];
            settings = _.filter(settings, function (s) {
                return s.key != settingName;
            });
            settings.push({
                'key': settingName,
                'val': settingVal
            });
            roomPref.settings = settings;
            roomPref.save();
        }
    };
}();
