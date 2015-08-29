var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


var guildSchema = Schema({
    name: String,
    lastKnownIntel: String,
    isDeleted: {type: Boolean, default: false},
    deletedBy: String,
    deletionDate: Date,
    players: [
        {
            name: String,
            lvl: Number,
            def: Number,
            eqDef: Number,
            heroDef: Number,
            date: Date,
            insertedByGuild: String,
            insertedByUser: String,
            insertedByUserId: Number,
            isDeleted: {type: Boolean, default: false}
        }
    ]
})

var roomPrefSchema = Schema({
    roomId: Number,
    guildId: {type: Schema.Types.ObjectId, required: false , ref: 'Guilds'},
    warData: {
        inWar: Boolean,
        guildName: String,
        warTime: Date

    },
    playersPrefs: [{
        id: Number,
        mini: String,
        minis: [{player: String, idx: Number}],
        risk: {type: Number, default: 0}
    }],
    settings: [],
    matches: [{
        guildName: String,
        warTime: Date,
        warResult: String
    }]
});


;

module.exports.roomPref = roomPrefSchema;
module.exports.guild = guildSchema;
