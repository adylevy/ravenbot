/**
 * Created by Ady on 2/20/2015.
 */

var mongoose = require('mongoose');
var Q = require('q');
var _ = require('underscore');
//require('./mongoData.js')(process.env['MONGOLAB_URI']);
var Levenshtein = require('levenshtein');
var NodeCache = require("node-cache");
var myCache = new NodeCache({stdTTL: 300, useClones: false}); //5m default cache time

module.exports = function () {

    var Guild = mongoose.model('Guilds', {
        name: String,
        lastKnownIntel: String,
        isDeleted: {type: Boolean, default: false},
        deletedBy: String,
        deletionDate: Date,
        players: [
            {
                name: String,
                lvl: Number,
                def: Number,
                eqDef: Number,
                heroDef: Number,
                date: Date,
                insertedByGuild: String,
                insertedByUser: String,
                insertedByUserId: Number,
                isDeleted: {type: Boolean, default: false}
            }
        ]
    });

    var createNewGuild = function (guildName) {
        var g = new Guild({
            name: guildName,
            players: [],
            isDeleted: false
        });
        g.isNew = true;
        return g;
    }

    return {

        getSimilarGuilds: function (guildName) {
            var defered = Q.defer();
            var firstLetter = new RegExp('^' + guildName[0] + '+.*', "i");
            Guild.find({
                $or: [{name: firstLetter, isDeleted: {$exists: false}}, {
                    name: firstLetter,
                    isDeleted: false
                }]
            }).lean().exec(function (err, guilds) {
                if (err) {
                    defered.resolve([]);
                } else {
                    var suggested = [];
                    _.each(guilds, function (guild) {
                        var dist = new Levenshtein(guild.name, guildName)
                        if (dist.valueOf() <= 2) {
                            suggested.push({name: guild.name, dist: dist.valueOf()});
                        }
                    })

                    defered.resolve(suggested);
                }

            })
            return defered.promise;
        },

        getGuildData: function (guildName, deepObj) {
            deepObj = deepObj === undefined ? false : deepObj;
            var that = this;
            var defered = Q.defer();
            var cacheKey = 'guild_' + guildName.replace(/\s/g, '_');
            var cacheItem = myCache.get(cacheKey);
            if (cacheItem && deepObj === false) {
                defered.resolve(cacheItem);
            } else {
                var query = Guild.find({
                    $or: [{name: guildName, isDeleted: {$exists: false}}, {
                        name: guildName,
                        isDeleted: false
                    }]
                });
                if (deepObj===false){
                    query.lean();
                }
                query.exec(
                    function (err, guilds) {
                        var item;
                        if (guilds.length == 0) {
                            item = createNewGuild(guildName);
                        } else {
                            item = guilds[0];
                        }
                        if (deepObj === false) {
                            myCache.set(cacheKey, item, 600);
                            defered.resolve(item);
                        }
                        else {
                            item._save = item.save;
                            item._cacheKey = cacheKey;
                            item.save = function (cb) {
                                myCache.del(this._cacheKey);
                                this._save(cb);
                            };

                            defered.resolve(item);
                        }
                    }.bind(this));
            }
            return defered.promise;
        },
        getGuildById: function (id) {
            var defered = Q.defer();
            Guild.findById(id).lean().exec(function (err, guilds) {
                defered.resolve(guilds);
            });
            return defered.promise;
        },
        getAllGuilds: function () {
            var defered = Q.defer();
            var cacheKey = 'allguilds';
            var cacheItem = myCache.get(cacheKey);
            if (cacheItem) {

                defered.resolve(cacheItem);
            } else {
                Guild.find({}, function (err, guilds) {
                    //  myCache.set(cacheKey, guilds, 600);
                    defered.resolve(guilds.toObject());
                });
            }
            return defered.promise;
        },
        getAllGuildsPaginated: function (from, to) {
            var defered = Q.defer();
            from = Number(from) + 1;
            var cacheKey = 'guilds_paginated' + from + '_' + to;
            var cacheItem = myCache.get(cacheKey);
            if (cacheItem) {

                defered.resolve(cacheItem);
            } else {
                Guild.find({}).sort('name').lean().skip(Number(from)).limit(Number(to) - Number(from)).exec(function (err, guilds) {
                    myCache.set(cacheKey, guilds, 600);
                    defered.resolve(guilds);
                });
            }
            return defered.promise;
        },
        removeGuild: function (guildName, deletingUser) {
            var defered = Q.defer();
            this.getGuildData(guildName).then(function (guild) {
                if (guild.isNew) {
                    defered.resolve('Guild not found in DB');
                    return;
                } else {
                    guild.isDeleted = true;
                    guild.deletedBy = deletingUser;
                    guild.deletionDate = Date.now();
                    guild.save(function () {
                        defered.resolve('Guild [' + guildName + '] removed ');
                    });
                }
            }.bind(this));
            return defered.promise;
        }

    };
}();
