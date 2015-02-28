/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
const _ = require('underscore');

var Player = require('./player_cls.js');
var Players = require('./players.js');
var BotBase = require('./botBase.js').BotBase;
var mongoData = require('./data/mongoData.js')(process.env['MONGOLAB_URI']);
var guildData = require('./data/guildData.js');
var audit = require('./data/audit.js');


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
                    console.log('new ADMIN bot', this.options, this.roomId);
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
                    var self=this;
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
                        mongoData.getSettings().then(function (settings) {
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
                        mongoData.getSettings().then(function (settings) {
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
                            roomId: self.roomId,
                            performerId: msg.user_id,
                            performerName: msg.name,
                            action: 'Remove entire guild'
                        });
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
                            mongoData.getSettings().then(function (settings) {

                                var guilds={};
                                _.each(settings.guilds, function (guild) {
                                    guilds[guild.roomId]= guild.guildName + ' / ' + guild.guildId;
                                });
                                var retMsg = [];
                                var playersCls = new Players();
                                var players = playersCls.getPlayerObjFromDBPlayers(guild.players || []);
                                retMsg.push(guild.name + ':')
                                _.each(players, function (player) {
                                    var inserted = new Player('199 ' + player.insertedByUser);
                                    retMsg.push(player.toString() + ' [' + player.insertDate.toISOString().replace(/T/, ' ').replace(/\..+/, '') + '] [' + inserted.name + '] [' +(guilds[player.insertedByGuild] || player.insertedByGuild) +']');
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

                    this.postMessage(helpMsg.join('\n'));
                },


                botRegistered: function (groupId) {
                    this.postMessage('Bot Registered : ' + groupId);
                },
                botUnregistered: function (groupId) {
                    this.postMessage('Bot UnRegistered : ' + groupId);

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
