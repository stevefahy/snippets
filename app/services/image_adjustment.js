//
// ImageAdjustment Service
//

cardApp.service('ImageAdjustment', ['$window', '$rootScope', '$timeout', '$q', 'General', function($window, $rootScope, $timeout, $q, General) {

    var self = this;
    var image_id;
    var source;
    var target;
    var image_parent;
    var image_adjusted;
    var image_edit_finished = false;
    var WINDOW_SCALE = 1.7;

    this.getImageOriginal = function(parent_container, id) {
        var original_data;
        // Custom attribute for storing image adjustments.
        var io = $('.' + parent_container + ' #cropper_' + id).attr('image-original');
        if (io != undefined) {
            original_data = JSON.parse(io);
        }
        return original_data;
    };

    this.setImageAdjustment = function(parent_container, id, name, value) {
        var ia = this.getImageAdjustments(parent_container, id);
        if (ia == undefined) {
            ia = {};
        }
        ia[name] = value;
        // Custom attribute for storing image adjustments.
        $('.' + parent_container + ' #image_' + id).attr('adjustment-data', JSON.stringify(ia));
    };

    // Set all image adjustments as one object.
    this.setImageAdjustments = function(parent_container, id, values) {
        if (values == undefined) {
            // If the image adjustment object is empty then remove the adjustment-data attribute.
            $('.' + parent_container + ' #image_' + id).removeAttr('adjustment-data');
        } else {
            // Custom attribute for storing image adjustments.
            $('.' + parent_container + ' #image_' + id).attr('adjustment-data', JSON.stringify(values));
        }
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

    this.getImageAdjustment = function(parent_container, id, adjustment) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        var ia = $('.' + parent_container + ' #image_' + id).attr('adjustment-data');
        var adjustment_value;
        if (ia != undefined) {
            adjustment_data = JSON.parse(ia);
            if (adjustment_data[adjustment]) {
                adjustment_value = adjustment_data[adjustment];
            }
        }
        return adjustment_value;
    };

    this.removeImageAdjustment = function(parent_container, id, adjustment) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        var ia = $('.' + parent_container + ' #image_' + id).attr('adjustment-data');
        var adjustment_value;
        if (ia != undefined) {
            adjustment_data = JSON.parse(ia);
            if (adjustment_data.hasOwnProperty(adjustment)) {
                delete adjustment_data[adjustment];
                $('.' + parent_container + ' #image_' + id).attr('adjustment-data', JSON.stringify(adjustment_data));
            }
        }
        return;
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

    var applyBlending = function(bottomImage, topImage, type, w, h) {
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
        for (var i = 2, len = arguments.length; i < len; i++) {
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
        var side_constant = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side_constant / 2);
        var src = pixels.data;
        var w = pixels.width;
        var h = pixels.height;
        // pad output by the convolution matrix
        var sw = w;
        var sh = h;
        var output = self.createImageData(w, h);
        var dst = output.data;
        // go through the destination image pixels
        var alphaFac = opaque ? 1 : 0;
        var height_amount = h;
        var y = 0;
        while (height_amount--) {
            var width_amount = w;
            var x = 0;
            while (width_amount--) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                // calculate the weighed sum of the source image pixels that
                // fall under the convolution matrix
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0, side = side_constant; cy < side; cy++) {
                    for (var cx = 0, side = side_constant; cx < side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy * sw + scx) * 4;
                            var wt = weights[cy * side_constant + cx];
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
                x++;
            }
            y++;
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
        var newCanvas = document.createElement('canvas');
        var context = newCanvas.getContext('2d');
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        //apply the old canvas to the new one
        context.drawImage(oldCanvas, 0, 0);
        return newCanvas;
    };

    this.getScale = function(original_image, crop_image) {
        var nat_w = original_image.naturalWidth;
        // check whether rotated
        var rotated = self.getImageAdjustment(self.getImageParent(), self.getImageId(), 'rotated');
        if (rotated == 90 || rotated == 270) {
            nat_w = original_image.naturalHeight;
        }
        var cur_w = $(crop_image).outerWidth();
        var scale = nat_w / cur_w;
        return scale;
    };

    this.getImageScale = function(original_image) {
        var nat_w = original_image.naturalWidth;
        // check whether rotated
        var rotated = self.getImageAdjustment(self.getImageParent(), self.getImageId(), 'rotated');
        if (rotated == 90 || rotated == 270) {
            nat_w = original_image.naturalHeight;
        }
        var current_w = $(original_image).width();
        var scale = nat_w / current_w;
        return scale;
    };

    this.resizeImage = function(image, w, h) {
        var deferred = $q.defer();
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, w, h);
        //return canvas;
        deferred.resolve(canvas);
        return deferred.promise;
    };

    // Apply all image adjustments passed in the filters object.
    this.applyFilters = function(source, filters) {
        var deferred = $q.defer();
        if (filters == undefined) {
            filters = { sharpen: undefined, filter: undefined, rotate: undefined, crop: undefined, perspective: undefined, flip_v: undefined, flip_h: undefined, rotated: undefined };
        }
        // Image Filter from source first, Crop last. Pass each adjustment to the next filter.
        self.filter(source, filters.filter)
            .then(function(result) {
                return self.rotated(result, filters.rotated);
            }).then(function(result) {
                return self.flipV(result, filters.flip_v);
            }).then(function(result) {
                return self.flipH(result, filters.flip_h);
            }).then(function(result) {
                return self.sharpen(result, filters.sharpen);
            }).then(function(result) {
                return self.perspective(result, filters.perspective);
            }).then(function(result) {
                return self.rotate(result, filters.rotate);
            }).then(function(result) {
                return self.crop(result, filters.crop);
            }).then(function(result) {
                deferred.resolve(result);
            });
        return deferred.promise;
    };

    // Perspective

    this.setPerspective = function(p) {
        this.p = p;
    };

    this.getPerspective = function() {
        return this.p;
    };

    var create_canvas_context = function(w, h) {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d', { alpha: false });
        return ctx;
    };

    this.perspective = function(source, amount) {
        var deferred = $q.defer();
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        if (amount != undefined) {
            self.perspectiveInit(source).then(function(p) {
                self.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                    self.perspectiveChange(p, amount.vertical, amount.horizontal, 'high').then(function() {
                        ctx.drawImage(p.ctxd, 0, 0);
                        deferred.resolve(new_canvas);
                    });
                });
            });
        } else {
            deferred.resolve(new_canvas);
        }
        return deferred.promise;
    };

    this.perspectiveDraw = function(p, points, quality) {
        var deferred = $q.defer();
        var ow;
        var oh;
        var ctxd = p.ctxd;
        var update = ctxd.getContext('2d');
        var d0x = points[0][0];
        var d0y = points[0][1];
        var d1x = points[1][0];
        var d1y = points[1][1];
        var d2x = points[2][0];
        var d2y = points[2][1];
        var d3x = points[3][0];
        var d3y = points[3][1];
        // compute the dimension of each side
        var dims = [
            Math.sqrt(Math.pow(d0x - d1x, 2) + Math.pow(d0y - d1y, 2)), // top side
            Math.sqrt(Math.pow(d1x - d2x, 2) + Math.pow(d1y - d2y, 2)), // right side
            Math.sqrt(Math.pow(d2x - d3x, 2) + Math.pow(d2y - d3y, 2)), // bottom side
            Math.sqrt(Math.pow(d3x - d0x, 2) + Math.pow(d3y - d0y, 2)) // left side
        ];
        if (quality == 'high') {
            ow = p.cvso_hi.width;
            oh = p.cvso_hi.height;
        } else {
            ow = p.cvso_lo.width;
            oh = p.cvso_lo.height;
        }
        // specify the index of which dimension is longest
        var base_index = 0;
        var max_scale_rate = 0;
        var zero_num = 0;
        for (var i = 0; i < 4; i++) {
            var rate = 0;
            if (i % 2) {
                rate = dims[i] / ow;
            } else {
                rate = dims[i] / oh;
            }
            if (rate > max_scale_rate) {
                base_index = i;
                max_scale_rate = rate;
            }
            if (dims[i] == 0) {
                zero_num++;
            }
        }
        if (zero_num > 1) { return; }
        var step = 2;
        var cover_step = step * 5;
        var cvso_hi = p.cvso_hi;
        var cvso_lo = p.cvso_lo;
        var ctxo;
        var ctxt;
        if (quality == 'high') {
            ctxo = p.ctxo_hi;
            ctxt = p.ctxt_hi;
        } else {
            ctxo = p.ctxo_lo;
            ctxt = p.ctxt_lo;
        }
        var ctxl;
        var cvsl;
        var r;
        var sx;
        var sy;
        var ex;
        var ey;
        var ag;
        var sc;
        if (base_index % 2 == 0) { // top or bottom side
            ctxl = create_canvas_context(ow, cover_step);
            ctxl.globalCompositeOperation = "copy";
            cvsl = ctxl.canvas;
            for (var y = 0; y < oh; y += step) {
                r = y / oh;
                sx = d0x + (d3x - d0x) * r;
                sy = d0y + (d3y - d0y) * r;
                ex = d1x + (d2x - d1x) * r;
                ey = d1y + (d2y - d1y) * r;
                ag = Math.atan((ey - sy) / (ex - sx));
                sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / ow;
                ctxl.setTransform(1, 0, 0, 1, 0, -y);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        } else if (base_index % 2 == 1) { // right or left side
            ctxl = create_canvas_context(cover_step, oh);
            ctxl.globalCompositeOperation = "copy";
            cvsl = ctxl.canvas;
            for (var x = 0; x < ow; x += step) {
                r = x / ow;
                sx = d0x + (d1x - d0x) * r;
                sy = d0y + (d1y - d0y) * r;
                ex = d3x + (d2x - d3x) * r;
                ey = d3y + (d2y - d3y) * r;
                ag = Math.atan((sx - ex) / (ey - sy));
                sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / oh;
                ctxl.setTransform(1, 0, 0, 1, -x, 0);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
        update.drawImage(ctxt.canvas, 0, 0, cvso_hi.width, cvso_hi.height);
        deferred.resolve(update);
        return deferred.promise;
    };

    this.quickPerspectiveDraw = function(p, points, quality) {
        // ctxd - p destination canvas 
        // image - source image
        // cvso - p canvas for the image
        // ctxo - p ctx of cvso
        // cvst - canvas for the transformed image
        // ctxt - p ctx of cvst
        var ow;
        var oh;
        var ctxo;
        var ctxt;
        var ctxd;
        var ctxl;
        var cvsl;
        var r;
        var sx;
        var sy;
        var ex;
        var ey;
        var ag;
        var sc;
        var d0x = points[0][0];
        var d0y = points[0][1];
        var d1x = points[1][0];
        var d1y = points[1][1];
        var d2x = points[2][0];
        var d2y = points[2][1];
        var d3x = points[3][0];
        var d3y = points[3][1];
        // compute the dimension of each side
        var dims = [
            Math.sqrt(Math.pow(d0x - d1x, 2) + Math.pow(d0y - d1y, 2)), // top side
            Math.sqrt(Math.pow(d1x - d2x, 2) + Math.pow(d1y - d2y, 2)), // right side
            Math.sqrt(Math.pow(d2x - d3x, 2) + Math.pow(d2y - d3y, 2)), // bottom side
            Math.sqrt(Math.pow(d3x - d0x, 2) + Math.pow(d3y - d0y, 2)) // left side
        ];
        if (quality == 'high') {
            ow = p.cvso_hi.width;
            oh = p.cvso_hi.height;
        } else {
            ow = p.cvso_lo.width;
            oh = p.cvso_lo.height;
        }
        // specify the index of which dimension is longest
        var base_index = 0;
        var max_scale_rate = 0;
        var zero_num = 0;
        for (var i = 0; i < 4; i++) {
            var rate = 0;
            if (i % 2) {
                rate = dims[i] / ow;
            } else {
                rate = dims[i] / oh;
            }
            if (rate > max_scale_rate) {
                base_index = i;
                max_scale_rate = rate;
            }
            if (dims[i] == 0) {
                zero_num++;
            }
        }
        if (zero_num > 1) { return; }
        var step = 2;
        var cover_step = step * 5;
        var cvso_hi = p.cvso_hi;
        var cvso_lo = p.cvso_lo;
        if (quality == 'high') {
            ctxo = p.ctxo_hi;
            ctxt = p.ctxt_hi;
        } else {
            ctxo = p.ctxo_lo;
            ctxt = p.ctxt_lo;
        }
        ctxd = p.ctxd;
        if (base_index % 2 == 0) { // top or bottom side
            ctxl = create_canvas_context(ow, cover_step);
            ctxl.globalCompositeOperation = "copy";
            cvsl = ctxl.canvas;
            for (var y = 0; y < oh; y += step) {
                r = y / oh;
                sx = d0x + (d3x - d0x) * r;
                sy = d0y + (d3y - d0y) * r;
                ex = d1x + (d2x - d1x) * r;
                ey = d1y + (d2y - d1y) * r;
                ag = Math.atan((ey - sy) / (ex - sx));
                sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / ow;
                ctxl.setTransform(1, 0, 0, 1, 0, -y);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        } else if (base_index % 2 == 1) { // right or left side
            ctxl = create_canvas_context(cover_step, oh);
            ctxl.globalCompositeOperation = "copy";
            cvsl = ctxl.canvas;
            for (var x = 0; x < ow; x += step) {
                r = x / ow;
                sx = d0x + (d1x - d0x) * r;
                sy = d0y + (d1y - d0y) * r;
                ex = d3x + (d2x - d3x) * r;
                ey = d3y + (d2y - d3y) * r;
                ag = Math.atan((sx - ex) / (ey - sy));
                sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / oh;
                ctxl.setTransform(1, 0, 0, 1, -x, 0);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
        p.ctxd1.drawImage(ctxt.canvas, -cvso_hi.width / 2, -cvso_hi.height / 2, cvso_hi.width, cvso_hi.height);
        p.ctxd2.drawImage(ctxt.canvas, -cvso_hi.width / 2, -cvso_hi.height / 2, cvso_hi.width, cvso_hi.height);
        return;
    };

    this.perspectiveInit = function(source_image_hi) {
        var deferred = $q.defer();
        var promises = [];
        var window_w = Math.round(window.innerWidth / WINDOW_SCALE);
        var image_w = source_image_hi.width;
        var image_h = source_image_hi.height;
        var scale = window_w / image_w;
        var scaled_height = Math.round(image_h * scale);
        var prom = self.resizeImage(source_image_hi, window_w, scaled_height).then(function(source_image_lo) {
            var ctxd = source_image_hi;
            // prepare a <canvas> for the image
            var cvso_hi = document.createElement('canvas');
            var cvso_lo = document.createElement('canvas');
            cvso_hi.width = parseInt(source_image_hi.width);
            cvso_hi.height = parseInt(source_image_hi.height);
            cvso_lo.width = parseInt(source_image_lo.width);
            cvso_lo.height = parseInt(source_image_lo.height);
            var ctxo_hi = cvso_hi.getContext('2d');
            ctxo_hi.drawImage(source_image_hi, 0, 0, cvso_hi.width, cvso_hi.height);
            var ctxo_lo = cvso_lo.getContext('2d', { alpha: false });
            ctxo_lo.drawImage(source_image_lo, 0, 0, cvso_lo.width, cvso_lo.height);
            // prepare a <canvas> for the transformed image
            var cvst_hi = document.createElement('canvas');
            cvst_hi.width = cvso_hi.width;
            cvst_hi.height = cvso_hi.height;
            var ctxt_hi = cvst_hi.getContext('2d');
            var cvst_lo = document.createElement('canvas');
            cvst_lo.width = cvso_lo.width;
            cvst_lo.height = cvso_lo.height;
            var ctxt_lo = cvst_lo.getContext('2d', { alpha: false });
            var hi_lo_v_scale = cvso_lo.width / cvso_hi.width;
            var hi_lo_h_scale = cvso_lo.height / cvso_hi.height;
            var hi_v_change = (((cvso_hi.height * 100) / 100) / PERSPECTIVE_RATIO).toFixed(2);
            var hi_h_change = (((cvso_hi.width * 100) / 100) / PERSPECTIVE_RATIO).toFixed(2);
            this.p = {
                ctxd: ctxd,
                cvso_hi: cvso_hi,
                cvso_lo: cvso_lo,
                ctxo_hi: ctxo_hi,
                ctxo_lo: ctxo_lo,
                ctxt_hi: ctxt_hi,
                ctxt_lo: ctxt_lo,
                hi_lo_h_scale: hi_lo_h_scale,
                hi_lo_v_scale: hi_lo_v_scale,
                hi_h_change: hi_h_change,
                hi_v_change: hi_v_change,
            };
        });
        promises.push(prom);
        $q.all(promises).then(function() {
            deferred.resolve(this.p);
        });
        return deferred.promise;
    };

    this.perspective_setup = function(lo_w, lo_h, hi_w, hi_h) {
        var deferred = $q.defer();
        p_s = [
            [0, 0],
            [Number(lo_w), 0],
            [Number(lo_w), Number(lo_h)],
            [0, Number(lo_h)]
        ];
        p_x = [
            [0, 0],
            [Number(lo_w), 0],
            [Number(lo_w), Number(lo_h)],
            [0, Number(lo_h)]
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
        deferred.resolve();
        return deferred.promise;
    };

    this.perspectivePoints = function(p, v, h, quality) {
        // return perspective, points, quality so that draw can be applied
        var deferred = $q.defer();
        var scale_v = p.hi_lo_v_scale;
        var scale_h = p.hi_lo_h_scale;
        var amount_v_h = Math.round(p.hi_v_change * v);
        var amount_h_h = Math.round(p.hi_h_change * h);
        var amount_v_l = amount_v_h * scale_v;
        var amount_h_l = amount_h_h * scale_h;
        if (quality == 'high') {
            if (amount_v_h > 0) {
                p_x_hi = [
                    [p_x_hi[0][0], p_x_hi[0][1]],
                    [p_x_hi[1][0], p_s_hi[1][1] + amount_v_h * -1],
                    [p_x_hi[2][0], p_s_hi[2][1] + amount_v_h],
                    [p_x_hi[3][0], p_x_hi[3][1]]
                ];
                p_x = [
                    [p_x[0][0], p_x[0][1]],
                    [p_x[1][0], p_s[1][1] + amount_v_l * -1],
                    [p_x[2][0], p_s[2][1] + amount_v_l],
                    [p_x[3][0], p_x[3][1]]
                ];
            } else {
                p_x_hi = [
                    [p_x_hi[0][0], p_s_hi[0][1] + amount_v_h],
                    [p_x_hi[1][0], p_x_hi[1][1]],
                    [p_x_hi[2][0], p_x_hi[2][1]],
                    [p_x_hi[3][0], p_s_hi[3][1] + amount_v_h * -1]
                ];
                p_x = [
                    [p_x[0][0], p_s[0][1] + amount_v_l],
                    [p_x[1][0], p_x[1][1]],
                    [p_x[2][0], p_x[2][1]],
                    [p_x[3][0], p_s[3][1] + amount_v_l * -1]
                ];
            }
            if (amount_h_h > 0) {
                p_x_hi = [
                    [p_s_hi[0][0] + amount_h_h * -1, p_x_hi[0][1]],
                    [p_s_hi[1][0] + amount_h_h, p_x_hi[1][1]],
                    [p_x_hi[2][0], p_x_hi[2][1]],
                    [p_x_hi[3][0], p_x_hi[3][1]]
                ];
                p_x = [
                    [p_s[0][0] + amount_h_l * -1, p_x[0][1]],
                    [p_s[1][0] + amount_h_l, p_x[1][1]],
                    [p_x[2][0], p_x[2][1]],
                    [p_x[3][0], p_x[3][1]]
                ];
            } else {
                p_x_hi = [
                    [p_x_hi[0][0], p_x_hi[0][1]],
                    [p_x_hi[1][0], p_x_hi[1][1]],
                    [p_s_hi[2][0] + amount_h_h * -1, p_x_hi[2][1]],
                    [p_s_hi[3][0] + amount_h_h, p_x_hi[3][1]]
                ];
                p_x = [
                    [p_x[0][0], p_x[0][1]],
                    [p_x[1][0], p_x[1][1]],
                    [p_s[2][0] + amount_h_l * -1, p_x[2][1]],
                    [p_s[3][0] + amount_h_l, p_x[3][1]]
                ];
            }
            deferred.resolve(p_x_hi);
        } else {
            if (amount_v_l > 0) {
                p_x = [
                    [p_x[0][0], p_x[0][1]],
                    [p_x[1][0], p_s[1][1] + amount_v_l * -1],
                    [p_x[2][0], p_s[2][1] + amount_v_l],
                    [p_x[3][0], p_x[3][1]]
                ];
                p_x_hi = [
                    [p_x_hi[0][0], p_x_hi[0][1]],
                    [p_x_hi[1][0], p_s_hi[1][1] + amount_v_h * -1],
                    [p_x_hi[2][0], p_s_hi[2][1] + amount_v_h],
                    [p_x_hi[3][0], p_x_hi[3][1]]
                ];
            } else {
                p_x = [
                    [p_x[0][0], p_s[0][1] + amount_v_l],
                    [p_x[1][0], p_x[1][1]],
                    [p_x[2][0], p_x[2][1]],
                    [p_x[3][0], p_s[3][1] + amount_v_l * -1]
                ];
                p_x_hi = [
                    [p_x_hi[0][0], p_s_hi[0][1] + amount_v_h],
                    [p_x_hi[1][0], p_x_hi[1][1]],
                    [p_x_hi[2][0], p_x_hi[2][1]],
                    [p_x_hi[3][0], p_s_hi[3][1] + amount_v_h * -1]
                ];
            }
            if (amount_h_l > 0) {
                p_x = [
                    [p_s[0][0] + amount_h_l * -1, p_x[0][1]],
                    [p_s[1][0] + amount_h_l, p_x[1][1]],
                    [p_x[2][0], p_x[2][1]],
                    [p_x[3][0], p_x[3][1]]
                ];
                p_x_hi = [
                    [p_s_hi[0][0] + amount_h_h * -1, p_x_hi[0][1]],
                    [p_s_hi[1][0] + amount_h_h, p_x_hi[1][1]],
                    [p_x_hi[2][0], p_x_hi[2][1]],
                    [p_x_hi[3][0], p_x_hi[3][1]]
                ];
            } else {
                p_x = [
                    [p_x[0][0], p_x[0][1]],
                    [p_x[1][0], p_x[1][1]],
                    [p_s[2][0] + amount_h_l * -1, p_x[2][1]],
                    [p_s[3][0] + amount_h_l, p_x[3][1]]
                ];
                p_x_hi = [
                    [p_x_hi[0][0], p_x_hi[0][1]],
                    [p_x_hi[1][0], p_x_hi[1][1]],
                    [p_s_hi[2][0] + amount_h_h * -1, p_x_hi[2][1]],
                    [p_s_hi[3][0] + amount_h_h, p_x_hi[3][1]]
                ];
            }
            deferred.resolve(p_x);
        }
        return deferred.promise;
    };

    this.perspectiveChange = function(p, v, h, quality) {
        var deferred = $q.defer();
        var vertical = v;
        var horizontal = h;
        self.perspectivePoints(p, vertical, horizontal, quality).then(function(result) {
            self.perspectiveDraw(p, result, quality);
            deferred.resolve(p);
        });
        return deferred.promise;
    };

    this.quickPerspectiveChange = function(v, h, quality) {
        var p = self.getPerspective();
        self.perspectivePoints(p, v, h, quality).then(function(result) {
            self.quickPerspectiveDraw(p, result, quality);
        });
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
        // visual testing
        // draw outline of image half size
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2 * (1 / scale);
        ctx.strokeRect(-iw / 2, -ih / 2, iw, ih);
        ctx.save();
        // reset the transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // draw outline of canvas half size
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(cw - cw / 2, ch - ch / 2, cw, ch);
        ctx.restore();
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

    // Flip V

    this.quickFlipV = function(ctx) {
        var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        // Traverse every row and flip the pixels
        var idh = imageData.height;
        var idw = imageData.width;
        for (i = 0, h = idh; i < h; i++) {
            // We only need to do half of every row since we're flipping the halves
            for (j = 0, w = idw / 2; j < w; j++) {
                var index = (i * 4) * idw + (j * 4);
                var mirrorIndex = ((i + 1) * 4) * idw - ((j + 1) * 4);
                for (var q = 0, amount = 4; q < amount; q++) {
                    var temp = imageData.data[index + q];
                    imageData.data[index + q] = imageData.data[mirrorIndex + q];
                    imageData.data[mirrorIndex + q] = temp;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    };

    this.flipV = function(source, bool) {
        var deferred = $q.defer();
        if (bool) {
            var ctx = source.getContext('2d');
            var imageData = ctx.getImageData(0, 0, source.width, source.height);
            // Traverse every row and flip the pixels
            var idw = imageData.width;
            var idh = imageData.height;
            for (i = 0, h = idh; i < h; i++) {
                // We only need to do half of every row since we're flipping the halves
                for (j = 0, w = idw / 2; j < w; j++) {
                    var index = (i * 4) * idw + (j * 4);
                    var mirrorIndex = ((i + 1) * 4) * idw - ((j + 1) * 4);
                    for (var q = 0; q < 4; q++) {
                        var temp = imageData.data[index + q];
                        imageData.data[index + q] = imageData.data[mirrorIndex + q];
                        imageData.data[mirrorIndex + q] = temp;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            deferred.resolve(source);
        } else {
            deferred.resolve(source);
        }
        return deferred.promise;
    };

    // Flip H

    this.quickFlipH = function(ctx) {
        var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        var imageData_dest = ctx.createImageData(imageData.width, imageData.height);
        var idh = imageData.height;
        var idw = imageData.width;
        //loop through image data
        for (row = 0; row < idh; row++) {
            for (col = 0; col < idw; col++) {
                //find current pixel
                index = (col + (row * idw)) * 4;
                index_dest = (col + ((idh - row) * idw)) * 4;
                for (var q = 0, amount = 4; q < amount; q++) {
                    imageData_dest.data[index_dest + q] = imageData.data[index + q];
                }
            }
        }
        ctx.putImageData(imageData_dest, 0, 0);
    };

    this.flipH = function(source, bool) {
        var deferred = $q.defer();
        if (bool) {
            var ctx = source.getContext('2d');
            var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            var imageData_dest = ctx.createImageData(imageData.width, imageData.height);
            var idh = imageData.height;
            var idw = imageData.width;
            //loop through image data
            for (row = 0; row < idh; row++) {
                for (col = 0; col < idw; col++) {
                    //find current pixel
                    index = (col + (row * idw)) * 4;
                    index_dest = (col + ((idh - row) * idw)) * 4;
                    for (var q = 0, amount = 4; q < amount; q++) {
                        imageData_dest.data[index_dest + q] = imageData.data[index + q];
                    }
                }
            }
            ctx.putImageData(imageData_dest, 0, 0);
            deferred.resolve(source);
        } else {
            deferred.resolve(source);
        }
        return deferred.promise;
    };

    // Rotated

    this.rotated = function(source, degrees) {
        var deferred = $q.defer();
        var io = self.getImageOriginal(self.getImageParent(), self.getImageId());
        var new_canvas = document.createElement("canvas");
        new_canvas.width = io.nat_width;
        new_canvas.height = io.nat_height;
        var ctx = new_canvas.getContext('2d');
        var image = source;
        ctx.drawImage(source, 0, 0);
        if (degrees != undefined && degrees != 0) {
            var ctx_source = source.getContext('2d');
            if (degrees == 90 || degrees == 270) {
                new_canvas.width = io.nat_height;
                new_canvas.height = io.nat_width;
                ctx.translate(new_canvas.width / 2, new_canvas.height / 2);
                ctx.rotate(degrees * Math.PI / 180);
                ctx.drawImage(ctx_source.canvas, -new_canvas.height / 2, -new_canvas.width / 2);
                deferred.resolve(new_canvas);
            } else if (degrees == 180) {
                new_canvas.width = io.nat_width;
                new_canvas.height = io.nat_height;
                ctx.translate(io.nat_width / 2, io.nat_height / 2);
                ctx.rotate(degrees * Math.PI / 180);
                ctx.drawImage(ctx_source.canvas, -new_canvas.width / 2, -new_canvas.height / 2);
                deferred.resolve(new_canvas);
            }
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
    this.quickSharpen = function(source, target, filters) {
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
            applyBlending(bottomImage, topImage, filter_data.blend, w, h).then(function(result) {
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