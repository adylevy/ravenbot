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

    // route for images
    app.use('/bower_components', serveStatic(__dirname + "/bower_components/"));
    // route for images
    app.use('/templates/scripts', serveStatic(__dirname + "/templates/scripts/"));
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

    app.use('/ui/guilds', function (req, res) {
        var rgx = /\/ui\/+([.*])\/+(.*)/.exec(req.originalUrl);

        var guildData = require('./modules/data/guildData.js');
        guildData.getAllGuildsPaginated().then(function (guilds) {
            var swig = require('swig');
            var output = swig.renderFile('./templates/guilds.html', {
                pagename: 'awesome people',
                guilds: guilds
            });
            res.end(output);
        })
    });

    app.use('/ui/guild', function (req, res) {
        var rgx = /\/ui\/guild\/(.*)/.exec(req.originalUrl);

        var guildData = require('./modules/data/guildData.js');
        guildData.getGuildById(rgx[1]).then(function (guild) {
            var swig = require('swig');
            var Players = require('./modules/players.js');
            var playerCls = new Players();
            var players = playerCls.getPlayerObjFromDBPlayers(guild.players || []);

            var appSettings = require('./modules/data/appsettings.js');
            appSettings.getSettings().then(function (settings) {

                var mappings = {};
                _.each(settings.guilds, function (guild) {
                    mappings[guild.roomId] = guild.guildName + ' / ' + guild.guildId;
                });
                var output = '';

                try {
                    output = swig.renderFile('./templates/guild.html', {
                        guild: guild,
                        players: players,
                        mappings: mappings
                    });
                }
                catch (e) {
                    console.log(e);
                }
                res.end(output);
            }.bind(this));
        })
    });

    app.use('/api/guilds', function (req, res) {
        //  guilds?_end=30&_sort=id&_sortDir=DESC&_start=0
        var rgx = /\/ui\/+([.*])\/+(.*)/.exec(req.originalUrl);

        var guildData = require('./modules/data/guildData.js');
        var url = require('url');

        var url_parts = url.parse(req.originalUrl, true);
        var query = url_parts.query;
        var end = query._end;
        var start = query._start;

        var splitted = url_parts.pathname.split('/');
        if (splitted[3]!=undefined && splitted[3]!=''){
            var id=splitted[3];
            guildData.getGuildById(id).then(function(theGuild){
                var guild = _.clone(theGuild);
                var Players = require('./modules/players.js');
                var playerCls = new Players();
                var players = playerCls.getPlayerObjFromDBPlayers(guild.players || []);
                _.each(players,function(p){
                    p._player= p.toString();
                })
                guild.players = players;
                guild.id = guild._id;
                delete guild._id;
                delete guild.__v;
                delete guild.lastKnownIntel;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(guild));
            })
        }else {

            guildData.getAllGuildsPaginated(start, end).then(function (guilds) {
                guildData.getAllGuilds().then(function (allGuilds) {
                    try {
                        res.setHeader('X-Total-Count', allGuilds.length);
                        res.setHeader('Content-Type', 'application/json');
                        var gg = [];
                        _.each(guilds, function (_guild) {
                            var guild = _.clone(_guild);
                            guild.players = guild.players ? guild.players.length : 0;
                            guild.id = guild._id;
                            delete guild._id;
                            delete guild.__v;
                            delete guild.lastKnownIntel;
                            gg.push(guild);
                        })
                        res.end(JSON.stringify(gg));
                    }
                    catch (e) {
                        console.log(e);
                        res.end();
                    }
                })

            });
        }
    })

    // catch all
    app.use('/ui', function (req, res) {
        var swig = require('swig');
        var output = swig.renderFile('./templates/main.html', {});
        res.end(output);
    });

    // catch all
    app.use(function (req, res) {
        res.end('404');
    })

    app.listen(CONFIG.port);

    console.log('server up');

};

var mongoData = require('./modules/data/mongoData.js');
mongoData.on('mongoConnected', whenConnected);
mongoData.connect();


