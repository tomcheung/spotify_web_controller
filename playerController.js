var config = require('./config.js');
var spotify = require('./spotify.js');
var socketIo = require('./socket.js');
var util = require('util');

var lock = false;
var prepared = false;

exports.playlist = config.playlist;
exports.currentIndex = 0;

function Track(trackInfo) {
    this.track_id = trackInfo['track_id'];
    this.name = trackInfo['name'];
    this.artist = trackInfo['artist'];
}

exports.Track = Track;

exports.next = function (offset) {
    exports.currentIndex = (exports.currentIndex + offset) % exports.playlist.length;

    if (exports.playlist.length <= 0) {
        console.log("No next song, stopped");
        return;
    }

    var trackId = exports.playlist[exports.currentIndex].track_id;
    console.log("Playing next song index: " + exports.currentIndex + " song: " + trackId);
    spotify.playTrack("spotify:track:" + trackId);
    setTimeout(exports.updateStatus, 110);
};

exports.remove = function (indexToRemove) {
    exports.playlist.splice(indexToRemove, 1);
    socketIo.sendPlayList()
};

exports.nextSong = function () {
    exports.next(1);
};

exports.prevSong = function () {
    exports.next(-1);
};

exports.getIndex = function (trackId) {
    for (var i = 0; i < exports.playlist.length; i++) {
        if (exports.playlist[i].track_id == trackId) {
            return exports.currentIndex = i;
        }
    }
    return -1;
};


exports.addToLast = function (track) {
    if (exports.getIndex(track.track_id) != -1)
        return;

    var t = new Track(track);
    exports.playlist.push(t);
    exports.updateStatus();
};

exports.setVolume = function (volumeLevel) {
    spotify.setVolume(volumeLevel, function () {
        exports.updateStatus();
    })
};

exports.shuffle = function () {
    var pl = exports.playlist;
    var l = pl.length;
    for (var i = 0; i < l; i++) {
        var r = Math.floor(Math.random() * l);
        var t = pl[r];
        pl[r] = pl[i];
        pl[i] = t;
    }

    exports.updateStatus();
};

exports.getStatus = function (callback) {
    if (!lock) {
        lock = true;
        spotify.getState(function (err, state) {
            //console.log(util.inspect(state));

            if (err) {
                console.log("get status error: " + err);
                lock = false;
                return;
            }

            if (!prepared && state != null && state.state == 'playing' && state.position * 1000 + config.player_polling_interval + 1000 >= state.duration) {
                console.log("Prepare next song...");
                setTimeout(function () {
                    exports.nextSong();
                }, config.player_polling_interval);
                prepared = true;
            }
            state.track_id = state.track_id.replace("spotify:track:", "");
            state.currentIndex = exports.getIndex(state.track_id);
            callback(state);
            lock = false;
        });
        console.log("status updated")
    }
};

exports.playTrack = function (track_id, callback) {
    spotify.playTrack("spotify:track:" + track_id, function (err, rtn) {
        if (err)
            console.log(err);
        exports.updateStatus();
    })
};

exports.updateStatus = function () {
    var socketIo = require('./socket.js');
    socketIo.update();
};

exports.play = function () {
    spotify.play(exports.updateStatus);
};

exports.pause = function () {
    spotify.pause(exports.updateStatus);
};