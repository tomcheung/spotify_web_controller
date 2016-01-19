app = angular.module('player', ['btford.socket-io', 'rzModule']);

app.factory('mySocket', function (socketFactory) {
    var ioSocket = io.connect();
    return socketFactory({
        ioSocket: ioSocket
    });
});

app.controller('playerController', function ($rootScope, $scope, $interval, $http, mySocket) {
    var lockProgessBar = false;

    var player = {
        current_track: "Song",
        current_artist: "",
        status: "Stop",
        current_pos: 100000,
        total_length: 99999999,
        volume: 100,
        lock: false,
        progress: 0
    };

    $scope.player = player;
    $scope.play_btn_status = "fa-play";

    function changeVolume() {
        mySocket.emit('setVolume', {'volumeLevel': player.volume});
    }

    mySocket.on('status', function (status) {
        player.status = status.state;
        if (player.status == 'playing') {
            $scope.player_control = "Pause";
            $scope.play_btn_status = "fa-pause";
        } else {
            $scope.player_control = "Play";
            $scope.play_btn_status = "fa-play";
        }

        player.current_track = status.track_name;
        player.current_artist = status.track_artist;
        player.current_pos = status.position * 1000;
        player.total_length = status.duration;
        player.volume = status.volume;

        $rootScope.activeIndex = status.currentIndex;
    });

    $scope.control = function (command) {
        param = {action: command};

        switch (command) {
            case 'play_pause':
                if (player.status == 'playing')
                    param['action'] = 'pause';
                else
                    param['action'] = 'play';
                break;
            case 'next':
            case 'prev':
                break;
            default:
                return
        }

        console.log(param);

        $http.post('/api/control', param);
    };

    $scope.sliderOption = {
        floor: 0, ceil: 1000,
        onStart: startDrag, onEnd: endDrag,
        showTicksValues: false, showTicks: false
    };

    $scope.volumeSliderOption = {
        floor: 0, ceil: 100,
        onChange: changeVolume,
        interval: 100,
        showTicksValues: false,
        showTicks: false
    };

    function startDrag() {
        lockProgessBar = true;
    }

    function endDrag() {
        $http.post('/api/track/progess', {
            position: player.progress * player.total_length / 1000000
        }).success(function () {
            setTimeout(function () {
                lockProgessBar = false;
            }, 80)
        });
    }

    $interval(function () {
        if (player.status == 'playing')
            player.current_pos = player.current_pos + 500;
        if (!lockProgessBar)
            player.progress = player.current_pos * 1000 / player.total_length;
    }, 500)
});

app.controller('playlistController', function ($rootScope, $scope, $http, mySocket) {

    mySocket.on('playlist', function (tracks) {
        var l = [];

        for (var i = 0; i < tracks.length; i++) {
            l.push(tracks[i]);
        }

        $scope.playlist = l;
    });

    $scope.playTrack = function (track_id) {
        console.log(track_id);
        $http.post('/api/track/play', {track_id: track_id})
    };

    $scope.removeTrack = function (index) {
        console.log(index);
        $http.post('/api/playlist', {
            action: 'remove',
            index: index
        })
    };

    $scope.trackActive = function (i) {
        if ($rootScope.activeIndex == i)
            return 'active';
        else
            return null;
    };

    $scope.shuffle = function () {
        $http.post('/api/playlist', {
            action: 'shuffle'
        });
    };

    $rootScope.addToPlayList = function (track) {
        $http.post('/api/playlist', {
            action: 'add_to_last',
            track: track
        }).success(function (response) {
            //var pl = document.getElementById("play-list");
            //pl.scrollTop = pl.scrollHeight;
        });

        $scope.playlist = [];
    }
});


app.controller('searchController', function ($rootScope, $scope, $http) {
    $scope.searchResult = [];

    $scope.keyword = "";

    $scope.search = function () {

        $scope.keyword.toLowerCase();

        $scope.loading = 'loading';
        $http
            .post('api/track/search', {keyword: $scope.keyword})
            .success(function (response) {
                var tracks = response, l = [];

                for (var i = 0; i < tracks.length; i++) {

                    var track = {
                        track_id: tracks[i].track_id,
                        name: tracks[i].name,
                        artist: tracks[i].artist
                    };
                    l.push(track);
                }
                $scope.loading = '';

                $scope.searchResult = l;
            })
    }
});