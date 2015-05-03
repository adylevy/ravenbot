var env = require('node-env-file');
var _ = require('underscore');
var Q = require('q');
var roomPrefs = require('./modules/data/roomPrefs.js');
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
var whenConnected=function(){
    console.log('mongo is connected');
    roomPrefs.getRoomPrefs(13006255).then(function(data){
       // console.log(data);
        var b=new Bot({},13006255);
        b.mainSwitch('cocacola',{
            name:'Ady 7000m/700k/700',
            user_id:'5'
        });
    });
};

var mongoData = require('./modules/data/mongoData.js');
mongoData.on('mongoConnected',whenConnected);
mongoData.connect();

//var AdminBot = require('./modules/adminBot.js');


/*b.on('botRegister',function(e,t){
    console.log('----->',e,t);
})*/


//b.saveRavenDataToSS('Dragon riders of Pern');
/*
b.mainSwitch('matched the real killers',{
    name:'me'});*/
/*b.mainSwitch('targets2');
/*b.mainSwitch('bulk off',{
    user_id:2,
    name:'Blue Dragon 127.85m/46.69k/2.16k'
});*/
/*b.mainSwitch('123 Ady 1m/2k/2k',{
    name:'Blue Dragon 127.85m/46.69k/2.16k',
    user_id:2
});
b.mainSwitch('bulk',{
    user_id:2,
    name:'Blue Dragon 127.85m/46.69k/2.16k'
});
b.mainSwitch('remove Sur Slim 3x',{
    user_id:2,
    name:'Blue Dragon 127.85m/46.69k/2.16k'
})*/
/*
b.mainSwitch('mymini Gamba 80m/20k/2000',{
    name:'MB 409.8m/109.7k/3.0k',
    user_id:5
});
*/
/*
b.mainSwitch('myrisk 3',{
    name:'MB 409.8m/109.7k/3.0k',
    user_id:18289121
});*/
/*
b.mainSwitch('get timer',{
    name:'MB 409.8m/109.7k/3.0k',
    user_id:1
});
b.mainSwitch('time',{
    name:'MB 409.8m/109.7k/3.0k',
    user_id:1
});
*/
/*setTimeout(function(){
    b.mainSwitch('128 ady 1 1 1',{
        name:'MB 409.8m/109.7k/3.0k',
        user_id:1
    });
    
},5000)

setTimeout(function(){
    b.mainSwitch('yes',{
        name:'MB 409.8m/109.7k/3.0k',
        user_id:1
    });

},8000)*/

/*
b.mainSwitch('65 CharLiemanson  1.8m/1.7k/1.0k',{
    name:'MB 120.8m/57.7k/3.0k',
    user_id:1
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




