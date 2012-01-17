/**
 * @preserve Copyright (c) 2011, Jason Sanford
 * Google Vector Layers is a library for showing geometry objects
 * from multiple geoweb services with the Google Maps API
 */

/*global gvector */

(function (root) {
    root.gvector = {
        VERSION: '1.1.0',

        /*ROOT_URL: (function () {
            var scripts = document.getElementsByTagName('script'),
                gvectorRe = /^(.*\/)gvector\-?([\w\-]*)\.js.*$/;

            var i, len, src, matches;

            for (i = 0, len = scripts.length; i < len; i++) {
                src = scripts[i].src;
                matches = src.match(gvectorRe);

                if (matches) {
                    if (matches[2] === 'include') { break; }
                    return matches[1];
                }
            }
            return '../../dist/';
        }()),*/

        noConflict: function () {
            root.gvector = this._originalgvector;
            return this;
        },

        _originalgvector: root.gvector
    };
}(this));
