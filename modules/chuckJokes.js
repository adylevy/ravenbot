var http = require('http');
var Q = require('q');
var Class = require('./Class.js').Class;

var ChuckJokes = Class.extend(function(){

    return {
        init: function () {

        },
        getJoke: function (first, last) {
            var deferred = Q.defer();
            try {
                http.get({
                    host: 'api.icndb.com',
                    path: '/jokes/random'
                }, function (res) {
                    // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
                    res.setEncoding('utf8');

                    // incrementally capture the incoming response body
                    var body = '';
                    res.on('data', function (d) {
                        body += d;
                    });

                    // do whatever we want with the response once it's done
                    res.on('end', function () {
                        try {
                            var parsed = JSON.parse(body);
                        } catch (err) {
                            console.error('Unable to parse response as JSON', err);
                           deferred.reject(err);
                        }

                        // pass the relevant data back to the callback
                        deferred.resolve(parsed.value.joke);
                    });
                }).on('error', function (err) {
                    // handle errors with the request itself
                    console.error('Error with the request:', err.message);
                    deferred.reject(err);
                });
            }
            catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }
    }
}());

module.exports = function () {
    var md= new ChuckJokes();
    return md;
}();