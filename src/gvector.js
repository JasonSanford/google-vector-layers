/**
 * @preserve Copyright (c) 2010-2011, CloudMade, Vladimir Agafonkin
 * Leaflet is a BSD-licensed JavaScript library for map display and interaction.
 * See http://leaflet.cloudmade.com for more information.
 */

/*global gvector */

(function (root) {
	root.gvector = {
		VERSION: '0.1',

		ROOT_URL: (function () {
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
		}()),

		noConflict: function () {
			root.gvector = this._originalgvector;
			return this;
		},

		_originalgvector: root.gvector
	};
}(this));
