cardApp.controller("cardCtrl", ['$scope', 'Cards', 'Conversations', 'Users', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', 'socket', function($scope, Cards, Conversations, Users, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, socket) {

    // TODO - Still needed?
    // Legacy for use with /s/:snip to display individual card.

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;

    $scope.dropDownToggle = Edit.dropDownToggle;

    // Use the url /snip id to load a snip
    var snip = $routeParams.snip;
    // Use the url /username to load a users snips
    var username = $routeParams.username;

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            loadUserData();
        }
    });

    // If This is a username url then get the public cards for that user
    if (username != undefined) {
        Conversations.find_user_public_conversation(username)
            .then(function(res) {
                $scope.cards = res.data;
                // Get the user name for the user id
                // TODO dont repeat if user id already retreived
                $scope.cards.map(function(key, array) {
                    Users.search_id(key.user)
                        .then(function(res) {
                            if (res.error === 'null') {
                                // user cannot be found
                            }
                            if (res.data.success) {
                                // Set the user_name to the retrieved name
                                key.user_name = res.data.success.google.name;
                            }
                        })
                        .catch(function(error) {
                            console.log('error: ' + error);
                        });
                });
            });
    }

    if (snip !== undefined) {
        Cards.search_id(snip)
            .then(function(res) {
                // update card_ctrl $scope.cards
                $rootScope.$broadcast('cards', res.data);
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
    }

    loadUserData = function() {
        if (snip === undefined && username === undefined) {
            Cards.search_user($scope.currentUser)
                .then(function(data) {
                    // update card_ctrl $scope.cards
                    $rootScope.$broadcast('cards', data);
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                });
        }
    };

    // update from cardcreate_ctrl createCard
    $scope.$on('cards', function(event, data) {
        $scope.cards = data;
    });

    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }
    };

    // DELETE ==================================================================
    $scope.deleteCard = function(id) {
        Cards.delete(id)
            .then(function(res) {
                $rootScope.$broadcast('search');
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
    };

    // UPDATE ==================================================================
    $scope.updateCard = function(id, card) {
        setTimeout(function() {
            $scope.$apply(function() {
                card.content = replaceTags.replace(card.content);
                card.content = replaceTags.removeDeleteId(card.content);
                //var pms = { 'id': id, 'card': card };
                var pms = { 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(data) {
                        $rootScope.$broadcast('search');
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            });
        }, 1000);
    };
}]);