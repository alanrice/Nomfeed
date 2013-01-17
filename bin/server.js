/**
 * Module dependencies.
 */

var express = require('express'),
    path = require('path'),
    routes = require(path.join('..', 'routes')),
    http = require('http'),
    Twit = require('twit'),
    path = require('path');
//io      = require('socket.io');

var app = express();

app.configure(function() {
    app.set('port', 8080);
    app.set('views', path.join(__dirname, path.join('..', 'views')));
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, path.join('..', 'public'))));
});

app.configure('development', function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

var T = new Twit({
    consumer_key: '***',
    consumer_secret: '***',
    access_token: '***',
    access_token_secret: '***'
});

app.get('/', routes.index);


var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
});

var io = require('socket.io').listen(server);

//Socket.io emits this event when a connection is made.
io.sockets.on('connection', function(socket) {

    // Emit a message to send it to the client.
    //socket.emit('ping', {
    //    msg: 'Hello. I know socket.io.'
    //});

    // Print messages from the client.
    socket.on('pong', function(data) {
        console.log(data.msg);
    });

});

//
//  filter the twitter public stream by the word 'mango'. 
//
var stream = T.stream('statuses/filter', {
    track: ['#dinner', '#food', '#lunch', '#cake', '#breakfast', '#supper', '#soup', '#salad', '#turkey', '#ham', '#snack', '#chocolate', '#icecream', '#pasta', '#feast', '#yum', '#nom']
});
var url;
stream.on('tweet', function(tweet) {
    if (typeof tweet.entities.media !== 'undefined') {
        var jsonEvent = {
            "text": tweet.text,
            "photo": tweet.entities.media[0].media_url,
            "url": 'http://' + tweet.entities.media[0].display_url
        };
        io.sockets.emit('ping', jsonEvent);
    } else if (tweet.entities.urls.length !== 0) {
        url = tweet.entities.urls[0].expanded_url;
        if (url.substring(0, 20) === "http://instagr.am/p/") {
            var options = {
                host: 'api.instagram.com',
                path: '/oembed?url=' + url
            };

            http.get(options, function(res) {
                //console.log('STATUS: ' + res.statusCode);
                res.setEncoding('utf8');

                var output = "";
                res.on('data', function(chunk) {
                    output += chunk;
                }).on('error', function(e) {
                    console.log('ERROR: ' + e.message);
                });

                res.on('end', function() {
                    var obj = JSON.parse(output);
                    var jsonEvent = {
                        "text": tweet.text,
                        "photo": obj.url,
                        "url": url
                    };
                    io.sockets.emit('ping', jsonEvent);
                });
            });
        }
    } else {
        var jsonEvent = {
            "text": tweet.text,
            "photo": "none",
            "user": tweet.user.screen_name,
            "url": 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str
        };
        io.sockets.emit('ping', jsonEvent);
    }
});