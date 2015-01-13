/**
 * Created by Ady on 12/27/2014.
 */
var http = require('http');
var Q = require('q');
var Class = require('./Class.js').Class;
const events = require('events');
const util = require('util');
const request = require('request');
const formidable = require('formidable');
const _ = require('underscore');
var Bot = require('./bot.js');
var fs = require('fs');

var BotsManager = Class.extend(function () {

    return {
        init: function (options) {
            this.options = options;
            var e = new events.EventEmitter();
            _.extend(this, e);
            console.log('bot manager', this.options);
            this.getAllBots().then(this.killAllBots.bind(this));
            this.registerMissingBots();
            this.startListening();
        },
        getAllBots: function () {
            var deferred = Q.defer();

            var url = 'https://api.groupme.com/v3/bots?token=' + this.options.token;
            request({url: url, method: 'GET'}, function (err, response, body) {
                body = JSON.parse(body);
                var bots = [];
                _.each(body.response, function (bot) {
                    bots.push(bot);
                });
                this.allBots = bots;

                deferred.resolve(bots);
            }.bind(this));

            return deferred.promise;
        },
        killAllBots: function () {
            console.log('kill all bots');
            var that = this;
            try {
                _.each(this.allBots, function (bot) {
                    that.unregisterBot(bot.bot_id);
                });
            }
            catch (e) {
                console.log(e);
            }
            this.allBots = [];
            return true;
        },
        registerMissingBots: function () {
            console.log('register bots');
            var groupIds = this.options.groups.split(',');
            _.each(groupIds, function (groupId) {
                if (_.findWhere(this.allBots, {group_id: groupId}) == undefined) {
                    this.registerBot(groupId).then(function (data) {
                        var response=data.response;
                        var groupIdx=data.groupId;
                        if (response.meta.code > 200 && response.meta.code < 300) {
                            try {
                                var manager = new Bot(response.response.bot, groupIdx);
                                var botResponse = response.response.bot;
                                botResponse.manager = manager;
                                this.allBots.push(botResponse);
                            } catch (e) {
                                console.log('e:', e);
                            }
                        }

                    }.bind(this));
                }
            }.bind(this));
        },
        unregisterBot: function (botId) {
            console.log('unregister', botId);
            var deferred = Q.defer();
            var url = 'https://api.groupme.com/v3/bots/destroy?token=' + this.options.token;
            request({url: url, method: 'POST', body: JSON.stringify({bot_id: botId})},
                function (error, response, body) {
                    deferred.resolve();
                }.bind(this));
            return deferred.promise;
        },
        registerBot: function (groupId) {
            var deferred = Q.defer();
            var bot = {};
            bot.name = this.options.name;
            bot.group_id = groupId;
            bot.callback_url = this.options.url + '/incoming';
            if (this.options.avatar_url) {
                bot.avatar_url = this.options.avatar_url;
            }
            ;
            var url = 'https://api.groupme.com/v3/bots?token=' + this.options.token;

            request({url: url, method: 'POST', body: JSON.stringify({bot: bot})},
                function (error, response, body) {
                    if (!error) {
                        var parsedBody = JSON.parse(body);

                        deferred.resolve({response: parsedBody, groupId: groupId});
                    } else {
                        deferred.reject(error);
                    }
                }.bind(this)
            );
            return deferred.promise;
        },
        handleMessage: function (self, msg) {
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
            var groupId = msg.group_id;
            if (msg.name != self.options.name) {
                var botObj = _.findWhere(this.allBots, {group_id: groupId});
                botObj.manager.handleMessage(msg);
            }
        },
        startListening: function () {
            var self = this;

            this.on('botMessage', this.handleMessage.bind(this));
            console.log(JSON.stringify({'name': self.options.name, 'groups': self.options.groups}));
            var server = http.createServer(function (request, response) {
                if (request.url == '/' && request.method == 'GET') {
                    response.writeHead(200, {"Content-Type": "application/json"});
                    response.end(JSON.stringify({'name': self.options.name, 'groups': self.options.groups}));
                } else if (request.url == '/images/raven.jpeg') {
                    var img = fs.readFileSync('./images/raven.jpeg');
                    response.writeHead(200, {'Content-Type': 'image/jpeg'});
                    response.end(img, 'binary');
                } else if (request.url == '/incoming' && request.method == 'POST') {
                    var form = new formidable.IncomingForm();
                    var messageFields = {};
                    form.parse(request, function (err, fields, files) {
                        if (err) console.error("bad incoming data " + err);
                    });

                    form.on('field', function (name, value) {
                        messageFields[name] = value;
                    });

                    form.on('end', function () {
                        response.writeHead(200, {"Content-Type": "text/plain"});
                        response.end("THANKS");
                        self.emit('botMessage', self, messageFields);
                    });

                } else {

                    response.writeHead(404, {"Content-Type": "text/plain"});
                    response.end("NOT FOUND");
                }

            }.bind(this));

            server.listen(self.options.port);
            console.log('server up');
        }
    }
}());


module.exports = function (options) {
    var md = new BotsManager(options);

    return md;
};