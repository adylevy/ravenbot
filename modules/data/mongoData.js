var mongoose = require('mongoose');
var _ = require('underscore');
var env = require('node-env-file');
const events = require('events');

if (typeof process.env['TOKEN'] == 'undefined') {
    env( './.env');
}

var singleton = function singleton(){

    if(singleton.caller != singleton.getInstance){
        throw new Error("This object cannot be instanciated");
    }

    this.init=  function () {
        console.log('init mongodb');

        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.on('error', function(){
            this.emit('mongoFailed');
        })
        db.once('open', function () {
            console.log('connection opened');
            this.emit('mongoConnected');
        }.bind(this));
        this.connect();
    };

    this.connect=  function (connectionString) {
        if (this.connecting){
            return;
        }
        this.connecting=true;
        this.connectionString=connectionString || process.env['MONGOLAB_URI'];
        console.log('connect!',this.connectionString);
        mongoose.connect(this.connectionString);
    };
    this.init();
}

var eventEmitter = new events.EventEmitter();
singleton.prototype.on=eventEmitter.on;
singleton.prototype.emit=eventEmitter.emit;

/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
singleton.instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
singleton.getInstance = function(){
    if(this.instance === null){
        this.instance = new singleton();
    }
    return this.instance;
}

module.exports = singleton.getInstance();
