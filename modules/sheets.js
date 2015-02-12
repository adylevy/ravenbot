var HTTPS = require('https');
var Levenshtein = require('levenshtein');
var GoogleSpreadsheets = require('./spreadsheets');
var GoogleClientLogin = require("googleclientlogin").GoogleClientLogin;
var Q = require('q');
var _ = require('underscore');
var sheetKey = process.env['SS_TOKEN'];//'0AorXt_5bia2PdE5iMm83WVhpTUNBZ2JId252Q3BRN3c';

var NodeCache = require( "node-cache" );
var myCache = new NodeCache( { stdTTL: 100, checkperiod: 120 } );

var googleAuth = new GoogleClientLogin({
    email: 'gmadybot@gmail.com',
    password: 'gmadybotgm',
    service: 'spreadsheets',
    accountType: GoogleClientLogin.accountTypes.google
});

function loginToGoogle() {
    var deferred = Q.defer();
    googleAuth.on(GoogleClientLogin.events.login, function(){
        deferred.resolve();
    });
    googleAuth.login();
    return deferred.promise;

}

function getSpreadsheet(){
    var deferred = Q.defer();
    var cacheItem = myCache.get('spreadsheet');
    if (cacheItem.spreadsheet){
        console.log('item from cache');
        deferred.resolve(cacheItem.spreadsheet);
    }else {
        GoogleSpreadsheets({
            key: sheetKey,
            auth: googleAuth.getAuthId()
        }, function (err, spreadsheet) {
            myCache.set('spreadsheet', spreadsheet);
            deferred.resolve(spreadsheet);
        });
    }
    return deferred.promise;
}

//todo put in cache
function loadDataFromSS(firstLetter) {
    var deferred = Q.defer();
    loginToGoogle().then(getSpreadsheet).then(function(spreadsheet){
        console.log('login to google success');
        var guildsData = [];
        var ctr = 0;
        //todo - refactor to 2 loops, 1 get needed sheets and 2nd get their rows (can be done with Q.all)
        _.each(spreadsheet.worksheets, function (worksheet, idx) {
            var title = worksheet.title.toLowerCase();
            if (title.length == 1 && title.charAt(0) != firstLetter.toLowerCase() ) {
                ctr++;
                return;
            }

            getRows(worksheet).then(function (rows) {
                _.each(rows, function (row) {
                    var gd = parseRow(row);
                    if (gd != null) {
                        guildsData.push(gd);
                    }
                });
                ctr++;
                if (ctr == spreadsheet.worksheets.length) {

                    deferred.resolve(guildsData);
                }

            });

            //  });

        });
    });

    return deferred.promise;
}

function getRows(worksheet, callback) {
    var deferred = Q.defer();
    worksheet.rows({
        key: sheetKey,
        worksheet: worksheet.id

    }, function (err, rows) {
        // Cells will contain a 2 dimensional array with all cell data in the
        // range requested.
        if (err){
            deferred.reject(err);
        }else{
            deferred.resolve(_.isUndefined(rows) ? [] : rows);
        }

    });
    return deferred.promise;
}

function getSheetColumns(worksheet) {
    var deferred = Q.defer();
    var cellRange = ('A1:' + String.fromCharCode(64 + Number(worksheet.colCount)) + '1');
    var minRow=1;
    var maxRow=1;
    console.log(cellRange);
    worksheet.cells({
        key: sheetKey,
        worksheet: worksheet.id,
       /* range: cellRange,*/
        minRow:minRow,
        maxRow:maxRow
    }, function (err, cells) {
        // Cells will contain a 2 dimensional array with all cell data in the
        // range requested.
        if (err){
            deferred.reject(err);
        }else{
            console.log(cells.cells);
            console.log('---');
            deferred.resolve(cells.cells);
        }
    });
    return deferred.promise;
}


function parseRow(row, headCells) {

    var guildData = {};
    guildData.guildName = row.title.trim().toLowerCase().replace(/(\r\n|\n|\r)/gm, "");
    guildData.allIntel = '';
    if (guildData.guildName == '' || guildData.guildName == undefined) {
        return null;
    }

    _.each(row.cells, function (cell, idx) {
        if (idx == 0) {
            return;
        }
        var cellValue = cell;//.toLowerCase().trim().replace(/\s/g, '').replace(/\//g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\:/g, '');

        if (cellValue!='') {
            guildData.lastIntel = cellValue;
            guildData.lastIntelCell=idx;
            guildData.allIntel += cellValue;
        }

    });

    return guildData;

}

//put in cache for 5 minutes.
function getData(guildName, callback) {
    var deferred = Q.defer();
    guildName = guildName.toLowerCase();
    console.log('sheets get data:',guildName);
    //var len=_sheetInfo.worksheets.length;
    //console.log('running over '+len+' sheets');
    // postMessage('looking for ' +guildName);
    loadDataFromSS(guildName.charAt(0)).then(function (guildsData) {
        var foundGuild = null;
        var bestMatch = {dist: 100, guild: {}};
        _.each(guildsData, function (guild, idx) {
            if (guild.guildName == undefined) {
                return;
            }
            var dist = new Levenshtein(guildName, guild.guildName);
            if (foundGuild == null && dist.valueOf() <= 1) {
                foundGuild = guild;
            }

            if (bestMatch.dist > dist.valueOf()) {
                bestMatch = {
                    dist: dist.valueOf(),
                    guild: guild
                };
            }

        });
        if (bestMatch.dist == 0 && foundGuild != null && foundGuild.guildName != bestMatch.guild.guildName) {
            // the best matched guild is better then the found one!
            // example fun2 and fun3
            foundGuild = bestMatch.guild;
        }
        if (callback!=undefined) {
            callback(foundGuild, bestMatch);
        }
        var obj={
            foundGuild:foundGuild,
            bestMatch:bestMatch
        };

        deferred.resolve(obj)
    }
    );

    return deferred.promise;
}


exports.getGuildData = getData;

