/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
var Class = require('./Class.js').Class;
const request = require('request');


var BotBase = Class.extend(function () {


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
                    console.log('new bot (base)', this.options, this.roomId);
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
                postMessage: function (_message, img) {
                  //  console.log('base post message');
                    var msgs = this.getMessagesArray(_message.replace(/\n/g, '\n'));
                  //  console.log(msgs);
                    this.postMessageArr(msgs, img);
                },
                postMessageArr: function (msgArr, img) {

                    var msg = msgArr.shift();
                    this.sendMsg(msg, img).then(Q.delay(200).then(function () {
                        if (msgArr.length > 0) {
                            this.postMessageArr(msgArr);
                        }
                    }.bind(this)));
                },
                sendMsg: function (msg, img) {
                    var deferred = Q.defer();
                    if (this.options == null || this.options.bot_id==undefined) {
                        console.log(msg, img);
                        deferred.resolve();
                        return deferred.promise;

                    }
                    var url = 'https://api.groupme.com/v3/bots/post';
                    var package = {};
                    package.text = msg;
                    package.bot_id = this.options.bot_id;
                    package.attachments = [];

                    if (img) {
                        package.attachments.push({
                            type: 'image',
                            url: img
                        });
                    }

                    if (msg != null && msg != undefined && msg.indexOf('^') != -1) {
                        var chars = [];
                        var numOfChars = (msg.match(/\^/g) || []).length;
                        for (var i = 0; i < numOfChars; i++) {
                            chars.push([3, 37]);

                        }
                        package.attachments.push({
                            "type": "emoji",
                            "placeholder": "^",
                            "charmap": chars
                        });
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

                }


            }
        }
        ()
    )
    ;

//util.inherits(BotsManager, events.EventEmitter);

module.exports.BotBase = BotBase;