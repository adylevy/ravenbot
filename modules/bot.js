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
var Player = require('./player.js');
var Players = require('./players.js');

var Bot = Class.extend(function () {


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
                init: function (options,roomId) {
                    this.options = options;
                    this.roomId = roomId;
                  /*  this.warData = {
                        inWar: false,
                        guildName: '',
                        warTime: null
                    };*/
                    console.log('new bot', this.options,this.roomId);
                },
                getRoomPrefs:function(){
                    var defered= Q.defer();
                    mongoData.getRoomPrefs(this.roomId).then(function(data){
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
                    this.mainSwitch(msg.text.toLowerCase().trim(), msg);
                },
                postMessage: function (_message, img) {
                    var msgs = this.getMessagesArray(_message.replace(/\n/g, '\n'));
                    console.log(msgs);
                    this.postMessageArr(msgs, img);
                },
                postMessageArr: function (msgArr, img) {

                    var msg = msgArr.shift();
                    this.sendMsg(msg, img).then(Q.delay(50).then(function () {
                        if (msgArr.length > 0) {
                            this.postMessageArr(msgArr);
                        }
                    }.bind(this)));
                },
                sendMsg: function (msg, img) {
                    var deferred = Q.defer();
                    if (this.options == null) {
                        console.log(msg);
                        deferred.resolve();
                        return deferred.promise;

                    }
                    var url = 'https://api.groupme.com/v3/bots/post';
                    var package = {};
                    package.text = msg;
                    package.bot_id = this.options.bot_id;
                    if (img) {
                        package.attachments = [{
                            type: 'image',
                            url: img
                        }]
                    }
                    request({
                        url: url,
                        method: 'POST',
                        body: JSON.stringify(package)
                    }, function (error, response, body) {
                        if (error) {
                            deferred.reject(error);
                        } else {
                            deferred.resolve([response, body]);
                        }
                    });
                    return deferred.promise;
                },
                getMessagesArray: function (txt) {
                    var ret = [];
                    var chunks = txt.split('\n');
                    while (chunks.length > 0) {
                        var packet = '';
                        while (packet.length < 400 && chunks.length > 0) {
                            var firstChunk = chunks.shift();
                            if (firstChunk.length > 400) {
                                packet += firstChunk.substr(0, 400 - packet.length);
                                firstChunk = firstChunk.substr(packet.length);
                                chunks = [firstChunk].concat(chunks);
                                packet += '\n';
                            } else {
                                packet += firstChunk + '\n';
                            }
                        }
                        packet = packet.substr(0, packet.length - 1);
                        ret.push(packet);
                        packet = '';
                    }

                    return ret;
                },
                mainSwitch: function (txt, msg) {
                    var self = this;

                    if (/^hello$/.test(txt)) {
                        this.postMessage('Hey there!');
                    }

                    if (/^all\stargets$/.test(txt)) {
                        this.getRoomPrefs().then(function(roomData){
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
                        });
                       
                    }

                    if (/^targets$/.test(txt)) {
                        this.getRoomPrefs().then(function(roomData) {
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
                        });
                    }

                    var newMatchRgx = /^matched\s*(new){0,1}\s*(.*)/;
                    if (newMatchRgx.test(txt)) {

                        var regexmatch = newMatchRgx.exec(txt);
                        // console.log('matched!',regexmatch);
                        if (regexmatch != null) {
                            var guildName = regexmatch[2];
                            if (regexmatch[1] == 'new') {
                                this.createNewGuild(guildName).then(function () {
                                    self.enterWarMode(guildName, null, null, false);
                                })

                            } else {
                                self.getGuildData(guildName).then(function (data) {
                                    var guild = data.foundGuild;
                                    var bestMatch = data.bestMatch;
                                    var ownData = data.ownData;
                                    if (guild == null && (ownData == null || ownData.players.length==0)) {
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
                        this.getRoomPrefs().then(function(roomData) {
                            if (roomData.warData.inWar) {
                                roomData.warData.inWar = false;
                                roomData.warData.guildName = '';
                                roomData.save();
                                this.postMessage('did we win this one ?');
                            } else {
                                this.postMessage('not in war.');
                            }
                        });
                    }

                    if (/^warstatus$/.test(txt)) {
                        this.getRoomPrefs().then(function(roomData) {
                            this.postMessage(roomData.warData.inWar ? 'in war with : ' + roomData.warData.guildName : 'not in war');
                        });
                    }

                    if (/^joke$/.test(txt)) {
                        this.tellAJoke();

                    }

                    if (/^minions$/.test(txt)) {
                        this.tellGifJoke();

                    }

                    if (/^myt$/.test(txt) || /^my\stargets$/.test(txt)) {
                        this.getRoomPrefs().then(function(roomData) {
                            if (roomData.warData.inWar) {
                                this.findUserTargets(roomData.warData.guildName, msg.name);
                            } else {
                                this.postMessage('can\'t look for targets while not in war.');
                            }
                        });
                    }

                    if (/^help$/.test(txt)) {
                        this.showHelp();
                    }

                    var removeRgx = /^remove\s(\d+)\s(.*)/;
                    if (removeRgx.test(txt)) {
                        this.getRoomPrefs().then(function(roomData) {
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
                        });
                    }

                    // handle insertion
                    var addUser=new player(txt);
                    if(addUser.isPlayer()){
                        this.getRoomPrefs().then(function(roomData) {
                            if (roomData.warData.inWar) {
                                this.insertOwnData(roomData.warData.guildName, addUser.toString());
                            }
                        });
                    }

                },
                tellAJoke: function () {
                    var self = this;
                    chuckJokes.getJoke().then(function (joke) {
                        self.postMessage(joke);
                    }.bind(this))
                },

                tellGifJoke: function () {
                    var self = this;
                    giphy.random('minions', function (err, response) {
                        self.postMessage('', response.data.image_url);
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
                    helpMsg.push('myt - user targets during war.');

                    this.postMessage(helpMsg.join('\n'));
                },
                insertOwnData: function (guildName, data) {
                    var self = this;
                    mongoData.getGuildData(guildName, function (item) {
                        var resultString = '';
                        var player = new player(data);

                        var players = _.filter(getPlayers(item.lastKnownIntel), function (el) {
                            return el.name.toLowerCase() != player.name.toLowerCase()
                        });

                        players.push(player);
                        _.each(players, function (player) {
                            resultString += player.toString();
                        });
                        item.lastKnownIntel = resultString;

                        item.save(function () {
                            self.postMessage('added [' + data + ']');
                        });
                    }.bind(this))
                },
                removeUserFromOwnData: function (guildName, mtch) {
                    var defered = Q.defer();
                    var lvl = mtch[1];
                    var user = mtch[2];
                    console.log('remove', lvl, user);
                    mongoData.getGuildData(guildName, function (item) {
                        var resultString = '';
                        var guildPlayers = getPlayers(item.lastKnownIntel);
                        var players = _.filter(guildPlayers, function (el) {
                            return el.name.toLowerCase() != user.toLowerCase() && el.lvl != lvl;
                        });
                        if (guildPlayers.length == players.length) {
                            defered.resolve(false);
                            return;
                        }

                        _.each(players, function (player) {
                            resultString += player.toString();
                        });
                        item.lastKnownIntel = resultString;

                        item.save(function () {
                            defered.resolve(true);
                        });
                    }.bind(this));
                    return defered.promise;

                },

                findUserTargets: function (guildName, userName) {
                    var self = this;
                    var user = new player('99 ' + userName);
                    if (!user.isPlayer()) {
                        this.postMessage('In order to user the myt command you must change your name in the room to reflect your stats using the following template: Name Atk/Eq Atk/Hero Atk')
                        return;
                    }
                    console.log('find user targets ...', user.name);
                    ;
                    this.getParsedIntelForGuild(guildName).then(function (guildData) {
                        console.log('got parsed intel');
                        var candidates = [];
                        console.log(guildData);
                        _.each(guildData, function (player) {
                            if (player.isPlayer() && player.def != 0 && player.eqDef != 0 && player.heroDef != 0) {
                                var line1 = user.def / player.def;
                                var line2 = user.eqDef / player.eqDef;
                                var line3 = user.heroDef / player.heroDef;

                                var all = (line1 * (7 / 12) + line2 * (4 / 12) + line3 * (1 / 12));
                                // self.postMessage('player: '+player.name+' '+line1+' '+line2+' '+line3+' '+all);
                                if (all > 1.2 && line1 > .6 && line2 > .7 && line3 > .5) {
                                    candidates.push(player);
                                    // console.log(player.name,all)
                                } else {
                                    //  console.log(user,player,all,line1,line2,line3);
                                }

                            }
                        });

                        var msg = [];
                        if (candidates.length == 0) {
                            msg.push('Could not find targets for: ' + user.name + '\n');
                        } else {
                            msg.push('Suggested targets for ' + user.name + '\n');

                        }
                        candidates = _.sortBy(candidates, function (player) {
                            return player.lvl;
                        }).reverse();
                        candidates=candidates.slice(0,5);
                        _.each(candidates, function (candidate) {

                            msg.push(candidate.toString());
                        });

                        this.postMessage(msg.join(''));

                    }.bind(this));

                },
                getParsedIntelForGuild: function (guildName) {
                    var defered = Q.defer();
                    var self = this;
                    sheetsData.getGuildData(guildName, function (guildData) {
                        console.log('got #1');
                        var players;
                        players = getPlayers(guildData.lastIntel);

                        mongoData.getGuildData(guildName, function (ourData) {
                            console.log('got #2');
                            var ourPlayers = [];
                            if (ourData.lastKnownIntel != '') {
                                ourPlayers = getPlayers(ourData.lastKnownIntel);
                            }
                            players = players.concat(ourPlayers);
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
                            console.log('got own data ', item);
                            data.ownData = item;
                            defered.resolve(data);
                        }.bind(this));

                    });
                    return defered.promise;

                },

                enterWarMode: function (guildName, ssData, ownData) {
                    this.getRoomPrefs().then(function(roomData) {
                        roomData.warData.inWar = true;
                        roomData.warData.guildName = guildName;
                        roomData.save();
                        var msg = new Array();
                        msg.push('War mode on!');
                        this.sendGuildTargets(msg, guildName, ssData, ownData, false);
                    });

                },
                sendGuildTargets: function (msg, guildName, ssData, ownData, all) {
                    console.log('send guild targets');
                    msg = msg || [];
                    msg.push('Targets in ' + guildName + ' :');
                    var guildData = ssData != null ? (all ? ssData.allIntel : ssData.lastIntel) : '';
                    if (guildData != null) {
                        msg.push('SS data:');
                        msg.push(guildData);
                    } else {
                        msg.push('No SS data.');
                    }

                    if (ownData != null && ownData.players.length != 0) {
                        msg.push('\nRaven data:');
                        var p=new Players();
                        var ownIntel=p.getPlayersIntelFromOwnData(ownData.players);
                        msg.push(ownIntel);
                    } else {
                        msg.push('\nNo Raven data, Please add data.')

                    }

                    this.postMessage(msg.join('\n'));

                }

            }
}());

//util.inherits(BotsManager, events.EventEmitter);

module.exports = function (options,idx) {

    var md = new Bot(options,idx);
    return md;
};
