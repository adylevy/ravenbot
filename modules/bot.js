/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
var Class = require('./Class.js').Class;

const request = require('request');
const _ = require('underscore');
var giphy = require('./giphy.js')('dc6zaTOxFJmzC');
var chuckJokes = require('./chuckJokes.js');
var sheetsData = require('./sheets.js');
var mongoData = require('./mongoData.js')(process.env['MONGOLAB_URI']);
var Player = require('./player_cls.js');
var Players = require('./players.js');
var BotBase = require('./botBase.js').BotBase;


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
                        this.mainSwitch(msg.text.toLowerCase().trim(), msg);
                    }

                },

                mainSwitch: function (txt, msg) {
                    var self = this;

                    if (/^hello$/.test(txt)) {
                        this.postMessage('Hey there!');
                    }

                    if (/^all\stargets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                self.getGuildData(roomData.warData.guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var bestMatch = data.bestMatch;
                                    var ownData = data.ownData;

                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, true);

                                });
                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
                            }
                        }.bind(this));

                    }

                    if (/^targets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar == true) {
                                self.getGuildData(roomData.warData.guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var bestMatch = data.bestMatch;
                                    var ownData = data.ownData;

                                    self.sendGuildTargets([], roomData.warData.guildName, guild, ownData, false);

                                });

                            } else {
                                this.postMessage('not in war! use matched command to issue a match');
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
                                var g=mongoData.createNewGuild(guildName);
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
                                            var msg = new Array();
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

                    if (/^war\sended$/.test(txt) || /^warended$/.test(txt)) {
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
                            this.postMessage(roomData.warData.inWar ? 'in war with : ' + roomData.warData.guildName : 'not in war');
                        }.bind(this));
                    }

                    if (/^joke$/.test(txt)) {
                        this.tellAJoke();

                    }

                    if (/^minions$/.test(txt)) {
                        this.tellGifJoke();

                    }

                    var gifRgx = /^gif\s(.*)+$/
                    if (gifRgx.test(txt)) {
                        var match = gifRgx.exec(txt);
                        this.tellGifJoke(match[1]);
                    }

                    if (/^myt$/.test(txt) || /^my\stargets$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            try {
                                if (roomData.warData.inWar) {
                                    this.findUserTargets(roomData.warData.guildName, msg.name);
                                } else {
                                    this.postMessage('can\'t look for targets while not in war.');
                                }
                            } catch (e) {
                                console.log('------->', e);

                            }
                        }.bind(this));
                    }
                    if (/^minit$/.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            try {

                                if (roomData.warData.inWar) {
                                    this.getUserMini(msg.user_id).then(function (p) {

                                        if (p == null || p == undefined) {
                                            this.postMessage('please set mini data using mymini command.');
                                        } else {
                                            this.findUserTargets(roomData.warData.guildName, p.mini);

                                        }

                                    }.bind(this))

                                } else {
                                    this.postMessage('can\'t look for targets while not in war.');
                                }
                            } catch (e) {
                                console.log('------->', e);

                            }
                        }.bind(this));
                    }
                    ;

                    var miniRgx = /^mymini\s(.*)/;
                    if (miniRgx.test(txt)) {
                        var match = miniRgx.exec(txt);
                        var miniP = new Player('9 ' + match[1]);
                        if (miniP.isPlayer()) {
                            console.log('adding mini : ' + miniP.toString());
                            this.updateRoomPrefs(msg.user_id, miniP.toString().substr(2));

                        } else {
                            this.postMessage('can\'t get Mini stats, try something like mymini Name 1m/1k/1k');
                        }

                    }

                    if (/^help$/.test(txt)) {
                        this.showHelp();
                    }

                    var removeRgx = /^remove\s(\d+)\s(.*)/;
                    if (removeRgx.test(txt)) {
                        this.getRoomPrefs().then(function (roomData) {
                            if (roomData.warData.inWar) {
                                console.log('removing user');
                                this.removeUserFromOwnData(roomData.warData.guildName, removeRgx.exec(txt)).then(function (status) {
                                    if (status) {
                                        self.postMessage('User removed from our DB');
                                    } else {
                                        self.postMessage('Error removing user from our DB');

                                    }

                                });
                            } else {
                                this.postMessage('can\'t remove a user while not in war.');
                            }
                        }.bind(this));
                    }

                    // handle insertion

                    var addUser = new Player(txt);
                    // console.log(addUser);
                    if (addUser.isPlayer() && txt.indexOf('changed name to') == -1) {
                        // console.log('add user ?')
                        this.getRoomPrefs().then(function (roomData) {
                            //  console.log(roomData);
                            if (roomData.warData.inWar) {
                                this.insertOwnData(roomData.warData.guildName, addUser, msg.name, self.roomId);
                            }
                        }.bind(this));
                    }

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
                       if (err==null) {
                           self.postMessage('', response.data.image_url);
                       }else{
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

                    this.postMessage(helpMsg.join('\n'));
                },
                insertOwnData: function (guildName, player, addingUserName, addingUserGuild) {
                    var self = this;
                    mongoData.getGuildData(guildName, function (item) {

                        var players = _.filter(item.players, function (el) {
                            return el.name.toLowerCase() != player.name.toLowerCase()
                        });
                        var mode=player.length==item.players.length ? 'added' : 'updated';
                        var gpo = player.getGuildPlayerObj();
                        gpo.insertedByGuild = 'tbd';
                        gpo.insertedByUser = addingUserName;
                        players.push(gpo);
                        item.players = players;
                        item.save(function () {
                            self.postMessage(mode+' [' + player.toString() + ']');
                        });
                    }.bind(this))
                },
                removeUserFromOwnData: function (guildName, mtch) {
                    var defered = Q.defer();
                    var lvl = mtch[1];
                    var user = mtch[2];
                    console.log('remove', lvl, user);
                    mongoData.getGuildData(guildName, function (item) {

                        var guildPlayers = item.players;
                        var players = _.filter(guildPlayers, function (el) {
                            return el.name.toLowerCase() != user.toLowerCase() && el.lvl != lvl;
                        });
                        if (guildPlayers.length == players.length) {
                            defered.resolve(false);
                            return;
                        }

                        item.players = players;

                        item.save(function () {
                            defered.resolve(true);
                        });
                    }.bind(this));
                    return defered.promise;

                },

                findUserTargets: function (guildName, userName) {
                    var self = this;
                    var user = new Player('99 ' + userName);
                    if (!user.isPlayer()) {
                        this.postMessage('In order to user the myt command you must change your name in the room to reflect your stats using the following template: Name Atk/Eq Atk/Hero Atk')
                        return;
                    }
                    console.log('find user targets ...', user.name);
                    ;
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
                                    if (all > 1.2 && line1 > .65 && line2 > .9 && line3 > .7) {
                                        candidates.push(player);
                                        // console.log(player.name,all)
                                    } else {
                                        //   console.log(user,player,all,line1,line2,line3,all);
                                    }

                                }
                            });

                            var msg = [];
                            if (candidates.length == 0) {
                                msg.push('Could not find targets for: ' + user.name);
                            } else {
                                msg.push('Suggested targets for ' + user.name);

                            }
                            candidates = _.sortBy(candidates, function (player) {
                                return player.lvl;
                            }).reverse();
                            candidates = candidates.slice(0, 5);
                            _.each(candidates, function (candidate) {

                                msg.push(candidate.toString());
                            });

                            this.postMessage(msg.join('\n'));
                        }
                        catch (ee) {
                            console.log('------->', ee);

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

                        players = guildData==null?[]:playerCls.getPlayers(guildData.lastIntel);

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
                    console.log('enter war mode', arguments);
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
                sendGuildTargets: function (msg, guildName, ssData, ownData, all) {
                    //   console.log('send guild targets',arguments);
                    msg = msg || [];
                    msg.push('Targets in ' + guildName + ' :');
                    var guildData = ssData != null ? (all ? ssData.allIntel : ssData.lastIntel) : '';
                    if (guildData != null) {
                        msg.push('SS data:');
                        msg.push(guildData);
                    } else {
                        msg.push('No SS data.');
                    }
                    //  console.log(ownData);
                    if (ownData != null && ownData.players.length != 0) {
                        msg.push('\nRaven data:');
                        var p = new Players();
                        var ownIntel = p.getPlayersIntelFromOwnData(ownData.players);
                        msg.push(ownIntel);
                    } else {
                        msg.push('\nNo Raven data, Please add data.')

                    }

                    this.postMessage(msg.join('\n'));

                },
                getUserMini: function (userId) {
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

                updateRoomPrefs: function (userId, miniPlayer) {
                    this.getRoomPrefs().then(function (roomPref) {
                            //{id:Number,mini:String}
                            //  console.log('got prefs', roomPref);
                            var players = _.filter(roomPref.playersPrefs || [], function (el) {
                                return el.id != userId;
                            });

                            players.push({
                                id: Number(userId),
                                mini: miniPlayer
                            });

                            roomPref.playersPrefs = players;

                            roomPref.save();
                            this.postMessage('updated Mini - ' + miniPlayer);
                        }.bind(this)
                    );

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
