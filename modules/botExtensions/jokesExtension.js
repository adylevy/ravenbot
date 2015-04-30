var giphy = require('../giphy.js')('dc6zaTOxFJmzC');
var chuckJokes = require('../chuckJokes.js');

module.exports = function (txt, msg, postMessage) {

    function handleMessage(txt){
        if (/^joke$/.test(txt)) {
            tellAJoke();
            return;
        }

        // Easter Egg images:

        if (/facepalm/.test(txt)) {
            tellGifJoke('marvel-wolverine-facepalm');
            return;
        }

        if (/potato/.test(txt)) {
            tellGifJoke('yellow-minions-potato');
            return;
        }

        if (/gumby/.test(txt)) {
            tellGifJoke('unf-gumby');
            return;
        }

        if (/rocketsnail/.test(txt)) {
            tellGifJoke('SQgbkziuGrNxS');
            return;
        }

        if (/^matched\steam\swild\ssnails$/.test(txt)) {
            tellGifJoke('SQgbkziuGrNxS');
        }

        if (/cowbell/.test(txt)) {
            tellGifJoke('whOs1JywNpe6c');
            return;
        }

        if (/hots\sfavorite/.test(txt)) {
            tellGifJoke('TuQUMaAji7pkY');
            return;
        }

        if (/^boom$/.test(txt)) {
            tellGifJoke('yNf9JjErqMcve');
        }

        if (/banana/.test(txt)) {
            tellGifJoke('cw8Nr4u28tVKw');
            return;
        }

        //Easter Egg jokes:

        if (/^norm$/.test(txt)) {
            postMessage('Evening Everybody');
        }

        if (/^how\sabout\sa\sbeer\snorm$/.test(txt)) {
            postMessage('OK, but stop me at one...  Make that one thirty.');
        }

        if (/^whats\sshakin\snorm$/.test(txt)) {
            postMessage('All four cheeks and a couple of chins, Coach.');
        }

        //Menu driven jokes

        if (/^minions$/.test(txt)) {
            tellGifJoke();
            return;
        }

        var gifRgx = /^gif\s(.*)+$/;
        if (gifRgx.test(txt)) {
            var match = gifRgx.exec(txt);
            tellGifJoke(match[1]);
            return;
        }
    }

    function tellAJoke() {

        chuckJokes.getJoke().then(function (joke) {
            postMessage(joke);
        }.bind(this))
    }


    function tellGifJoke(theme) {

        theme = typeof(theme) == 'string' ? theme : 'minions';
        giphy.random(encodeURI(theme), function (err, response) {
            if (err == null) {
                postMessage('', response.data.image_url);
            } else {
                postMessage('could not find this theme.');

            }
        })
    }

    handleMessage(txt);

}