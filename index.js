var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
if (typeof process.env['TOKEN'] == 'undefined') {
    env(__dirname + '/.env');
}

// local configuration read from env.
const TOKEN = process.env['TOKEN']; // your groupme api token
const GROUPS = process.env['GROUPS']; // the room you want to join
const ADMIN_GROUP = process.env['ADMIN_GROUP'];
const NAME = process.env['NAME']; // the name of your bot
const URL = process.env['URL']; // the domain you're serving from, should be accessible by Groupme.
const AVATAR = process.env['AVATAR'];
const CONFIG = {
    token: TOKEN,
    name: NAME,
    url: URL,
    adminGroup: ADMIN_GROUP,
    avatar_url: AVATAR,
    port: process.env.PORT || 5000
};


var whenConnected = function () {
    console.log('mongo is connected');
    var botManager = require('./modules/botsmanager.js')(CONFIG);

    var connect = require('connect');
    var serveStatic = require('serve-static');
    var app = connect().use(connect.bodyParser());

    // route for images
    app.use('/images/:filename', function(req,res){
        console.log(req);
        console.log(req.params);
        serveStatic(__dirname + "/images/"+req.params.filename)
    });
    //route for bot files
    app.use('/incoming', function (req, res) {
        try {
            botManager.handleMessage(req.body);
        }
        catch (e) {
            console.log('--->', e);
        }
        res.end('');
    });
    // catch all
    app.use(function(req, res){
        res.end('');
    })

    app.listen(CONFIG.port);

    console.log('server up');

};

var mongoData = require('./modules/data/mongoData.js');
mongoData.on('mongoConnected', whenConnected);
mongoData.connect();


