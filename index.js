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
    app.use('/images', serveStatic(__dirname + "/images/"));
//route for bot files
    app.use('/incoming', function (req, res) {
        botManager.handleMessage(req);
        res.end('thanks');
    });
    app.listen(CONFIG.port);

    /* startListening: function () {
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

     server.listen(self.options.port);*/
    console.log('server up');


};

var mongoData = require('./modules/data/mongoData.js');
mongoData.on('mongoConnected', whenConnected);
mongoData.connect();


