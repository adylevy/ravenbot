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
var mongoData = require('./data/mongoData.js')(process.env['MONGOLAB_URI']);
var roomPrefs = require('./data/roomPrefs.js');

var BotsManager = Class.extend(function () {

    return {
        init: function (options) {
            this.options = options;
console.log(options)
            this.allBots=[];
            var e = new events.EventEmitter();
            _.extend(this, e);
            console.log('bot manager', this.options);
            this.startListening();
            /*.then(this.killAllBots.bind(this))*/
            this.getAllBots().then(this.registerMissingBots.bind(this));
            this.timerInterval=setInterval(function(){this.onTimeTick()}.bind(this),1*60*1000);
        },
        onTimeTick: function(){
            roomPrefs.getAllRoomPrefs().then(function(rooms){

               try{ _.each(rooms,function(room){
                    if (room.warData.inWar){
                      //  console.log('onTick',room.roomId,this.allBots);
                        var botObj = _.findWhere(this.allBots, {group_id: room.roomId+''});
                        if (botObj && botObj.manager && botObj.manager.onTimeTick){
                            botObj.manager.onTimeTick(room);
                        }
                    }
                }.bind(this));}
                catch(e){console.warn('error',e);}
                
            }.bind(this));
            
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
                console.log('------->',e);
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
                var guilds = settings.guilds;
               console.log('got settings',settings,guilds);
                var adminGroup=self.options.adminGroup;
                try {
                    if (_.find(guilds, function (guild) {
                            guild.roomId + '' == adminGroup + '';
                        })==null) {
                        guilds.push({
                            roomId:adminGroup,
                            guildName:'Admin',
                            guildId:''
                        });
                    }
                }catch(e){console.log(e);}
                //console.log('register',groupIds);
                var registerArr=[];
                _.each(guilds, function (guild) {
                   try {
                       var botObj=_.findWhere(this.allBots, {group_id: guild.roomId+''});
                       if (botObj == undefined) {
                           registerArr.push(this.registerBotAndCreateManager(guild.roomId));
                       }else{
                           registerArr.push(this.createManager(guild.roomId,botObj));
                       }
                   }catch(e){}
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
        createManager : function(groupIdx,botObj){
            var manager = this.options.adminGroup==groupIdx? new AdminBot(botObj, groupIdx) : new Bot(botObj, groupIdx);
            manager.on('botRegister',function(ctx,guild){
                var botObj = _.findWhere(this.allBots, {group_id: guild.roomId});
                if (botObj==undefined) {
                    this.registerBotAndCreateManager(guild.roomId).then(function (newBot) {
                        ctx.botRegistered(guild.roomId);
                        newBot.postMessage('RavenBot is successfully registered in this room.\nRaven Manual:\nhttps://docs.google.com/document/d/15naOzWKf9z9CT-D4hHZTryTE55l4HyNiR8sahye0TzU/edit');
                        this.addGroupToSettings(guild);
                    }.bind(this));
                }else{
                    ctx.postMessage('Bot already registered');
                }

            }.bind(this));
            manager.on('botUnregister',function(ctx,groupId){
                var botObj = _.findWhere(this.allBots, {group_id: groupId});
                if (botObj!=undefined) {
                    botObj.manager.postMessage('Bye.');
                    this.allBots = _.filter(this.allBots, function (bot) {
                        return bot.group_id != groupId;
                    });
                    this.removeGroupFromSettings(groupId);
                    this.unregisterBot(botObj.bot_id).then(function () {
                        ctx.botUnregistered(groupId);

                    }.bind(this));
                }else{
                    ctx.postMessage('Bot is not registered');

                }

            }.bind(this));
            manager.on('broadcast',function(ctx,broadcastObj){
                this.broadCast(ctx,broadcastObj.guild,broadcastObj.msg);

            }.bind(this));

            botObj.manager=manager;
            var allbots = _.filter( this.allBots, function (el) {
                //group_id: Number(guild.roomId)
                return el.group_id != botObj.group_id;
            });
            allbots.push(botObj);
            this.allBots=allbots;

            return manager;
        },
        registerBotAndCreateManager: function(groupId){
            var deferred = Q.defer();
            this.registerBot(groupId).then(function (data) {
                var response=data.response;
                var groupIdx=data.groupId;
                if (response.meta.code > 200 && response.meta.code < 300) {
                    try {
                        var botObj=response.response.bot;
                        var manager=this.createManager(groupIdx,botObj);
                        botObj.manager = manager;

                        deferred.resolve(manager);
                    } catch (e) {
                        console.log('------->', e);
                        deferred.reject(e);
                    }
                }

            }.bind(this)).fail(function(e){
                console.log('--------------->>>>',e);
                
            });
            return deferred.promise;
        },
        broadCast: function(ctx,group,msg){
            if (group=='all'){
                _.each(this.allBots,function(bot){
                    if (bot.group_id!=this.options.adminGroup) {
                        bot.manager.postMessage(msg);
                    }
                }.bind(this));
                ctx.postMessage('Msg sent.');
            }
            else{
                var botObj = _.findWhere(this.allBots, {group_id: group});
                if (botObj==undefined) {
                 ctx.postMessage('Group not found.');
                }
                else{
                    botObj.manager.postMessage(msg);   
                    ctx.postMessage('Msg sent.');
                }
            }
            
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
                  try {
                      botObj.manager.handleMessage(msg);
                  }catch(e){
                      console.warn('FATAL ERROR : ',e);
                      
                  }
                }
            }
        },
        startListening: function () {
            var self = this;

            this.on('botMessage', this.handleMessage.bind(this));

                var self = this;
                //console.log(JSON.stringify({'name': self.options.name, 'groups': settings.groups}));
                var server = http.createServer(function (request, response) {
                    if (request.url == '/' && request.method == 'GET') {
                        response.writeHead(200, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({'name': self.options.name}));
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

        },
        addGroupToSettings: function(guild){
            mongoData.getSettings().then(function(settings){
                var guilds = settings.guilds;
                if (!_.findWhere(guilds,{roomId:Number(guild.roomId)})){
                    guilds.push({
                        roomId:guild.roomId,
                        guildName:guild.guildName,
                        guildId:guild.guildId
                        
                    });
                    settings.guilds=guilds;
                    settings.save();
                }
            })
            
        },
        removeGroupFromSettings: function(groupId){
            mongoData.getSettings().then(function(settings){
                var guilds = settings.guilds;
                if (_.findWhere(guilds,{roomId:Number(groupId)})){
                    guilds = _.filter(guilds,function(guild){
                        return guild.roomId!=groupId;
                    })
                    settings.guilds=guilds;
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