/**
 * Created by Ady on 2/20/2015.
 */

var mongoose = require('mongoose');
var Q = require('q');
var _ = require('underscore');
require('./mongoData.js')(process.env['MONGOLAB_URI']);

var NodeCache = require("node-cache");
var myCache = new NodeCache({stdTTL: 300}); //5m default cache time

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

        getGuildData: function (guildName, callback) {
            var that = this;
            var cacheKey = 'guild_' + guildName.replace(/\s/g, '_');
            var cacheItem = myCache.get(cacheKey);
            if (cacheItem[cacheKey]) {
                callback(cacheItem[cacheKey]);
            } else {
                Guild.find({$or: [{name: guildName, isDeleted: { $exists: false }},{name: guildName,isDeleted: false}]}, function (err, guilds) {
                    var item;
                    if (guilds.length == 0) {
                        item = createNewGuild(guildName);
                    } else {
                        item = guilds[0];
                    }
                    item._save = item.save;
                    item._cacheKey = cacheKey;
                    item.save = function (cb) {
                        myCache.set(this._cacheKey, this, 600);
                        this._save(cb);
                    };
                    myCache.set(cacheKey, item, 600);
                    callback(item);
                });
            }
        },
        getAllGuilds: function () {
            var defered = Q.defer();
            Guild.find({}, function (err, guilds) {
                defered.resolve(guilds);
            });
            return defered.promise;
        },
        removeGuild: function (guildName, deletingUser) {
            var defered = Q.defer();
            this.getGuildData(guildName, function (guild) {
                if (guild.isNew) {
                    defered.resolve('Guild not found in DB');
                    return;
                } else {
                    guild.isDeleted=true;
                    guild.deletedBy=deletingUser;
                    guild.deletionDate= Date.now();
                    guild.save(function () {
                        defered.resolve('Guild [' + guildName + '] removed ');
                    });
                }
            });
            return defered.promise;
        }
    };
}();