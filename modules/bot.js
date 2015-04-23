/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
const _ = require('underscore');
var giphy = require('./giphy.js')('dc6zaTOxFJmzC');
var chuckJokes = require('./chuckJokes.js');
var sheetsData = require('./sheets.js');
//var mongoData = require('./data/mongoData.js')(process.env['MONGOLAB_URI']);
var roomPrefs = require('./data/roomPrefs.js');
var guildData = require('./data/guildData.js');
var Player = require('./player_cls.js');
var Players = require('./players.js');
var BotBase = require('./botBase.js').BotBase;
var utils = require('./utils.js');
var audit = require('./data/audit.js');
var moment = require('moment');

var Bot = BotBase.extend(function () {

            var OriginSourceType = {

                'RavenOld': 1,
                'RavenNew': 2,
                'SSOld': 4,
                'SSNew': 8,
                'Smart': 16
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
                init: function (options, roomId) {
                    this.options = options;
                    this.roomId = roomId;
                    this.ctx = {
                        players: [],
                        globalReq: []
                    };

                    console.log('new bot **', this.options, this.roomId);
                },
                getRoomPrefs: function () {
                    return roomPrefs.getRoomPrefs(this.roomId);
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
                        try {
                            this.mainSwitch(msg.text.trim(), msg);
                        }
                        catch (e) {
                            console.log('-------->', e, ' <<---');
                        }
                    }
                },

                mainSwitch: function (txt, msg) {
                    var self = this;
                    var caseSensitiveTxt = txt.trim();
                    txt = txt.toLowerCase().trim();
                    var ctxPlayer = this.getCtxPlayer(msg.user_id);

                    if (this.handleCtxPlayer(caseSensitiveTxt, msg)) {
                        return;
                    }
                    if (this.handleGlobalCtxMsg(caseSensitiveTxt, msg)) {
                        return;
                    }

                    if (/^hello$/.test(txt)) {
                        this.postMessage('Hey there!');
                    }

                    if (/^ss\s?targets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                self.getGuildData(roomData.warData.guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var ownData = data.ownData;
                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, OriginSourceType.SSNew);
                                });
                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
                            }
                        }.bind(this));
                    }

                    if (/^all\s?targets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                self.getGuildData(roomData.warData.guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var ownData = data.ownData;
                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, OriginSourceType.RavenNew | OriginSourceType.RavenOld | OriginSourceType.SSNew);
                                });
                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
                            }
                        }.bind(this));
                    }

                    if (/^dirty\smartini$/.test(txt)) {
                        this.postMessage('','http://greygoose.com/GreyGoose/media/images/recipes/feature/recipe-Original-DIRTY-MARTINI-feature.jpg');
                    }

                    if (/^manual$/.test(txt)) {
                        this.postMessage('Raven Manual:\nhttps://docs.google.com/document/d/15naOzWKf9z9CT-D4hHZTryTE55l4HyNiR8sahye0TzU/edit');
                    }

                    if (/^support$/.test(txt)) {
                        this.postMessage('Support Room:\nhttps://groupme.com/join_group/11752971/5jvG41');
                    }

                    if (/^targets2$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                this.sendGuildTargetsUnified(roomData.warData.guildName);
                            }
                        }.bind(this));
                    }

                    if (/^targets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                self.getGuildData(roomData.warData.guildName, true).then(function (data) {
                                    var guild = data.foundGuild;
                                    var ownData = data.ownData;
                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, OriginSourceType.RavenNew | OriginSourceType.RavenOld);
                                });
                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
                            }
                        }.bind(this));
                    }

                    if (/^time$/.test(txt)) {
                        // console.log('get prefs');
                        this.getRoomPrefs().then(function (roomData) {
                            //  console.log('got prefs',roomData);
                            if (roomData.warData.inWar == true) {
                                var diff = new Date(Date.now() - roomData.warData.warTime);
                                this.postMessage(60 - diff.getMinutes() + ' minutes left.');
                            } else {
                                this.postMessage('not in war.');
                            }
                        }.bind(this));
                    }

                    var syncRgx = /^[Ss]ync\s(\d+)$/;
                    if (syncRgx.test(txt)) {
                        var mtch = syncRgx.exec(txt);
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                try {
                                    var newTime = new Date(new Date().getTime() - (60 - Number(mtch[1])) * 60000);
                                }
                                catch (e) {
                                    console.log('--------->', e);
                                }
                                roomData.warData.warTime = newTime;
                                roomData.save(function () {
                                    this.postMessage('war time synced. ' + Number(mtch[1]) + ' minutes left.');
                                }.bind(this));
                            } else {
                                this.postMessage('not in war.');
                            }
                        }.bind(this));
                    }

                    var newMatchRgx = /^matched(new){0,1}\s*(.*)/;
                    if (newMatchRgx.test(txt)) {
                        var regexmatch = newMatchRgx.exec(txt);
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                this.postMessage('already in war.\nuse "we" to end war before starting another match.');
                                return;
                            } else {
                                var guildName = regexmatch[2];
                                if (regexmatch[1] == 'new') {
                                    self.enterWarMode(guildName, null, null, false);
                                } else {
                                    self.getGuildData(guildName).then(function (data) {
                                        var guild = data.foundGuild;
                                        var bestMatch = data.bestMatch;
                                        var ownData = data.ownData;
                                        //  console.log('-------------->',guild);
                                        if (guild == null && (ownData == null || ownData.__v == undefined)) {
                                            if (bestMatch.guild.guildName) {
                                                var msg = [];
                                                msg.push('can\'t find guild. best match :  (' + bestMatch.guild.guildName + ')');
                                                msg.push('or you can use [matchednew GuildName]');
                                                self.postMessage(msg.join('\n'));
                                            }
                                        }
                                        else {
                                            self.enterWarMode(guildName, guild, ownData);
                                        }
                                    });
                                }
                            }
                        }.bind(this));

                    }
                    var updateLastWarResults = /^lastwarresults\s?(.*)$/;
                    if (updateLastWarResults.test(txt)) {
                        var mtchs = updateLastWarResults.exec(txt);
                        this.updateLastWarResults(mtchs[1]);
                    }
                    ;


                    var showtargetsRgx = /^targets\sin\s*(.*)/;
                    if (showtargetsRgx.test(txt)) {
                        var mtchs = showtargetsRgx.exec(txt);
                        if (mtchs != null) {
                            var guildName = mtchs[1];
                            //  console.log('getting guild info')
                            self.getGuildData(guildName).then(function (data) {
                                console.log('got guild data');
                                var guild = data.foundGuild;
                                var bestMatch = data.bestMatch;
                                var ownData = data.ownData;
                                //  console.log('-------------->',guild);
                                if (guild == null && (ownData == null || ownData.__v == undefined)) {
                                    if (bestMatch.guild.guildName) {
                                        var msg = [];
                                        msg.push('can\'t find guild. best match :  (' + bestMatch.guild.guildName + ')');
                                        self.postMessage(msg.join('\n'));
                                    }
                                }
                                else {
                                    var originSource = OriginSourceType.Smart;
                                    if (guild && guild.guildName != guildName) {
                                        guildName = guild.guildName;
                                    }
                                    this.sendGuildTargets([], guildName, guild, ownData, originSource);
                                }

                            }.bind(this));
                        }
                    }
                    ;


                    if (/^war\sended$/.test(txt) || /^warended$/.test(txt) || /^we$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar) {
                                this.endWar(roomData);
                            } else {
                                this.postMessage('not in war.');
                            }
                        }.bind(this));
                    }

                    if (/^war\s?status$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            //    console.log('war status', roomData);
                            this.postMessage(roomData.warData.inWar ? 'in war with ' + roomData.warData.guildName : 'not in war');
                        }.bind(this));
                    }

                    this.jokesHandler(txt);

                    if (/^myt$/.test(txt) || /^my\stargets$/.test(txt) || /^nut$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            try {
                                if (roomData.warData.inWar) {
                                    var player = roomPrefs.getRoomPlayerFromRoomPref(roomData, msg.user_id);
                                    var risk = player == undefined ? 0 : Number(player.risk);
                                    this.findUserTargets(roomData.warData.guildName, msg.name, risk);

                                } else {
                                    this.postMessage('can\'t look for targets while not in war.');
                                }
                            } catch (e) {
                                console.log('------->', e);
                                console.trace();
                            }
                        }.bind(this));
                    }

                    var settingsRgx = /^[Ss]et\s(\w+)\s(\w+)$/;
                    var validSettings = ['timer', 'matched'];
                    if (settingsRgx.test(txt)) {
                        var mtches = settingsRgx.exec(txt);

                        var key = mtches[1];
                        var val = mtches[2];
                        if (key == undefined || val == undefined) {
                            return;
                        }
                        if (validSettings.indexOf(key) == -1) {
                            this.postMessage('invalid setting key');
                            return;
                        }
                        this.getRoomPrefs().then(function (roomData) {
                            roomPrefs.setRoomSetting(roomData, key, val);
                            this.postMessage('Room setting ' + key + ' was set to ' + val);
                        }.bind(this));
                    }

                    var getSettingsRgx = /^[Gg]et\s(\w+)$/;
                    if (getSettingsRgx.test(txt)) {
                        var mtches = getSettingsRgx.exec(txt);

                        var key = mtches[1];
                        if (key == undefined) {
                            return;
                        }
                        if (validSettings.indexOf(key) == -1) {
                            this.postMessage('invalid setting key');
                            return;
                        }
                        this.getRoomPrefs().then(function (roomData) {
                            var val = roomPrefs.getRoomSettingFromRoomPref(roomData, key);
                            this.postMessage('Room setting for ' + key + ' is ' + (val == undefined ? 'default value' : val));
                        }.bind(this));
                    }

                    var minitRgx = /^minit(\d)?$/;
                    if (minitRgx.test(txt)) {
                        var mtch = minitRgx.exec(txt);
                        var idx = mtch[1] == undefined ? 1 : Number(mtch[1]);
                        this.getRoomPrefs().then(function (roomData) {
                            try {

                                if (roomData.warData.inWar) {
                                    var p = roomPrefs.getRoomPlayerFromRoomPref(roomData, msg.user_id);
                                    var minis = p == undefined ? [] : p.minis;
                                    var mini = _.find(minis, function (mini) {
                                        return mini.idx == idx;
                                    });
                                    if (p == null || p == undefined || mini == undefined) {
                                        this.postMessage('please set mini data using mymini command.');
                                    } else {
                                        this.findUserTargets(roomData.warData.guildName, mini.player, p.risk, true);
                                    }

                                } else {
                                    this.postMessage('can\'t look for targets while not in war.');
                                }
                            } catch (e) {
                                console.log('------->', e);
                                console.trace();
                            }
                        }.bind(this));
                    }
                    ;

                    var miniRgx = /^[mM]ymini(\d)?\s(.*)/;
                    if (miniRgx.test(caseSensitiveTxt)) {
                        var match = miniRgx.exec(caseSensitiveTxt);
                        var idx = match[1] == undefined ? 1 : Number(match[1]);
                        var miniP = new Player('199 ' + match[2]);
                        if (miniP.isPlayer()) {
                            //  console.log('adding mini : ' + miniP.toString().substr(4));
                            roomPrefs.addUpdateMini(this.roomId, msg.user_id, idx, miniP.toString().substr(4)).then(function (msg) {
                                this.postMessage(msg);
                            }.bind(this));

                        } else {
                            this.postMessage('can\'t get Mini stats, try something like mymini Name 1m/1k/1k');
                        }
                    }
                    if (/^[mM]ymini$/.test(txt)) {
                        roomPrefs.getRoomPlayer(this.roomId, msg.user_id).then(function (player) {

                            var msg = [];
                            if (player == undefined || player.minis.length == 0) {
                                this.postMessage('you don\'t have any toons set.')
                                return;
                            } else {
                                _.each(player.minis || [], function (mini) {
                                    var p = new Player('199 ' + mini.player);
                                    if (p.isPlayer()) {
                                        msg.push('Mini #' + mini.idx + ': ' + p.toString().substr(4));
                                    }
                                });
                                this.postMessage(msg.join('\n'));
                            }
                        }.bind(this));
                    }
                    var riskRgx = /^[mM]yrisk\s?(\d?\d?)/;
                    if (riskRgx.test(caseSensitiveTxt)) {
                        var match = riskRgx.exec(caseSensitiveTxt);
                        var risk = match[1];
                        if (risk != undefined && risk != '') {
                            risk = Number(risk);
                            if (risk > 10) {
                                risk = 10;
                            }
                            roomPrefs.updatePlayerRisk(self.roomId, msg.user_id, msg.name, risk).then(function (retMsg) {
                                this.postMessage(retMsg);

                            }.bind(this));
                        } else {
                            this.getRoomPrefs().then(function (roomPref) {
                                var player = _.find(roomPref.playersPrefs || [], function (p) {
                                    return p.id == msg.user_id;
                                });
                                this.postMessage('Current risk for ' + msg.name + ' is ' + (player == undefined ? 0 : player.risk));
                            }.bind(this));
                        }
                    }

                    var bulkRgx = /^[bB]ulk\s?\b(on|off)?/;
                    if (bulkRgx.test(caseSensitiveTxt)) {
                        var match = bulkRgx.exec(caseSensitiveTxt);
                        var newMode = match[1];
                        if (!(newMode == '' || newMode == undefined)) {
                            var newBulkMode = (newMode == 'on') ? true : false;
                            ctxPlayer.bulk = newBulkMode;
                            this.updateCtxPlayer(ctxPlayer);
                            this.postMessage('Bulk mode is ' + (ctxPlayer.bulk ? 'on' : 'off') + ' for ' + msg.name);

                        } else {
                            this.postMessage('Bulk mode is ' + (ctxPlayer.bulk ? 'on' : 'off') + ' for ' + msg.name);

                        }
                    }

                    if (/^help$/.test(txt)) {
                        this.showHelp();
                    }

                    if (/^helpwar$/.test(txt)) {
                        this.showHelpwar();
                    }

                    var removeRgx = /^[rR][eE][mM][oO][vV][eE]\s*(\d+)\s(.*)/;
                    if (removeRgx.test(caseSensitiveTxt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar) {
                                // console.log('removing user');
                                this.removeUserFromOwnData(roomData.warData.guildName, removeRgx.exec(caseSensitiveTxt), msg).then(function (msg) {
                                    if (msg != '') {
                                        self.postMessage(msg);
                                    }

                                });
                            } else {
                                this.postMessage('can\'t remove a user while not in war.');
                            }
                        }.bind(this));
                    }

                    // handle insertion
                    var lines = caseSensitiveTxt.split('\n');

                    var maxLines = ctxPlayer.bulk ? 20 : 1;
                    var usersToAdd = [];
                    for (var i = 0; i < maxLines && i < lines.length; i++) {
                        var addUser = new Player(lines[i]);
                        if (addUser.isPlayer()) {
                            usersToAdd.push(addUser);
                        }
                    }
                    if (usersToAdd.length > 0) {
                        this.getRoomPrefs().then(function (roomData) {
                            //  console.log(roomData);
                            if (roomData.warData.inWar) {
                                this.insertOwnData(roomData.warData.guildName, usersToAdd, msg.name, self.roomId, msg.user_id);
                            } else {
                                this.postMessage('Not in war at the moment, cant add users.')

                            }
                        }.bind(this));

                    }

                },
                jokesHandler: function (txt) {
                    if (/^joke$/.test(txt)) {
                        this.tellAJoke();
                        return;
                    }

                    if (/facepalm/.test(txt)) {
                        this.tellGifJoke('marvel-wolverine-facepalm');
                        return;
                    }

                    if (/potato/.test(txt)) {
                        this.tellGifJoke('yellow-minions-potato');
                        return;
                    }

                    if (/gumby/.test(txt)) {
                        this.tellGifJoke('unf-gumby');
                        return;
                    }

                    if (/rocketsnail/.test(txt)) {
                        this.tellGifJoke('SQgbkziuGrNxS');
                        return;
                    }
                    if (/cowbell/.test(txt)) {
                        this.tellGifJoke('whOs1JywNpe6c');
                        return;
                    }
                    if (/hots favorite/.test(txt)) {
                        this.tellGifJoke('TuQUMaAji7pkY');
                        return;
                    }

                    if (/banana/.test(txt)) {
                        this.tellGifJoke('cw8Nr4u28tVKw');
                        return;
                    }

                    if (/^minions$/.test(txt)) {
                        this.tellGifJoke();
                        return;
                    }

                    var gifRgx = /^gif\s(.*)+$/;
                    if (gifRgx.test(txt)) {
                        var match = gifRgx.exec(txt);
                        this.tellGifJoke(match[1]);
                        return;
                    }


                }
                ,
                getCtxPlayer: function (id) {
                    var player = _.find(this.ctx.players, function (p) {
                        return p.id == id;
                    });
                    if (player == undefined) {
                        player = {
                            id: id,
                            bulk: false,
                            lastMsg: '',
                            options: []
                        }
                    }
                    return player;
                }
                ,
                updateCtxPlayer: function (p) {
                    var players = _.filter(this.ctx.players, function (el) {
                        return el.id != p.id;
                    });
                    players.push(p);
                    this.ctx.players = players;

                }
                ,

                handleCtxPlayer: function (txt, msg) {
                    var ctxPlayer = this.getCtxPlayer(msg.user_id);
                    var hasMatch = false;
                    var lowerCase = txt.toLowerCase();
                    _.each(ctxPlayer.options, function (option) {
                        if (option['key'].test(lowerCase)) {
                            this.mainSwitch(option.cmd, msg);
                            hasMatch = true;
                        }
                    }.bind(this));
                    ctxPlayer.options = [];
                    this.updateCtxPlayer(ctxPlayer);
                    return hasMatch;
                }
                ,
                addGlobalContextCommands: function(commands){
                    this.ctx.globalReq=this.ctx.globalReq.concat(commands);
                },
                handleGlobalCtxMsg: function (txt, msg) {
                    var lowerCase = txt.toLowerCase();
                    var hasMatch = false;
                    _.each(this.ctx.globalReq, function (option) {
                        if (option['key'].test(lowerCase)) {
                            this.mainSwitch(option.cmd, msg);
                            hasMatch = true;
                        }
                    }.bind(this));
                    this.ctx.globalReq=[];
                    return hasMatch;
                },
                updateLastWarResults: function (txt) {
                    this.getRoomPrefs().then(function (roomData) {
                        var matches = roomData.matches || [];
                        var lastMatch=_.last(matches);
                        var won = /yes/.test(txt) || /won/.test(txt) || /win/.test(txt) || /yep/.test(txt);
                        if (lastMatch){
                            lastMatch.warResult=won?'won':'lost';
                            roomData.save();
                            this.postMessage('Last war results were saved.');
                        }

                    }.bind(this));
                }
                ,

                tellAJoke: function () {
                    var self = this;
                    chuckJokes.getJoke().then(function (joke) {
                        self.postMessage(joke);
                    }.bind(this))
                }
                ,

                tellGifJoke: function (theme) {
                    var self = this;
                    theme = typeof(theme) == 'string' ? theme : 'minions';
                    //  console.log('gif ', theme);
                    giphy.random(encodeURI(theme), function (err, response) {
                        if (err == null) {
                            self.postMessage('', response.data.image_url);
                        } else {
                            self.postMessage('could not find this theme.');

                        }
                    })
                }
                ,

                showHelpwar: function () {
                    var helpMsg = [];
                    helpMsg.push('War command list:');
                    helpMsg.push('matched [guildname] - starts war and war timer');
                    helpMsg.push('we - ends current war and ends timer');
                    helpMsg.push('targets - displays targets from Raven Database');
                    helpMsg.push('ss targets - displays targets from Intel SpreadSheet');
                    helpMsg.push('all targets - Raven + SS intel.');
                    helpMsg.push('myt - user targets during war.');
                    helpMsg.push('minit - mini\'s targets during war');
                    helpMsg.push('123 username 1m/2k/3k - adds user.');
                    helpMsg.push('remove 123 username - removes a user from Raven DB.');
                    helpMsg.push('time - displays minutes left in current war');
                    helpMsg.push('sync mm - syncs number of minutes left for current war');
                    helpMsg.push('myrisk 0-6 - sets user risk for myt & minit');
                    helpMsg.push('lastwarresults yes/no - update last war results for the records.');

                    this.postMessage(helpMsg.join('\n'));
                }
                ,

                showHelp: function () {
                    var helpMsg = [];
                    helpMsg.push('General Use command list:');
                    helpMsg.push('hello - greet the bot.');
                    helpMsg.push('helpwar - displays War commands');
                    helpMsg.push('mymini# user 1m/2k/3k - sets mini# stats');
                    helpMsg.push('mymini - displays current stats of minis');
                    helpMsg.push('joke - random joke');
                    helpMsg.push('minions - random minion gif');
                    helpMsg.push('gif (insert phrase) - random theme gif');
                    helpMsg.push('support - provides link to support room');
                    helpMsg.push('manual - gets Raven manual');
                    helpMsg.push('targets in XXX - show intel for guild XXX')
                    // helpMsg.push('bulk on/off - enable/disable bulk mode');

                    this.postMessage(helpMsg.join('\n'));
                }
                ,
                insertOwnData: function (guildName, playersToAdd, addingUserName, addingUserGuild, addingUserId) {
                    var defered = Q.defer();
                    var self = this;
                    var ctxPlayer = this.getCtxPlayer(addingUserId);
                    ctxPlayer.options = [];
                    guildData.getGuildData(guildName, function (item) {
                        for (var i = 0; i < playersToAdd.length; i++) {
                            var player = playersToAdd[i];
                            var players = _.filter(item.players, function (el) {
                                return !(utils.capitaliseFirstLetter(el.name) == player.name && el.lvl == player.lvl);
                            });
                            var mode = players.length == item.players.length ? 'added' : 'updated';
                            if (mode == 'added') {
                                var similarPlayers = _.filter(item.players, function (el) {
                                    var diff = Math.abs(Number(el.lvl) - Number(player.lvl));
                                    var nameMatch = el.name.toLowerCase() == player.name.toLowerCase();
                                    return nameMatch && diff <= 3;
                                });
                                if (similarPlayers.length > 0) {
                                    var msg = [];
                                    msg.push('Found similar players, reply yes to remove:');
                                    _.each(similarPlayers, function (p) {
                                        msg.push(p.lvl + ' ' + utils.capitaliseFirstLetter(p.name));
                                        ctxPlayer.options.push({
                                            'key': new RegExp('^[Yy]es$'),
                                            'cmd': 'remove ' + p.lvl + ' ' + utils.capitaliseFirstLetter(p.name)
                                        });
                                    });
                                    self.postMessage(msg.join('\n'));
                                }
                            }
                            var gpo = player.getGuildPlayerObj();
                            gpo.insertedByGuild = addingUserGuild;
                            gpo.insertedByUser = addingUserName;
                            gpo.insertedByUserId = addingUserId;
                            players.push(gpo);
                            item.players = players;
                            item.save(function () {
                                defered.resolve();
                            });
                            self.postMessage(mode + ' [' + player.toString() + ']');
                        }
                        this.updateCtxPlayer(ctxPlayer);
                    }.bind(this));

                    return defered.promise;
                }
                ,
                removeUserFromOwnData: function (guildName, mtch, msg) {
                    var defered = Q.defer();
                    var lvl = mtch[1];
                    var username = mtch[2];
                    var self = this;
                    //   console.log('remove', lvl, username);
                    guildData.getGuildData(guildName, function (item) {

                        var guildPlayers = item.players;
                        var playerToRemove = _.find(guildPlayers, function (el) {
                            return (utils.capitaliseFirstLetter(el.name) == utils.capitaliseFirstLetter(username) && el.lvl == lvl);
                        });
                        var players = _.filter(guildPlayers, function (el) {
                            return !(utils.capitaliseFirstLetter(el.name) == utils.capitaliseFirstLetter(username) && el.lvl == lvl);
                        });
                        if (guildPlayers.length == players.length) {
                            defered.resolve("Can\'t find " + lvl + ' ' + username + ' in RavenDB');
                            return;
                        }
                        item.players = players;
                        var playerCls = new Players();
                        var pToRemove = playerCls.getPlayerObjFromDBPlayers(playerToRemove ? [playerToRemove] : []);
                        var removedOne = username;
                        if (pToRemove.length > 0) {
                            removedOne = pToRemove[0].toString();
                        }
                        audit.add({
                            guildName: guildName,
                            roomId: msg.group_id,
                            performerId: msg.user_id,
                            performerName: msg.name,
                            action: 'Remove user - ' + removedOne
                        });
                        item.save(function () {
                            defered.resolve('removed ' + lvl + ' ' + username + ' from RavenDB');
                        });
                    }.bind(this));
                    return defered.promise;

                }
                ,

                getCandidatesForUser: function (user, risk, combinedGuildData) {
                    var msg = [];

                    var riskDef = [
                        {'all': 1.2, 'line1': .65, 'line2': .77, 'line3': .5},
                        {'all': 1.1, 'line1': .6, 'line2': .75, 'line3': .45},
                        {'all': 1, 'line1': .55, 'line2': .7, 'line3': .45},
                        {'all': 0.9, 'line1': .45, 'line2': .65, 'line3': .4},
                        {'all': 0.7, 'line1': .4, 'line2': .6, 'line3': .35},
                        {'all': 0.5, 'line1': .35, 'line2': .5, 'line3': .3},
                        {'all': 0, 'line1': .2, 'line2': .4, 'line3': .2}
                    ];

                    var tttriskDef = [
                        {'all': 1.2, 'line1': .35, 'line2': .6, 'line3': .8},
                        {'all': 1.1, 'line1': .35, 'line2': .65, 'line3': .75},
                        {'all': 1, 'line1': .3, 'line2': .6, 'line3': .7},
                        {'all': 0.9, 'line1': .25, 'line2': .5, 'line3': .6},
                        {'all': 0.7, 'line1': .25, 'line2': .5, 'line3': .5},
                        {'all': 0.5, 'line1': .25, 'line2': .4, 'line3': .4},
                        {'all': 0, 'line1': .2, 'line2': .4, 'line3': .3}
                    ];

                    var riskFactor;
                    while (riskDef[risk] == undefined) {
                        risk -= 1;
                    }
                    riskFactor = riskDef[risk];
                    var candidates = [],
                        dups = {},
                        noDups = [],
                        uniqData = [];

                    _.each(combinedGuildData, function (player) {
                            var playerKey = player.name + '_' + Math.floor(player.lvl / 10);
                            var equiv = _.find(combinedGuildData, function (p) {
                                return playerKey == p.name + '_' + Math.floor(p.lvl / 10) && p.origin != player.origin;
                            });
                            if (equiv != undefined) {
                                dups[playerKey] = dups[playerKey] || [];
                                dups[playerKey].push(player);
                            } else {
                                noDups.push(player);
                            }
                        }
                    );
                    _.each(dups, function (dup) {
                        var p1 = dup[0];
                        var p2 = dup[1];
                        if (p1.lvl > p2.lvl || (p1.isFresh() && !p2.isFresh()) || (p1.lvl == p2.lvl && p1.isFresh() && p2.isFresh() && p1.origin == 'R' && p2.origin == 'SS')) {
                            noDups.push(p1);
                        } else {
                            noDups.push(p2);
                        }
                    })

                    var historical = new Date();
                    historical.setDate(historical.getDate() - 21);

                    noDups = _.filter(noDups, function (player) {
                        return player.origin != 'R' || (player.insertDate.getTime() > historical.getTime());
                    });

                    uniqData = _.uniq(noDups, function (player) {
                        return player.name + '_' + Math.floor(player.lvl / 10);
                    });

                    _.each(uniqData, function (player) {
                        if (player.isPlayer() && player.def != 0 && player.eqDef != 0 && player.heroDef != 0) {
                            var line1 = user.def / player.def;
                            var line2 = user.eqDef / player.eqDef;
                            var line3 = user.heroDef / player.heroDef;

                            var all = (line1 * (7 / 14) + line2 * (5 / 14) + line3 * (2 / 14));

                            if (all >= riskFactor.all && line1 >= riskFactor.line1 && line2 >= riskFactor.line2 && line3 >= riskFactor.line3) {
                                player.rank = all;
                                candidates.push(player);
                            } else {
                                // console.log(player,all,line1,line2,line3);
                            }
                        }
                    });

                    var msg = [];

                    candidates = _.sortBy(candidates, function (player) {
                        return player.lvl + (player.isFresh() ? 200 : 0) + (player.origin == 'R' ? 100 : 0);
                    }).reverse();

                    candidates = candidates.slice(0, 5);
                    _.each(candidates, function (candidate) {
                        var crank = candidate.rank;
                        var rank = crank > 2 ? 'A' : crank > 1.5 ? 'B' : 'C';
                        msg.push(candidate.toString() + ' [' + candidate.origin + '|' + (candidate.isFresh() ? 'Fresh' : 'Old') + '|' + rank + ']');
                    });

                    return msg;
                }
                ,

                findUserTargets: function (guildName, userName, risk, showStats) {

                    var user = new Player('199 ' + userName);
                    if (!user.isPlayer()) {
                        this.postMessage('In order to user the myt command you must change your name in the room to reflect your stats using the following template: Name Atk/Eq Atk/Hero Atk');
                        return;
                    }

                    this.getParsedIntelForGuild(guildName).then(function (combinedGuildData) {
                            try {

                                var mega = false;
                                var candidates = this.getCandidatesForUser(user, risk, combinedGuildData);
                                if (candidates == 0) {
                                    mega = true;
                                    candidates = this.getCandidatesForUser(user, risk + 4, combinedGuildData);
                                }
                                var msg = [];
                                if (candidates.length == 0) {
                                    msg.push('Could not find targets for: ' + (showStats ? user.toString().substr(4) : user.name));
                                    msg.push('Try hitting castle, wall or scouting.');
                                } else {
                                    if (mega) {
                                        msg.push('******* USE MEGA FOR THESE *******')
                                    }
                                    msg.push('Suggested targets for ' + (showStats ? user.toString().substr(4) : user.name) + ' (Risk:' + risk + ')');
                                    msg.push(candidates.join('\n'));
                                    if (mega) {
                                        msg.push('******* USE MEGA FOR THESE *******')
                                    }
                                }

                                this.postMessage(msg.join('\n'));
                            }
                            catch
                                (ee) {
                                console.log('------->', ee);
                                console.trace();

                            }
                        }.bind(this)
                    )
                    ;

                }
                ,
                getParsedIntelForGuild: function (guildName) {
                    var defered = Q.defer();
                    sheetsData.getGuildData(guildName, function (ssGuildData) {
                        var players;
                        var playerCls = new Players();
                        players = ssGuildData == null ? [] : playerCls.getPlayers(ssGuildData.lastIntel, ssGuildData.lastIntelCell >= 3);
                        guildData.getGuildData(guildName, function (ourData) {
                            var ourPlayers = playerCls.getPlayerObjFromDBPlayers(ourData.players || []);
                            players = players.concat(ourPlayers);
                            defered.resolve(players);
                        });
                    }.bind(this));
                    return defered.promise;
                }
                ,
                getGuildData: function (guildName, getOldIntel) {
                    var defered = Q.defer();
                    getOldIntel = (typeof(getOldIntel) == 'undefined' ? true : getOldIntel);
                    var self = this;
                    //console.log('looking for data : ', guildName);
                    sheetsData.getGuildData(guildName).then(function (data) {
                        //   console.log('got data from SS',data);
                        /*{
                         foundGuild:foundGuild,
                         bestMatch:bestMatch
                         }*/
                        //  console.log(data);

                        if (data && data.foundGuild && data.foundGuild.guildName && data.foundGuild.guildName != guildName) {
                            guildName = data.foundGuild.guildName;
                        }

                        guildData.getGuildData(guildName, function (item) {
                            //     console.log('got own data ', item);
                            data.ownData = item;
                            defered.resolve(data);
                        }.bind(this));

                    }.bind(this));
                    return defered.promise;

                }
                ,

                enterWarMode: function (guildName, ssData, ownData) {
                    //   console.log('enter war mode', arguments);
                    this.getRoomPrefs().then(function (roomData) {
                        //  console.log('enter war mode with room data', roomData);
                        try {
                            if (ssData && ssData.guildName != guildName) {
                                guildName = ssData.guildName;
                            }

                            roomData.warData.inWar = true;
                            roomData.warData.guildName = guildName;
                            roomData.warData.warTime = Date.now();
                            roomData.save();
                            var msg = [];
                            msg.push('^^ WAR MODE ON ^^');

                            var lastWarStats=this.getLastWarStats(roomData,guildName);
                            if (lastWarStats!=''){
                                msg.push(lastWarStats);
                            }

                            var matchedMode = roomPrefs.getRoomSettingFromRoomPref(roomData, 'matched');
                            var originSource = OriginSourceType.Smart;
                            if (matchedMode == 'old') {
                                originSource = OriginSourceType.RavenNew | OriginSourceType.RavenOld | OriginSourceType.SSNew;
                            }
                            this.sendGuildTargets(msg, guildName, ssData, ownData, originSource);
                        }
                        catch (e) {
                            console.log('-------->', e);
                            console.trace();
                        }
                    }.bind(this));

                }
                ,
                sendGuildTargetsUnified: function (guildName) {
                    this.getParsedIntelForGuild(guildName).then(function (ssGuildData) {
                        try {
                            var msg = [];
                            var uniqData = _.uniq(ssGuildData, function (player) {
                                return player.name + '_' + Math.floor(player.lvl / 10);
                            });
                            var candidates = [];
                            _.each(uniqData, function (player) {
                                if (player.isPlayer() && player.def != 0 && player.eqDef != 0 && player.heroDef != 0) {
                                    candidates.push(player);
                                }
                            });
                            candidates = _.sortBy(candidates, function (player) {
                                return player.lvl;
                            }).reverse();
                            // console.log(candidates);

                            _.each(candidates, function (candidate) {
                                var crank = candidate.rank;
                                var rank = crank > 2 ? 'A' : crank > 1.5 ? 'B' : 'C';
                                msg.push(candidate.toString() + ' [' + candidate.origin + '|' + (candidate.isFresh() ? 'Fresh' : 'Old') + ']');
                            });

                            this.postMessage(msg.join('\n'));
                        } catch (e) {
                            console.log('------->', e);
                        }
                    }.bind(this));

                }
                ,
                sendGuildTargets: function (msg, guildName, ssData, ownData, originType) {
                    //   console.log('send guild targets',arguments);
                    msg = msg || [];
                    msg.push('Targets in ' + guildName + ' :');
                    var ssGuildData = ssData != null ? ssData.lastIntel : '';
                    var ravenPlayersCtr = 0;
                    if ((originType & OriginSourceType.RavenNew) ||
                        (originType & OriginSourceType.RavenOld) ||
                        (originType == OriginSourceType.Smart)) {
                        if (ownData != null && ownData.players.length != 0) {
                            msg.push('Raven data:');
                            var p = new Players();
                            var ownIntel = p.getPlayersIntelFromOwnData(ownData.players);
                            msg.push(ownIntel);
                            ravenPlayersCtr = (ownIntel.match(/\n/g) || []).length;
                        }
                        else {
                            msg.push('\nNo Raven data, Please add data.')
                        }
                    }
                    if ((originType & OriginSourceType.SSNew) ||
                        (originType & OriginSourceType.SSOld) ||
                        (originType == OriginSourceType.Smart)) {
                        if ((originType != OriginSourceType.Smart || (ravenPlayersCtr < 8)) && ssGuildData != null && ssGuildData.length > 5) {
                            if (ravenPlayersCtr > 0) {
                                msg.push('');
                            }
                            msg.push('SS data:');
                            ssGuildData = ssGuildData.replace(/\n\s*\n/g, '\n');
                            msg.push(ssGuildData);
                        } else {
                            if (originType != OriginSourceType.Smart) {
                                msg.push('\nNo SS data.');
                            }
                        }
                    }
                    this.postMessage(msg.join('\n'));

                }
                ,

                onTimeTick: function (roomData) {

                    var d = new Date();
                    var diff = d - roomData.warData.warTime;
                    var timerSettings = roomPrefs.getRoomSettingFromRoomPref(roomData, 'timer');
                    var diffInSeconds = Math.round(diff / 1000);
                    var diffInMinutes = Math.round(diffInSeconds / 60);
                    if (diffInMinutes >= 60) {
                        this.endWar(roomData);
                    } else if ((diffInMinutes % 10 == 0 && diffInMinutes > 0) || diffInMinutes == 55) {
                        if (timerSettings != 'off') {
                            this.postMessage(60 - diffInMinutes + " minutes left.");
                        }
                    }
                }
                ,
                endWar: function (roomData) {
                    var matchStat={
                        guildName: roomData.warData.guildName,
                        warTime: roomData.warData.warTime,
                        warResult:'unknown'
                    };
                    var matches=roomData.matches || [];
                    matches.push(matchStat);
                    roomData.matches=matches;
                    roomData.warData.inWar = false;
                    roomData.warData.guildName = '';
                    roomData.save();
                    this.addGlobalContextCommands([{
                        'key': new RegExp('^[Yy]es$'),
                        'cmd': 'lastwarresults yes'
                    },{
                        'key': new RegExp('^[Nn]o$'),
                        'cmd': 'lastwarresults no'
                    }
                    ]);
                    this.postMessage('War Ended.\ndid we win this one ? (yes/no)');
                }
                ,
                getLastWarStats: function(roomData,guildName){
                    var matches=roomData.matches || [];
                    var guildFights= _.filter(matches,function(match){
                        return match.guildName.toLowerCase()==guildName;
                    });
                    if (guildFights===undefined || guildFights.length==0){
                        return '';
                    }
                    var stats=[];
                    stats.push('you have fought '+guildFights.length+' times in the past,');
                    var lastwar=_.last(guildFights);
                    var wartime=moment(lastwar.warTime);
                    stats.push('last war was '+wartime.fromNow()+' and war result is '+lastwar.warResult+'.');
                    return stats.join('\n');
                },
                saveRavenDataToSS: function (guildName) {
                    this.getGuildData(guildName).then(function (data) {
                        if (data.ownData != null && data.ownData.players.length != 0) {
                            var msg = [];
                            msg.push('');
                            msg.push('----------->>>>');
                            msg.push('Raven data:');
                            var p = new Players();
                            var ownIntel = p.getPlayersIntelFromOwnData(data.ownData.players, '&#10;', false);
                            msg.push(ownIntel);
                            msg.push('----------->>>>');
                            sheetsData.setGuildData(data.foundGuild, msg.join('&#10;'));
                        }

                    });
                }
            }
        }
        ()
    )
    ;

//util.inherits(BotsManager, events.EventEmitter);

module.exports = function (options, idx) {
    var md = new Bot(options, idx);
    return md;
};
