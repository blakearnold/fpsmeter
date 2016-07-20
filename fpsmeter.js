// Copyright (c) 2012 David Corvoysier http://www.kaizou.org
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// fpsmeter.js

(function(){
    // We need to verify that CSS transitions are supported
    function getCSSTransition() {
        var dummy = document.createElement('dummy');

        var transEndEventNames = {
            'WebkitTransition' : 'webkitTransitionEnd',
            'MozTransition'    : 'transitionend',
            'OTransition'      : 'oTransitionEnd',
            'msTransition'     : 'MSTransitionEnd',
            'transition'       : 'transitionend'
        };

        var cssTrans = {};

        for ( var prop in transEndEventNames ) {
            if(dummy.style[prop]!==undefined){
                cssTrans.propertyName = prop;
                cssTrans.eventName = transEndEventNames[prop];
            }
        }

        return cssTrans;
    }

    // requestAnimationFrame polyfill by Erik Möller
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    function getAnimationControls() {
        var controls = {};
        controls.frameID = null;

        // Use this to remmeber what method we use to calculate fps
        controls.method = 'raf';

        if (window.mozPaintCount !== undefined) {
            controls.method = 'native';
            // Remember how many paints we had
            controls.startFrame = function(ref) {
                controls.frameID = window.mozPaintCount;
            };

            controls.stopFrame = function() {
                // We just count the number of paints that
                // occured during the last iteration
                return window.mozPaintCount - controls.frameID;
            };
        } else {
            var values;
            controls.startFrame = function(ref) {
                values = [];
                // Define a function to repeatedly store reference
                // x positions
                var storeValue = function () {
                    controls.frameID = window.requestAnimationFrame(storeValue);
                    var l = GetFloatValueOfAttr(ref, 'left');
                    if(l){
                        values.push(l);
                    }
                };
                // Start storing positions right now
                storeValue();
            };

            controls.stopFrame = function() {
                // We will look at reference x positions
                // stored during the last iteration and remove
                // duplicates
                window.cancelAnimationFrame(controls.frameID);
                var duplicates = 0;
                var current = -1;
                for (var i = 0; i < values.length; i++) {
                    var l = values[i];
                    if (l == current) {
                        duplicates++;
                    } else {
                        current = l;
                    }
                }
                return (values.length - duplicates);
            };
        }

        return controls;
    }

    function createMovingElement() {
        var elm = document.createElement("div");
        elm.setAttribute("id", "AnimBenchRef");
        elm.style['position'] = 'absolute';
        elm.style['backgroundColor'] = 'transparent';
        elm.style['width'] = '1px';
        elm.style['height'] = '1px';
        elm.style['left'] = '0px';
        elm.style['bottom'] = '0px';
        elm.style['-webkit-backface-visibility'] = 'hidden';
        elm.style['-moz-backface-visibility'] = 'hidden';
        elm.style['-ms-backface-visibility'] = 'hidden';
        return elm;
    }

    function setTransition(elm, cssTrans, rate) {
        elm.style[cssTrans.propertyName] = 'all ' + rate + 's linear';
        elm.addEventListener(cssTrans.eventName,
            function (evt) {
                var elapsed = (new Date().getTime()) - startTime;
                var frames = controls.stopFrame();
                var fps = Math.round(frames*1000/elapsed);
                startIteration(elm);
                var evt = document.createEvent("Event");
                evt.initEvent("fps",true,true);
                evt.fps = updateStats(fps);
                evt.method = controls.method;
                document.dispatchEvent(evt);
            },
            false);
    }

    function startIteration(ref) {
        if (!ref) {
            return;
        }
        // Remember when we started the iteration
        startTime = new Date().getTime();

        if (ref.style.left == margin+"px") {
            ref.style.left = (bodyWidth - margin) + "px";
        } else {
            ref.style.left = margin+"px";
        }

        controls.startFrame(ref);
    }

    function GetFloatValueOfAttr (element,attr) {
        var floatValue = null;
        if (window.getComputedStyle) {
            var compStyle = window.getComputedStyle (element, null);
            try {
                var value = compStyle.getPropertyCSSValue (attr);
                var valueType = value.primitiveType;
                switch (valueType) {
                  case CSSPrimitiveValue.CSS_NUMBER:
                      floatValue = value.getFloatValue (CSSPrimitiveValue.CSS_NUMBER);
                      break;
                  case CSSPrimitiveValue.CSS_PERCENTAGE:
                      floatValue = value.getFloatValue (CSSPrimitiveValue.CSS_PERCENTAGE);
                      // alert ("The value of the width property: " + floatValue + "%");
                      break;
                  default:
                      if (CSSPrimitiveValue.CSS_EMS <= valueType && valueType <= CSSPrimitiveValue.CSS_DIMENSION) {
                          floatValue = value.getFloatValue (CSSPrimitiveValue.CSS_PX);
                      }
                }
            }
            catch (e) {
                // Opera doesn't support the getPropertyCSSValue method
                var stringValue = compStyle[attr];
                floatValue = stringValue.substring(0, stringValue.length - 2);
            }
        }
        return floatValue;
    }

    var cssTrans = getCSSTransition();
    if(!cssTrans.propertyName){
        return;
    }

    var controls = getAnimationControls();

    var ref = null;
    var startTime = null;
    var bodyWidth;
    var margin = 10;

    var self = window.FPSMeter = {
        run : function(rate) {
            rate = rate ? rate : 1;
            if(document.readyState === 'complete') {
                if(!ref) {
                    ref = createMovingElement();
                    setTransition(ref, cssTrans, rate);
                    bodyWidth = GetFloatValueOfAttr(document.body,'width');
                    var bodyRef = document.getElementsByTagName("body").item(0);
                    bodyRef.appendChild(ref);
                }
                self.stats = undefined;
                setTimeout(function (evt) {
                    startIteration(ref);
                }, 10);
            } else {
                setTimeout(function (evt) {
                    self.run(rate);
                }, 10);
            }
        },
        stop : function() {
            controls.stopframe();
            var bodyRef = document.getElementsByTagName("body").item(0);
            bodyRef.removeChild(ref);
            ref = null;
        },
        resetStats : function() {
            self.stats = undefined;
        },
        getStats : function() {
            return self.stats;
        },
    };

    function updateStats(fps) {
        var stats = self.stats || {
            max : -1,
            min : -1,
            current : -1,
            count : 0,
            avg : 0,
            M2 : 0,
            variance : 0,
            std : 0
        };

        stats.max = (stats.max > fps) ? stats.max : fps;
        stats.min = (stats.min == -1) || (stats.min > fps) ? fps : stats.min;
        stats.current = fps;
        stats.count++;
        var delta = (fps - stats.avg);
        var R = delta / stats.count;
        stats.avg += R;
        stats.M2 += (stats.count - 1) * delta * R;
        stats.variance = stats.M2 / (stats.count - 1);
        stats.std = Math.sqrt(stats.variance);

        self.stats = stats;
        console.log(stats);

        return stats;
    }

})();
