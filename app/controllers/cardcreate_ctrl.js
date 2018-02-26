cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$timeout', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'socket', 'Users', 'Database', function($scope, $rootScope, $location, $http, $window, $timeout, Cards, replaceTags, Format, Edit, Conversations, socket, Users, Database) {

    var ua = navigator.userAgent;

    var INPUT_PROMPT = "Enter some text";

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    $scope.input = false;


    this.$onInit = function() {

    };

    // Add the input prompt attribute
    $timeout(function() {
        $('#cecard_create').attr('data-placeholder', INPUT_PROMPT);
        console.log(ua);
        if (ua.toLowerCase().indexOf('firefox') > -1 || ua.toLowerCase().indexOf('edge') > -1) {


            $('#cecard_create').on('focus', function() {
                console.log('FOCUS');
                var $this = $(this);
                $this.html($this.html() + '<br>'); // firefox hack


  
            });


            $('#cecard_create').on('blur', function() {
                var $this = $(this);
                $this.text($this.text().replace('<.*?>', ''));



            });
        }
    });

    // Add the input prompt listener
    (function($) {
        $(document).on('change keydown keypress input', 'div[data-placeholder]', function() {
            if (this.textContent) {
                $scope.input = true;
                this.dataset.divPlaceholderContent = 'true';

            } else {
                $scope.input = false;
//window.getSelection().removeAllRanges();
                delete(this.dataset.divPlaceholderContent);
            }
        });

    })(jQuery);




    $scope.card_create = {
        _id: 'card_create',
        content: '',
        //user: $scope.currentUser,
        user_name: ''
    };

    // Broadcast by Database createCard service when a new card has been created
    $scope.$on('CARD_CREATED', function(event, data) {
        // Reset the placholder for text input checking
        $('#cecard_create').removeAttr("data-div-placeholder-content");
        // Reset the model
        $scope.card_create.content = '';
        //
        $scope.input = false;
    });

    // Create Card
    $scope.createCard = function(id, card_create) {
        Database.createCard(id, card_create, $scope.currentUser);
    };

    setFocus = function() {
        $timeout(function() {
            var element = $window.document.getElementById('cecard_create');
            if (element) {
                element.focus();
                $rootScope.$broadcast('CONV_CHECK');
            }
        });
    };

    // only check focus on web version
    if (ua !== 'AndroidApp') {
        $window.onfocus = function() {
            //this.setFocus();
        };
        $window.focus();
        setFocus();
    }

    // TODO - Better way to get user details across controllers. service? middleware? app.use?
    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        $scope.currentUser = result.data.user;
        $scope.card_create.user = $scope.currentUser.google.name;
    });

}]);