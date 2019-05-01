//
// ImageAdjustment Service
//

cardApp.service('ImageAdjustment', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, General, UserData, principal) {

    var self = this;
    var image_id;
    var source;
    var target;
    var image_parent;
    var image_adjusted;
    var image_edit_finished = false;

    this.setImageAdjustment = function(parent_container, id, name, value) {
        var ia = this.getImageAdjustments(parent_container, id);
        if (ia == undefined) {
            ia = {};
        }
        ia[name] = value;
        // Custom attribute for storing image adjustments.
        $('.' + parent_container + ' #image_' + id).attr('adjustment-data', JSON.stringify(ia));
    };

    this.getImageAdjustments = function(parent_container, id) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        var ia = $('.' + parent_container + ' #image_' + id).attr('adjustment-data');
        if (ia != undefined) {
            adjustment_data = JSON.parse(ia);
        }
        return adjustment_data;
    };

    this.setImageParent = function(id) {
        image_parent = id;
    };

    this.getImageParent = function() {
        return image_parent;
    };

    this.setImageId = function(id) {
        image_id = id;
    };

    this.getImageId = function() {
        return image_id;
    };

    this.setSource = function(canvas) {
        source = canvas;
    };

    this.getSource = function() {
        return source;
    };

    this.setTarget = function(canvas) {
        target = canvas;
    };

    this.getTarget = function() {
        return target;
    };

    this.setImageEditing = function(bool) {
        image_edit_finished = bool;
    };

    this.getImageEditing = function(bool) {
        return image_edit_finished;
    };

    this.getImageAdjusted = function() {
        return image_adjusted;
    };

    this.setImageAdjusted = function(boo) {
        image_adjusted = boo;
    };

    // Helper functions

    var getFilter = function(filter) {
        var result = [];
        var index = General.findWithAttr(FILTERS, 'filter_css_name', filter);
        if (index >= 0) {
            result = FILTERS[index];
        } else {
            result = -1;
        }
        return result;
    };

    var applyBlending = function(bottomImage, topImage, id, type, w, h) {
        var deferred = $q.defer();
        // create the canvas
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        // Multiply
        if (type == 'multiply') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Overlay
        if (type == 'overlay') {
            ctx.globalCompositeOperation = 'overlay';
            ctx.drawImage(topImage, 0, 0, w, h);
            ctx.drawImage(bottomImage, 0, 0, w, h);
        }
        // Lighten
        if (type == 'lighten') {
            ctx.globalCompositeOperation = 'lighten';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Darken
        if (type == 'darken') {
            ctx.globalCompositeOperation = 'darken';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Screen
        if (type == 'screen') {
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Screen
        if (type == 'soft-light') {
            ctx.globalCompositeOperation = 'soft-light';
            ctx.drawImage(topImage, 0, 0, w, h);
            ctx.drawImage(bottomImage, 0, 0, w, h);
        }
        deferred.resolve(canvas);
        return deferred.promise;
    };

    // Image processing.

    this.getPixels = function(img) {
        var c = this.getCanvas(img.width, img.height);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return ctx.getImageData(0, 0, c.width, c.height);
    };

    this.getCanvas = function(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    };

    this.filterImage = function(filter, image, var_args) {
        var args = [this.getPixels(image)];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return filter.apply(null, args);
    };

    this.grayscale = function(pixels, args) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    };

    this.tmpCanvas = document.createElement('canvas');
    this.tmpCtx = this.tmpCanvas.getContext('2d');

    this.createImageData = function(w, h) {
        return this.tmpCtx.createImageData(w, h);
    };

    this.convolute = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);
        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;
        // pad output by the convolution matrix
        var w = sw;
        var h = sh;
        var output = self.createImageData(w, h);
        var dst = output.data;
        // go through the destination image pixels
        var alphaFac = opaque ? 1 : 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                // calculate the weighed sum of the source image pixels that
                // fall under the convolution matrix
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy * sw + scx) * 4;
                            var wt = weights[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                            a += src[srcOff + 3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    };

    if (!window.Float32Array)
        Float32Array = Array;

    this.convoluteFloat32 = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);

        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;

        var w = sw;
        var h = sh;
        var output = {
            width: w,
            height: h,
            data: new Float32Array(w * h * 4)
        };
        var dst = output.data;

        var alphaFac = opaque ? 1 : 0;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                        var scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                        var srcOff = (scy * sw + scx) * 4;
                        var wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    };

    // General

    this.cloneCanvas = function(oldCanvas) {
        //create a new canvas
        var newCanvas = document.createElement('canvas');
        var context = newCanvas.getContext('2d');
        //set dimensions
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        //apply the old canvas to the new one
        context.drawImage(oldCanvas, 0, 0);
        //return the new canvas
        return newCanvas;
    };

    this.getScale = function(original_image, crop_image) {
        var nat_w = original_image.naturalWidth;
        var cur_w = $(crop_image).outerWidth();
        var scale = nat_w / cur_w;
        return scale;
    };

    // Apply all image adjustments passed in the filters object.

    this.applyFilters = function(source, filters) {
        var deferred = $q.defer();
        if (filters == undefined) {
            filters = { sharpen: undefined, filter: undefined, rotate: undefined, crop: undefined };
        }
        // Sharpen from source first, Crop last. Pass each adjustment to the next filter.
        self.filter(source, filters.filter)
            .then(function(result) {
                return self.sharpen(result, filters.sharpen);
            }).then(function(result) {
                return self.rotate(result, filters.rotate);
            }).then(function(result) {
                return self.crop(result, filters.crop);
            }).then(function(result) {
                deferred.resolve(result);
            });
        return deferred.promise;
    };

    var p_s;
    var p_x;
    var p_s_hi;
    var p_x_hi;

    var image_lo_w;
    var image_lo_h;
    var image_hi_w;
    var image_hi_h;


    this.perspective_setup = function(w, h, hi_w, hi_h) {
        console.log(w + ' : ' + h + ' : ' + hi_w + ' : ' + hi_h);
        image_lo_w = w;
        image_lo_h = h;
        image_hi_w = hi_w;
        image_hi_h = hi_h;

        p_s = [
            [0, 0],
            [Number(w), 0],
            [Number(w), Number(h)],
            [0, Number(h)]
        ];
        p_x = [
            [0, 0],
            [Number(w), 0],
            [Number(w), Number(h)],
            [0, Number(h)]
        ];


        p_s_hi = [
            [0, 0],
            [Number(hi_w), 0],
            [Number(hi_w), Number(hi_h)],
            [0, Number(hi_h)]
        ];
        p_x_hi = [
            [0, 0],
            [Number(hi_w), 0],
            [Number(hi_w), Number(hi_h)],
            [0, Number(hi_h)]
        ];
    };

    this.perspectiveVChange = function(p, ctx, image, a, quality, wl, hl, wh, hh) {
        //console.log();
        //if(quality == 'high'){
            var scale = image_lo_w / image_hi_w;
            console.log(scale);
            amount_h = Math.round(((wh * 100) / 100) / 1000 * a);
        //} else {
            //amount_l = Math.round(((wl * 100) / 100) / 1000 * a);
            amount_l = amount_h * scale;
        //}
        
        console.log(image_hi_w + ' : ' + image_lo_w + ' : ' + amount_h + ' : ' + amount_l);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // TL x, TL y
        // TR x, TR y
        // BR x, BR y
        // BL x, BL y
        if (quality == 'high') {
            if (amount_h > 0) {

                p_x_hi = [
                    [p_x_hi[0][0], p_x_hi[0][1]],
                    [p_x_hi[1][0], p_s_hi[1][1] + amount_h * -1],
                    [p_x_hi[2][0], p_s_hi[2][1] + amount_h],
                    [p_x_hi[3][0], p_x_hi[3][1]]
                ];

               p_x = [
                    [p_x[0][0], p_x[0][1]],
                    [p_x[1][0], p_s[1][1] + amount_l * -1],
                    [p_x[2][0], p_s[2][1] + amount_l],
                    [p_x[3][0], p_x[3][1]]
                ];

                p.draw(p_x_hi, amount_h, quality, wh, hh);

            } else {

                p_x_hi = [
                    [p_x_hi[0][0], p_s_hi[0][1] + amount_h],
                    [p_x_hi[1][0], p_x_hi[1][1]],
                    [p_x_hi[2][0], p_x_hi[2][1]],
                    [p_x_hi[3][0], p_s_hi[3][1] + amount_h * -1]
                ];

                   p_x = [
                    [p_x[0][0], p_s[0][1] + amount_l],
                    [p_x[1][0], p_x[1][1]],
                    [p_x[2][0], p_x[2][1]],
                    [p_x[3][0], p_s[3][1] + amount_l * -1]
                ];

                p.draw(p_x_hi, amount_h, quality, wh, hh);

            }
        } else {
            if (amount_l > 0) {

                p_x = [
                    [p_x[0][0], p_x[0][1]],
                    [p_x[1][0], p_s[1][1] + amount_l * -1],
                    [p_x[2][0], p_s[2][1] + amount_l],
                    [p_x[3][0], p_x[3][1]]
                ];

                  p_x_hi = [
                    [p_x_hi[0][0], p_x_hi[0][1]],
                    [p_x_hi[1][0], p_s_hi[1][1] + amount_h * -1],
                    [p_x_hi[2][0], p_s_hi[2][1] + amount_h],
                    [p_x_hi[3][0], p_x_hi[3][1]]
                ];

                p.draw(p_x, amount_l, quality, wl, hl);

            } else {

                p_x = [
                    [p_x[0][0], p_s[0][1] + amount_l],
                    [p_x[1][0], p_x[1][1]],
                    [p_x[2][0], p_x[2][1]],
                    [p_x[3][0], p_s[3][1] + amount_l * -1]
                ];

                   p_x_hi = [
                    [p_x_hi[0][0], p_s_hi[0][1] + amount_h],
                    [p_x_hi[1][0], p_x_hi[1][1]],
                    [p_x_hi[2][0], p_x_hi[2][1]],
                    [p_x_hi[3][0], p_s_hi[3][1] + amount_h * -1]
                ];

                p.draw(p_x, amount_l, quality, wl, hl);

            }
        }

    };

    this.perspectiveHChange = function(p, ctx, image, amount, quality) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // TL x, TL y
        // TR x, TR y
        // BR x, BR y
        // BL x, BL y
        if (amount >= 0) {

            p_x = [
                [p_s[0][0] + amount * -1, p_x[0][1]],
                [p_s[1][0] + amount, p_x[1][1]],
                [p_x[2][0], p_x[2][1]],
                [p_x[3][0], p_x[3][1]]
            ];

            p.draw(p_x, amount, quality);

        } else {

            p_x = [
                [p_x[0][0], p_x[0][1]],
                [p_x[1][0], p_x[1][1]],
                [p_s[2][0] + amount * -1, p_x[2][1]],
                [p_s[3][0] + amount, p_x[3][1]]
            ];

            p.draw(p_x, amount, quality);
        }

    };

    // Rotate

    // Make the rotation directly to the canvas for performance reasons.
    this.quickRotate = function(ctx, image, angle) {
        var adjusted_angle = angle / 100;

        var w = image.width;
        var h = image.height;
        var cw = w / 2; // half canvas width and height
        var ch = h / 2;
        var iw = image.width / 2; // half image width and height
        var ih = image.height / 2;
        // get the length C-B
        var dist = Math.sqrt(Math.pow(cw, 2) + Math.pow(ch, 2));
        // get the angle A
        var diagAngle = Math.asin(ch / dist);
        // Do the symmetry on the angle
        a1 = ((adjusted_angle % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
        if (a1 > Math.PI) {
            a1 -= Math.PI;
        }
        if (a1 > Math.PI / 2 && a1 <= Math.PI) {
            a1 = (Math.PI / 2) - (a1 - (Math.PI / 2));
        }
        // get angles A1, A2
        var ang1 = Math.PI / 2 - diagAngle - Math.abs(a1);
        var ang2 = Math.abs(diagAngle - Math.abs(a1));
        // get lenghts C-E and C-F
        var dist1 = Math.cos(ang1) * dist;
        var dist2 = Math.cos(ang2) * dist;
        // get the max scale
        var scale = Math.max(dist2 / (iw), dist1 / (ih));
        // create the transform
        var dx = Math.cos(adjusted_angle) * scale;
        var dy = Math.sin(adjusted_angle) * scale;

        ctx.setTransform(dx, dy, -dy, dx, cw, ch);
        ctx.drawImage(image, -iw, -ih);

        /*
        // draw outline of image half size
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2 * (1 / scale);
        ctx.strokeRect(-iw / 2, -ih / 2, iw, ih);

        // reset the transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // draw outline of canvas half size
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(cw - cw / 2, ch - ch / 2, cw, ch);
        */
    };

    // Return the rotated canvas.
    this.rotate = function(source, angle) {
        var deferred = $q.defer();
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        if (angle != undefined) {
            angle = angle / 100;
            var w = source.width;
            var h = source.height;
            var cw = w / 2; // half canvas width and height
            var ch = h / 2;
            var iw = source.width / 2; // half image width and height
            var ih = source.height / 2;
            // get the length C-B
            var dist = Math.sqrt(Math.pow(cw, 2) + Math.pow(ch, 2));
            // get the angle A
            var diagAngle = Math.asin(ch / dist);
            // Do the symmetry on the angle
            a1 = ((angle % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
            if (a1 > Math.PI) {
                a1 -= Math.PI;
            }
            if (a1 > Math.PI / 2 && a1 <= Math.PI) {
                a1 = (Math.PI / 2) - (a1 - (Math.PI / 2));
            }
            // get angles A1, A2
            var ang1 = Math.PI / 2 - diagAngle - Math.abs(a1);
            var ang2 = Math.abs(diagAngle - Math.abs(a1));
            // get lenghts C-E and C-F
            var dist1 = Math.cos(ang1) * dist;
            var dist2 = Math.cos(ang2) * dist;
            // get the max scale
            var scale = Math.max(dist2 / (iw), dist1 / (ih));
            // create the transform
            var dx = Math.cos(angle) * scale;
            var dy = Math.sin(angle) * scale;
            ctx.setTransform(dx, dy, -dy, dx, cw, ch);
            ctx.drawImage(source, -iw, -ih);
            // reset the transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            deferred.resolve(new_canvas);
        } else {
            deferred.resolve(new_canvas);
        }
        return deferred.promise;
    };

    // Sharpen

    // Return the sharpened canvas.
    this.sharpen = function(source, amount) {
        var deferred = $q.defer();
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        if (amount != undefined) {
            var sharpen = amount;
            var adjacent = (1 - sharpen) / 4;
            var matrix = [0, adjacent, 0, adjacent, sharpen, adjacent, 0, adjacent, 0];
            var res = self.filterImage(self.convolute, source, matrix);
            ctx.putImageData(res, 0, 0);
            deferred.resolve(new_canvas);
        } else {
            deferred.resolve(new_canvas);
        }
        return deferred.promise;
    };

    // Apply directly to the target canvas. Changed sharpen amount.
    this.setSharpenUpdate = function(source, target, filters) {
        var deferred = $q.defer();
        this.applyFilters(source, filters).then(function(result) {
            target.width = result.width;
            target.height = result.height;
            var ctx = target.getContext('2d');
            ctx.drawImage(result, 0, 0);
            $(target).addClass('adjusted');
            deferred.resolve(result);
        });
        this.setImageAdjusted(true);
        return deferred.promise;
    };

    // Filter

    // Return the filtered canvas.
    this.filter = function(source, filter) {
        var deferred = $q.defer();
        var promises = [];
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        // reset filter
        ctx.filter = "none";
        ctx.drawImage(source, 0, 0);
        if (filter != undefined) {
            prom1 = self.filterLayers(new_canvas, filter).then(function(canvas) {
                var filter_data = getFilter(filter);
                if (filter_data.filter != undefined) {
                    ctx.filter = filter_data.filter;
                }
                ctx.drawImage(canvas, 0, 0);
            });
            promises.push(prom1);
        } else {
            deferred.resolve(new_canvas);
        }
        $q.all(promises).then(function() {
            deferred.resolve(new_canvas);
        });
        return deferred.promise;
    };

    // Create any layers required by a filter.
    this.filterLayers = function(canvas, filter) {
        var deferred = $q.defer();
        var w = canvas.width;
        var h = canvas.height;
        var targetCtx = canvas.getContext('2d');
        var filter_data = getFilter(filter);
        // Convert image to canvas
        var topImage = canvas;
        var topCanvas = document.createElement("canvas");
        topCanvas.width = w;
        topCanvas.height = h;
        var topCtx = topCanvas.getContext('2d');
        topCtx.drawImage(topImage, 0, 0);
        // If there is a blend to be applied.
        if (filter_data.blend != 'none') {
            var grd;
            var canvas_gradient = document.createElement('canvas');
            canvas_gradient.width = w;
            canvas_gradient.height = h;
            var ctx_gradient = canvas_gradient.getContext('2d');
            // Gradients
            if (filter_data.gradient == 'radial') {
                // radial gradient, gradient_percent
                if (filter_data.gradient_percent != undefined) {
                    var penultimate_percent = filter_data.gradient_percent[filter_data.gradient_percent.length - 2];
                    var final_radius = w * (penultimate_percent / 100);
                    grd = ctx_gradient.createRadialGradient((w / 2), (h / 2), 0, (w / 2), (h / 2), final_radius);
                } else {
                    grd = ctx_gradient.createRadialGradient((w / 2), (h / 2), (w / 100), (w / 2), (h / 2), w);
                }
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, w, h);
            }
            if (filter_data.gradient == 'solid') {
                // Fill with colour
                ctx_gradient.fillStyle = "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")";
                ctx_gradient.fillRect(0, 0, w, h);
            }
            if (filter_data.gradient == 'linear') {
                // radial gradient
                grd = ctx_gradient.createLinearGradient(0, 0, 0, w);
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, w, h);
            }
            bottomImage = canvas_gradient;
            var bottomCanvas = document.createElement("canvas");
            bottomCanvas.width = w;
            bottomCanvas.height = h;
            // get the 2d context to draw
            var bottomCtx = bottomCanvas.getContext('2d');
            bottomCtx.drawImage(bottomImage, 0, 0, w, h);
            var id = 'steve';
            applyBlending(bottomImage, topImage, id, filter_data.blend, w, h).then(function(result) {
                targetCtx.drawImage(result, 0, 0, w, h);
                deferred.resolve(result);
            });
        } else {
            targetCtx.drawImage(topCanvas, 0, 0, w, h);
            deferred.resolve(topCanvas);
        }
        return deferred.promise;
    };

    // Crop

    // Return the cropped canvas.
    this.crop = function(source, crop) {
        var deferred = $q.defer();
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        if (crop != undefined) {
            var sx = crop.x;
            var sy = crop.y;
            var swidth = crop.width;
            var sheight = crop.height;
            new_canvas.width = swidth;
            new_canvas.height = sheight;
            ctx.drawImage(source, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
            deferred.resolve(new_canvas);
        } else {
            deferred.resolve(new_canvas);
        }
        return deferred.promise;
    };

}]);