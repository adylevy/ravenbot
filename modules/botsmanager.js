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
var AdminBot = require('./adminBot.js');
var fs = require('fs');
var mongoData = require('./mongoData.js')(process.env['MONGOLAB_URI']);

var BotsManager = Class.extend(function () {

    return {
        init: function (options) {
            this.options = options;

            this.allBots=[];
            var e = new events.EventEmitter();
            _.extend(this, e);
            console.log('bot manager', this.options);
            this.startListening();
            this.getAllBots().then(this.killAllBots.bind(this)).then(this.registerMissingBots.bind(this));
          
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
            var deferred = Q.defer();
            var that = this;
            var unregArray=[];
            try {
                _.each(this.allBots, function (bot) {
                    unregArray.push(that.unregisterBot(bot.bot_id));
                });
            }
            catch (e) {
                console.log(e);
            }
            Q.all(unregArray).then(function(){
                this.allBots = [];
                deferred.resolve( this.allBots);
            }.bind(this))

            return deferred.promise;
        },
        registerMissingBots: function () {
            var self=this;
            var deferred = Q.defer();
            console.log('register bots');
            mongoData.getSettings().then(function(settings){
                var groupIds = settings.groups;
                console.log('got settings',settings,groupIds);
                var adminGroup=self.options.adminGroup;
                try {
                    if (_.find(groupIds, function (el) {
                            el + '' == adminGroup + '';
                        })==null) {
                        groupIds.push(adminGroup);
                    }
                }catch(e){console.log(e);}
                console.log('register',groupIds);
                var registerArr=[];
                _.each(groupIds, function (groupId) {
                    if (groupId !='') {
                        if (_.findWhere(this.allBots, {group_id: groupId}) == undefined) {
                            registerArr.push(this.registerBotAndCreateManager(groupId));
                        }
                    }
                }.bind(this));
                Q.all(registerArr).then(function(){
                    deferred.resolve();
                })
            }.bind(this))

            return deferred.promise;
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
        registerBotAndCreateManager: function(groupId){
            var deferred = Q.defer();
            this.registerBot(groupId).then(function (data) {
                var response=data.response;
                var groupIdx=data.groupId;
                if (response.meta.code > 200 && response.meta.code < 300) {
                    try {
                        var manager = this.options.adminGroup==groupIdx? new AdminBot(response.response.bot, groupIdx) : new Bot(response.response.bot, groupIdx);
                        manager.on('botRegister',function(ctx,groupId){
                           this.registerBotAndCreateManager(groupId).then(function(){
                               ctx.botRegistered(groupId);
                               this.addGroupToSettings(groupId);
                           }.bind(this));

                        }.bind(this))
                        var botResponse = response.response.bot;
                        botResponse.manager = manager;
                        this.allBots.push(botResponse);
                        deferred.resolve(manager);
                    } catch (e) {
                        console.log('e:', e);
                        deferred.reject(e);
                    }
                }

            }.bind(this)).fail(function(e){
                console.log('--------------->>>>',e);
                
            });
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
                      try {
                          var parsedBody = JSON.parse(body);
                          deferred.resolve({response: parsedBody, groupId: groupId});
                      }
                    catch(e){
                        deferred.reject(e);

                      }
                       
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
                if (botObj==undefined){
                    console.log('couldnt find a bot to handle:',msg)
                    return;
                    
                }else {
                    botObj.manager.handleMessage(msg);
                }
            }
        },
        startListening: function () {
            var self = this;

            this.on('botMessage', this.handleMessage.bind(this));
            mongoData.getSettings().then(function(settings) {
                var self = this;
                console.log(JSON.stringify({'name': self.options.name, 'groups': settings.groups}));
                var server = http.createServer(function (request, response) {
                    if (request.url == '/' && request.method == 'GET') {
                        response.writeHead(200, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({'name': self.options.name, 'groups': settings.groups}));
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
            }.bind(this));
        },
        addGroupToSettings: function(groupId){
            mongoData.getSettings().then(function(settings){
                var groupIds = settings.groups;
                if (!_.contains(groupIds,groupId)){
                    groupIds.push(groupId);
                    settings.groups=groupIds;
                    settings.save();
                }
            })
            
        }
    }
}());


module.exports = function (options) {
    var md = new BotsManager(options);

    return md;
};