/**
 * Created by Ady on 12/30/2014.
 */

var Q = require('q');
var Class = require('./Class.js').Class;
const events = require('events');
const request = require('request');
const _ = require('underscore');
var giphy = require('./giphy.js')('dc6zaTOxFJmzC');
var chuckJokes = require('./chuckJokes.js');
var sheetsData = require('./sheets.js');
var mongoData = require('./mongoData.js')(process.env['MONGOLAB_URI']);
var Player = require('./player_cls.js');
var Players = require('./players.js');
var BotBase = require('./botBase.js').BotBase;


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
                    if (/^hello$/.test(txt)) {
                        this.postMessage('Hey there Admin!');
                    }
                    
                    var regMatch= /^register\s(\d+)$/;
                    if (regMatch.test(txt)) {
                        var regexmatch = regMatch.exec(txt);
                        this.postMessage('Registering !',regexmatch[1]);
                        this.emit('botRegister', this, regexmatch[1]);
                    }

                    var regMatch= /^unregister\s(\d+)$/;
                    if (regMatch.test(txt)) {
                        var regexmatch = regMatch.exec(txt);
                        this.postMessage('Unregistering !',regexmatch[1]);
                        this.emit('botUnregister', this, regexmatch[1]);
                    }
                    
                },
                botRegistered: function(groupId){
                    this.postMessage('Bot Registered : '+groupId);
                },
                botUnregistered: function(groupId){
                    this.postMessage('Bot UnRegistered : '+groupId);
                    
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
