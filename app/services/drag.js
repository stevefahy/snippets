//
// Drag Service
//

cardApp.service('Drag', ['$window', '$rootScope', function($window, $rootScope) {
    var ua = navigator.userAgent;
    var mobile = false;
    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }
    var self = this;
    var elmnt = null;
    var boundary = null;

    var bound_w;
    var bound_h;

    var drag_w;
    var drag_h;

    this.setUp = function(elmnt, boundary, crop_area) {
        self.elmnt = elmnt;
        self.boundary = boundary;
        self.crop_area = crop_area;
        var pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;
        elmnt.onmousedown = dragMouseDown;
        elmnt.addEventListener("touchstart", dragMouseDown, { passive: true });
    };

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.cancelable) {
            e.preventDefault();
        }
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;

        drag_w = $(self.elmnt).outerWidth();
        drag_h = $(self.elmnt).outerHeight();

        bound_w = $(self.boundary).outerWidth();
        bound_h = $(self.boundary).outerHeight();

        if (!mobile) {
            document.onmouseup = self.closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }
        if (mobile) {
            self.elmnt.addEventListener("touchend", self.closeDragElement, true);
            self.elmnt.addEventListener("touchmove", elementDrag, false);
        }

    }

    function elementDrag(e) {
        e = e || window.event;
        if (e.cancelable) {
            e.preventDefault();
        }
        // calculate the new cursor position:
        if (!mobile) {
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
        }
        if (mobile) {
            pos1 = pos3 - e.touches[0].clientX;
            pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
        }
        var new_top = self.elmnt.offsetTop - pos2;
        var new_left = self.elmnt.offsetLeft - pos1;
        var current_right = drag_w + new_left;
        var current_bottom = drag_h + new_top;
        if (new_top < 0) {
            new_top = 0;
        }
        if (new_left < 0) {
            new_left = 0;
        }
        if (current_right > bound_w) {
            new_left = bound_w - drag_w;
        }
        if (current_bottom > bound_h) {
            new_top = bound_h - drag_h;
        }
        var per_bottom = bound_h - (new_top + drag_h);
        var per_right = bound_w - (new_left + drag_w);
        if (per_bottom < 0) {
            per_bottom = 0;
        }
        if (per_right < 0) {
            per_right = 0;
        }
        if (new_top == 0) {
            $(self.elmnt).addClass('crop_top_max');
        } else {
            $(self.elmnt).removeClass('crop_top_max');
        }
        if (new_left == 0) {
            $(self.elmnt).addClass('crop_left_max');
        } else {
            $(self.elmnt).removeClass('crop_left_max');
        }
        if (per_bottom == 0) {
            $(self.elmnt).addClass('crop_bottom_max');
        } else {
            $(self.elmnt).removeClass('crop_bottom_max');
        }
        if (per_right == 0) {
            $(self.elmnt).addClass('crop_right_max');
        } else {
            $(self.elmnt).removeClass('crop_right_max');
        }
        self.elmnt.style.top = new_top + "px";
        self.elmnt.style.left = new_left + "px";
        $(self.crop_area)[0].style.clipPath = "inset(" + new_top + "px " + per_right + "px " + per_bottom + "px " + new_left + "px)";
    }

    this.stopDragElement = function() {
        if (!mobile) {
            self.elmnt.onmousedown = null;
        } else {
            self.elmnt.removeEventListener("touchstart", dragMouseDown, false);
        }
        self.closeDragElement();
    };

    this.resume = function() {
        if (!mobile) {
            self.elmnt.onmousedown = dragMouseDown;
        } else {
            self.elmnt.addEventListener("touchstart", dragMouseDown, false);
        }
    };

    this.closeDragElement = function() {
        /* stop moving when mouse button is released:*/
        if (!mobile) {
            document.onmouseup = null;
            document.onmousemove = null;
        }
        if (mobile) {
            self.elmnt.removeEventListener("touchend", self.closeDragElement, true);
            self.elmnt.removeEventListener("touchmove", elementDrag, false);
        }
        $(self.elmnt).removeClass('active');
    };

}]);