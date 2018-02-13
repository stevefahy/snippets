cardApp.controller("cardsearchCtrl", ['$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', function($scope, Cards, $rootScope, $location, $http, socket) {

    this.$onInit = function() {
        $scope.showDiv = false;
    };

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user;
        }
    });

    $scope.search_icon = function() {
        $scope.showDiv = !$scope.showDiv;
        $("#search_input").attr("visibility", "visible");
        $("#search_button").attr("visibility", "visible");
    };

    // update from cardcreate_ctrl createCard
    $scope.$on('search', function(event) {
        $scope.searchCard();
    });

    $scope.changePath = function(path) {
        $location.path(path);
    };

    $scope.logOut = function() {
        // close socket.io connection and delete namespace
        socket.delete();
        Cards.logout();
        $scope.changePath('/api/logout');
    };

    $scope.logIn = function() {
        // close socket.io connection and delete namespace
        $scope.changePath('/api/logout');
    };

    $scope.searchCard = function(input) {
        //$location.path('/');
        // validate the formData to make sure that something is there
        if ($scope.input !== undefined) {
            // call the create function from our service (returns a promise object)
            Cards.search($scope.input)
                .then(function(res) {
                    // update card_ctrl $scope.cards
                    $rootScope.$broadcast('cards', res.data);
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                });
        }
    };

}]);