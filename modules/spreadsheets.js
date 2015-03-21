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
        headers: headers
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

var xmlSafeValue = function(val){
    if ( val == null ) return '';
    return String(val)/*.replace(/&/g, '&amp;')*/
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

var saveCell = function (params,r,c,oldData,newData, auth, cb) {
    var headers = {};
    var visibility = "public";
    var projection = "values";

    if (auth) {
        headers['Authorization'] = "GoogleLogin auth=" + auth;
        visibility = "private";
        projection = "full";
    }

    params.push(visibility, projection);
    params.push('R' + r + 'C' + c);
    var url = FEED_URL + params.join("/");

    headers.Accept='text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';

    request.get({
        url: url,
        headers: headers
    }, function (err, response, body) {

        parseString(body, function (err, result) {
            var cellContent=result.entry.content[0]._;
            var ssData = cellContent.split('----------->>>>');
            var data=[];
            _.each(ssData,function(line){
                if (line.indexOf('Raven data:')==-1){
                    data.push(line);
                }
            });
            var content=data.join('\n');
            content=content.replace(/[\n]+/g,'\n');
            content=content.replace(/\n/g,'&#10;');
            content=content+newData;
            var _url = result.entry.link[1].$.href;
            var data_xml =
                '<entry><id>' + url + '</id>' +
                '<link rel="edit" type="application/atom+xml" href="' + _url + '"/>' +
                '<gs:cell row="' + r + '" col="' + c + '" inputValue="'+xmlSafeValue(content)+'"/></entry>';
            console.log(data_xml);
            data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gs='http://schemas.google.com/spreadsheets/2006'>");
            console.log(_url);
            headers['content-type'] = 'application/atom+xml';
            console.log(headers);
            request({
                url: _url,
                method: 'PUT',
                headers: headers,
                body: data_xml
            }, function (err, response, body) {
                console.warn(err, response.statusCode, body);
            });
        });
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
            var ctr=0;
            entries.forEach(function (entry) {
                rows.push(new Row(entry,ctr++));
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

    this.updateCell=function(idx,r,c,oldData,newData){
        var params=[];
        params.push('cells');
        params.push(this.key);
        params.push(idx);
        saveCell(params,r,c,oldData,newData,this.auth,function(res){
            console.log(res);
        })
    };
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

var Row = function (data,idx,ssID) {
    this.cells=[];
    this.idx=idx;
    for(var key in data){
        if (key.substring(0, 4) == 'gsx:') {
            // console.log(key, data[key].$t);
            this.cells.push(data[key][0]);
        };
    }
    this.title=data.title[0]._;
    this.ssID=data.link[0].$.href;

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
