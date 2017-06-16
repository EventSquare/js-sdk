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
    //cart: '98d326f3-4b72-4677-83a2-ddbd2a49d56c', //Force reuse of the same cart
},function(err,store){
    if(err){
        console.error(err);
        return;
    }

    console.log('Succesfully connected and created a cart (' + store.cart.cartid + ')');

    //Check for shows
    if(store.channel.shows && store.channel.shows.length){

        EventSquare.show("kerstmagie/wea2nmitludc/o7gtaqudmx2j/" + store.channel.shows[0].id,{
            language: 'nl',
        },function(err,show){
            if(err){
                console.error(err);
                return;
            }
        });
    }

    //Add items to cart

    // var request = {
    //     quantity: 1
    // }
    //
    // EventSquare.updateType(store.cart.cartid,store_types[0].id ,request,function(err,cart){
    //
    //     if(err){
    //         console.error(err);
    //         return;
    //     }
    //     console.log('Succesfully added to the cart');
    //     loadCart(store);
    //
    // });

});

function loadCart(store){

    EventSquare.cart(store.cart.cartid,function(err,cart){

        if(err){
            console.error(err);
            return;
        }

        console.log('Succesfully requested cart details');

    });



}
