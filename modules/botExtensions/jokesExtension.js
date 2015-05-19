var giphy = require('../giphy.js')('dc6zaTOxFJmzC');
var chuckJokes = require('../chuckJokes.js');

module.exports = function (txt, msg, postMessage) {

    function handleMessage(txt){
        if (/^joke$/.test(txt)) {
            tellAJoke();
            return;
        }

        //Easter Egg images

        if (/facepalm/.test(txt)) {
            tellGifJoke('marvel-wolverine-facepalm');
            return;
        }

        if (/potato/.test(txt)) {
            tellGifJoke('yellow-minions-potato');
            return;
        }

        if (/^gumby$/.test(txt)) {
            tellGifJoke('unf-gumby');
            return;
        }

        if (/rocketsnail/.test(txt)) {
            tellGifJoke('SQgbkziuGrNxS');
            return;
        }

        if (/^matched\steam\swild\ssnails$/.test(txt)) {
            tellGifJoke('SQgbkziuGrNxS');
            return;
        }

        if (/cowbell/.test(txt)) {
            tellGifJoke('whOs1JywNpe6c');
            return;
        }

        if (/^boom$/.test(txt)) {
            tellGifJoke('yNf9JjErqMcve');
            return;
        }

        if (/hots\sfavorite/.test(txt)) {
            tellGifJoke('TuQUMaAji7pkY');
            return;
        }

        if (/banana/.test(txt)) {
            tellGifJoke('cw8Nr4u28tVKw');
            return;
        }

        //Raven Easter Egg responses

        if (/^raven\sis\sa\spretty\sbird$/.test(txt)) {
            postMessage('Did I hear Hots?  Here, have some candy.');
            return;
        }

        //Norm Jokes

        if (/^norm$/.test(txt)) {
            postMessage('Evening Everybody');
            return;
        }

        if (/^how\sabout\sa\sbeer\snorm$/.test(txt)) {
            postMessage('OK, but stop me at one... Make that one thirty.');
            return;
        }

        if (/^whats\sshakin\snorm$/.test(txt)) {
            postMessage('All four cheeks and a couple of chins.');
            return;
        }

        //Tribute to DJ - 22 May 2015 war

        if (/^matched\sthe\sancients$/.test(txt)) {
            postMessage('We fight in memory of DJ. To show your respect, we ask that you fight us with honour, do not hold back and give only 1 love tap to DJ.');
            return;             
        }

        //Known Joke Images

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