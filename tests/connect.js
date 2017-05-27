var EventSquare = require('../');
require('dotenv').config()

EventSquare.init({
    apikey: process.env.API_KEY,
    uri: process.env.STORE_URI,
    lang: 'en',
    agent: 'EventSquare Agent',
    ip: '1.1.1.1',
    cart: '1cb03430-fb1b-4add-8f69-369a1702ce91',
},function(err,store){
    if(err){
        console.error(err);
        return;
    }
    console.log('Succesfully connected');
});
