'use strict';

(function(root){

    var node = false;
    var es = {};

    if(typeof exports === 'undefined'){
        //Browser
        es = root['EventSquare'] = {};
    } else {
        //CommonJS
        es = root.exports;
        node = true;
    }

    if(node){
        var unirest = require('unirest');
    }

    var Endpoint = 'http://api.staging.eventsquare.io/1.0';
    var Edition;
    var Listeners = {};

    var Config = {
        apikey: null,
        uri: 'demo/demo',
        redirect: 'https://checkout.eventsquare.io',
        cart: null,
        queue: null,
        counter: true,
        agent: null,
        ip: null,
        language: 'en',
    };

    es.init = function(c,callback){
        Object.assign(Config,c);
        if(!Config.agent && !node){
            Config.agent = navigator.userAgent;
        }
        if(!Config.cart && !node){
            Config.cart = findCartInCookie();
        }
        loadStore(callback);
    };

    es.on = function(event,callback){
        Listeners[event] = callback;
    }

    function emit(type,data){
        if(typeof Listeners[type] === 'function'){
            Listeners[type](data);
        }
    }

    function loadStore(callback){

        if(typeof Config.apikey !== 'undefined' && typeof Config.uri !== 'undefined'){

            var request = {
                agent: Config.agent,
                language: Config.language,
            }

            if(Config.ip){
                request.ip = Config.ip;
            }

            if(Config.cart){
                request.cart = Config.cart;
            }

            req('get','/store/' + Config.uri,request,{
                //Header data
            },function(err,res){

                if(err){
                    callback(err);
                    return;
                }

                //Verify edition
                if(typeof res.edition !== 'undefined'){

                    callback(null,res.edition);
                    Edition = res.edition;

                    //Cart
                    if(typeof Edition.cart !== 'undefined'){
                        if(!node){
                            storeCartInCookie(Edition.cart);
                            if(Config.counter){
                                startCounter();
                            }
                        }
                    }
                    //Queue t.b.d.
                    if(typeof Edition.queue !== 'undefined'){

                    }
                } else {
                    callback('Please append the edition, and optionally channel to the uri (ex: event/edition/{channel})',null);
                }

            });
        }
    };

    function storeCartInCookie(cart) {
        var d = new Date();
        d.setTime(d.getTime() + (cart.expires_in * 1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = '_es' + "=" + cart.cartid + ";" + expires + ";path=/";
    }

    function findCartInCookie() {
        var name =  "_es=";
        var ca = document.cookie.split(';');
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }

    function startCounter(){

        var now = new Date();
        var counterEnd = new Date(now.getTime() + Edition.cart.expires_in*1000).getTime();

        var Timer = makeTimer(counterEnd);
        emit('tick',Timer);

        var counterInterval = setInterval(function(){

            Timer = makeTimer(counterEnd);
            emit('tick',Timer);

            if(Timer.expires <= 0){
                clearInterval(counterInterval);
                emit('expired');
            }

        },1000);

    }

    function makeTimer(end) {

        var now = new Date();
        var expires = Math.round((end - now.getTime()) / 1000);

        var min = Math.floor(expires/60);
        var sec = expires - (60 * min);

        var minVis = min;
        var secVis = sec;

        if(minVis < 10){
            minVis = 0 + String(minVis);
        }
        if(secVis < 10){
            secVis = 0 + String(secVis);
        }

        return {
            expires: expires,
            min: min,
            sec: sec,
            label: minVis+':'+secVis
        }
    }

    function loadStyles() {
        var css = 'es-css';  // you could encode the css path itself to generate id..
        if (!document.getElementById(css)){
            var head  = document.getElementsByTagName('head')[0];
            var link  = document.createElement('link');
            link.id   = css;
            link.rel  = 'stylesheet';
            link.type = 'text/css';
            link.href = 'http://website.com/css/stylesheet.css';
            link.media = 'all';
            head.appendChild(link);
        }
    }

    function req(method,uri,data,headers,callback) {

        var url = Endpoint + uri;

        if(node){

            var headers = headers ? headers : {};
            headers.apikey = Config.apikey;
            unirest[method](url)
            .headers(headers)
            .send(data)
            .end(function (response) {
                if(response.code >= 200 && response.code < 300){
                    callback(null,response.body);
                    return;
                } else {
                    if(typeof response.body !== 'undefined'){
                        callback(response.body,null);
                    } else {
                        callback(response.error,null);
                    }
                }
            });

        } else {

            if(method == 'get' && data){
                url += serialize(data);
            }

            var oReq = new XMLHttpRequest();

            oReq.addEventListener("load", function(){

                var response = {};

                try {
                    response = JSON.parse(oReq.response);
                    if(oReq.status >= 200 && oReq.status < 300){
                        callback(null,response);
                    } else {
                        callback(response,null);
                    }

                } catch (err){
                    callback(err.message,null);
                }

            });
            oReq.addEventListener("error", function(err){
                callback(err,null);
            });

            oReq.open(method, url);
            oReq.setRequestHeader("apikey", Config.apikey);
            oReq.send();

        }

    }

    function serialize(obj) {
      var str = [];
      for(var p in obj)
        if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
      return "?" + str.join("&");
    }

    function initCallback() {
        var scripts = document.getElementsByTagName('script');
        var index = scripts.length - 1;
        var es = scripts[index];
        var fs = es.src.replace(/^[^\?]+\??/,'').replace('callback=','');
        root[fs]();
    }

    if(!node){
        initCallback();
    }

})(typeof exports === 'undefined' ? this : module);
