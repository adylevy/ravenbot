/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
const _ = require('underscore');
var giphy = require('./giphy.js')('dc6zaTOxFJmzC');
var chuckJokes = require('./chuckJokes.js');
var sheetsData = require('./sheets.js');
var mongoData = require('./mongoData.js')(process.env['MONGOLAB_URI']);
var Player = require('./player_cls.js');
var Players = require('./players.js');
var BotBase = require('./botBase.js').BotBase;
var utils = require('./utils.js');

var Bot = BotBase.extend(function () {


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
                        players: []
                    };

                    console.log('new bot **', this.options, this.roomId);
                },
                getRoomPrefs: function () {
                    var defered = Q.defer();
                    mongoData.getRoomPrefs(this.roomId).then(function (data) {
                        defered.resolve(data);
                    });
                    return defered.promise;

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
                         //   console.log(msg);
                            this.mainSwitch(msg.text.trim(), msg);
                        }
                        catch (e) {
                            console.log('-------->', e, ' <<---');
                        }
                    }
                },

                mainSwitch: function (txt, msg) {
                    var self = this;
                    var caseinsensitive = txt;
                    txt = txt.toLowerCase();
                    var ctxPlayer = this.getCtxPlayer(msg.user_id);
                    
                    if (this.handleCtxPlayer(caseinsensitive,msg)){
                        return;                        
                    }
                    
                    if (/^hello$/.test(txt)) {
                        this.postMessage('Hey there! :pilgrim:');
                    }

                    if (/^all\stargets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                self.getGuildData(roomData.warData.guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var ownData = data.ownData;
                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, true);
                                });
                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
                            }
                        }.bind(this));
                    }

                    if (/^manual$/.test(txt)){
                        this.postMessage('Raven Manual:\nhttps://docs.google.com/document/d/15naOzWKf9z9CT-D4hHZTryTE55l4HyNiR8sahye0TzU/edit');
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
                                self.getGuildData(roomData.warData.guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var ownData = data.ownData;
                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, false);
                                });
                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
                            }
                        }.bind(this));
                    }

                    if (/^time$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
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
                                    console.log(e);
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

                    var newMatchRgx = /^matched\s*(new){0,1}\s*(.*)/;
                    if (newMatchRgx.test(txt)) {

                        var regexmatch = newMatchRgx.exec(txt);
                        // console.log('matched!',regexmatch);
                        if (regexmatch != null) {
                            var guildName = regexmatch[2];
                            if (regexmatch[1] == 'new') {
                                var g = mongoData.createNewGuild(guildName);
                                g.save();
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
                                            msg.push('or you can use [matched new GuildName]');
                                            self.postMessage(msg.join('\n'));
                                        }
                                    }
                                    else {
                                        self.enterWarMode(guildName, guild, ownData);
                                    }
                                });
                            }
                        }
                    }

                    if (/^war\sended$/.test(txt) || /^warended$/.test(txt) || /^we$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar) {
                                roomData.warData.inWar = false;
                                roomData.warData.guildName = '';
                                roomData.save();
                                this.postMessage('did we win this one ?');
                            } else {
                                this.postMessage('not in war.');
                            }
                        }.bind(this));
                    }

                    if (/^warstatus$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            console.log('war status', roomData);
                            this.postMessage(roomData.warData.inWar ? 'in war with ' + roomData.warData.guildName : 'not in war');
                        }.bind(this));
                    }

                    this.jokesHandler(txt);

                    if (/^myt$/.test(txt) || /^my\stargets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            try {
                                if (roomData.warData.inWar) {
                                    this.getUser(msg.user_id).then(function (player) {
                                        var risk = player == undefined ? 0 : Number(player.risk)
                                        this.findUserTargets(roomData.warData.guildName, msg.name, risk);
                                    }.bind(this));
                                } else {
                                    this.postMessage('can\'t look for targets while not in war.');
                                }
                            } catch (e) {
                                console.log('------->', e);

                            }
                        }.bind(this));
                    }
                    
                    var settingsRgx=/^[Ss]et\s(\w+)\s(\w+)$/;
                    var validSettings=['timer'];
                    if (settingsRgx.test(txt)){
                        var mtches=settingsRgx.exec(txt);
                       
                        var key=mtches[1];
                        var val=mtches[2];
                        if (key==undefined || val==undefined){
                            return;                            
                        }
                        if (validSettings.indexOf(key)==-1){
                            this.postMessage('invalid setting key');
                            return;
                        }
                        this.getRoomPrefs().then(function (roomData) {
                            this.setRoomSetting(roomData,key,val);
                            this.postMessage('Room setting '+key+' was set to '+val);
                        }.bind(this));
                    }

                    var getSettingsRgx=/^[Gg]et\s(\w+)$/;
                    if (getSettingsRgx.test(txt)){
                        var mtches=getSettingsRgx.exec(txt);
                       
                        var key=mtches[1];
                        if (key==undefined){
                            return;
                        }
                        if (validSettings.indexOf(key)==-1){
                            this.postMessage('invalid setting key');
                            return;
                        }
                        this.getRoomPrefs().then(function (roomData) {
                            var val=this.getRoomSetting(roomData,key);
                            this.postMessage('Room setting for '+key+' is '+(val==undefined ? 'default value' : val));
                        }.bind(this));
                    }
                        
                    if (/^minit$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            try {

                                if (roomData.warData.inWar) {
                                    this.getUser(msg.user_id).then(function (p) {
                                        if (p == null || p == undefined) {
                                            this.postMessage('please set mini data using mymini command.');
                                        } else {
                                            this.findUserTargets(roomData.warData.guildName, p.mini, p.risk);
                                        }
                                    }.bind(this))
                                } else {
                                    this.postMessage('can\'t look for targets while not in war.');
                                }
                            } catch (e) {
                                console.log('------->', e);
                            }
                        }.bind(this));
                    };

                    var miniRgx = /^[mM][yY][mM][iI][nN][iI]\s(.*)/;
                    if (miniRgx.test(caseinsensitive)) {
                        var match = miniRgx.exec(caseinsensitive);
                        var miniP = new Player('199 ' + match[1]);
                        if (miniP.isPlayer()) {
                            console.log('adding mini : ' + miniP.toString());
                            this.updateRoomPrefs(msg.user_id, miniP.toString().substr(2));

                        } else {
                            this.postMessage('can\'t get Mini stats, try something like mymini Name 1m/1k/1k');
                        }
                    }
                    var riskRgx = /^[mM]yrisk\s?(\d?\d?)/;
                    if (riskRgx.test(caseinsensitive)) {
                        var match = riskRgx.exec(caseinsensitive);
                        var risk = match[1];
                        if (risk != undefined && risk != '') {
                            risk = Number(risk);
                            if (risk > 10) {
                                risk = 10;
                            }
                            this.updatePlayerRisk(msg.user_id, msg.name, risk);
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
                    if (bulkRgx.test(caseinsensitive)) {
                        var match = bulkRgx.exec(caseinsensitive);
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

                    var removeRgx = /^[rR][eE][mM][oO][vV][eE]\s*(\d+)\s(.*)/;
                    if (removeRgx.test(caseinsensitive)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar) {
                                console.log('removing user');
                                this.removeUserFromOwnData(roomData.warData.guildName, removeRgx.exec(caseinsensitive)).then(function (msg) {
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
                    var lines = caseinsensitive.split('\n');
                   
                    var maxLines = ctxPlayer.bulk ? 20 : 1;
                    var usersToAdd = [];
                    for (var i = 0; i < maxLines && i < lines.length; i++) {
                      //  console.log('trying to add line' + i);
                        var addUser = new Player(lines[i]);
                        // console.log(addUser);
                        if (addUser.isPlayer()) {
                            usersToAdd.push(addUser);
                        }
                    }
                    if (usersToAdd.length > 0) {
                        this.getRoomPrefs().then(function (roomData) {
                            //  console.log(roomData);
                            if (roomData.warData.inWar) {

                                this.insertOwnData(roomData.warData.guildName, usersToAdd, msg.name, self.roomId,msg.user_id);

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

                    if (/cowbell/.test(txt)) {
                        this.tellGifJoke('cowbell snl');
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


                },
                getCtxPlayer: function (id) {
                    var player = _.find(this.ctx.players, function (p) {
                        return p.id == id;
                    });
                    if (player == undefined) {
                        player = {
                            id: id,
                            bulk: false,
                            lastMsg: '',
                            options:[]
                        }
                    }
                    return player;
                },
                updateCtxPlayer: function (p) {
                    var players = _.filter(this.ctx.players, function (el) {
                        return el.id != p.id;
                    });
                    players.push(p);
                    this.ctx.players = players;

                },

                handleCtxPlayer:function(txt,msg){
                    var ctxPlayer=this.getCtxPlayer(msg.user_id);
                    var hasMatch=false;
                    var lowerCase=txt.toLowerCase();
                    _.each(ctxPlayer.options,function(option){
                        if (option['key'].test(lowerCase)){
                            this.mainSwitch(option.cmd,msg);
                            hasMatch=true;
                        }
                    }.bind(this));
                    ctxPlayer.options=[];
                    this.updateCtxPlayer(ctxPlayer);
                    return hasMatch;
                },
                
                tellAJoke: function () {
                    var self = this;
                    chuckJokes.getJoke().then(function (joke) {
                        self.postMessage(joke);
                    }.bind(this))
                },

                tellGifJoke: function (theme) {
                    var self = this;
                    theme = typeof(theme) == 'string' ? theme : 'minions';
                    console.log('gif ', theme);
                    giphy.random(encodeURI(theme), function (err, response) {
                        if (err == null) {
                            self.postMessage('', response.data.image_url);
                        } else {
                            self.postMessage('could not find this theme.');

                        }
                    })
                },

                showHelp: function () {
                    var helpMsg = [];
                    helpMsg.push('command list:');
                    helpMsg.push('hello - greet the bot.');
                    helpMsg.push('targets - current targets.');
                    helpMsg.push('all targets - new+old intel.');
                    helpMsg.push('matched [guildName] - enter war mode.');
                    helpMsg.push('123 user 1m/2k/3k - adds user.');
                    helpMsg.push('remove 123 user name - removes a user from our own DB.');
                    helpMsg.push('warended - ends war mode.');
                    helpMsg.push('joke - random joke.');
                    helpMsg.push('minions - random minion gif.');
                    helpMsg.push('gif theme - random theme gif.');
                    helpMsg.push('myt - user targets during war.');
                    helpMsg.push('minit - mini\'s targets during war.');
                    helpMsg.push('mymini user 1m/2k/3k - set mini for user.');
                    helpMsg.push('time - shows war timer.');
                    helpMsg.push('sync mm - syncs number of minutes left for war');
                    helpMsg.push('myrisk 0-6 - sets user risk for myt & minit');
                    helpMsg.push('manual - gets Raven manual');
                    // helpMsg.push('bulk on/off - enable/disable bulk mode');

                    this.postMessage(helpMsg.join('\n'));
                },
                insertOwnData: function (guildName, playersToAdd, addingUserName, addingUserGuild,addingUserId) {
                    var defered = Q.defer();
                    var self = this;
                    var ctxPlayer = this.getCtxPlayer(addingUserId);
                    ctxPlayer.options=[];
                    mongoData.getGuildData(guildName, function (item) {
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
                                    return nameMatch && diff<=3;
                                });
                                if (similarPlayers.length>0){
                                    var msg=[];
                                    msg.push('Found similar players, reply yes to remove:');
                                    _.each(similarPlayers,function(p){
                                        msg.push(p.lvl+' '+utils.capitaliseFirstLetter(p.name));
                                        ctxPlayer.options.push({
                                            'key':new RegExp('^[Yy]es$'),
                                            'cmd':'remove '+ p.lvl+' '+utils.capitaliseFirstLetter(p.name)
                                        });
                                    });
                                    self.postMessage(msg.join('\n'));
                                }
                            }
                            var gpo = player.getGuildPlayerObj();
                            gpo.insertedByGuild = addingUserGuild;
                            gpo.insertedByUser = addingUserName;
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
                },
                removeUserFromOwnData: function (guildName, mtch) {
                    var defered = Q.defer();
                    var lvl = mtch[1];
                    var username = mtch[2];
                    console.log('remove', lvl, username);
                    mongoData.getGuildData(guildName, function (item) {

                        var guildPlayers = item.players;

                        var players = _.filter(guildPlayers, function (el) {
                            return !(utils.capitaliseFirstLetter(el.name) == utils.capitaliseFirstLetter(username) && el.lvl == lvl);
                        });
                        if (guildPlayers.length == players.length) {
                            defered.resolve("Can\'t find " + lvl + ' ' + username + ' in RavenDB');
                            return;
                        }

                        item.players = players;

                        item.save(function () {
                            defered.resolve('removed ' + lvl + ' ' + username + ' from RavenDB');
                        });
                    }.bind(this));
                    return defered.promise;

                },

                findUserTargets: function (guildName, userName, risk) {
                    var self = this;
                    var user = new Player('199 ' + userName);
                    if (!user.isPlayer()) {
                        this.postMessage('In order to user the myt command you must change your name in the room to reflect your stats using the following template: Name Atk/Eq Atk/Hero Atk');
                        return;
                    }
                    console.log('find user targets ...', user.name, risk);

                    var riskDef = [
                        {'all': 1.2, 'line1': .65, 'line2': .8, 'line3': .7},
                        {'all': 1.1, 'line1': .6, 'line2': .75, 'line3': .65},
                        {'all': 1, 'line1': .55, 'line2': .7, 'line3': .6},
                        {'all': 0.9, 'line1': .45, 'line2': .65, 'line3': .55},
                        {'all': 0.7, 'line1': .4, 'line2': .6, 'line3': .4},
                        {'all': 0.5, 'line1': .35, 'line2': .5, 'line3': .3},
                        {'all': 0, 'line1': .2, 'line2': .4, 'line3': .2}
                    ];

                    var riskFactor = riskDef[0];
                    if (riskDef[risk] != undefined) {
                        riskFactor = riskDef[risk];
                    } else {
                        risk = 0;
                    }

                    this.getParsedIntelForGuild(guildName).then(function (guildData) {
                        try {
                            //  console.log('got parsed intel',guildData);
                            var candidates = [];

                            var uniqData = _.uniq(guildData, function (player) {
                                return player.name + '_' + Math.floor(player.lvl / 10);
                            });

                            _.each(uniqData, function (player) {
                                if (player.isPlayer() && player.def != 0 && player.eqDef != 0 && player.heroDef != 0) {
                                    var line1 = user.def / player.def;
                                    var line2 = user.eqDef / player.eqDef;
                                    var line3 = user.heroDef / player.heroDef;

                                    var all = (line1 * (7 / 14) + line2 * (5 / 14) + line3 * (2 / 14));
                                    // self.postMessage('player: '+player.name+' '+line1+' '+line2+' '+line3+' '+all);
                                    if (all >= riskFactor.all && line1 >= riskFactor.line1 && line2 >= riskFactor.line2 && line3 >= riskFactor.line3) {
                                        player.rank = all;
                                        candidates.push(player);
                                        // console.log(player.name,all)
                                    } else {
                                        //  console.log(player,all,line1,line2,line3);
                                    }
                                }
                            });

                            var msg = [];
                            if (candidates.length == 0) {
                                msg.push('Could not find targets for: ' + user.name);
                            } else {
                                msg.push('Suggested targets for ' + user.name + ' (Risk:' + risk + ')');

                            }
                            candidates = _.sortBy(candidates, function (player) {
                                return player.lvl + (player.isFresh() ? 200 : 0) + (player.origin == 'R' ? 100 : 0);
                            }).reverse();

                            /* candidates = _.sortBy(candidates, function (player) {
                             return player.isFresh();
                             }).reverse();*/
                            // console.log(candidates);
                            candidates = candidates.slice(0, 5);
                            _.each(candidates, function (candidate) {
                                var crank = candidate.rank;
                                var rank = crank > 2 ? 'A' : crank > 1.5 ? 'B' : 'C';
                                msg.push(candidate.toString() + ' [' + candidate.origin + '|' + (candidate.isFresh() ? 'Fresh' : 'Old') + '|' + rank + ']');
                            });

                            this.postMessage(msg.join('\n'));
                        }
                        catch (ee) {
                            console.log('------->', ee);
                            console.trace();

                        }
                    }.bind(this));

                },
                getParsedIntelForGuild: function (guildName) {
                    var defered = Q.defer();
                    var self = this;
                    sheetsData.getGuildData(guildName, function (guildData) {
                        //  console.log('got #1');
                        var players;
                        var playerCls = new Players();
                        // console.log('2-31=23-',guildData.lastIntel);

                        players = guildData == null ? [] : playerCls.getPlayers(guildData.lastIntel, guildData.lastIntelCell >= 3);

                        // console.log('2-31=23-',players);
                        mongoData.getGuildData(guildName, function (ourData) {
                            //      console.log('got #2');
                            var ourPlayers = [];
                            //  if (ourData.lastKnownIntel != '') {
                            ourPlayers = playerCls.getPlayerObjFromDBPlayers(ourData.players || []);
                            // }
                            players = players.concat(ourPlayers);
                            //  console.log('resolving getParsedIntel',players);
                            defered.resolve(players);
                        });
                    }.bind(this));
                    return defered.promise;
                },
                getGuildData: function (guildName) {
                    var defered = Q.defer();
                    var self = this;
                    console.log('looking for data : ', guildName);
                    sheetsData.getGuildData(guildName).then(function (data) {
                        //   console.log('got data from SS',data);
                        /*{
                         foundGuild:foundGuild,
                         bestMatch:bestMatch
                         }*/
                        mongoData.getGuildData(guildName, function (item) {
                            //     console.log('got own data ', item);
                            data.ownData = item;
                            defered.resolve(data);
                        }.bind(this));

                    });
                    return defered.promise;

                },

                enterWarMode: function (guildName, ssData, ownData) {
                    //   console.log('enter war mode', arguments);
                    this.getRoomPrefs().then(function (roomData) {
                        console.log('enter war mode with room data', roomData);
                        try {
                            roomData.warData.inWar = true;
                            roomData.warData.guildName = guildName;
                            roomData.warData.warTime = Date.now();
                            roomData.save();
                            var msg = new Array();
                            msg.push('War mode on!');
                            this.sendGuildTargets(msg, guildName, ssData, ownData, false);
                        }
                        catch (e) {
                            console.log('-------->', e);

                        }
                    }.bind(this));

                },
                sendGuildTargetsUnified: function (guildName) {
                    this.getParsedIntelForGuild(guildName).then(function (guildData) {
                        try {
                            var msg = [];
                            var uniqData = _.uniq(guildData, function (player) {
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
                            console.log(e);
                        }
                    }.bind(this));

                },
                sendGuildTargets: function (msg, guildName, ssData, ownData, all) {
                    //   console.log('send guild targets',arguments);
                    msg = msg || [];
                    msg.push('Targets in ' + guildName + ' :');
                    var guildData = ssData != null ? (all ? ssData.allIntel : ssData.lastIntel) : '';


                    //  console.log(ownData);
                    if (ownData != null && ownData.players.length != 0) {
                        msg.push('Raven data:');
                        var p = new Players();
                        var ownIntel = p.getPlayersIntelFromOwnData(ownData.players);
                        msg.push(ownIntel);
                    } else {
                        msg.push('\nNo Raven data, Please add data.')
                    }
                    if (guildData != null && guildData.length > 5) {
                        msg.push('\nSS data:');
                        guildData = guildData.replace(/\n\s*\n/g, '\n');
                        msg.push(guildData);
                    } else {
                        msg.push('\nNo SS data.');
                    }

                    this.postMessage(msg.join('\n'));

                },
                getUser: function (userId) {
                    var defered = Q.defer();
                    this.getRoomPrefs().then(function (roomPref) {
                        var players = roomPref.playersPrefs || [];
                        var player = _.find(players, function (p) {
                            return p.id == userId;
                        });
                        defered.resolve(player);
                    });
                    return defered.promise;

                },
                updatePlayerRisk: function (userId, name, risk) {
                    this.getRoomPrefs().then(function (roomPref) {

                            var player = _.find(roomPref.playersPrefs || [], function (p) {
                                return p.id == userId;
                            });
                            var players = _.filter(roomPref.playersPrefs || [], function (el) {
                                return el.id != userId;
                            });
                            players.push({
                                id: Number(userId),
                                mini: player == undefined ? '' : (player.mini || ''),
                                risk: risk
                            });

                            roomPref.playersPrefs = players;

                            roomPref.save();
                            this.postMessage('updated risk for ' + name + ' to ' + risk);
                        }.bind(this)
                    );

                },
                updateRoomPrefs: function (userId, miniPlayer) {
                    this.getRoomPrefs().then(function (roomPref) {
                            //{id:Number,mini:String}
                            //  console.log('got prefs', roomPref);
                            var player = _.find(roomPref.playersPrefs || [], function (p) {
                                return p.id == userId;
                            });
                            var players = _.filter(roomPref.playersPrefs || [], function (el) {
                                return el.id != userId;
                            });

                            players.push({
                                id: Number(userId),
                                mini: miniPlayer,
                                risk: player == undefined ? 0 : player.risk
                            });

                            roomPref.playersPrefs = players;

                            roomPref.save();
                            this.postMessage('updated Mini - ' + miniPlayer);
                        }.bind(this)
                    );
                },
                getRoomSetting: function(roomPref,settingName){
                    var settings=roomPref.settings || [];
                    var setting= _.find(settings,function(s){
                        return s.key==settingName;                        
                    });
                    
                    return setting==undefined ? null : setting.val;
                    
                },
                setRoomSetting: function(roomPref, settingName, settingVal){
                    var settings=roomPref.settings || [];
                    settings= _.filter(settings, function (s) {
                        return s.key!=settingName;
                    });
                    settings.push({
                        'key':settingName,
                        'val':settingVal
                    });
                    roomPref.settings=settings;
                    roomPref.save();
                },
                onTimeTick: function (roomData) {
                   
                    var d = new Date();
                    var diff = d - roomData.warData.warTime;
                    var timerSettings=this.getRoomSetting(roomData,'timer');
                    var diffInSeconds = Math.round(diff / 1000);
                    var diffInMinutes = Math.round(diffInSeconds / 60);
                    if (diffInMinutes >= 60) {
                        roomData.warData.inWar = false;
                        roomData.warData.guildName = '';
                        roomData.save(function (e) {
                            console.log(e);
                        });
                        this.postMessage("War ended. did we win this one ?");
                    } else if ((diffInMinutes % 10 == 0 && diffInMinutes > 0) || diffInMinutes==55) {
                        if (timerSettings!='off') {
                            this.postMessage(60 - diffInMinutes + " minutes left.");
                        }
                    }
                }
            }
        }()
    )
    ;

//util.inherits(BotsManager, events.EventEmitter);

module.exports = function (options, idx) {
    var md = new Bot(options, idx);
    return md;
};
