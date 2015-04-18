/**
 * Created by Ady on 2/20/2015.
 */

var mongoose = require('mongoose');
var Q = require('q');
var _ = require('underscore');
require('./mongoData.js');


module.exports = function () {

    var AppSettings = mongoose.model('AppSettings', {
        groups: [], guilds: [{
            guildName: String,
            roomId: Number,
            guildId: String
        }], warStartDate: Date
    });

    return {

        getSettings: function () {

            var defered = Q.defer();
            AppSettings.findOne({}, function (err, settings) {
                var item = settings;
                if (item == null) {
                    item = new AppSettings({groups: []});
                }
                defered.resolve(item);
            });
            return defered.promise;
        }
    };
}();