cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', '$timeout', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, $timeout, socket) {

    var ua = navigator.userAgent;

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result.data.user._id);
            socket.connect(socket.getId());

            //
            console.log('running?');
            if (ua === 'AndroidApp') {
                console.log('sendDetails');
               var token =  Android.sendDetails(result.data.user._id);
               console.log('token: ' + token);
            }
        }
    });

}]);