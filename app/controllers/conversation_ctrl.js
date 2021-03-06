cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'ImageEdit', '$compile', 'ImageAdjustment', 'Keyboard', 'Scroll', '$animate', 'CropRotate', 'ImageFilters', 'ContentEditable', 'Notify', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, ImageEdit, $compile, ImageAdjustment, Keyboard, Scroll, $animate, CropRotate, ImageFilters, ContentEditable, Notify) {

    openCropRotate = ImageEdit.openCropRotate;
    editImage = ImageEdit.editImage;
    closeImageEdit = ImageEdit.closeImageEdit;
    deleteImage = ImageEdit.deleteImage;
    openFilters = ImageEdit.openFilters;
    closeFilters = ImageEdit.closeFilters;
    filterClick = ImageFilters.filterClick;
    adjustImage = ImageEdit.adjustImage;
    submitTitle = ImageEdit.submitTitle;
    cancelTitle = ImageEdit.cancelTitle;
    testImage = ImageEdit.testImage;
    addTitle = ImageEdit.addTitle;
    cancelCrop = CropRotate.cancelCrop;
    makeCrop = CropRotate.makeCrop;
    toggleRotateSlider = CropRotate.toggleRotateSlider;
    togglePerspectiveSlider = CropRotate.togglePerspectiveSlider;
    flipImage = CropRotate.flipImage;
    rotateImage = CropRotate.rotateImage;
    sliderRotateChange = CropRotate.sliderRotateChange;
    sliderRotateEnd = CropRotate.sliderRotateEnd;
    sliderperspectiveVChange = CropRotate.sliderperspectiveVChange;
    sliderperspectiveHChange = CropRotate.sliderperspectiveHChange;
    sliderTestChange = ImageEdit.sliderTestChange;

    $scope.getFocus = Format.getFocus;
    $scope.getBlur = Format.getBlur;
    $scope.contentChanged = Format.contentChanged;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;
    $scope.dropDownToggle = Edit.dropDownToggle;
    $scope.pasteHtmlAtCaret = Format.pasteHtmlAtCaret;
    $scope.checkCursor = Format.checkCursor;
    $scope.test_card = [];
    $scope.inviewoptions = { offset: [100, 0, 100, 0] };

    // leaving controller.
    $scope.$on('$destroy', function() {
        // Reset image editing to false
        ImageAdjustment.setImageEditing(false);
        $('.image_adjust_on').remove();
        $rootScope.top_down = false;
        Conversations.setConversationId('');
        Conversations.setConversationType('');
        resetObserver_queue();
        unbindScroll();
        $scope.cards = [];
        first_load = false;
    });

    // Detect device user agent 
    var ua = navigator.userAgent;

    // SCROLLING

    // Percent from top and bottom after which a check for more cards is executed.
    var UP_PERCENT = 20; //10
    var DOWN_PERCENT = 80; // 90
    // Percent from top and bottom after which a check to move the scroll position and check for mre cards is executed.
    var TOP_END = 0;
    var BOTTOM_END = 100;
    // Numbers of cards to load or display.
    var INIT_NUM_TO_LOAD = 50;
    var NUM_TO_LOAD = 20;

    var OUTER_TO_LOAD = 30;

    var MAX_BOTTOM = 30;
    var MAX_TOP = 30;

    var NUM_UPDATE_DISPLAY = 10;
    var NUM_UPDATE_DISPLAY_INIT = 30;
    // Minimum number of $scope.cards_temp to keep loaded.
    var MIN_TEMP = 40;
    // The maximum number of cards to keep out of bounds.
    var MAX_OUT_BOUNDS = 10;

    // SCROLL INDICATOR

    var SCROLL_THUMB_MIN = 5;

    $rootScope.pageLoading = true;
    $rootScope.offlineMode = false;
    $scope.no_cards = true;
    $rootScope.loading_cards = false;
    $scope.feed = false;
    $scope.top_down = false;
    $rootScope.top_down = false;
    $rootScope.last_win_width;
    $rootScope.loading_cards_offscreen = false;

    $scope.isMember = false;
    $scope.cards = [];
    $scope.removed_cards_top = [];
    $scope.removed_cards_bottom = [];
    $scope.cards_temp = [];

    $scope.image_title = {
        content: 'Enter Text here!',
    };

    var first_load = true;
    var scroll_direction;
    var last_scrolled;
    var dir;
    var store = {};
    var image_check_counter = 0;
    var scroll_updating = false;
    var programmatic_scroll = false;
    var last_card_stored;
    let currently_editing;
    let editing_original;

    // SCROLL INDICATOR
    var pb;
    var cdh;
    var currentScroll;
    var maxScroll;
    var ch;
    var mobile = false;
    var time_1;
    var time_2;
    var latest_card_time;

    $rootScope.LATEST_CARD_TIME;

    var all_latest_cards;

    // Adding cards
    let new_cards = [];

    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    Keyboard.keyBoardListenStart();

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    // DEBUGGING
    $rootScope.$watch('debug', function(newStatus) {
        var unbinddb1;
        var unbinddb2;
        var unbinddb3;
        if (newStatus) {
            unbinddb1 = $scope.$watch('cards_temp.length', function(newStatus) {
                $rootScope.cards_temp_length = newStatus;
            });
            unbinddb2 = $scope.$watch('removed_cards_top.length', function(newStatus) {
                $rootScope.removed_cards_top_length = newStatus;
            });
            unbinddb3 = $scope.$watch('removed_cards_bottom.length', function(newStatus) {
                $rootScope.removed_cards_bottom_length = newStatus;
            });
        } else {
            $rootScope.cards_temp_length = 'NA';
            $rootScope.removed_cards_top_length = 'NA';
            $rootScope.removed_cards_bottom_length = 'NA';
            if (unbinddb1 != undefined) {
                unbinddb1();
                unbinddb2();
                unbinddb3();
            }
        }
    });

    // When cropper image has been changed save the card.
    saveCard = function(id) {
        var deferred = $q.defer();
        // Find the card to be saved by id.
        var pos = General.findWithAttr($scope.cards, '_id', id);
        if (pos >= 0) {
            var card = $scope.cards[pos];
            // Update the card.
            Format.updateCard(id, card, $scope.currentUser).then(function(result) {
                Scroll.enable('.content_cnv');
                ImageAdjustment.setImageAdjusted(false);
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    // When an image is uploaded.
    $scope.$on('imageUpload', function(event, data) {
        scroll_updating = true;
    });
    // When an image is pasted
    $scope.$on('imagePasted', function(event, data) {
        $timeout(function() {
            scroll_updating = false;
        }, 500);
    });

    $scope.$on('window_resize', function() {
        setUpScrollBar();
    });

    $scope.$on('ngRepeatFinishedTemp', function(ngRepeatFinishedEvent) {
        image_check_counter++;
        checkImages('load_off_screen', image_check_counter);
    });

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        dir = 2;
        image_check_counter++;
        checkImages('content_cnv', image_check_counter);
        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
    });

    // SCROLLING

    newCardAnimComplete = function(card_id) {
        var deferred = $q.defer();
        var pos = General.findWithAttr($scope.cards, '_id', card_id);
        if (pos >= 0) {
            createObserver($scope.cards[pos]._id);
        }
        bindScroll();
        deferred.resolve();
        return deferred.promise;
    }

    animateCard = async function(card_id) {
        var deferred = $q.defer();
        let speed = 800;
        // Only animate the last added card.
        if (new_cards.length > 0) {
            deferred.resolve();
        } else {
            var max_s;
            if (!$scope.top_down) {
                max_s = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
            } else {
                max_s = 0;
            }
            unbindScroll();
            // Stop the animation if the user scrolls.
            $(".content_cnv").bind("touchstart", function(e) {
                $(".content_cnv").stop(true, false).unbind('touchstart');
                newCardAnimComplete(card_id);
            });
            $(".content_cnv").animate({
                scrollTop: max_s
            }, speed, "easeOutQuad", async function() {
                // Animation complete.
                await newCardAnimComplete(card_id);
                deferred.resolve();
            });
        }
        return deferred.promise;
    }

    addNewCards = async function() {
        if (new_cards.length > 0) {
            let next_card = new_cards.pop();
            $scope.cards.push(next_card);
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    }

    upDateObservers = function() {
        resetObserver_queue();
        intObservers();
        for (var i = 0, len = $scope.cards.length; i < len; i++) {
            //
            // If a new card has been posted.
            //
            // TODO - If not at top or bottom add dialogue to notify user of new post
            // but only scroll to the card if the user chooses. Requires change to addCards also.
            if ($scope.cards[i].new_card) {
                if (!$scope.top_down) {
                    delete $scope.cards[i].new_card;
                }
                var card_id = $scope.cards[i]._id;
                $scope.test_card[0] = $scope.cards[i];
                $rootScope.LATEST_CARD_TIME = $scope.cards[i].updatedAt;
                // Get the height of the new card.
                let test = awaitImages('#card_' + card_id).then(async function(result) {
                    // Animate the change onscreen.
                    $timeout(async function() {
                        if ($scope.top_down) {
                            var cur_s = $(".content_cnv").scrollTop();
                            if (cur_s == 0) {
                                // If at top - animate the card into position.
                                unbindScroll();
                                Scroll.disable('.content_cnv');
                                var new_h = Number($('.test_card').outerHeight(true).toFixed(2));
                                new_h--;
                                $('.content_cnv').css('--v', (new_h * -1) + 'px');
                                $(".content_cnv").css('overflow-y', 'visible');
                                $(".content_cnv").css('overflow-x', 'visible');
                                $('.content_cnv').addClass('animate-transform').on('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);
                                var pos = General.findWithAttr($scope.cards, '_id', card_id);
                                if (pos >= 0) {
                                    delete $scope.cards[pos].new_card;
                                }
                            } else {
                                // not top
                                var pos = General.findWithAttr($scope.cards, '_id', card_id);
                                if (pos >= 0) {
                                    delete $scope.cards[pos].new_card;
                                }
                                await animateCard(card_id);
                                addNewCards();
                            }
                        } else {
                            await animateCard(card_id);
                            addNewCards();
                        }
                    }, 100);
                });
            } else {
                createObserver($scope.cards[i]._id);
            }
        }
    };

    $scope.$watch('cards.length', function(newStatus) {
        // Debugging
        $rootScope.cards_length = newStatus;
        $timeout(function() {
            upDateObservers();
        }, 100);
        if (maxScroll > 0) {
            setUpScrollBar();
        }
    });

    // doRepeat Directive finished loading onscreen
    domUpdated = function() {
        $('#delete_image').remove();
        $rootScope.$broadcast("ngRepeatFinishedTemp", { temp: "some value" });
    };

    var updateScrollBar = function() {
        var sth = (100 / (((ch / cdh) * 100) / 100));
        if (sth < SCROLL_THUMB_MIN) {
            sth = SCROLL_THUMB_MIN;
        }
        // Set the progress thumb height.
        $(pb).css('height', sth + "%");
        var sm = 100 - sth;
        var s = (currentScroll / (maxScroll) * 100);
        s = (s * sm) / 100;
        // Set the progress thumb position.
        pb.style.top = s + "%";
    };

    var scrollFunction = function() {
        ch = this.scrollHeight;
        currentScroll = $(this).scrollTop();
        maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        if (scrolled < last_scrolled) {
            // Up
            dir = 1;
        } else if (scrolled > last_scrolled) {
            // Down
            dir = 0;
        } else if (scrolled == last_scrolled) {
            // No change. Dont fire.
            dir = 2;
        }
        if (mobile) {
            updateScrollBar();
        }
        if (!scroll_updating) {
            if (dir == 1 && scrolled <= UP_PERCENT) {
                //console.log('FIRE UP!');
                addMoreTop()
                    .then(function(result) {
                        //console.log('AMT END');
                        scroll_updating = false;
                    });
            }
            if (dir == 0 && scrolled >= DOWN_PERCENT) {
                //console.log('FIRE DOWN!');
                addMoreBottom()
                    .then(function(result) {
                        //console.log('AMB END');
                        scroll_updating = false;
                    });
            }
        }
        last_scrolled = scrolled;
    };

    setUpScrollBar = function() {
        $('.progress-container').css('top', $('.content_cnv').offset().top);
        $('.progress-container').css('height', $('.content_cnv').height());
        pb = document.getElementById('progress-thumb');
        $(pb).css('height', SCROLL_THUMB_MIN + "%");
        cdh = $('.content_cnv').height();
        ch = $('.content_cnv')[0].scrollHeight;
        currentScroll = $('.content_cnv').scrollTop();
        maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
        if (mobile) {
            if (maxScroll > 0) {
                $('.progress-container').addClass('active');
                $('#progress-thumb').removeClass('fade_in');
                $('#progress-thumb').addClass('fade_in');
                updateScrollBar();
            }
        }
    };

    bindScroll = function() {
        setUpScrollBar();
        $('.content_cnv')[0].addEventListener('scroll', scrollFunction, { passive: true }, { once: true });
    };

    unbindScroll = function() {
        $('.content_cnv')[0].removeEventListener('scroll', scrollFunction, { passive: true }, { once: true });
        $('.progress-container').removeClass('active');
    };

    // UPDATING CARDS

    tempToCards = function() {
        var deferred = $q.defer();
        scroll_updating = true;
        if ($scope.cards_temp.length > 0) {
            var amount = NUM_UPDATE_DISPLAY;
            var cards_to_move;
            if ($scope.cards.length == 0) {
                amount = NUM_UPDATE_DISPLAY_INIT;
                $rootScope.LATEST_CARD_TIME = $scope.cards_temp[0].updatedAt;
            }
            cards_to_move = $scope.cards_temp.splice(0, amount);
            for (var i = 0, len = cards_to_move.length; i < len; i++) {
                //$scope.cards.push(cards_to_move[i]);
                $('.load_off_screen #card_' + cards_to_move[i]._id).remove();
                $scope.cards.push(cards_to_move[i]);
            }
            deferred.resolve(true);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    addMoreTop = function() {
        var deferred = $q.defer();
        scroll_updating = true;
        unRemoveCardsTop()
            .then(function(result) {
                if (result == 0 && !$scope.top_down) {
                    removeCardsBottom()
                        .then(function(result) {
                            deferred.resolve();
                        });
                } else {
                    removeCardsBottom()
                        .then(function(result) {
                            deferred.resolve();
                        });
                }
            });
        return deferred.promise;
    };

    addMoreBottom = function() {
        var deferred = $q.defer();
        scroll_updating = true;
        unRemoveCardsBottom()
            .then(function(result) {
                if (result == 0 && $scope.top_down) {
                    removeCardsTop()
                        .then(function(result) {
                            deferred.resolve();
                        });
                    deferred.resolve();
                } else {
                    removeCardsTop()
                        .then(function(result) {
                            deferred.resolve();
                        });
                    deferred.resolve();
                }
            });
        return deferred.promise;
    };

    checkAfter = function(card, amount) {
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            getFollowingAfter('$lt', card, amount);
        } else if (Conversations.getConversationType() == 'private') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getCards(id);
            }
        } else if (Conversations.getConversationType() == 'public') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getPublicCards(id);
            }
        }
    };

    checkBefore = function(card, amount) {
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            getFollowingBefore('$gt', card, amount);
        } else if (Conversations.getConversationType() == 'private') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getCards(id);
            }
        } else if (Conversations.getConversationType() == 'public') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getPublicCards(id);
            }
        }
    };

    getCardAmountBottom = function() {
        var amount = 0;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').last().addClass('removeCards');
        var last_index;
        for (var len = allElements.length, i = allElements.length; i > 0; i--) {
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                last_index = i + 1;
                break;
            }
        }
        if (last_index != undefined) {
            var remainder = allElements.length - last_index;
            amount = remainder <= MAX_OUT_BOUNDS ? remainder - MAX_OUT_BOUNDS : remainder - MAX_OUT_BOUNDS;
            // check less than zero
            amount = amount < 0 ? 0 : amount;
            // check for undefined
            amount = amount != undefined ? amount : 0;
        }
        return amount;
    };

    getCardAmountTop = function() {
        var amount = 0;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').first().addClass('removeCards');
        var last_index;
        for (var i = 0, len = allElements.length; i < len; i++) {
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                last_index = i;
                break;
            }
        }
        if (last_index != undefined) {
            amount = last_index <= MAX_OUT_BOUNDS ? 0 : last_index - MAX_OUT_BOUNDS;
        }
        // check less than zero
        amount = amount < 0 ? 0 : amount;
        // check for undefined
        amount = amount != undefined ? amount : 0;
        return amount;
    };

    unRemoveCardsTop = function() {
        var deferred = $q.defer();
        var removed_length = $scope.removed_cards_top.length;
        var amount = NUM_UPDATE_DISPLAY;
        if (removed_length < amount) {
            amount = removed_length;
        }
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt', true);
            } else {
                $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt');
            }
            var spliced = $scope.removed_cards_top.splice(0, amount);
            for (var i = 0, len = spliced.length; i < len; i++) {
                $scope.cards.push(spliced[i]);
            }
            var all_cards = $scope.cards.concat($scope.removed_cards_top, $scope.removed_cards_bottom);
            var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
            checkBefore(sort_card[sort_card.length - 1], Number(Number(MAX_TOP) - (Number($scope.removed_cards_top.length))));
            deferred.resolve(amount);
        } else {
            var all_cards = $scope.cards.concat($scope.removed_cards_top, $scope.removed_cards_bottom);
            var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
            checkBefore(sort_card[sort_card.length - 1], MAX_TOP);
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    unRemoveCardsBottom = function() {
        var deferred = $q.defer();
        var removed_length = $scope.removed_cards_bottom.length;
        amount = NUM_UPDATE_DISPLAY;
        if (removed_length < amount) {
            amount = removed_length;
        }
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt');
            } else {
                $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt', true);
            }
            var spliced = $scope.removed_cards_bottom.splice(0, amount);
            for (var i = 0, len = spliced.length; i < len; i++) {
                $scope.cards.push(spliced[i]);
            }
            var all_cards = $scope.cards.concat($scope.removed_cards_top, $scope.removed_cards_bottom);
            var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
            checkAfter(sort_card[0], Number(Number(MAX_BOTTOM) - (Number($scope.removed_cards_bottom.length))));
            deferred.resolve(amount);
        } else {
            var all_cards = $scope.cards.concat($scope.removed_cards_top, $scope.removed_cards_bottom);
            var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
            checkAfter(sort_card[0], MAX_BOTTOM);
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    removeCardsTop = function() {
        var deferred = $q.defer();
        var amount = getCardAmountTop();
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');
            } else {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            }
            var removed_cards_top_temp = $scope.cards.splice(0, amount);
            for (var i = 0, len = removed_cards_top_temp.length; i < len; i++) {
                delete removed_cards_top_temp[i].$$hashKey;
                if ($scope.removed_cards_top.length < MAX_TOP) {
                    $scope.removed_cards_top.push(removed_cards_top_temp[i]);
                } else {
                    $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt');
                    $scope.removed_cards_top.pop();
                    $scope.removed_cards_top.push(removed_cards_top_temp[i]);
                }
            }
            deferred.resolve(amount);
        } else {
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    removeCardsBottom = function() {
        var deferred = $q.defer();
        var amount = getCardAmountBottom();
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            } else {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');
            }
            var removed_cards_bottom_temp = $scope.cards.splice(0, amount);
            for (var i = 0, len = removed_cards_bottom_temp.length; i < len; i++) {
                delete removed_cards_bottom_temp[i].$$hashKey;
                if ($scope.removed_cards_bottom.length < MAX_BOTTOM) {
                    $scope.removed_cards_bottom.push(removed_cards_bottom_temp[i]);
                } else {
                    $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt');
                    $scope.removed_cards_bottom.shift();
                    $scope.removed_cards_bottom.push(removed_cards_bottom_temp[i]);
                }
            }
            deferred.resolve(amount);
        } else {
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    // LOADING CHECK

    imagesLoadedx = function(obj) {
        // Check if first load.
        if ($scope.cards.length == 0) {
            tempToCards()
                .then(function(res) {
                    scroll_updating = false;
                });
        }
        // Check if first load of content_cnv
        if (obj.location == 'content_cnv' && $scope.cards.length > 0) {
            if (first_load) {
                programmatic_scroll = true;
                $scope.$broadcast("items_changed", scroll_direction);
                $timeout(function() {
                    $rootScope.pageLoading = false;
                }, 300);
                // Wait for the page transition animation to end before applying scroll.
                $timeout(function() {
                    bindScroll();
                }, 1000);
            }
            first_load = false;
        }
        if (obj.location == 'content_cnv') {
            $rootScope.loading_cards = false;
            obj = null;
        } else if (obj.location == 'load_off_screen') {
            $rootScope.loading_cards_offscreen = false;
            obj = null;
        }
    };

    checkImages = function(location, counter) {
        var loc = location + '_' + counter;
        store[loc] = {};
        store[loc].id = counter;
        store[loc].location = location;
        store[loc].img_loaded = 0;
        store[loc].img_count = $('.' + location + ' img').length;
        if (store[loc].img_count > 0) {
            $('.' + location).find('img').each(function() {
                if (this.complete) {
                    store[loc].img_loaded++;
                    if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                        imagesLoadedx(store[loc]);
                    }
                } else {
                    $(this).on('load', function() {
                        store[loc].img_loaded++;
                        if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                            imagesLoadedx(store[loc]);
                        }
                    });
                    $(this).on('error', function() {
                        store[loc].img_loaded++;
                        if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                            imagesLoadedx(store[loc]);
                        }
                    });
                }
            });
        } else {
            imagesLoadedx(store[loc]);
        }
    };

    //
    // Conversations
    //

    // Find the conversation id.
    getConversationId = function() {
        var deferred = $q.defer();
        // Use the id from $routeParams.id if it exists. The conversation may have been loaded by username.
        if (id != undefined) {
            Conversations.setConversationId(id);
            // LDB
            Conversations.find_conversation_id(id)
                .then(function(res) {
                    Conversations.setConversationType(res.conversation_type);
                    deferred.resolve(res);
                });
        } else if (username != undefined) {
            // Public. Use the username from $routeParams.username to load that users Public conversation.
            // LDB
            Conversations.find_user_public_conversation_id(username)
                .then(function(res) {
                    // check if this is a valid username
                    if (res.error) {
                        $location.path("/api/login");
                    } else {
                        Conversations.setConversationId(res._id);
                        Conversations.setConversationType(res.conversation_type);
                        deferred.resolve(res);
                    }
                })
                .catch(function(error) {
                    //console.log(error);
                });
        } else {
            // No id or username - Feed.
            Conversations.setConversationType('feed');
            deferred.resolve({ conversation: 'feed' });
        }
        return deferred.promise;
    };

    // card_create.html is added to the conversation if $scope.isMember=true.
    checkPermit = function(conv) {
        var result = false;
        // Logged in
        if (principal.isValid()) {
            if (Conversations.getConversationType() == 'public') {
                if (conv.admin.includes(UserData.getUser()._id)) {
                    result = true;
                } else {
                    $scope.no_footer = true;
                }
            } else {
                var pos = General.findWithAttr(conv.participants, '_id', UserData.getUser()._id);
                if (pos >= 0) {
                    result = true;
                }
            }
        }
        return result;
    };

    $scope.follow = function(card) {
        // Find the public conversation for the selected user.
        // LDB
        Conversations.find_user_public_conversation_by_id(card.user)
            .then(function(result) {
                if (result.conversation_type == 'public') {
                    // If following then unfollow
                    var conversation_id = result._id;
                    var pms = { 'id': conversation_id, 'user': UserData.getUser()._id };
                    if (card.following) {
                        // Update the Conversation in the DB.
                        // LDB
                        Conversations.deleteFollower(pms)
                            .then(function(conversation) {
                                // Update the User in the DB.
                                // LDB
                                Users.unfollow_conversation(conversation._id)
                                    .then(function(user) {
                                        UserData.setUser(user);
                                        $scope.currentUser = UserData.getUser();
                                        removeUserCards(conversation_id);
                                        updateFollowingIcons($scope.cards);
                                    });
                            });
                    } else {
                        // If not following then follow. Update the Conversation in the DB.
                        // LDB
                        Conversations.addFollower(pms)
                            .then(function(conversation) {
                                // Update the User in the DB.
                                // LDB
                                Users.follow_conversation(conversation._id)
                                    .then(function(user) {
                                        UserData.setUser(user);
                                        $scope.currentUser = UserData.getUser();
                                        updateFollowingIcons($scope.cards);
                                    });
                            });
                    }
                }
            });
    };

    addSlider = function($el, parent_container, id, data) {
        $rootScope.slider_settings[data.type].amount = data.last_position;
        var t = $compile($el)($scope);
        var s = $('.slider_container_inner').append(t);
        s.addClass('active');
        $timeout(function() {
            $('.slider_container').addClass('animate');
            var currentHeight = $('.slider_container_inner').outerHeight();
            $('.slider_container').css('height', currentHeight);
            s.removeClass('hide');
        }, 0);
    };

    addCard = function(card) {
        // Get the user for this card
        var users = UserData.getContacts();
        var user_pos = General.findWithAttr(users, '_id', card.user);
        var user = users[user_pos];
        // Store the original characters of the card.
        card.original_content = card.content;
        // Get the user name for the user id
        card.user_name = user.user_name;
        card.avatar = user.avatar;
        $scope.cards.push(card);
    };

    deleteCard = function(id) {
        var deferred = $q.defer();
        let previous_card = { content: 'empty' };
        // Check the existence of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', id);
            if (found_pos >= 0) {
                arr = i;
                break;
            }
        }
        if (found_pos >= 0) {
            $rootScope.deleting_card = true;
            $timeout(function() {
                card_arrays[arr].splice(found_pos, 1);
                $scope.$apply();
                let a = card_arrays[arr];
                let sorted = $filter('orderBy')(a, 'updatedAt', true);
                if (sorted.length > 0) {
                    previous_card = sorted[0];
                    delete previous_card.$$hashKey;
                    deferred.resolve(previous_card);
                }
            });
            $rootScope.deleting_card = false;
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    function awaitImages(div) {
        var deferred = $q.defer();
        // Images loaded is zero because we're going to process a new set of images.
        var imagesLoaded = 0;
        // Total images is still the total number of <img> elements on the page.
        var totalImages = $(div).find('img').length;
        if (totalImages == 0) {
            deferred.resolve();
        }
        // Step through each image in the DOM, clone it, attach an onload event
        // listener, then set its source to the source of the original image. When
        // that new image has loaded, fire the imageLoaded() callback.
        $(div).find('img').each(function(idx, img) {
            $('<img>').on('load', imageLoaded).attr('src', $(img).attr('src'));
        });
        // Do exactly as we had before -- increment the loaded count and if all are
        // loaded, call the allImagesLoaded() function.
        function imageLoaded() {
            imagesLoaded++;
            if (imagesLoaded == totalImages) {
                allImagesLoaded();
            }
        }

        function allImagesLoaded() {
            deferred.resolve();
        }
        return deferred.promise;
    }

    replaceAllBlobs = function() {
        $('.container_cnv').find('img').each(function() {
            if ($(this).attr('src').substr(0, 5) == 'blob:') {
                let original_image_name = $(this).attr('original-image-name');
                $(this).removeAttr('original-image-name');
                if (!$(this).attr('id').includes('filtered')) {
                    // Original image
                    $(this).attr('src', IMAGES_URL + original_image_name);
                } else {
                    // Filtered Image
                    $(this).attr('src', IMAGES_URL + original_image_name + '?TEMP_DATE_' + new Date());
                }
            }
            // Original image (adjusted)
            if ($(this).attr('data-src')) {
                if ($(this).attr('data-src').substr(0, 5) == 'blob:') {
                    let original_image_name = $(this).attr('original-image-name');
                    $(this).removeAttr('original-image-name');
                    $(this).attr('data-src', IMAGES_URL + original_image_name);
                }
            }
        });
    }

    // Update to find image in all arrays or create container!
    updateImages = function(images) {
        var deferred = $q.defer();
        replaceAllBlobs();
        deferred.resolve();
        return deferred.promise;
    }

    sendRequested = async function(posted, updated, deleted) {
        var deferred = $q.defer();
        // Send notifications and update viewed (POSTs)
        for (n in posted) {
            const cp = await Database.cardPosted(posted[n].returned, posted[n].method);
        }
        // Send notifications and update viewed (PUTs)
        for (n in updated) {
            const cp = await Database.cardPosted(updated[n].returned, updated[n].method);
        }
        // Send notifications and update viewed (DELETEs)
        for (n in deleted) {
            const cp = await Database.cardPosted(deleted[n].returned, deleted[n].method);
        }
        deferred.resolve();
        return deferred.promise;
    }

    // Update card id from temp to the id returned from the DB.
    updateCardId = function(temp_id, db_id) {
        $('#card_' + temp_id).attr('id', 'card_' + db_id);
        $('#card_' + db_id + ' #ce' + temp_id).attr('id', 'ce' + db_id);
        // Check the existece of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', temp_id);
            if (found_pos >= 0) {
                arr = i;
                break;
            }
        }
        if (found_pos >= 0) {
            card_arrays[arr][found_pos]._id = db_id;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    }

    // Update card ids from temp to the id returned from the DB.
    updateCardIds = function(posted) {
        var deferred = $q.defer();
        posted.forEach(function(element) {
            updateCardId(element.requested._id, element.returned._id);
        });
        deferred.resolve();
        return deferred.promise;
    }

    resizeContent = function(id, card, old_card, div) {
        var deferred = $q.defer();
        card.old_h = $('.' + PARENTCONTAINER + ' #card_' + id + ' .' + div + ' .ce').height().toFixed(2);
        card.new_h = $('.test_card .' + div + ' .ce').height().toFixed(2);
        $('#card_' + id + ' .' + div).height(card.old_h);
        $($('#card_' + id + ' .' + div))
            .animate({ opacity: 0 }, 300, function() {
                // Animation complete.
                if (card.new_id != undefined) {
                    old_card._id = card.new_id;
                }
                old_card.user = card.user;
                old_card.createdAt = card.createdAt;
                if (div == 'title_area') {
                    old_card.title_image_text = card.title_image_text;
                    old_card.title_area = card.title_area;
                }
                if (div == 'content_area') {
                    old_card.original_content = card.content;
                    old_card.content = card.content;
                }
                delete old_card.new_card;
                var expanded = true;
                if (div == 'content_area' && old_card.expanded == false) {
                    expanded = false
                }
                // Ensure the model updates before animating.
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                if (card.new_h != card.old_h && expanded) {
                    //console.log('new height');
                    $($('#card_' + id + ' .' + div)).animate({ height: card.new_h }, 500, function() {
                        // Animation complete.
                        $(this).animate({ opacity: 1 }, 400, function() {
                            $(this).css('opacity', '');
                            $(this).css('height', '');
                            delete old_card.old_h;
                            delete old_card.new_h;
                            deferred.resolve();
                        });
                    });
                } else {
                    //console.log('same height');
                    $(this).animate({ opacity: 1 }, 300, function() {
                        $(this).css('opacity', '');
                        $(this).css('height', '');
                        delete old_card.old_h;
                        delete old_card.new_h;
                        deferred.resolve();
                    });
                }
            });
        return deferred.promise;
    }

    disableCheckBoxes = function(content) {
        var tmp = document.createElement("div");
        tmp.innerHTML = content;
        $(tmp).find('input[type=checkbox]').attr('disabled', 'disabled');
        return tmp.innerHTML;
    }

    updateCard = function(card) {
        if (!card.parsed) {
            card = parseCard(card);
        }
        // Check the existence of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', card._id);
            if (found_pos >= 0) {
                arr = i;
                break;
            }
        }
        if (found_pos >= 0) {
            $scope.test_card[0] = card;
            $scope.test_card[0].expanded = true;
            var v = card_arrays[arr][found_pos].content;
            v = replaceTags.replace(v);
            // DANGER These had been removed for android image save bug
            v = replaceTags.removeDeleteId(v);
            v = replaceTags.removeFocusIds(v);
            card_arrays[arr][found_pos].content = v;
            $timeout(function() {
                let test = awaitImages('.test_card').then(function(result) {
                    // Animate the change onscreen.
                    $timeout(async function() {
                        // Create a copy of the existing content which has any checkboxes disabled. Checkboxes are disabled whe saved to the Database.
                        var existing_card_title_area = disableCheckBoxes(card_arrays[arr][found_pos].title_area);
                        if (card_arrays[arr][found_pos].title_image_text != card.title_image_text || existing_card_title_area != card.title_area) {
                            if (card.title_image) {
                                card_arrays[arr][found_pos].title_image = true;
                            } else {
                                card_arrays[arr][found_pos].title_image = false;
                            }
                            await resizeContent(card._id, card, card_arrays[arr][found_pos], 'title_area');
                        } else {
                            // Same content
                            card_arrays[arr][found_pos].original_content = card.content;
                            card_arrays[arr][found_pos].createdAt = card.createdAt;
                        }
                        // Create a copy of the existing content which has any checkboxes disabled. Checkboxes are disabled whe saved to the Database.
                        var existing_card = disableCheckBoxes(card_arrays[arr][found_pos].content);
                        if (existing_card != card.content) {
                            await resizeContent(card._id, card, card_arrays[arr][found_pos], 'content_area');
                        } else {
                            // Same content
                            card_arrays[arr][found_pos].original_content = card.content;
                            card_arrays[arr][found_pos].createdAt = card.createdAt;
                        }
                    });
                });
            });
        }
    };

    updateFollowingIcons = function(newValue) {
        var deferred = $q.defer();
        var promises = [];
        if (newValue != undefined) {
            // Find all Users first.
            var userList = [];
            var userListObjects = [];
            newValue.map(function(key, array) {
                if (!userList.includes(key.user)) {
                    userList.push(key.user);
                }
            });
            userList.map(function(key, array) {
                // Find the public conversation for this user.
                // LDB
                var prom = Conversations.find_user_public_conversation_by_id(key)
                    .then(function(result) {
                        var user_obj = { user_id: key, conversation: result };
                        userListObjects.push(user_obj);
                    });
                promises.push(prom);
            });
        }
        // All following icons have been mapped.
        $q.all(promises).then(function() {
            newValue.map(function(key, array) {
                // Find the public conversation for this user.
                var user_pos = General.findWithAttr(userListObjects, 'user_id', key.user);
                var public_conv_id = userListObjects[user_pos].conversation._id;
                if ($scope.currentUser.following.indexOf(public_conv_id) >= 0) {
                    // The user is following this user.
                    key.following = true;
                } else {
                    // The user is not following this user.
                    key.following = false;
                }
            });
            deferred.resolve();
        });
        return deferred.promise;
    };

    removeUserCards = function(conversation_id) {
        // Remove cards
        var i = $scope.cards.length;
        while (i--) {
            if ($scope.cards[i].conversationId == conversation_id) {
                $scope.cards.splice(i, 1);
            }
        }
    };

    updateCardsUser = function(arr, user, user_name, avatar) {
        array = $scope[arr];
        if (array.length > 0) {
            array.map(function(key, array) {
                if (key.user == user) {
                    key.user_name = user_name;
                    key.avatar = avatar;
                }
            });
        }
    };

    showLatest = function() {
        Notify.removeNotify();
        unbindScroll();
        Scroll.disable('.content_cnv');
        $scope.removed_cards_bottom = [];
        $scope.removed_cards_top = [];
        $scope.cards = [];
        $scope.cards_temp = [];
        $scope.cards = all_latest_cards;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
        $rootScope.LATEST_CARD_TIME = $scope.cards[0].updatedAt;
        var max_s;
        if (!$scope.top_down) {
            max_s = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
        } else {
            max_s = 0;
        }
        let speed = 800;
        $(".content_cnv").animate({
            scrollTop: max_s
        }, speed, "easeOutQuad", async function() {
            // Animation complete.
            bindScroll();
            Scroll.enable('.content_cnv');
        });
    }

    // TODO - change if adding button to notify user of new card.
    addCards = function(arr) {
        var deferred = $q.defer();
        var promises = [];
        var all_cards;
        var sort_card;
        var spliced;
        let new_cards_temp = [];
        for (var i = 0, len = arr.length; i < len; i++) {
            if (!arr[i].parsed) {
                arr[i] = parseCard(arr[i]);
            }
        }
        all_latest_cards = JSON.parse(JSON.stringify(arr));
        all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
        // Check if card already exists (may have been created by this user offline).
        var i = arr.length;
        while (i--) {
            let found = all_cards.filter(x => x._id == arr[i]._id);
            // Not found. New Card. Set this as a new card (for animating onscreen).
            if (found.length == 0) {
                arr[i].new_card = true;
            } else {
                // Already exists (may have been added offline).
                let card_data = JSON.parse(JSON.stringify(arr[i]));
                updateCard(card_data);
                // Remove this card from the array of cards to add.
                new_cards_temp.push(card_data);
                arr.splice(i, 1);
            }
        }
        new_cards = [...arr];
        if (!$scope.top_down) {
            if ($scope.removed_cards_bottom.length > 0) {
                sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                $scope.removed_cards_top = sort_card;
                $scope.removed_cards_bottom = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                $scope.cards = $scope.cards.concat(arr, spliced);
                programmatic_scroll = true;
                deferred.resolve();
            } else {
                // No cards have been removed due to scrolling.
                addNewCards();
                deferred.resolve();
            }
        } else {
            // If not at top, show alert of new cards
            all_latest_cards = $filter('orderBy')(all_latest_cards, 'updatedAt', true);
            var d1 = new Date($rootScope.LATEST_CARD_TIME);
            var d2 = new Date(all_latest_cards[0].updatedAt);
            var new_card_found = false;
            if (d1 < d2) {
                new_card_found = true;
            }
            var sender_is_reciever = (all_latest_cards[0].user == $scope.currentUser._id);
            if (new_card_found && last_scrolled > 10) {
                //console.log('NOT AT TOP');
                if (!sender_is_reciever) {
                    $rootScope.LATEST_CARD_TIME = all_latest_cards[0].updatedAt;
                    Notify.addNotify();
                }
                deferred.resolve();
            } else if (last_scrolled < 10 || last_scrolled == undefined) {
                // No cards have been removed due to scrolling.
                addNewCards();
                deferred.resolve();
            }
        }
        return deferred.promise;
    };

    getCardsUpdate = function(id) {
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            var load_amount;
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0]._id;
                operand = '$gt';
                load_amount = NUM_TO_LOAD;
            } else {
                // TODO - check if still needed.
                load_amount = INIT_NUM_TO_LOAD;
                last_card = '0';
                operand = '$lt';
            }
            var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
                        var users = UserData.getContacts();
                        var user;
                        for (var i = 0, len = res.data.length; i < len; i++) {
                            var key = res.data[i];
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            // Get the user for this card
                            if (user_pos < 0) {
                                //Users.search_id(key.user)
                                //   .then(function(res) {
                                //    });
                            } else {
                                user = users[user_pos];
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                cards_new.push(key);
                            }
                        }
                    } else {
                        $rootScope.loading_cards = false;
                    }
                })
                .catch(function(error) {
                    //console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards = false;
                deferred.resolve(cards_new);
            });
        } else {
            // Wait for loading to finish.
            deferred.resolve(cards_new);
        }
        return deferred.promise;
    };

    $scope.toggleCardHeight = function(event, id) {
        if (event) {
            event.stopPropagation();
        }
        var tgt = event.target.tagName;
        if (tgt != "INPUT") {
            var index = General.findWithAttr($scope.cards, '_id', id);
            if (!$scope.cards[index].editing) {
                var oh = $(".content_cnv #card_" + id + " .content_area .ce").outerHeight();
                var msPerHeight = 1.25; //How much ms per height
                var minRange = 400; //minimal animation time
                var maxRange = 600; //Maximal animation time
                var time = oh * msPerHeight;
                time = Math.min(time, maxRange);
                time = Math.max(time, minRange);
                var expand = true;
                if ($scope.cards[index].expanded) {
                    oh = 0;
                    expand = false;
                }
                $scope.cards[index].expanded = !$scope.cards[index].expanded;
                $(".content_cnv #card_" + id + " .content_area").velocity({ height: oh + "px" }, {
                    duration: time,
                    easing: "easeInOutCubic",
                    complete: function() {
                        // Animation complete.
                        if (oh != 0) {
                            $(this).height('unset');
                        }
                    }
                });
            }
        }
    }

    $scope.cancelEdits = function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        var pos = General.findWithAttr($scope.cards, '_id', currently_editing);
        if (pos >= 0) {
            $scope.cards[pos].editing = false;
            if ($scope.cards[pos].content != editing_original) {
                $scope.cards[pos].content = editing_original;
                $scope.saveEdits();
            }
        }
        var image_id = ImageAdjustment.getImageId();
        checkImageEdit(image_id);
        checkImageFilters();
        $('.decide_menu').animate({ "right": "-100vw" }, {
            duration: 400,
            easing: "easeOutQuad",
            complete: function() {
                $('.decide_menu').removeClass('active');
            }
        });
    };

    checkImageEdit = function(image_id) {
        var image_editing = false;
        if ($('#image_adjust_' + image_id).length > 0) {
            image_editing = true;
        }
        if (image_editing) {
            ImageEdit.closeImageEdit('e', image_id);
        }
    }

    checkImageFilters = function() {
        var image_filters = false;
        if ($('.filters_active').length > 0) {
            image_filters = true;
        }
        if (image_filters) {
            ImageEdit.closeFilters();
        }
    }

    $scope.saveEdits = async function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        var image_id = ImageAdjustment.getImageId();
        var card_id = $('.content_cnv #cropper_' + image_id).closest('div.card_temp').attr('id');
        checkImageEdit(image_id);
        checkImageFilters();
        ImageEdit.updateTitle(card_id);
        for (var i = 0, len = $scope.cards.length; i < len; i++) {
            delete $scope.cards[i].disabled;
        }
        var pos = General.findWithAttr($scope.cards, '_id', currently_editing);
        if (pos >= 0) {
            $scope.cards[pos].editing = false;
            let card = $scope.cards[pos];
            // Disable check boxes before saving.
            checkboxesEnabled($scope.cards[pos]._id, false);
            Format.getBlur(card._id, card, $scope.currentUser);
        }
        $('.decide_menu').animate({ "right": "-100vw" }, {
            duration: 400,
            easing: "easeOutQuad",
            complete: function() {
                $('.decide_menu').removeClass('active');
                $rootScope.editing = false;
            }
        });
    }

    $scope.editCard = function(event, card) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        $rootScope.editing = true;
        if (card.user == $scope.currentUser._id) {
            for (var i = 0, len = $scope.cards.length; i < len; i++) {
                $scope.cards[i].disabled = true;
            }
            var pos = General.findWithAttr($scope.cards, '_id', card._id);
            if (pos >= 0) {
                $scope.cards[pos].editing = true;
                $scope.cards[pos].disabled = false;
                currently_editing = $scope.cards[pos]._id;
                editing_original = $scope.cards[pos].original_content;
            }
            checkboxesEnabled($scope.cards[pos]._id, true);
            $('.content_cnv #card_' + card._id).prop("onclick", null).off("click");
            $('.decide_menu').addClass('active');
            $('.decide_menu').animate({ "right": "0" }, {
                duration: 400,
                easing: "easeOutQuad",
                complete: function() {}
            });
        }
    }

    parseCard = function(card) {
        let node = $.parseHTML(card.content);
        var content_area = {};
        content_area.title;
        var title_end;
        var tmp = document.createElement("div");
        var title_tmp = document.createElement("div");
        var content_tmp = document.createElement("div");
        var content_found = false;
        card.title_image = false;
        if (node[0].nodeName == 'DIV' && node[0].className.indexOf('cropper_cont') >= 0) {
            title_tmp.appendChild(node[0]);
            content_found = true;
        } else {
            title_tmp.appendChild(node[0]);
        }
        var cropper_found = false;
        for (var i = 1, len = node.length; i < len; i++) {
            if (node[i].nodeName != "#text") {
                if ((node[i].outerHTML).indexOf('cropper_cont') >= 0) {
                    cropper_found = true;
                }
            }
            //cropper_found
            if (!cropper_found && !content_found) {
                title_tmp.appendChild(node[i]);
                // first index of <br> or character limit.
                if (title_tmp.innerHTML.indexOf('<br>') > 0) {
                    content_found = true;
                }
                if (title_tmp.textContent.length > TITLE_CHAR_LIMIT) {
                    content_found = true;
                }
            } else {
                content_found = true;
                content_tmp.appendChild(node[i]);
            }
        }
        card.content = content_tmp.innerHTML;
        card.title_area = title_tmp.innerHTML;
        tmp.appendChild(node[0]);
        if (node[0].nodeName != '#text') {
            $(node[0]).children("img").each(function() {
                if ($(this).attr('title-data')) {
                    if ($(this).attr('title-data').length > 0) {
                        card.title_image_text = $(this).attr('title-data');
                        card.title_image = true;
                        card.animate_title = true;
                    } else {
                        delete card.title_image_text;
                        card.title_image = false;
                    }
                } else {
                    delete card.title_image_text;
                    card.title_image = false;
                }
            });
            if (tmp.innerHTML.includes('title-data')) {
                var index = tmp.innerHTML.indexOf('title-data');
                var td = tmp.innerHTML.substr(index, tmp.innerHTML.length);
            }
        }
        var tmp2 = document.createElement("div");
        for (var i = 1; i < node.length; i++) {
            tmp2.appendChild(node[i]);
        }
        card.editing = false;
        card.expanded = false;
        card.parsed = true;
        return card;
    }

    // TODO - If not following anyone suggest follow?
    getFollowing = function(dir, last_cardy) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var followed = UserData.getUser().following;
            var operand;
            var sort_card;
            var load_amount = NUM_TO_LOAD;
            var last_card;
            if (last_cardy == undefined) {
                if ($scope.cards.length > 0) {
                    // Only get newer than temp but check removed cards
                    var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                    sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                    last_card = sort_card[0]._id;
                } else {
                    last_card = '0';
                }
            }
            var val = { ids: followed, amount: load_amount, last_card: last_card, direction: dir };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getFeed(val)
                    .then(function(res) {
                        if (res.data.cards.length > 0) {
                            res.data.cards.map(function(key, array) {
                                key = parseCard(key);
                                // Get the conversation for this card
                                var conversation_pos = General.nestedArrayIndexOfValue(res.data.conversations, 'admin', key.user);
                                var conversation = res.data.conversations[conversation_pos];
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                // Get the user name for the user id
                                key.user_name = conversation.conversation_name;
                                key.avatar = conversation.conversation_avatar;
                                key.following = true;
                                // Load any images offScreen
                                if (last_card == '0') {
                                    $scope.cards_temp.push(key);
                                } else {
                                    $scope.removed_cards_bottom.push(key);
                                }
                            });
                        } else {
                            $rootScope.loading_cards_offscreen = false;
                        }
                    }).catch(function(error) {
                        //console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    $rootScope.loading_cards_offscreen = false;
                    deferred.resolve();
                });
            }
        }
        return deferred.promise;
    };

    getFollowingUpdate = function() {
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            var load_amount;
            var followed = UserData.getUser().following;
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                last_card = sort_card[0].updatedAt;
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            last_card = General.getISODate();
            var val = { ids: followed, amount: NUM_TO_LOAD, last_card: last_card };
            var prom1 = Conversations.updateFeed(val)
                .then(function(res) {
                    if (res.data.cards.length > 0) {
                        var users = UserData.getContacts();
                        var user;
                        for (var i = 0, len = res.data.cards.length; i < len; i++) {
                            var key = res.data.cards[i];
                            key = parseCard(key);
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            // Get the user for this card
                            if (user_pos < 0) {
                                //Users.search_id(key.user)
                                //   .then(function(res) {
                                //    });
                            } else {
                                user = users[user_pos];
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                key.following = true;
                                cards_new.push(key);
                            }
                        }
                    } else {
                        $rootScope.loading_cards = false;
                    }
                })
                .catch(function(error) {
                    //console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards = false;
                deferred.resolve(cards_new);
            });
        } else {
            // return empty array
            deferred.resolve(cards_new);
        }
        return deferred.promise;
    };

    getFollowingAfter = function(dir, last_cardy, amount) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var followed = UserData.getUser().following;
            var operand;
            var sort_card;
            var load_amount = amount;
            var last_card;
            if (last_cardy == undefined) {
                if ($scope.cards.length > 0) {
                    // Only get newer than temp but check removed cards
                    var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                    sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                    last_card = sort_card[0]._id;
                } else {
                    last_card = '0';
                }
            } else {
                last_card = last_cardy.updatedAt;
            }
            var val = { ids: followed, amount: load_amount, last_card: last_card, direction: dir };
            var prom1 = Conversations.getFeed(val)
                .then(function(res) {
                    if (res.data.cards.length > 0) {
                        res.data.cards.map(function(key, array) {
                            key = parseCard(key);
                            // Get the conversation for this card
                            var conversation_pos = General.nestedArrayIndexOfValue(res.data.conversations, 'admin', key.user);
                            var conversation = res.data.conversations[conversation_pos];
                            // Store the original characters of the card.
                            key.original_content = key.content;
                            // Get the user name for the user id
                            key.user_name = conversation.conversation_name;
                            key.avatar = conversation.conversation_avatar;
                            key.following = true;
                            // Load any images offScreen
                            $scope.removed_cards_bottom.push(key);
                        });
                    } else {
                        $rootScope.loading_cards_offscreen = false;
                    }
                }).catch(function(error) {
                    //console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards_offscreen = false;
                deferred.resolve();
            });
        }
        return deferred.promise;
    };

    getFollowingBefore = function(dir, last_cardy, amount) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var followed = UserData.getUser().following;
            var operand;
            var sort_card;
            var load_amount = amount;
            var last_card;
            if (last_cardy == undefined) {
                if ($scope.cards.length > 0) {
                    // Only get newer than temp but check removed cards
                    var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                    sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                    last_card = sort_card[0]._id;
                } else {
                    last_card = '0';
                }
            } else {
                last_card = last_cardy.updatedAt;
            }
            var val = { ids: followed, amount: load_amount, last_card: last_card, direction: dir };
            var prom1 = Conversations.getFeed(val)
                .then(function(res) {
                    if (res.data.cards.length > 0) {
                        res.data.cards.map(function(key, array) {
                            var pos = General.findWithAttr($scope.cards, '_id', key._id);
                            // Dont allow Dupes. (Updated Card).
                            if (pos < 0) {
                                key = parseCard(key);
                                // Get the conversation for this card
                                var conversation_pos = General.nestedArrayIndexOfValue(res.data.conversations, 'admin', key.user);
                                var conversation = res.data.conversations[conversation_pos];
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                // Get the user name for the user id
                                key.user_name = conversation.conversation_name;
                                key.avatar = conversation.conversation_avatar;
                                key.following = true;
                                // Load any images offScreen
                                $scope.removed_cards_top.push(key);
                            }
                        });
                    } else {
                        $rootScope.loading_cards_offscreen = false;
                    }
                }).catch(function(error) {
                    //console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards_offscreen = false;
                deferred.resolve();
            });
        }
        return deferred.promise;
    };

    getCards = function(id) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var last_card;
            var operand;
            var load_amount;
            var sort_card;
            load_amount = NUM_TO_LOAD;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0]._id;
                operand = '$lt'
            } else {
                last_card = '0';
            }
            var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getConversationCards(val)
                    .then(function(res) {
                        if (res.data.length > 0) {
                            var users = UserData.getContacts();
                            var user;
                            for (var i = 0, len = res.data.length; i < len; i++) {
                                var key = res.data[i];
                                var user_pos = General.findWithAttr(users, '_id', key.user);
                                // Get the user for this card
                                if (user_pos < 0) {
                                    //Users.search_id(key.user)
                                    //   .then(function(res) {
                                    //    });
                                } else {
                                    user = users[user_pos];
                                    // Store the original characters of the card.
                                    key.original_content = key.content;
                                    // Get the user name for the user id
                                    key.user_name = user.user_name;
                                    key.avatar = user.avatar;
                                    $scope.cards_temp.push(key);
                                }
                            }
                        } else {
                            $rootScope.pageLoading = false;
                            $rootScope.loading_cards_offscreen = false;
                        }
                    })
                    .catch(function(error) {
                        //console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        }
        return deferred.promise;
    };

    getPublicCards = function(id) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var last_card;
            var operand;
            var load_amount;
            var sort_card;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0]._id;
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = '0';
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getPublicConversationCards(val)
                    .then(function(res) {
                        if (res.data.length > 0) {
                            var users = UserData.getContacts();
                            var user;
                            for (var i = 0, len = res.data.length; i < len; i++) {
                                var key = res.data[i];
                                var user_pos = General.findWithAttr(users, '_id', key.user);
                                // Get the user for this card
                                if (user_pos < 0) {
                                    //Users.search_id(key.user)
                                    //   .then(function(res) {
                                    //    });
                                } else {
                                    user = users[user_pos];
                                    // Store the original characters of the card.
                                    key.original_content = key.content;
                                    // Get the user name for the user id
                                    key.user_name = user.user_name;
                                    key.avatar = user.avatar;
                                    $scope.cards_temp.push(key);
                                }
                            }
                        } else {
                            $rootScope.loading_cards_offscreen = false;
                        }
                    })
                    .catch(function(error) {
                        //console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        }
        return deferred.promise;
    };

    getPublicCardsUpdate = function(id) {
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[sort_card.length - 1]._id;
                operand = '$gt';
            } else {
                last_card = '0';
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            promises.push(Conversations.getPublicConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
                        promises.push(res.data.map(function(key, array) {
                            // Get the user for this card
                            var users = UserData.getContacts();
                            var user;
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            if (user_pos < 0) {
                                var prom3 = Users.search_public_id(key.user)
                                    .then(function(res) {
                                        if (res.data) {
                                            user = res.data.success;
                                        } else {
                                            user = res;
                                        }
                                        // Get the user name for the user id
                                        key.user_name = user.user_name;
                                        key.avatar = user.avatar;
                                        // Store the original characters of the card.
                                        key.original_content = key.content;
                                        cards_new.push(key);
                                    });
                                promises.push(prom3);
                            } else {
                                user = users[user_pos];
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                cards_new.push(key);
                            }
                        }));
                    } else {
                        deferred.resolve();
                    }
                    // All the cards have been mapped.
                    $q.all(promises).then(function() {
                        var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                        last_card = sort_card[sort_card.length - 1];
                        $rootScope.loading_cards = false;
                        deferred.resolve(cards_new);
                    });
                }));
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    loadFeed = function() {
        // Set the users profile
        var profile = {};
        profile.user_name = UserData.getUser().user_name;
        profile.avatar = UserData.getUser().avatar;
        Profile.setProfile(profile);
        $rootScope.$broadcast('PROFILE_SET');
        $scope.isMember = true;
        // Load the users public conversation
        // LDB
        Conversations.find_user_public_conversation_by_id(UserData.getUser()._id).then(function(result) {
            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
            if (result._id != undefined) {
                // TODO STORE THE CONVERSATION
                Conversations.setConversationId(result._id);
                getFollowing('$lt');
            }
        });
    };

    setConversationProfile = function(id) {
        var profile = {};
        // LDB
        Conversations.find_conversation_id(id).then(function(res) {
            if (res.conversation_type == 'public') {
                // $scope.conv_type used for Header
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
                var user = UserData.getContact(res.participants[participant_pos]._id);
                var avatar = "default";
                // set the other user name as the name of the conversation.
                if (user != undefined) {
                    profile.user_name = user.user_name;
                    avatar = user.avatar;
                }
                profile.avatar = avatar;
                Profile.setConvProfile(profile);
                $rootScope.$broadcast('PROFILE_SET');
            }
        });
    };

    loadConversation = function() {
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() != 'public') {
            // Clear conversation viewed
            updateConversationViewed(id);
        }
        // Set the conversation profile
        setConversationProfile(id);
        getCards(id);
        // Force cache for directly loaded conversatiom
        $http.get("/chat/conversation/" + id).then(function(result) {
            //console.log(result);
        });

    };

    loadPublicConversation = function() {
        var id = Conversations.getConversationId();
        // Set the conversation profile
        setConversationProfile(id);
        if (!$scope.isMember || !principal.isValid()) {
            $scope.no_footer = true;
        }
        getPublicCards(id).then(function(result) {
            $rootScope.pageLoading = false;
        });
    };

    $scope.changePathGroup = function() {
        $location.path("/api/group_info/" + Conversations.getConversationId());
    };

    // DELETE ==================================================================
    $scope.deleteCard = function(event, card_id, conversation_id) {
        if (event) {
            event.stopPropagation();
        }
        Database.deleteCard(card_id, conversation_id, $scope.currentUser);
    };

    // Disable checkboxes if the contenteditable is set to false.
    var checkboxesEnabled = function(id, bool) {
        var deferred = $q.defer();
        var el = $('.' + PARENTCONTAINER + ' #ce' + id)[0];
        var pos = General.findWithAttr($scope.cards, '_id', id);
        if (bool == false) {
            $(el).find('input[type=checkbox]').attr('disabled', 'disabled');
            deferred.resolve();
        } else {
            $(el).find('input[type=checkbox]').removeAttr('disabled');
            deferred.resolve();
        }
        return deferred.promise;
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

    // clear the participants unviewed array by conversation id
    updateConversationViewed = function(id) {
        UserData.updateConversationViewed(id);
    };

    setUp = function(res) {
        var deferred = $q.defer();
        if (Conversations.getConversationType() == 'feed') {
            $scope.feed = true;
            $scope.top_down = true;
            $rootScope.top_down = true;
            $scope.isMember = true;
            scroll_direction = "top";
            deferred.resolve();
        } else if (Conversations.getConversationType() == 'public') {
            $scope.top_down = true;
            $rootScope.top_down = true;
            $scope.isMember = checkPermit(res);
            scroll_direction = "top";
            deferred.resolve();
        } else if (Conversations.getConversationType() == 'private') {
            $scope.isMember = checkPermit(res);
            scroll_direction = "bottom";
            $scope.top_down = false;
            $rootScope.top_down = false;
            deferred.resolve();
        }
        return deferred.promise;
    }

    // START - find the conversation id
    getConversationId()
        .then(function(res) {
            // Load the public feed, public conversation or private conversation.
            if (principal.isValid()) {
                // Logged in
                UserData.checkUser().then(function(result) {
                    setUp(res).then(function() {
                        $scope.currentUser = UserData.getUser();
                        if (Conversations.getConversationType() == 'feed') {
                            // Display the users feed.
                            loadFeed();
                        } else if (Conversations.getConversationType() == 'public') {
                            loadPublicConversation();
                        } else if (Conversations.getConversationType() == 'private') {
                            // Logged in.Load the conversation for the first time.
                            loadConversation();
                        }
                    });
                });
            } else {
                $rootScope.dataLoading = false;
                // Not logged in
                if (Conversations.getConversationType() == 'public') {
                    // Public route (Does not need to be logged in).
                    setUp(res).then(function() {
                        loadPublicConversation();
                    })
                } else {
                    $location.path("/api/login/");
                }
            }
        });

    var cardAnimEnd = function() {
        var id = (this.id).substr(5, (this.id).length);
        // remove the animation end listener which called this function.
        $(this).off('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);
        $(this).css('margin-top', '');
        $(this).removeClass('animate-transform');
        $('.content_cnv').css('--v', '');
        $(".content_cnv").css('overflow-y', '');
        $(".content_cnv").css('overflow-x', '');
        $(".content_cnv").css('overflow', '');
        $(this).removeClass('animate_down');
        $(this).removeClass('will_transform');
        $scope.$apply(function($scope) {
            // Delete the new card value.
            var pos = General.findWithAttr($scope.cards, '_id', id);
            if (pos >= 0) {
                createObserver($scope.cards[pos]._id);
            }
        });
        bindScroll();
        Scroll.enable('.content_cnv');
        addNewCards();
    };

}]);