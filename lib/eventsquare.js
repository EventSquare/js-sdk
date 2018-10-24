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

    var Endpoint = 'https://api.eventsquare.io/1.0';
    var Checkout = 'https://checkout.eventsquare.io';

    var Edition;
    var Listeners = {};

    var Config = {
        apikey: null,
        headers: {},
        test: false,
        uri: 'demo/demo',
        redirect: Checkout,
        cart: null,
        queue: null,
        counter: true,
        agent: null,
        ip: null,
        language: 'en',
    };

    es.init = function(c){
        Object.assign(Config,c);
    };

    es.store = function(uri,request,callback){
        if(!node){
            if(!Config.agent && !request.agent){
                request.agent = navigator.userAgent;
            }
            if(!request.cart){
                request.cart = findCartInCookie();
            }
        }
        loadStore(uri,request,callback);
    };
    es.show = function(uri,request,callback){
        req('get','/store/' + uri,request,{},function(err,res){

            if(err){
                callback(err);
                return;
            }
            callback(null,res.show);

        });
    };
    es.seatmap = function(uri,request,callback){
        req('get','/store/' + uri,request,{},function(err,res){
            if(err){
                callback(err);
                return;
            }
            callback(null,res.seatmap);
        });
    };

    es.useEndpoint = function(endpoint) {
        Endpoint = endpoint;
    }
    es.useCheckout = function(checkout) {
        Checkout = checkout;
    }

    es.updateType = function(cartid,uid,request,callback){

        req('put','/cart/'+cartid+'/types/' + uid,request,{},function(err,res){
            if(err){
                callback(err,null);
                return;
            }
            es.cart(cartid,callback);
        });
    }

    es.deleteType = function(cartid,uid,request,callback){

        req('delete','/cart/'+cartid+'/types/' + uid,request,{},function(err,res){
            if(err){
                callback(err,null);
                return;
            }
            es.cart(cartid,callback);
        });
    }

    es.cart = function(uid,callback) {

        var request = {}

        req('get','/cart/'+uid,request,{},function(err,res){
            if(err){
                callback(err,null);
                return;
            }
            if(!node){
                updateQuantities(res.cart);
            }
            callback(null,res.cart);
        });
    }

    es.flushCart = function(uid,callback) {
        var request = {}
        req('delete','/cart/'+uid,request,{},function(err,res){
            if(err){
                callback(err,null);
                return;
            }
            callback(null);
        });
    }

    es.getFastlaneUrl = function(store){

        var url = Checkout;

        if(Config.cart){
            var url = Checkout + '/fastlane/'+Config.cart;

            var params = {};
            if(store){
                params.s = store;
            }
            if(Config.test){
                params.t = true;
            }
            url += serialize(params);
        }

        return url;
    }

    es.on = function(event,callback){
        Listeners[event] = callback;
    }

    es.helpers = {
        list: function(store){
            var items = [];
            for(var s=0;s<store.channel.sections.length;s++){
                if(typeof store.channel.sections[s].data.types !== 'undefined' && store.channel.sections[s].data.types.length){
                    for(var i = 0; i < store.channel.sections[s].data.types.length; i++){
                        items.push(store.channel.sections[s].data.types[i]);
                    }
                }
            }
            return items;
        },
        items: function(cart){
            return cart.items.products.concat(cart.items.types)
        },
        count: function(cart) {
            var counter = 0;
            if(typeof cart === 'object'){
                var items = es.helpers.items(cart);
                for(var i = 0; i < items.length; i++){
                    counter += items[i].quantity;
                }
            }
            return counter;
        }
    }

    function emit(type,data){
        if(typeof Listeners[type] === 'function'){
            Listeners[type](data);
        }
    }

    function loadStore(uri,request,callback){

        req('get','/store/' + uri,request,{},function(err,res){

            if(err){
                callback(err);
                return;
            }

            //Verify edition
            if(typeof res.edition !== 'undefined'){

                if(!node){
                    Edition = res.edition;
                    //Cart
                    if(typeof Edition.cart !== 'undefined'){
                        storeCartInCookie(Edition.cart);
                        if(Config.counter){
                            startCounter();
                        }
                        Config.cart = Edition.cart.cartid;
                    }
                }

                //Queue t.b.d.
                if(typeof res.edition.queue !== 'undefined'){

                }

                callback(null,res.edition);

            } else {
                callback('Please append the edition, and optionally channel to the uri (ex: event/edition/{channel})',null);
            }

        });

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

    function updateQuantities(cart){

        var items = es.helpers.items(cart);
        var elements = getElementsByAttribute("es-quantity");
        if(elements.length){
            var itemsQuantities = {};
            for(var i = 0; i < items.length; i++){
                itemsQuantities[items[i].id] = items[i].quantity;
            }
            for(var e = 0; e < elements.length; e++){
                var uid = elements[e].getAttribute('es-quantity');
                if(typeof uid !== 'undefined'){
                    if(typeof itemsQuantities[uid] !== 'undefined'){
                        elements[e].innerHTML = itemsQuantities[uid];
                    } else {
                        elements[e].innerHTML = 0;
                    }
                }
            }
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

            var defaultHeaders = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'apikey': Config.apikey
            }

            //Merge with headers from init
            var mergedHeaders = headers ? Object.assign(defaultHeaders,headers) : defaultHeaders;
            mergedHeaders = Config.headers ? Object.assign(mergedHeaders,Config.headers) : mergedHeaders;

            unirest[method](url)
            .headers(mergedHeaders)
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
            oReq.setRequestHeader("Content-Type", "application/json");
            oReq.setRequestHeader("Accept", "application/json");
            oReq.send(JSON.stringify(data));

        }

    }

    function serialize(obj) {
        var str = [];
        for(var p in obj)
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
        return str.length ? "?" + str.join("&") : '';
    }

    function getElementsByAttribute(attribute) {
        var nodeList = document.getElementsByTagName('*');
        var nodeArray = [];
        var iterator = 0;
        var node = null;

        while (node = nodeList[iterator++]) {
            if (node.hasAttribute(attribute)) nodeArray.push(node);
        }

        return nodeArray;
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
