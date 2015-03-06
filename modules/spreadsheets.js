var request = require("request");
var http = require("http");
var querystring = require("querystring");
const _ = require('underscore');
var FEED_URL = "https://spreadsheets.google.com/feeds/";
var parseString = require('./xml2js/xml2js').parseString;

var forceArray = function (val) {
    if (Array.isArray(val)) {
        return val;
    }

    return [val];
};

var getFeed = function (params, auth, query, cb) {
    var headers = {};
    var visibility = "public";
    var projection = "values";

    if (auth) {
        headers.Authorization = "GoogleLogin auth=" + auth;
        visibility = "private";
        projection = "full";
    }
    params.push(visibility, projection);

    query = query || {};
    // query.alt = "json";
    headers.Accept='text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    var url = FEED_URL + params.join("/");
    if (query) {
        url += "?" + querystring.stringify(query);
    }
    // console.log('getting: ' + url);
    request.get({
        url: url,
        headers: headers,
        json: true
    }, function (err, response, body) {
        if (err) {
            cb(err);
            return;
        }
        if (!response) {
            cb(new Error("Missing response."));
            return;
        }
        if (response.statusCode === 401) {
            return cb(new Error("Invalid authorization key."));
        }

        if (response.statusCode >= 400) {
            return cb(new Error("HTTP error " + response.statusCode + ": " + http.STATUS_CODES[response.statusCode]));
        }
        parseString(body, function (err, result) {
            //  console.dir(result);
            cb(null, result.feed);
        });
        //
    });
};

var Spreadsheets = module.exports = function (opts, cb) {
    if (!opts) {
        throw new Error("Invalid arguments.");
    }
    if (!opts.key) {
        throw new Error("Spreadsheet key not provided.");
    }

    getFeed(["worksheets", opts.key], opts.auth, null, function (err, data) {
        if (err) {
            return cb(err);
        }

        cb(null, new Spreadsheet(opts.key, opts.auth, data));
    });
};

Spreadsheets.rows = function (opts, cb) {
    if (!opts) {
        throw new Error("Invalid arguments.");
    }
    if (!opts.key) {
        throw new Error("Spreadsheet key not provided.");
    }
    if (!opts.worksheet) {
        throw new Error("Worksheet not specified.");
    }

    var query = {};
    if (opts.start) {
        query["start-index"] = opts.start;
    }
    if (opts.num) {
        query["max-results"] = opts.num;
    }
    if (opts.orderby) {
        query["orderby"] = opts.orderby;
    }
    if (opts.reverse) {
        query["reverse"] = opts.reverse;
    }
    if (opts.sq) {
        query["sq"] = opts.sq;
    }

    getFeed(["list", opts.key, opts.worksheet], opts.auth, query, function (err, data) {
        if (err) {
            return cb(err);
        }

        var rows = [];

        if (typeof data.entry != "undefined" && data.entry !== null) {
            var entries = forceArray(data.entry);

            entries.forEach(function (entry) {
                rows.push(new Row(entry));
            });
        }

        cb(null, rows);
    });
};

Spreadsheets.cells = function (opts, cb) {
    if (!opts) {
        throw new Error("Invalid arguments.");
    }
    if (!opts.key) {
        throw new Error("Spreadsheet key not provided.");
    }
    if (!opts.worksheet) {
        throw new Error("Worksheet not specified.");
    }

    var query = {};
    if (opts.range) {
        query["range"] = opts.range;
    }
    if (opts.maxRow) {
        query["max-row"] = opts.maxRow;
    }
    if (opts.minRow) {
        query["min-row"] = opts.minRow;
    }
    if (opts.maxCol) {
        query["max-col"] = opts.maxCol;
    }
    if (opts.minCol) {
        query["min-col"] = opts.minCol;
    }

    getFeed(["cells", opts.key, opts.worksheet], opts.auth, query, function (err, data) {
        if (err) {
            return cb(err);
        }

        cb(null, new Cells(data));
    });
};

var Spreadsheet = function (key, auth, data) {
    this.key = key;
    this.auth = auth;
    this.title = data.title[0]._;
    this.updated = data.updated[0];
    this.author = {
        name: data.author[0].name[0],
        email: data.author[0].email[0]
    };

    this.worksheets = [];
    var worksheets = forceArray(data.entry);

    worksheets.forEach(function (worksheetData) {
        this.worksheets.push(new Worksheet(this, worksheetData));
    }, this);
};

var Worksheet = function (spreadsheet, data) {
    // This should be okay, unless Google decided to change their URL scheme...
    var id = data.id[0];
    this.id = id.substring(id.lastIndexOf("/") + 1);
    this.spreadsheet = spreadsheet;
    this.rowCount = data['gs:rowCount'][0];
    this.colCount = data['gs:colCount'][0];
    this.title = data.title[0]._;
};

Worksheet.prototype.rows = function (opts, cb) {
    opts = opts || {};
    Spreadsheets.rows({
        key: this.spreadsheet.key,
        auth: this.spreadsheet.auth,
        worksheet: this.id,
        start: opts.start,
        num: opts.num,
        sq: opts.sq,
        orderby: opts.orderby,
        reverse: opts.reverse
    }, cb);
};

Worksheet.prototype.cells = function (opts, cb) {
    opts = opts || {};
    Spreadsheets.cells({
        key: this.spreadsheet.key,
        auth: this.spreadsheet.auth,
        worksheet: this.id,
        range: opts.range,
        maxRow: opts.maxRow,
        minRow: opts.minRow,
        maxCol: opts.maxCol,
        minCol: opts.minCol
    }, cb);
};

var Row = function (data) {
    this.cells=[];
    for(var key in data){
        if (key.substring(0, 4) == 'gsx:') {
            // console.log(key, data[key].$t);
            this.cells.push(data[key][0]);
        };
    }
    this.title=data.title[0]._;

    /* Object.keys(data).forEach(function (key) {
     var val;
     val = data[key];
     if (key.substring(0, 4) == "gsx:") {
     if (typeof val == 'object' && Object.keys(val).length === 0) {
     val = null;
     }
     if (key == "gsx:") {
     this[key.substring(0, 3)] = val;
     } else {
     this[key.substring(4)] = val;
     }
     } else if (key.substring(0, 4) == "gsx$") {
     if (key == "gsx$") {
     this[key.substring(0, 3)] = val;
     } else {
     this[key.substring(4)] = val.$t || val;
     }
     } else {
     if (key == "id") {
     this[key] = val;
     } else if (val.$t) {
     this[key] = val.$t;
     }
     }
     }, this);*/

};

var Cells = function (data) {
    // Populate the cell data into an array grid.
    this.cells = {};

    var entries = forceArray(data.entry);
    var cell, row, col;
    entries.forEach(function (entry) {
        cell = typeof entry == 'undefined' ? {} : entry.gs$cell;
        row = cell.row;
        col = cell.col;

        if (!this.cells[row]) {
            this.cells[row] = {};
        }

        this.cells[row][col] = {
            row: row,
            col: col,
            value: cell.$t || ""
        };
    }, this);
};