/**
 * @preserve Copyright (c) 2012, Jason Sanford
 * Google Vector Layers is a library for showing geometry objects
 * from multiple geoweb services with the Google Maps API
 */

/*global gvector */

(function (root) {
    root.gvector = {
        VERSION: '1.2.0',

        noConflict: function () {
            root.gvector = this._originalgvector;
            return this;
        },

        _originalgvector: root.gvector
    };
}(this));
