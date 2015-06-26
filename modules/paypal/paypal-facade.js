/* Copyright 2015 PayPal */
"use strict";
var paypal = require('paypal-rest-sdk');
require('./configure-paypal');

var baseUrl = process.env['URL'];

function preparePay(price, callback) {


    var create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": baseUrl + "/paypal/ok",
            "cancel_url": baseUrl + "/paypal/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Raven donation",
                    "price": price + ".00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": price + ".00"
            },
            "description": "Thank you for donating !"
        }]
    };


    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            console.log("Create Payment Response");
            console.log(payment);
            for (var index = 0; index < payment.links.length; index++) {
                //Redirect user to this endpoint for redirect url
                if (payment.links[index].rel === 'approval_url') {
                    callback(payment.links[index].href);
                }
            }
        }
    });
}

function doPay(paymentId, payerID, token, callback) {

    var execute_payment_json = {
        "payer_id": payerID,
        "transactions": []
    };


    paypal.payment.get(paymentId, function (error, payment) {
        if (error) {
            console.log(error);
            throw error;
        } else {
            console.log("Get Payment Response1");
            console.log(payment);

            var amount = payment.transactions[0].amount;
            execute_payment_json.transactions.push({amount: amount});

            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    console.log(error.response);
                    throw error;
                } else {
                    console.log("Get Payment Response2");
                    console.log(payment);
                    callback(baseUrl+'/paypal/thankyou');
                    //  {"id":"PAY-7RS3381398631591BKWG2IRY","create_time":"2015-06-26T19:13:11Z","update_time":"2015-06-26T19:23:57Z","state":"approved","intent":"sale","payer":{"payment_method":"paypal","payer_info":{"email":"adylevy-buyer@gmail.com","first_name":"test","last_name":"buyer","payer_id":"XM9G58RX99QAY","shipping_address":{"line1":"ישראליס 5 דירה 4","city":"תל-אביב","state":"","postal_code":"61014","country_code":"IL","recipient_name":"test buyer"}}},"transactions":[{"amount":{"total":"1.00","currency":"USD","details":{"subtotal":"1.00"}},"description":"This is the payment description.","item_list":{"items":[{"name":"item","sku":"item","price":"1.00","currency":"USD","quantity":"1"}],"shipping_address":{"recipient_name":"test buyer","line1":"ישראליס 5 דירה 4","city":"תל-אביב","state":"","postal_code":"61014","country_code":"IL"}},"related_resources":[{"sale":{"id":"99P41764V6444230N","create_time":"2015-06-26T19:13:11Z","update_time":"2015-06-26T19:23:57Z","amount":{"total":"1.00","currency":"USD"},"payment_mode":"INSTANT_TRANSFER","state":"completed","protection_eligibility":"ELIGIBLE","protection_eligibility_type":"ITEM_NOT_RECEIVED_ELIGIBLE,UNAUTHORIZED_PAYMENT_ELIGIBLE","parent_payment":"PAY-7RS3381398631591BKWG2IRY","transaction_fee":{"value":"0.34","currency":"USD"},"links":[{"href":"https://api.sandbox.paypal.com/v1/payments/sale/99P41764V6444230N","rel":"self","method":"GET"},{"href":"https://api.sandbox.paypal.com/v1/payments/sale/99P41764V6444230N/refund","rel":"refund","method":"POST"},{"href":"https://api.sandbox.paypal.com/v1/payments/payment/PAY-7RS3381398631591BKWG2IRY","rel":"parent_payment","method":"GET"}]}}]}],"links":[{"href":"https://api.sandbox.paypal.com/v1/payments/payment/PAY-7RS3381398631591BKWG2IRY","rel":"self","method":"GET"}],"httpStatusCode":200}

                }
            });
        }

    });


}

exports.preparePay = preparePay;
exports.doPay = doPay;
