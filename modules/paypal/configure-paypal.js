var paypal = require('paypal-rest-sdk');

var clientId = process.env['PAYPAL_CLIENTID'];
var clientSecret = process.env['PAYPAL_CLIENTSECRET'];
var paypalMode = process.env['PAYPAL_MODE'];

paypal.configure({
    'mode': paypalMode, //sandbox or live
    'client_id': clientId,
    'client_secret': clientSecret
});

/*
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AWaIxKVur99stGRxW55EM6ojd04rdkAAcW5NOLzRyeQjUa1qJyrqPT81NApTdntbQ9QOIK7DqiN9B8iv',
    'client_secret': 'EBCxpo9_4EQNesEn-ctKfBpQOVEa19JBN75piVTL5pvxKmVy-4PtK5zytDHoG2_FfP8tr6ymrm2BsQK7'
});
*/
