var http, director, router, server, port;

http        = require('http');
//director    = require('director');
var bot = require('./bot.js'); 
var env = require('node-env-file');
var _ =  require('underscore');

if (typeof process.env['TOKEN']=='undefined'){
env(__dirname + '/.env');
}


// local configuration read from env.
const TOKEN = process.env['TOKEN']; // your groupme api token
const GROUP = process.env['GROUP']; // the room you want to join
const ADMIN_NAME = process.env['ADMIN_NAME'];
const NAME = process.env['NAME']; // the name of your bot
const URL = process.env['URL']; // the domain you're serving from, should be accessible by Groupme.
const CONFIG = {token:TOKEN, group:GROUP, name:NAME, url:URL, adminName: ADMIN_NAME};

var mybot = bot(CONFIG);

mybot.on('botRegistered', function(b) {
  console.log("I am registered");
  b.message("AdyBot admin registered in room.");
});

mybot.on('botMessage', function(b, message) {
  console.log("I got a message, fyi");
  if (message.name != b.name) {
    if (message.group_id==GROUP){
      switch (message.text.split(' ')[0]){

        case 'list':
          listBots();
          break;
        case 'register':
          registerBot(message.text);
          break;
        case 'unregister':
          unregisterBot(message.text);
         default:
        break;
      }
  }
  else{
     b.message('ROOM:'+message.group_id + ": "+message.name + " said '" + message.text+"'");
   
  }
  }
});


var registerBot=function(){
  mybot.registerBot('11376345',CONFIG.name);
}
var unregisterBot=function(){
  mybot.unregisterBot('11376345',function(e){
    mybot.message('successfully unregistered');
  });
}


listBots = function(){
  mybot.message('fetching list');
    mybot.allBots(function(bots){
        var bots_txt='';
        _.each(bots,function(bot){
          bots_txt+=' Bot: '+bot.group_name+' '+bot.name;
        })
        mybot.message('Bots: '+bots_txt);
      })
}

mybot.on('botInternalMsg',function(b,msg){
  b.message('internal: '+msg);
})

console.log("i am serving");


port = Number(process.env.PORT || 5001);
mybot.serve(port);
