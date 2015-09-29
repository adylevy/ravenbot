/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
const _ = require('underscore');

var Player = require('./player_cls.js');
var Players = require('./players.js');
var BotBase = require('./botBase.js').BotBase;
var guildData = require('./data/guildData.js');
var audit = require('./data/audit.js');
var appSettings = require('./data/appsettings.js');

var AdminBot = BotBase.extend(function () {


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
                init: function (options, roomId) {
                    this.options = options;
                    this.roomId = roomId;

                    /*  this.warData = {
                     inWar: false,
                     guildName: '',
                     warTime: null
                     };*/
                    console.log('new ADMIN bot', this.roomId);
                },
                handleMessage: function (msg) {
                    /*{
                     "id": "1234567890",
                     "source_guid": "GUID",
                     "created_at": 1302623328,
                     "user_id": "1234567890",
                     "group_id": "1234567890",
                     "name": "John",
                     "avatar_url": "http://i.groupme.com/123456789",
                     "text": "Hello world ☃☃",
                     "system": true,
                     "favorited_by": [
                     "101",
                     "66",
                     "1234567890"
                     ],
                     "attachments": []
                     }*/
                    if (!msg.system) {
                        this.mainSwitch(msg.text.toLowerCase().trim(), msg);
                    }

                },
                mainSwitch: function (txt, msg) {
                    console.log('admin main switch');
                    var self = this;
                    if (/^[Hh]ello$/.test(txt)) {
                        this.postMessage('Hey there Admin!');
                    }

                    var regMatch = /^[Rr]egister\s(\d+)\s?([^\s]*)\s?(.*)$/;
                    if (regMatch.test(txt)) {
                        var regexmatch = regMatch.exec(txt);

                        var obj = {
                            roomId: regexmatch[1],
                            guildName: regexmatch[2],
                            guildId: regexmatch[3]
                        };
                        this.postMessage('Registering !');
                        // console.log(obj);
                        this.emit('botRegister', this, obj);
                    }

                    regMatch = /^[Uu]nregister\s(\d+)$/;
                    if (regMatch.test(txt)) {
                        var regexmatch = regMatch.exec(txt);
                        this.postMessage('Unregistering !', regexmatch[1]);
                        this.emit('botUnregister', this, regexmatch[1]);
                    }

                    regMatch = /^[sS]et\s(\d+)\s?([^\s]*)\s?(.*)$/;
                    if (regMatch.test(txt)) {
                        var matches = regMatch.exec(txt);
                        appSettings.getSettings().then(function (settings) {
                            var guild = _.findWhere(settings.guilds, {roomId: Number(matches[1])});
                            if (guild) {
                                guild.guildName = matches[2];
                                guild.guildId = matches[3] || '';
                                settings.save(function () {
                                    this.postMessage('all set.')

                                }.bind(this));
                            } else {
                                this.postMessage('can\'t find room.');
                            }

                        }.bind(this));
                    }
                    regMatch = /^list$/;
                    if (regMatch.test(txt)) {
                        appSettings.getSettings().then(function (settings) {
                            var postback = [];
                            _.each(settings.guilds, function (guild) {
                                postback.push(guild.roomId + ': ' + guild.guildName + ' / ' + guild.guildId);
                            });
                            this.postMessage(postback.join('\n'));

                        }.bind(this))

                    }

                    if (/^help$/.test(txt)) {
                        this.showHelp();
                    }

                    var removeRgx = /^[rR]emove\s(.*)/;
                    if (removeRgx.test(txt)) {
                        var mtches = removeRgx.exec(txt);
                        var guildname = mtches[1];
                        guildData.removeGuild(guildname, msg.name).then(function (msg) {
                            this.postMessage(msg);
                        }.bind(this));
                        audit.add({
                            guildName: guildname,
                            roomId: msg.group_id,
                            performerId: msg.user_id,
                            performerName: msg.name,
                            action: 'Remove entire guild'
                        });
                    }

                    var broadcastRgx = /^[bB]roadcast\s(all|[\d]+)\s(.*)/;
                    if (broadcastRgx.test(txt)) {
                        var mtches = broadcastRgx.exec(txt);
                        var guild = mtches[1];
                        var msg = mtches[2];
                        this.emit('broadcast', this, {msg: msg, guild: guild});
                    }

                    if (/^war\s*started$/.test(txt)) {
                        appSettings.getSettings().then(function (settings) {
                            settings.warStartDate = Date.now();
                            settings.save();
                            this.postMessage("WAR STARTED!");
                        }.bind(this));
                    }

                    if (/^getstats$/.test(txt)) {
                        this.getStats();
                    }

                    if (/^war\sended$/.test(txt)) {
                        appSettings.getSettings().then(function (settings) {
                            settings.warStartDate = null;
                            settings.save();
                            this.postMessage("WAR ENDED!");
                        }.bind(this));
                    }

                    if (/^war\s*status/.test(txt)) {
                        appSettings.getSettings().then(function (settings) {
                            if (settings.warStartDate == null) {
                                this.postMessage('no war now..');
                            } else {

                                this.postMessage("War started at " + settings.warStartDate);
                            }

                        }.bind(this));
                    }

                    var showRgx = /^[sS]how\s(.*)/;
                    if (showRgx.test(txt)) {
                        var mtches = showRgx.exec(txt);
                        var guildname = mtches[1];
                        guildData.getGuildData(guildname, function (guild) {
                            if (guild.isNew) {
                                this.postMessage("Can't find guild in DB");
                                return;
                            }
                            appSettings.getSettings().then(function (settings) {

                                var guilds = {};
                                _.each(settings.guilds, function (guild) {
                                    guilds[guild.roomId] = guild.guildName + ' / ' + guild.guildId;
                                });
                                var retMsg = [];
                                var playersCls = new Players();
                                var players = playersCls.getPlayerObjFromDBPlayers(guild.players || []);
                                retMsg.push(guild.name + ':')
                                _.each(players, function (player) {
                                    var inserted = new Player('199 ' + player.insertedByUser);
                                    var insertedBy = inserted.isPlayer() ? inserted.name : player.insertedByUser;
                                    retMsg.push(player.toString() + ' [' + player.insertDate.toISOString().replace(/T/, ' ').replace(/\..+/, '') + '] [' + insertedBy + '] [' + (guilds[player.insertedByGuild] || player.insertedByGuild) + ']');
                                });
                                this.postMessage(retMsg.join('\n'));
                            }.bind(this));
                        }.bind(this));
                    }

                },

                showHelp: function () {
                    var helpMsg = [];
                    helpMsg.push('admin command list:');
                    helpMsg.push('hello - greet the bot.');
                    helpMsg.push('register roomId Abbr GuildName - register room');
                    helpMsg.push('set roomId Abbr GuildName - update room info');
                    helpMsg.push('unregister roomId - unreg room');
                    //  helpMsg.push('stats - Raven statistics');
                    helpMsg.push('list - show all rooms registered');
                    helpMsg.push('show guildName - fetches info on Guild');
                    helpMsg.push('remove guildName - removes a guild from ravenDB');
                    helpMsg.push('broadcast [all|roomId] msg - sending msg to room or all rooms');
                    helpMsg.push('war started - indicates global war is ON');
                    helpMsg.push('war ended - indicates that war is not ON at the moment');
                    helpMsg.push('war status')
                    helpMsg.push('getstats - get war stats');
                    this.postMessage(helpMsg.join('\n'));
                },


                botRegistered: function (groupId) {
                    this.postMessage('Bot Registered : ' + groupId);
                },
                botUnregistered: function (groupId) {
                    this.postMessage('Bot UnRegistered : ' + groupId);
                },
                getStats: function (withTotal) {
                    appSettings.getSettings().then(function (prefs) {
                        guildData.getAllGuilds().then(function (guilds) {
                            var outArr=[];
                            var submittedGuild = {};
                            var submittedPlayer = {};
                            var dt = new Date();
                            dt.setDate(dt.getDate() - 8);
                            _.each(guilds, function (guild) {
                                _.each(guild.players, function (player) {
                                    if (player.date == undefined || player.date.getTime() <= dt.getTime()) {
                                        return;
                                    }
                                    if (submittedGuild[player.insertedByGuild] == undefined) {
                                        submittedGuild[player.insertedByGuild] = 0;
                                    }
                                    if (submittedPlayer[player.insertedByUser] == undefined) {
                                        submittedPlayer[player.insertedByUser] = 0;
                                    }

                                    submittedGuild[player.insertedByGuild] = submittedGuild[player.insertedByGuild] + 1;
                                    submittedPlayer[player.insertedByUser] = submittedPlayer[player.insertedByUser] + 1;
                                })
                            });
                            var stats = [];
                            _.each(submittedGuild, function (ctr, idx) {

                                var guildPref = _.findWhere(prefs.guilds, {roomId: Number(idx)});
                                if (guildPref == undefined) {
                                    console.log(idx, ctr);
                                } else {
                                    stats.push({
                                        name: guildPref.guildName,
                                        id: guildPref.guildId,
                                        ctr: ctr,
                                        roomId: Number(idx)
                                    });

                                }
                            });

                            _.each(prefs.guilds, function (guild) {
                                var roomId = guild.roomId;
                                var stat = _.findWhere(stats, {roomId: roomId});
                                if (stat == undefined) {
                                    //   console.warn('NO CONTRIBUTION: '+guild.roomId+' - '+ guild.guildId+' '+guild.guildName);
                                }
                            })
                            stats = _.sortBy(stats, function (s) {
                                return s.ctr
                            }).reverse();
                            var k = 0;
                            _.each(stats, function (stat) {
                              outArr.push(++k + ' - ' + stat.name + ' ' + stat.id + ' total:' + stat.ctr);
                            })
                            var submittedPlayersCnt = 0;
                            _.each(submittedPlayer, function (ctr, idx) {
                                if (ctr > 20) {
                                    //   console.log(idx,ctr);
                                }
                                submittedPlayersCnt++;
                            })
                            outArr.push ('total players - '+ submittedPlayersCnt);

                            this.postMessage(outArr.join('\n'));
                        })
                    }.bind(this))
                }


            }
        }
        ()
    )
    ;


module.exports = function (options, idx) {

    var md = new AdminBot(options, idx);
    return md;
};
