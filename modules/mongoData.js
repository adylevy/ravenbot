var mongoose = require('mongoose');
var Class = require('./Class.js').Class;
var Q = require('q');
var Player = require('./player_cls.js');
var Players = require('./players.js');
var _ = require('underscore');
const events = require('events');

var Mongodata = Class.extend(function () {

    var _privateFunc = function () {
        console.log('private func');
    }

    var Guild = mongoose.model('Guilds', {
        name: String, lastKnownIntel: String, players: [
            {
                name: String,
                lvl: Number,
                def: Number,
                eqDef: Number,
                heroDef: Number,
                date: Date,
                insertedByGuild: String,
                insertedByUser: String
            }
        ]
    });

    var RoomPrefs = mongoose.model('RoomPrefs', {
        roomId: Number, guildId: String, warData: {
            inWar: Boolean,
            guildName: String,
            warTime: Date

        }, playersPrefs: [{id: Number, mini: String}]
    });

    var AppSettings = mongoose.model('AppSettings', {groups: []});

    return {
        init: function (connectionString, autoConnect,callback) {
            console.log('init mongodb');

            this.connectionString = connectionString;
            autoConnect = typeof(autoConnect) == 'undefined' ? true : autoConnect;
            if (autoConnect) {
                console.log('auto connect');
                this.connect();
            }
            var db = mongoose.connection;
            db.on('error', console.error.bind(console, 'connection error:'));
            db.once('open', function () {

                console.log('connection opened');
                if (typeof callback=='function'){
                    callback();
                }
                this.emit('someThing');

            }.bind(this));
        },
        connect: function () {
            console.log('connect!',this.connectionString);
            mongoose.connect(this.connectionString);
        },
        createNewGuild: function (guildName) {
            var g = new Guild({
                name: guildName,
                lastKnownIntel: '',
                players: []
            });
            return g;
        },
        createRoomPrefs: function (roomId) {
            var r = new RoomPrefs({
                roomId: roomId,
                warData: {
                    inWar: false,
                    guildName: '',
                    warTime: null,
                    playersPrefs: []
                }

            });
            return r;

        },
        getGuildData: function (guildName, callback) {
            var that = this;
            Guild.find({name: guildName}, function (err, guilds) {
                var item;
                if (guilds.length == 0) {
                    item = that.createNewGuild(guildName);
                } else {
                    item = guilds[0];
                }
                callback(item);
            });
        },
        getSettings: function () {
            var that = this;
            var defered = Q.defer();
            AppSettings.findOne({}, function (err, settings) {
                var item = settings;
                if (item == null) {
                    item = new AppSettings({groups: []});
                }
                defered.resolve(item);
            });
            return defered.promise;
        },
        getRoomPrefs: function (roomId) {
            var that = this;
            var defered = Q.defer();
            RoomPrefs.find({roomId: roomId}, function (err, rooms) {
                var item;
                if (rooms.length == 0) {
                    item = that.createRoomPrefs(roomId);
                } else {
                    item = rooms[0];
                }
                defered.resolve(item);
            });
            return defered.promise;
        },
        reBuildGuildDB: function () {
            Guild.find({}, function (err, data) {
                //  console.log(data);
                var p = new Players();
                _.each(data, function (guild) {
                    var players = p.getPlayers(guild.lastKnownIntel);
                    guild.players = [];
                    _.each(players, function (p0) {
                        var newP = new player();
                        newP.create(p0.lvl, p0.name, p0.def, p0.eqDef, p0.heroDef);
                        guildObj = newP.getGuildPlayerObj();
                        guildObj.insertedByGuild = 'TRK';
                        guildObj.insertedByUser = 'Bot';
                        guild.players.push(guildObj);
                    })

                    guild.save();
                })
                console.log('done rebuild');


            });

        },
        remoteItem: function (item) {
            item.remove();
        },
        saveData: function (guild, callback) {

            guild.save(function (err) {
                callback(err);
            })
        }
    }
}());

module.exports = function (connectionString,auto,callback) {
    var md = new Mongodata(connectionString,auto,callback);
    return md;
}