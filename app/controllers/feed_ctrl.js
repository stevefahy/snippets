cardApp.controller("feedCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$interval', '$q', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', '$animate', 'viewAnimationsService', 'Cropp', '$compile', 'ImageAdjustment', function($scope, $rootScope, $location, $http, $window, $interval, $q, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, $animate, viewAnimationsService, Cropp, $compile, ImageAdjustment) {

    openCrop = Cropp.openCrop;
    setCrop = Cropp.setCrop;
    editImage = Cropp.editImage;
    closeEdit = Cropp.closeEdit;
    filterImage = Cropp.filterImage;
    closeFilters = Cropp.closeFilters;
    filterClick = Cropp.filterClick;
    settingsImage = Cropp.settingsImage;
    adjustImage = Cropp.adjustImage;

    $scope.addSlider = function(data) {
        if (data.last_position != undefined) {
            $scope.adjust.sharpen = data.last_position;
        } else {
            $scope.adjust.sharpen = 0;
        }
        var $el = $('<rzslider rz-slider-model="adjust.sharpen" rz-slider-options="adjust.options"></rzslider>').appendTo('#adjust_' + data.id + ' .image_adjust_sharpen');
        $compile($el)($scope);
    };

    $scope.adjust = {
        sharpen: 0,
        options: {
            floor: 0,
            ceil: 20,
            step: 0.1,
            precision: 1,
            id: 'slider-id',
            onStart: function(sharpen) {
                //console.log('on start ' + $scope.adjust.sharpen);
            },
            onChange: function(id) {
                //console.log('on change ' + $scope.adjust.sharpen);
            },
            onEnd: function(id) {
                //console.log('on end ' + $scope.adjust.sharpen);
                ImageAdjustment.setSharpen(ImageAdjustment.getImageId(), ImageAdjustment.getTarget(), ImageAdjustment.getSource(), $scope.adjust.sharpen);
            }
        }
    };

    $scope.$on('$destroy', function() {
        //leaving controller.
        Cropp.destroyCrop();
        $('.image_adjust_on').remove();

        $interval.cancel(updateContent);
        updateContent = undefined;

    });

    $scope.$on('getCards', function(event, data) {});

    // Detect device user agent 
    var ua = navigator.userAgent;

    // Enable scroll indicator if mobile.
    //$scope.scroll_indicator_options = { disable: !$rootScope.is_mobile };
    //$scope.scroll_indicator_options = {disable:false};

    $rootScope.pageLoading = true;
    $rootScope.last_win_width;

    $scope.getFocus = Format.getFocus;
    $scope.getBlur = Format.getBlur;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;
    $scope.dropDownToggle = Edit.dropDownToggle;
    $scope.pasteHtmlAtCaret = Format.pasteHtmlAtCaret;
    $scope.checkCursor = Format.checkCursor;
    $scope.isMember = false;
    $scope.totalDisplayed = -6;

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    // Default navigation
    if ($rootScope.animate_pages) {
        // Loading conversation directly should not animate.
        viewAnimationsService.setEnterAnimation('page-conversation');
    }
    viewAnimationsService.setLeaveAnimation('page-conversation-static');

    if ($rootScope.nav) {
        if ($rootScope.nav.from == 'group') {
            viewAnimationsService.setEnterAnimation('page-conversation-static');
            viewAnimationsService.setLeaveAnimation('page-group');
        } else if ($rootScope.nav.from == 'group-direct') {
            viewAnimationsService.setEnterAnimation('page-conversation-static');
            viewAnimationsService.setLeaveAnimation('page-group-direct');
        } else if ($rootScope.nav.from == 'contacts') {
            $rootScope.nav = { from: 'conv', to: 'contacts' };
            viewAnimationsService.setEnterAnimation('page-conversation');
            viewAnimationsService.setLeaveAnimation('page-contacts-static');
        } else {
            $rootScope.nav = { from: 'conv', to: 'convs' };
        }
    } else {
        $rootScope.nav = { from: 'conv', to: 'convs' };
    }

    // Load the rest of the cards if page loaded directly without animation.
    if (!$rootScope.animate_pages) {
        $scope.totalDisplayed = -1000;
    }

    General.keyBoardListenStart();

    $scope.$on('rzSliderRender', function(event, data) {
        $scope.addSlider(data);
    });

    // Broadcast by UserData after it has processed the notification. (card has been created, updated or deleted by another user to this user).
    $scope.$on('CONV_NOTIFICATION', function(event, msg) {
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            updateConversationViewed(id);
        }

        // Check if this is a public conversation.
        Conversations.find_public_conversation_id(msg.conversation_id)
            .then(function(result) {
                console.log(result);
                if (result.data.conversation_type == 'public') {
                    updateFollowing();
                }
            });
    });

    // Broadcast by Database createCard service when a new card has been created by this user.
    $scope.$on('CARD_CREATED', function(event, data) {
        updateConversation(data);
    });

    // Broadcast by Database updateCard service when a card has been updated.
    $scope.$on('CARD_UPDATED', function(event, data) {
        var card_pos = General.findWithAttr($scope.cards, '_id', data._id);
        if (card_pos >= 0) {
            $scope.cards[card_pos].updatedAt = data.updatedAt;
            $scope.cards[card_pos].original_content = $scope.cards[card_pos].content;
        }
    });

    // Broadcast by Database deleteCard service when a card has been deleted.
    $scope.$on('CARD_DELETED', function(event, card_id) {
        // find the position of the deleted card within the cards array.
        var deleted_card_pos = General.findWithAttr($scope.cards, '_id', card_id);
        // if the card is found then remove it.
        if (deleted_card_pos >= 0) {
            $scope.cards.splice(deleted_card_pos, 1);
        }
    });



    $scope.follow = function(card) {
        // Find the public conversation for this user.
        Conversations.find_user_public_conversation_by_id(card.user)
            .then(function(result) {
                console.log(result);
                if (result.data.conversation_type == 'public') {
                    // If following then unfollow
                    if (card.following) {
                        var pms = { 'id': result.data._id, 'user': UserData.getUser()._id };
                        // Updateconversation in DB.
                        Conversations.deleteFollower(pms)
                            .then(function(result) {
                                console.log(result);

                                Users.unfollow_conversation(result.data._id)
                                    .then(function(result) {
                                        UserData.setUser(result.data);
                                        $scope.currentUser = UserData.getUser();
                                        updatedFollowing($scope.cards)
                                            .then(function(result) {
                                                console.log('remove');
                                                // Remove this users cards from the feed.
                                                updateFollowing();
                                            });


                                    });

                            });


                        // If not following then follow
                    } else {
                        var pms = { 'id': result.data._id, 'user': UserData.getUser()._id };
                        // Updateconversation in DB.
                        Conversations.addFollower(pms)
                            .then(function(result) {
                                console.log(result);
                            });
                        Users.follow_conversation(result.data._id)
                            .then(function(result) {
                                UserData.setUser(result.data);
                                $scope.currentUser = UserData.getUser();
                                updatedFollowing($scope.cards);
                            });
                    }
                }
            });
    };

    updatedFollowing = function(newValue) {
        var deferred = $q.defer();
        var promises = [];
        //console.log(newValue);
        if (newValue != undefined) {
            newValue.map(function(key, array) {
                // Find the public conversation for this user.
                var prom1 = Conversations.find_user_public_conversation_by_id(key.user)
                    .then(function(result) {
                        console.log(result);
                        if ($scope.currentUser.following.indexOf(result.data._id) >= 0) {
                            // The user is following this user.
                            key.following = true;
                        } else {
                            // The user is not following this user.
                            key.following = false;
                        }
                        //return;
                    });
                promises.push(prom1);
            });
        }
        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            console.log('updatedFollowing Fin');
            deferred.resolve();

        });
        return deferred.promise;
    };

    $rootScope.$on('PUBLIC_NOTIFICATION', function(event, msg) {
        //notification(msg);
        console.log(msg);
        console.log($location.url());
        if ($location.url() == '/') {
            updateFollowing();
        }

    });

    updateCards = function(new_cards) {
        console.log(new_cards);
        console.log($scope.cards);

        console.log('MAP 1 START');
        var i = $scope.cards.length;
        while (i--) {
            //var index = General.findWithAttr(conversations_delete, '_id', conversations[i]._id);
            var card_pos = General.findWithAttr(new_cards, '_id', $scope.cards[i]._id);
            // If the the conversation exists in the LM then remove it from the LM (User does not exist).
            if (card_pos < 0) {
                //conversations.splice(i, 1);
                $scope.cards.splice(i, 1);
            }
        }
        console.log('MAP 1 END');

        console.log('MAP 2 START');
        new_cards.map(function(key, array) {
            var card_pos = General.findWithAttr($scope.cards, '_id', key._id);
            console.log(card_pos);
            if (card_pos < 0) {
                console.log('add: ' + key._id);
                //var add_card_pos = General.findWithAttr($scope.cards, '_id', key._id);
                $scope.cards.push(key);
            } else {
                console.log('update: ' + key._id);
                $scope.cards[card_pos] = key;
            }
        });
        console.log('MAP 2 END');

    };

    updateFollowing = function() {
        var deferred = $q.defer();
        var promises = [];
        //General.isEqual(key[check_objects[i]], res[check_objects[i]])) {
        var temp_cards = [];
        var followed = UserData.getUser().following;
        console.log(followed);
        followed.map(function(key, array) {
            var prom1 = Conversations.find_public_conversation_id(key)
                .then(function(result) {
                    console.log(result);
                    return Conversations.getPublicConversationById(key)
                        .then(function(res) {
                            console.log(res);
                            if (temp_cards.length < 1) {
                                res.data.map(function(key, array) {
                                    // Store the original characters of the card.
                                    key.original_content = result.data.content;
                                    // Get the user name for the user id
                                    key.user_name = result.data.conversation_name;
                                    key.avatar = result.data.conversation_avatar;
                                    key.following = true;
                                    temp_cards.push(key);
                                });
                            } else {
                                res.data.map(function(key, array) {
                                    // Store the original characters of the card.
                                    key.original_content = result.data.content;
                                    // Get the user name for the user id
                                    key.user_name = result.data.conversation_name;
                                    key.avatar = result.data.conversation_avatar;
                                    key.following = true;
                                    temp_cards.push(key);
                                });
                            }
                            return temp_cards;


                        });
                    //promises.push(prom2);
                });
            promises.push(prom1);
        });

        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            console.log(promises);
            console.log('map finished');
            console.log(temp_cards);
            updateCards(temp_cards);
        });
        return deferred.promise;
    };

    /*
    
                                */

    // TODO - If not following anyone suggest follow?
    getFollowing = function() {
        var deferred = $q.defer();
        var promises = [];
        $scope.cards = [];
        var followed = UserData.getUser().following;
        console.log(followed);
        followed.map(function(key, array) {
            console.log(key);
            var prom1 = Conversations.find_public_conversation_id(key)
                .then(function(result) {
                    console.log(result);
                    if (result.data != null) {
                        Conversations.getPublicConversationById(key)
                            .then(function(res) {
                                console.log(res);
                                console.log($scope.cards.length);
                                if ($scope.cards.length < 1) {
                                    console.log('first');

                                    res.data.map(function(key, array) {

                                        // Store the original characters of the card.
                                        key.original_content = result.data.content;
                                        // Get the user name for the user id
                                        key.user_name = result.data.conversation_name;
                                        key.avatar = result.data.conversation_avatar;
                                        key.following = true;

                                        $scope.cards.push(key);
                                    });
                                } else {
                                    console.log('subsequent');
                                    res.data.map(function(key, array) {

                                        // Store the original characters of the card.
                                        key.original_content = result.data.content;
                                        // Get the user name for the user id
                                        key.user_name = result.data.conversation_name;
                                        key.avatar = result.data.conversation_avatar;
                                        key.following = true;

                                        $scope.cards.push(key);
                                    });
                                    console.log($scope.cards);
                                }

                            });
                    }
                });
            promises.push(prom1);
        });

        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            console.log(promises);
            console.log('getFollowing finished');
            console.log($scope.cards);
            //updateCards(temp_cards);
        });
        return deferred.promise;
    };

    getCards = function() {
        $timeout(function() {
            findConversationId(function(result) {
                UserData.getCardsModelById(result)
                    .then(function(result) {
                        if (result != undefined) {
                            $scope.cards = result.data;
                        }
                    });
            });
        });
    };

    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            // Logged in.Load the conversation for the first time.
            //getCards();
            // Get the users which this user is following.
            console.log('feed');
            console.log(UserData.getUser());

            // Set the users profile
            var profile = {};
            profile.user_name = UserData.getUser().user_name;
            profile.avatar = UserData.getUser().avatar;
            Profile.setProfile(profile);
            $rootScope.$broadcast('PROFILE_SET');

            getFollowing();

            updateContent = $interval(function() {
                //updateFollowing();
            }, 5000);
        });
    } else {
        // Public route (Does not need to be logged in).
        getCards();
    }

    $scope.changePathGroup = function() {
        $rootScope.nav = { from: 'conv', to: 'group' };
        viewAnimationsService.setLeaveAnimation('page page-conversation');
        viewAnimationsService.setEnterAnimation('page page-group');
        $location.path("/api/group_info/" + Conversations.getConversationId());
    };

    // DELETE ==================================================================
    $scope.deleteCard = function(card_id, conversation_id) {
        Database.deleteCard(card_id, conversation_id, $scope.currentUser);
    };

    // Called as each card is loaded.
    // Disable checkboxes if the contenteditable is set to false.
    $scope.disableCheckboxes = function(id) {
        $timeout(function() {
            var el = document.getElementById('ce' + id);
            if ($(el).attr('contenteditable') == 'false') {
                $(el).find('input[type=checkbox]').attr('disabled', 'disabled');
            }
        }, 0);
    };

    // TODO - check if compatible with General version.
    function comparer(otherArray) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other.content == current.content;
            }).length == 0;
        };
    }

    function comparerDeleted(otherArray) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other._id == current._id;
            }).length == 0;
        };
    }

    findDifference = function(new_cards, old_cards, type) {
        var onlyInA;
        if (type == 'updated') {
            onlyInA = new_cards.filter(comparer(old_cards));
        } else if (type == 'deleted') {
            onlyInA = new_cards.filter(comparerDeleted(old_cards));
        }
        return onlyInA;
    };

    // TODO - make service (also in card_create.js)
    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }
        // Firefox bug - when contenteditable = true a checkbox cannot be selected
        // Fix - create a span around the checkbox with a contenteditable = false
        // Get the span around the checkbox.
        var node = $(checkbox).closest('#checkbox_edit');
        // Temporarily change the id
        $(node).attr("id", "checkbox_current");
        // Get the node of the temp id.
        node = document.getElementById('checkbox_current');
        // Set focus back to the card so that getBlur and getFocus function to update the card.
        var range = document.createRange();
        range.setStartAfter(node);
        var sel = window.getSelection();
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Reset the id
        node.setAttribute('id', 'checkbox_edit');
    };

    checkBoxMouseover = function(checkbox) {
        // Fix for Firefox
        // Get the initial contenteditable value for this card.
        var card = $(checkbox).closest(".ce");
        var initial_state = $(card).attr('contenteditable');
        // If Firefox
        if (ua.toLowerCase().indexOf('firefox') > -1) {
            var span = $(checkbox).closest("#checkbox_edit");
            // If this is a editable card.
            if (initial_state == 'true') {
                // temp set editable to false so that it can be checked on Firefox.
                $(span).attr('contenteditable', 'false');
            } else {
                // set editable to true so that it cannot be checked as this is not an editable card.
                $(span).attr('contenteditable', 'true');
            }
        }
    };

    checkBoxMouseout = function(checkbox) {
        // Fix for Firefox
        // Reset the edit value to its default true
        if (ua.toLowerCase().indexOf('firefox') > -1) {
            var span = $(checkbox).closest("#checkbox_edit");
            $(span).attr('contenteditable', 'true');
        }
    };

    // Find the conversation id.
    findConversationId = function(callback) {
        // Use the id from $routeParams.id if it exists. 
        // The conversation may have been loaded by username.
        if (id === undefined) {
            // Use the username from $routeParams.username to load that users Public conversation.
            if (username != undefined) {
                //
                // Public
                //
                Conversations.find_user_public_conversation_id(username)
                    .then(function(res) {
                        // check if this is a valid username
                        if (res.data.error) {
                            $location.path("/api/login");
                        } else {
                            var profile = {};
                            profile.user_name = res.data.conversation_name;
                            profile.avatar = res.data.conversation_avatar;
                            Profile.setProfile(profile);
                            $rootScope.$broadcast('PROFILE_SET');
                            // get the public conversation id for this username
                            var public_id = res.data._id;
                            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
                            Conversations.setConversationId(public_id);
                            // Check the users permission for this conversation. (logged in and participant)
                            checkPermission(public_id, function(result) {
                                $scope.isMember = result;
                                getPublicConversation(public_id, res.data);
                                callback(public_id);
                            });
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            }
        } else {
            Conversations.setConversationId(id);
            // Check the users permission for this conversation. (logged in and participant)
            checkPermission(id, function(result) {
                $scope.isMember = result;
                if (result) {
                    getConversation(id);
                } else {
                    $location.path("/api/login");
                }
                callback(id);
            });
        }
    };

    // Check the users permission for this conversation. (logged in and participant)
    // If the user is logged in and a participant of the conversation the $scope.isMember=true.
    // card_create.html is added to the conversation if $scope.isMember=true.
    checkPermission = function(conversation_id, callback) {
        // If looged in
        if ($scope.currentUser) {
            UserData.getConversationModelById(conversation_id)
                .then(function(res) {
                    if (res) {
                        // Find the current user in the conversation participants array.
                        var user_pos = General.findWithAttr(res.participants, '_id', UserData.getUser()._id);
                        if (user_pos >= 0) {
                            // user found in the participants array.
                            callback(true);
                        } else {
                            // user not found in the participants array.
                            callback(false);
                        }
                    } else {
                        // empty conversation
                        UserData.getConversations()
                            .then(function(res) {
                                // Find the conversation in the conversations.
                                var conv_pos = General.findWithAttr(res, '_id', conversation_id);
                                // Find the current user in the conversation participants array.
                                var user_pos = General.findWithAttr(res[conv_pos].participants, '_id', UserData.getUser()._id);
                                if (user_pos >= 0) {
                                    // user found in the participants array.
                                    // Add this conversation to the local model.
                                    UserData.addConversationModel(res[conv_pos])
                                        .then(function(result) {
                                            // If this is the first card in a new conversation then create the cards model for this conversation.
                                            UserData.addCardsModelById(res[conv_pos]._id)
                                                .then(function(res) {
                                                    //console.log(res);
                                                });
                                        });
                                    callback(true);
                                } else {
                                    // user not found in the participants array.
                                    callback(false);
                                }
                            });
                    }
                });
        } else {
            // not logged in.
            callback(false);
        }
    };

    getPublicConversation = function(id, conv) {
        Conversations.getPublicConversationById(id)
            .then(function(result) {
                $scope.cards = result.data;
                // Map relevant data to the loaded cards.
                if ($scope.cards.length > 0) {
                    $scope.cards.map(function(key, array) {
                        // Store the original characters of the card.
                        key.original_content = key.content;
                        // Get the user name for the user id
                        key.user_name = conv.conversation_name;

                        key.avatar = conv.conversation_avatar;
                    });
                } else {
                    $rootScope.pageLoading = false;
                }
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });

    };

    // Get the conversation by id
    getConversation = function(id) {
        var profile = {};
        UserData.getConversationModelById(id)
            .then(function(res) {
                if (res.conversation_type == 'public') {
                    //  $scope.conv_type used for Header
                    $scope.conv_type = 'public';
                    profile.user_name = res.conversation_name;
                    profile.avatar = res.conversation_avatar;
                    Profile.setConvProfile(profile);
                    $rootScope.$broadcast('PROFILE_SET');
                }
                // Group conversation. (Two or more)
                if (res.conversation_name != '') {
                    $scope.conv_type = 'group';
                    profile.user_name = res.conversation_name;
                    profile.avatar = res.conversation_avatar;
                    Profile.setConvProfile(profile);
                    $rootScope.$broadcast('PROFILE_SET');
                }
                // Two user conversation (not a group)
                if (res.conversation_name == '') {
                    $scope.conv_type = 'two';
                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(res.participants, '_id', $scope.currentUser._id);
                    // Get the position of the current user
                    participant_pos = 1 - user_pos;
                    // Find the other user
                    UserData.getConversationsUser(res.participants[participant_pos]._id)
                        .then(function(result) {
                            var avatar = "default";
                            // set the other user name as the name of the conversation.
                            if (result) {
                                profile.user_name = result.user_name;
                                avatar = result.avatar;
                            }
                            profile.avatar = avatar;
                            Profile.setConvProfile(profile);
                            $rootScope.$broadcast('PROFILE_SET');
                        });
                }
            });

        UserData.getCardsModelById(id)
            .then(function(result) {
                if (result != undefined) {
                    $scope.cards = result.data;
                    if (result.data.length == 0) {
                        $rootScope.pageLoading = false;
                    }
                    // Clear the cards unviewed array for this participant of this conversation.
                    updateConversationViewed(id);
                } else {
                    $scope.cards = [];
                    $rootScope.pageLoading = false;
                }
            });
    };

    // clear the participants unviewed array by conversation id
    updateConversationViewed = function(id) {
        UserData.updateConversationViewed(id);
    };

    // update the conversation with the new card data
    updateConversation = function(data) {
        // Get the user name for the user id
        // TODO dont repeat if user id already retreived
        UserData.getConversationsUser(data.user)
            .then(function(res) {
                // Set the user_name to the retrieved name
                data.user_name = res.user_name;
                data.avatar = res.avatar;
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
        // Update the cards model
        $scope.cards.push(data);
        // Map relevant data to the loaded cards.
        $scope.cards.map(function(key, array) {
            // Store the new original characters of the card.
            key.original_content = key.content;
        });
        // Clear the cards unviewed arrary for this participant of this conversation.
        updateConversationViewed(data.conversationId);
    };

    adjustCropped = function() {
        if (!$rootScope.crop_on) {
            var win_width = $(window).width();
            if ($rootScope.last_win_width != win_width) {
                last_win_width = win_width;
                $(".cropped").each(function(index, value) {
                    var stored = $(value).attr('cbd-data');
                    var stored_image = $(value).attr('image-data');
                    stored_image = JSON.parse(stored_image);
                    if (stored) {
                        stored = JSON.parse(stored);
                        if (stored_image.naturalWidth < win_width) {
                            $(value).parent().css("height", stored_image.height);
                            $(value).parent().css("width", stored_image.naturalWidth);
                            var zoom = stored_image.naturalWidth / (stored.right - stored.left);
                            $(value).css("zoom", zoom);
                        } else {
                            var zoom = win_width / (stored.right - stored.left);
                            $(value).css("zoom", zoom);
                            var height = (stored.bottom - stored.top) * zoom;
                            $(value).parent().css("height", height);
                        }
                    }
                });
            }
        }
    };

    $scope.inviewoptions = { offset: [100, 0, 100, 0] };


    $scope.lineInView = function(data, id) {
        if (data) {
            $('#ce' + id).removeClass('outview');
        } else {
            $('#ce' + id).addClass('outview');
        }
    };

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        $rootScope.pageLoading = false;
        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
    });

    tempE = function() {
        $(".cropper_cont").each(function(index, value) {
            $(this).attr('height', $(this).find("img").height());
        });
    };

    tempD = function() {
        $(".cropper_cont").each(function(index, value) {
            value._ce = $(this).parent().attr('contenteditable');
            $(this).parent().attr('contenteditable', 'false');
            value._onclick = value.onclick;
            value.onclick = function() { return false; };
        });
    };

    // Listen for the end of the view transition.
    $(".page").on("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function(e) {
        if (e.originalEvent.animationName == "slide-in") {
            $timeout(function() {
                $scope.$apply(function() {
                    // Load the rest of the cards.
                    $scope.totalDisplayed = -1000;
                }, 0);
            });
        }
    });

}]);