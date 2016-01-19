/**
 * Created by cheungch on 16/11/2015.
 */

var io = require('socket.io')();
var util = require('util');
var config = require('./config.js');
var playerCtrl = require('./playerController.js');


io.update = function () {
    playerCtrl.getStatus(function (state) {
        io.sendPlayList();
        io.sendStatus(state)
    })
};

io.sendStatus = function (state) {
    io.emit('status', state);
};

io.sendPlayList = function () {
    io.emit('playlist', playerCtrl.playlist);
};

io.on('connection', function (socket) {
    console.log('new user connected, socket id: ' + socket.id);

    playerCtrl.getStatus(function (state) {
        socket.emit('status', state);
    });

    socket.emit('playlist', playerCtrl.playlist);

    socket.on('setVolume', function (msg) {
        var volume = msg.volumeLevel;
        playerCtrl.setVolume(volume);
    });
});

setInterval(io.update, config.player_polling_interval);

module.exports = exports = io;