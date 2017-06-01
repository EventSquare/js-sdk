var EventSquare = require('../');
require('dotenv').config()

EventSquare.init({
    apikey: process.env.API_KEY,
});

EventSquare.useEndpoint(process.env.API_ENDPOINT);
EventSquare.useCheckout(process.env.CHECKOUT_URL);

EventSquare.store("kerstmagie/wea2nmitludc",{
    language: 'nl',
    ip: '1.1.1.1',
    //cart: 'bfa74d2a-eb2c-4675-b28a-7f2bc4e5fa3b',
},function(err,store){
    if(err){
        console.error(err);
        return;
    }
    console.log('Succesfully connected and created a cart (' + store.cart.cartid + ')');

    EventSquare.cart(store.cart.cartid,function(err,cart){

        if(err){
            console.error(err);
            return;
        }
        console.log('Succesfully requested cart details');
    });

});
