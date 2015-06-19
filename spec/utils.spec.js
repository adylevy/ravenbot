'use strict';

describe('utils tests', function() {

    var utils;
    beforeEach(function() {
        utils = require('../modules/utils');
    });

    describe('capitalise testing', function() {

        it('capatiize first letter', function() {
            expect(utils.capitaliseFirstLetter('bla')).toEqual('Bla');
        });

    });

});
