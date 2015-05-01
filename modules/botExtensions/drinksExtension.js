module.exports = function (txt, msg, postMessage) {

    function handleMessage(txt) {
        var baseUrl = process.env['URL'];

        // Drinks that show up in the menu:

        if (/^dirty\smartini$/.test(txt)) {
            postMessage('', baseUrl + '/images/dirtymartini.jpg');
        }

        if (/^long\sisland\siced\s?tea$/.test(txt)) {
            postMessage('', baseUrl + '/images/LIIT.jpg');
        }

        if (/^coca[\-\s]?cola$/.test(txt)) {
            postMessage('', baseUrl + '/images/cocacola.jpg');
        }

        if (/^alabama\sslammer$/.test(txt)) {
            postMessage('', baseUrl + '/images/alabamaslammer.jpg');
        }

        if (/^rum\sand\scoke$/.test(txt)) {
            postMessage('', baseUrl + '/images/bacardicoke.jpg');
        }

        if (/^screwdriver$/.test(txt)) {
            postMessage('', baseUrl + '/images/screwdriver.jpg');
        }

        if (/^bloody\smary$/.test(txt)) {
            postMessage('', baseUrl + '/images/bloodymary.jpg');
        }

        if (/^gin\sand\stonic$/.test(txt)) {
            postMessage('', baseUrl + '/images/gintonic.jpg');
        }

        if (/^mojito$/.test(txt)) {
            postMessage('', baseUrl + '/images/mojito.jpg');
        }

        if (/^beer$/.test(txt)) {
            postMessage('', baseUrl + '/images/beer.jpg');
        }

        if (/^shirley\stemple$/.test(txt)) {
            postMessage('', baseUrl + '/images/shirleytemple.jpg');
        }

        // Drinks that are hidden from the menu:

        if (/^adybeer$/.test(txt)) {
            postMessage('', baseUrl + '/images/adybeer.jpg');
        }

        if (/^bluemoon$/.test(txt)) {
            postMessage('', baseUrl + '/images/bluemoon.jpg');
        }

        if (/^mint\sjulep$/.test(txt)) {
            postMessage('', baseUrl + '/images/julep.jpg');
        }

        if (/^sex\son\sthe\sbeach$/.test(txt)) {
            postMessage('', baseUrl + '/images/sex-on-the-beach.jpg');
        }

        // Calls up the menu:

        if (/^bartender$/.test(txt)) {
            showbartender();
        }

        // Menu:

    }

    function showbartender() {
        var helpMsg = [];
        helpMsg.push('Pull up a chair.  What can I get you?');
        helpMsg.push('');
        helpMsg.push('Dirty Martini');
        helpMsg.push('Bloody Mary');
        helpMsg.push('Rum and Coke');
        helpMsg.push('Screwdriver');
        helpMsg.push('Alabama Slammer');
        helpMsg.push('Long Island Iced Tea');
        helpMsg.push('Gin and Tonic');
        helpMsg.push('Mojito');
        helpMsg.push('Beer');
        helpMsg.push('Shirley Temple');
        helpMsg.push('Coca-Cola');

        postMessage(helpMsg.join('\n'));
    }

    handleMessage(txt);

}