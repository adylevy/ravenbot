/**
 * Created by Ady on 2/20/2015.
 */

var mongoose = require('mongoose');
var Q = require('q');
var _ = require('underscore');
require('./mongoData.js')

module.exports = function () {

    var Audit = mongoose.model('Audit', {
        guildName: String,
        roomId: Number,
        performerId: Number,
        performerName: String,
        action: String,
        date: Date

    });

    return {

        getAll: function (_guildName) {
            var defered = Q.defer();
            Audit.find({
                guildName: _guildName
            }, function (err, auditLines) {
               defered.resolve(auditLines);
            });
            return defered.promise;
        },
        add: function(auditItem){
            var a = new Audit({
                guildName: auditItem.guildName,
                roomId: auditItem.roomId,
                performerId: auditItem.performerId,
                performerName: auditItem.performerName,
                action: auditItem.action,
                date: Date.now()
            });
            a.save();

        }
    };
}();
