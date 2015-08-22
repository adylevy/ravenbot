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

        if (/^vodka\stonic$/.test(txt)) {
            postMessage('', baseUrl + '/images/vodkatonic2.jpg');
        }

        if (/^mudslide$/.test(txt)) {
            postMessage('', baseUrl + '/images/mudslide.jpg');
        }

        if (/^fuzzy\snavel$/.test(txt)) {
            postMessage('', baseUrl + '/images/fuzzynavel.jpg');
        }

        if (/^red\swine$/.test(txt)) {
            postMessage('', baseUrl + '/images/redwine.jpg');
        }

        if (/^shirley\stemple$/.test(txt)) {
            postMessage('', baseUrl + '/images/shirleytemple.jpg');
        }

        if (/^coffee$/.test(txt)) {
            postMessage('', baseUrl + '/images/coffee.jpg');
        }

        if (/^breakfast\stea$/.test(txt)) {
            postMessage('', baseUrl + '/images/breakfast_tea.jpg');
        }

        if (/^irish\scoffee$/.test(txt)) {
            postMessage('', baseUrl + '/images/irishcoffee2.jpg');
        }

        if (/^scotch$/.test(txt)) {
            postMessage('', baseUrl + '/images/scotch.jpg');
        }

        if (/^champagne$/.test(txt)) {
            postMessage('', baseUrl + '/images/champagne.jpg');
        }

        if (/^fireball$/.test(txt)) {
            postMessage('', baseUrl + '/images/fireball.jpg');
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

        // Hidden images:

        if (/^uisge$/.test(txt)) {
            postMessage('', baseUrl + '/images/uisge.jpg');
        }

        // Temp Prize Winnings:

        if (/^matched\sthe\sbrood$/.test(txt)) {
            postMessage('', baseUrl + '/images/brood.jpg');
            return;
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
        helpMsg.push('Irish Coffee');
        helpMsg.push('Long Island Iced Tea');
        helpMsg.push('Gin and Tonic');
        helpMsg.push('Mojito');
        helpMsg.push('Scotch');
        helpMsg.push('Beer');
        helpMsg.push('Fireball');
        helpMsg.push('Champagne');
        helpMsg.push('Vodka Tonic');
        helpMsg.push('Mudslide');
        helpMsg.push('Red Wine');
        helpMsg.push('Fuzzy Navel');
        helpMsg.push('Shirley Temple');
        helpMsg.push('Coffee');
        helpMsg.push('Breakfast Tea');
        helpMsg.push('Coca-Cola');

        postMessage(helpMsg.join('\n'));
    }

    handleMessage(txt);

}