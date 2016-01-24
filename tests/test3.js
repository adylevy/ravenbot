var roomPrefs = require('./../modules/data/roomPrefs.js');
var _ = require('underscore');
var whenConnected = function () {
    console.log('mongo is connected');
   // this.timerInterval = setInterval(function () {

   // }.bind(this),  1000);



    var onTimeTick = function (){
        roomPrefs.getAllRoomPrefs().then(function (rooms) {

            _.each(rooms, function (room) {
                if (room.warData.inWar) {
                    //  console.log('onTick',room.roomId,this.allBots);
                    console.log(room);
                }
            }.bind(this));

         //   console.log(rooms);
        });
    }
    onTimeTick()

    ;

};

var mongoData = require('./../modules/data/mongoData.js');
mongoData.on('mongoConnected', whenConnected);
mongoData.connect();


