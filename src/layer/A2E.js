gvector.A2E = gvector.AGS.extend({
    initialize: function(options) {
        
        // Check for required parameters
        for (var i = 0, len = this._requiredParams.length; i < len; i++) {
            if (!options[this._requiredParams[i]]) {
                throw new Error("No \"" + this._requiredParams[i] + "\" parameter found.");
            }
        }
        
        // _globalPointer is a string that points to a global function variable
        // Features returned from a JSONP request are passed to this function
        this._globalPointer = "A2E_" + Math.floor(Math.random() * 100000);
        window[this._globalPointer] = this;
        
        // If the url wasn't passed with a trailing /, add it.
        if (options.url.substr(options.url.length - 1, 1) !== "/") {
            options.url += "/";
        }
        
        this._originalOptions = gvector.Util.extend({}, options);
        
        if (options.esriOptions) {
            if (typeof options.esriOptions == "object") {
                gvector.Util.extend(options, this._convertEsriOptions(options.esriOptions));
            } else {
                // Send to function that request JSON from server
                // Use a callback to process returned JSON and send back to initialize layer with proper options
                this._getEsriOptions();
                return; // Get out of here until we have proper JSON
            }
        }
        
        // Extend Layer to create A2E
        gvector.Layer.prototype.initialize.call(this, options);
        
        if (this.options.where) {
            this.options.where = encodeURIComponent(this.options.where);
        }
        
        // Create an array to hold the features
        this._vectors = [];
        
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2) {
                var z = this.options.map.getZoom();
                var sr = this.options.scaleRange;
                this.options.visibleAtScale = (z >= sr[0] && z <= sr[1]);
            }
            this._show();
        }
        
        if (this.options.autoUpdate && this.options.esriOptions.editFeedInfo) {
            this._makeJsonpRequest("http://cdn.pubnub.com/pubnub-3.1.min.js");
            var me = this;
            this._pubNubScriptLoaderInterval = setInterval(function() {
                if (window.PUBNUB) {
                    me._pubNubScriptLoaded();
                }
            }, 200);
        }
    },
    
    _pubNubScriptLoaded: function() {
        clearInterval(this._pubNubScriptLoaderInterval);
        //console.log("PubNumb Script has loaded");
        this.pubNub = PUBNUB.init({
            subscribe_key: this.options.esriOptions.editFeedInfo.pubnubSubscribeKey,
            ssl: false,
            origin: "pubsub.pubnub.com"
        });
        
        this.pubNub.subscribe({
            channel: this.options.esriOptions.editFeedInfo.pubnubChannel,
            callback: function(message) {
                console.log("PubNub Update!");
                console.log(message);
                alert("Someone made an edit to the map at ArcGIS.com<br />PubNub is amazing!");
            },
            error: function() {
                console.log("There was a pubnub error");
            }
        });
    }
    
});
