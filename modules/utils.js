

(function(exports){

    function capitaliseFirstLetter (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    exports.capitaliseFirstLetter=capitaliseFirstLetter;

})(typeof exports === 'undefined'? this['utils']={}: exports);
