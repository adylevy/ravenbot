var mongoose = require('mongoose');
var Class = require('./Class.js').Class;
var Q = require('q');
var Player = require('./player.js');
var Players = require('./players.js');
var _ = require('underscore');

var Mongodata = Class.extend(function(){

    var _privateFunc = function () {
        console.log('private func');
    }

    var Guild = mongoose.model('Guilds', { name: String , lastKnownIntel: String, players: [
        { name:String,lvl:Number,def:Number,eqDef:Number,heroDef:Number,date:Date, insertedByGuild:String,insertedByUser:String}
    ] });
    
    var RoomPrefs = mongoose.model('RoomPrefs', { roomId: Number , guildId: String, warData: {
        inWar:Boolean,
        guildName:String,
        warTime:Date
    } })
        
    return {
        init: function (connectionString) {
            console.log('init mongodb');
            this.connect(connectionString);
            var db = mongoose.connection;
            db.on('error', console.error.bind(console, 'connection error:'));
            db.once('open', function (callback) {
                // yay!
                console.log('connection opened');
            });
        },
        connect: function (connectionString) {
            mongoose.connect(connectionString);
        },
        createNewGuild: function(guildName){
          var g=new Guild({
              name:guildName,
              lastKnownIntel:''
          })
            return g;
        },
        createRoomPrefs: function(roomId){
            var r=new RoomPrefs({
                roomId:roomId,
                warData:{
                    inWar:false,
                    guildName:'',
                    warTime: null
                }
               
            });
            return r;
            
        },
        getGuildData: function (guildName, callback) {
            var that=this;
            Guild.find({name: guildName}, function (err, guilds) {
                var item;
                if (guilds.length==0){
                    item=that.createNewGuild(guildName);
                }else{
                    item=guilds[0];
                }
                callback(item);
            });
        },
        getRoomPrefs: function(roomId){
            var that=this;
            var defered= Q.defer();
            RoomPrefs.find({roomId: roomId}, function (err, rooms) {
                var item;
                if (rooms.length==0){
                    item=that.createRoomPrefs(roomId);
                }else{
                    item=rooms[0];
                }
                defered.resolve(item);
            });
            return defered.promise;
        },
        reBuildGuildDB: function(){
            Guild.find({}, function(err,data){
              //  console.log(data);
                var p=new Players();
                _.each(data,function(guild){
                    var players=p.getPlayers(guild.lastKnownIntel);
                    guild.players=[];
                    _.each(players,function(p0){
                        var newP=new player();
                        newP.create(p0.lvl,p0.name,p0.def,p0.eqDef,p0.heroDef);
                        guildObj=newP.getGuildPlayerObj();
                        guildObj.insertedByGuild='TRK';
                        guildObj.insertedByUser='Bot';
                        guild.players.push(guildObj);
                    })
               
                    guild.save();
                })
                console.log('done rebuild');
               
                
            });
            
        },
        remoteItem: function(item){
            item.remove();
        },
        saveData: function (guild, callback) {

            guild.save(function (err) {
                callback(err);
            })
        }
    }
}());

module.exports = function (connectionString) {
    var md= new Mongodata(connectionString);
    return md;
}