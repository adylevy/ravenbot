var roomPrefs = require('./../modules/data/roomPrefs.js');

var whenConnected=function(){
    console.log('mongo is connected');
    roomPrefs.getAllRoomPrefs().then(function(data){

      console.log(data);
   })

};

var mongoData = require('./../modules/data/mongoData.js');
mongoData.on('mongoConnected',whenConnected);
mongoData.connect();


