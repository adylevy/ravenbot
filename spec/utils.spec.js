'use strict';

describe('utils tests', function() {

    beforeEach(function() {

    });

    describe('capitalise testing', function() {

        it('capatiize first letter', function() {
            expect(utils.capitaliseFirstLetter('bla')).toEqual('Bla');
        });

    });

});
