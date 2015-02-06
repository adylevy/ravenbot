/**
 * Created by Ady on 1/13/2015.
 */
var Class = require('./Class.js').Class;
var _ = require('underscore');

var Player = Class.extend(function () {


    return {
        /* options :
         {
         "bot_id": "1234567890",
         "group_id": "1234567890",
         "name": "hal9000",
         "avatar_url": "http://i.groupme.com/123456789",
         "callback_url": "http://example.com/bots/callback"
         }
         */
        init: function (line) {
            //console.log(line);
            if (typeof(line)!='string'){
                return;
                
            }
            //line=line.toLowerCase();
            this.line = line;
            var playerRgx = /^(\d+)\s+([\w\-@\.,\s\(\)]{1,35})\s+([\d\.,\s?mkbMKB]+)[\s?\/?,?(]+([\d\.,mkMK]+)[\s?\/?,?()]+([\d\.,mkMK]+)/;
            var nameLvlRgx = /([\w\-@\.,\s\(\)]{1,35})\s+(\d+)\s+([\d\.,\s?mkbMKB]+)[\s?\/?,?(]+([\d\.,mkMK]+)[\s?\/?,?()]+([\d\.,mkMK]+)/;
            var matches = playerRgx.exec(line);
            var secondTry = nameLvlRgx.exec(line);
            if (matches==null && secondTry!=null){
                matches=secondTry;
                var lvl = matches[2];
                matches[2]=matches[1];
                matches[1]=lvl;
            }
            if (matches != null && matches.length == 6) {
                this.player = true;
                this.lvl = Number(matches[1]);
                this.name = matches[2];
                matches[3]=matches[3].toLocaleLowerCase();
                matches[4]=matches[4].toLocaleLowerCase();
                matches[5]=matches[5].toLocaleLowerCase();
                this.def = this.normalize(matches[3].replace(/,/g,'.'), 'm', this.lvl>100?10:0);
                this.eqDef = this.normalize(matches[4].replace(/,/g,'.') || 0, 'k',this.lvl>140?100:0);
                this.heroDef = this.normalize(matches[5].replace(/,/g,'.') || 0, 'k',0);
                this.insertDate = new Date(2014,1,1);
            } else {
                this.player = false;
               // console.log('no match', line);
            }

        },
        
        isFresh: function(){
            var d=new Date();
            d.setDate(d.getDate()-6);
            return this.insertDate.getTime()>=d.getTime();
            
        },
        create: function(_lvl,_name,_def,_eqDef,_heroDef){

            this.player = true;
            this.lvl = Number(_lvl);
            this.name = _name;
            this.def = this.normalize(_def || 0, 'm', this.lvl>100?10:0);
            this.eqDef = this.normalize(_eqDef || 0, 'k',this.lvl>140?100:0);
            this.heroDef = this.normalize(_heroDef || 0, 'k',0);
          //  console.log('--->',this);
        },
        
        getGuildPlayerObj: function(){
            return { name:this.name,lvl:this.lvl,def:this.def,eqDef:this.eqDef,heroDef:this.heroDef,date:Date.now(), insertedByGuild:'',insertedByUser:''}
            
        },

        normalize : function (stat, def,bThreshHold) {
            stat=stat+'';
        var num = stat;

        if ((def == 'k' && stat.indexOf('k') == -1) && Number(stat) < 100) {
            stat += def;
        }
            if ((def == 'k' && stat.indexOf('k') == -1) && bThreshHold!=0 && Number(stat)>bThreshHold && Number(stat)<1000){
                stat += def;
            }
            
        if ((def == 'm' && stat.indexOf('m') == -1 && stat.indexOf('b')==-1) && Number(stat) < 1000) {

            if (stat.indexOf('b')==-1 && Number(stat)<=bThreshHold){
                stat+='b';
            }else {
                stat += def;
            }
        }

        if (stat.indexOf('k') > -1) {
            num = Number(stat.replace('k', '')) * 1000;
        } else if (stat.indexOf('m') > -1) {
            num = Number(stat.replace('m', '')) * 1000000;
        }else if (stat.indexOf('b')>-1){
            num = Number(stat.replace('b', '')) * 1000000000;
        }
        return Number(num);
    },

    toString :function () {
        var prettyNum = function (num) {

            if (num >= 1000000) {
                num = (num / 1000000).toFixed(2);
                if (num.indexOf('.00') != -1) {
                    num = num.substr(0, num.length - 3);
                }
                num += 'm';
            } else if (num >= 1000) {
                num = (num / 1000).toFixed(2);
                if (num.indexOf('.00') != -1) {
                    num = num.substr(0, num.length - 3);
                }
                num += 'k';
            }
            return num;
        }
        return this.lvl + ' ' + this.name + ' ' + prettyNum(this.def) + '/' + prettyNum(this.eqDef) + '/' + prettyNum(this.heroDef) + '';
    },

    isPlayer :function () {
        return this.player == true && this.lvl > 0 && this.name != '';
    }



}
}());

module.exports = function (options) {
    var md = new Player(options);
    return md;
};

