module.exports = function (txt, msg, postMessage) {

    function handleMessage(txt) {
        var baseUrl = process.env['URL'];

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

        if (/^bacardi\sand\scoke$/.test(txt)) {
            postMessage('', baseUrl + '/images/bacardicoke.jpg');
        }

        if (/^screwdriver$/.test(txt)) {
            postMessage('', baseUrl + '/images/screwdriver.jpg');
        }

        if (/^bloody\smary$/.test(txt)) {
            postMessage('', baseUrl + '/images/bloodymary.jpg');
        }

        if (/^bartender$/.test(txt)) {
            showbartender();
        }

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
        helpMsg.push('Coca-Cola');

        postMessage(helpMsg.join('\n'));
    }

    handleMessage(txt);

}