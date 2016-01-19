/**
 * Created by cheungch on 16/11/2015.
 */

var router = require('express').Router();
var socket = require('../socket.js');
var spotify = require('../spotify.js');
var config = require('../config.js');
var request = require('request');
var queryString = require('querystring');
var playerCtrl = require('../playerController');


router.get('/status', function (req, res, next) {
    spotify.getState(function (err, state) {
        res.send(state);
        //console.log(state);
    })
});

router.post('/track/play', function (req, res, next) {
    var track_id = req.body['track_id'];
    playerCtrl.playTrack(track_id);
});


router.post('/track/progess', function (req, res, next) {
    var pos = req.body['position'];

    spotify.jumpTo(pos, function () {
        console.log("update progess: " + pos);
        setTimeout(function () {
            playerCtrl.updateStatus();
            res.send({'set pos': pos});
        }, 100);
    })
});


router.post('/playlist', function (req, res, next) {
    var action = req.body['action'];

    switch (action) {
        case "add_to_last":
            var track = req.body['track'];
            playerCtrl.addToLast(track);
            break;
        case "remove":
            var index = req.body['index'];
            console.log('Rmove track from playlist in index' + index);
            playerCtrl.remove(index);
            break;
        case "shuffle":
            playerCtrl.shuffle();
            break;
    }
    res.send({'action': action})
});


router.post('/track/search', function (req, res) {
    var keyword = req.body['keyword'];

    if (keyword != null) {
        request({
            uri: 'https://api.spotify.com/v1/search?q=' + queryString.escape(keyword) + '&type=track',
            method: 'GET',
            json: true
        }, function (e, r, body) {
            var response = [];
            if (e == null && body.tracks != null) {
                var tracks = body.tracks.items;
                for (var i = 0; i < tracks.length; i++) {
                    var track = {
                        track_id: tracks[i].id,
                        name: tracks[i].name,
                        artist: tracks[i].artists[0].name
                    };
                    response.push(track)
                }
            } else {
                console.log(e)
            }
            res.send(response);
        })
    } else {
        res.status(400).send({error: 'no keyword provided'})
    }
});

router.get('/track', function (req, res, next) {
    res.send(playerCtrl.playlist)
});


router.post('/control', function (req, res, next) {
    var action = req.body['action'];
    console.log("Player action: " + action);

    switch (action) {
        case 'play':
            playerCtrl.play();
            break;
        case 'pause':
            playerCtrl.pause();
            break;
        case 'next':
            playerCtrl.nextSong();
            break;
        case 'prev':
            playerCtrl.prevSong();
            break;
        case 'volume':
            var volumeLevel = req.body['volumeLevel'];
            playerCtrl.setVolume(volumeLevel);
            break;
        default:
            res.send({error: 'invalid_action'})
    }

    res.send({action: action})

});

module.exports = router;