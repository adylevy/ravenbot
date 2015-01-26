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

//
//require('./modules/botsmanager.js')(CONFIG);


//var mongoData = require('./modules/mongoData.js')(process.env['MONGOLAB_URI']);
//mongoData.reBuildGuildDB();

var Bot = require('./modules/bot.js');
//var AdminBot = require('./modules/adminBot.js');
var b=new Bot({},11615015);
/*b.on('botRegister',function(e,t){
    console.log('----->',e,t);
})*/
//b.mainSwitch('matched northcliff dragon squad');
b.mainSwitch('matched Johnny\'s Heroes');
/*b.mainSwitch('myt',{
    name:'MB 409.8m/109.7k/3.0k'
});*/
/*
b.mainSwitch('mymini Gamba 80m/20k/2000',{
    name:'MB 409.8m/109.7k/3.0k',
    user_id:5
});

b.mainSwitch('minit',{
    name:'MB 409.8m/109.7k/3.0k',
    user_id:5
});*/

//b.mainSwitch('123 ady 123m/1k/12k');
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




