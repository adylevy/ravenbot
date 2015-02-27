var mongoose = require('mongoose');
var Class = require('./../Class.js').Class;
var Q = require('q');
var Players = require('./../players.js');
var _ = require('underscore');


var Mongodata = Class.extend(function () {


     var AppSettings = mongoose.model('AppSettings', {groups: [], guilds:[{
        guildName:String,
        roomId:Number,
        guildId:String
    }]});

    return {
        init: function (connectionString, autoConnect,callback) {
            console.log('init mongodb');

            this.connectionString = connectionString;
            autoConnect = typeof(autoConnect) == 'undefined' ? true : autoConnect;
            if (autoConnect) {
                console.log('auto connect');
                this.connect();
            }
            var db = mongoose.connection;
            db.on('error', console.error.bind(console, 'connection error:'));
            db.once('open', function () {

                console.log('connection opened');
                if (typeof callback=='function'){
                    callback();
                }
                this.emit('mongoConnected');

            }.bind(this));
        },
        connect: function () {
            console.log('connect!',this.connectionString);
            mongoose.connect(this.connectionString);
        },

        getSettings: function () {
            var that = this;
            var defered = Q.defer();
            AppSettings.findOne({}, function (err, settings) {
                var item = settings;
                if (item == null) {
                    item = new AppSettings({groups: []});
                }
                defered.resolve(item);
            });
            return defered.promise;
        }
    }
}());

module.exports = function (connectionString,auto,callback) {
    var md = new Mongodata(connectionString,auto,callback);
    return md;
}