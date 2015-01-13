var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
if (typeof process.env['TOKEN'] == 'undefined') {
    env(__dirname + '/.env');
}

// local configuration read from env.
const TOKEN = process.env['TOKEN']; // your groupme api token
const GROUPS = process.env['GROUPS']; // the room you want to join
const ADMIN_NAME = process.env['ADMIN_NAME'];
const NAME = process.env['NAME']; // the name of your bot
const URL = process.env['URL']; // the domain you're serving from, should be accessible by Groupme.
const AVATAR = process.env['AVATAR'];
const CONFIG = {token: TOKEN, groups: GROUPS, name: NAME, url: URL, adminName: ADMIN_NAME, avatar_url: AVATAR, port: process.env.PORT || 5000};

//var Bot = require('./modules/bot.js');
require('./modules/botsmanager.js')(CONFIG);


//var mongoData = require('./modules/mongoData.js')(process.env['MONGOLAB_URI']);
//mongoData.reBuildGuildDB();

//var b=new Bot();
//b.mainSwitch('matched blabla bla bla');
//b.warData.guildName='iraid';
//b.warData.inWar=true;
/*Q.delay(1000).then(function(){
  //  b.mainSwitch('all targets');
    b.mainSwitch('myt',{
        name:'Ady (TRK) 60m/47k/7k'
    });
});*/

//b.findUserTargets('Knights whom say Ni','Jace 381m/70k/4.1k');
//b.findUserTargets('iroc26','ady 60m/47k/7k');
//b.findUserTargets('the replacement killers','Ady (TRK) 60m/47k/7k')
//b.findUserTargets('rose warriors','Ady (TRK) 60m/47k/7k')




