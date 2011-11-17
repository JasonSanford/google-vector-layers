gvector.CartoDB = gvector.Layer.extend({
	initialize: function(options) {
	    for (var i = 0, len = this._requiredParams.length; i < len; i++) {
	        if (!options[this._requiredParams[i]]) {
	            throw new Error("No \"" + this._requiredParams[i] + "\" parameter found.");
	        }
	    }
		gvector.Layer.prototype.initialize.call(this, options);
		this._globalPointer = "CartoDB_" + Math.floor(Math.random() * 100000);
		window[this._globalPointer] = this;
		if (this.options.map) {
		    if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2) {
		        var z = this.options.map.getZoom();
		        var sr = this.options.scaleRange;
		        this.options.visibleAtScale = (z >= sr[0] && z <= sr[1]);
		    }
		    this._show();
		}
	},
	
	options: {
	    version: 1,
	    user: null,
	    table: null,
		where: null
	},
	
	_requiredParams: ["user", "table"],
	
	_getFeatures: function() {
	    // http://geojason.cartodb.com/api/v1/sql?q=SELECT%20*%20FROM%20sewer_line%20LIMIT%20100&format=geojson
	    // http://geojason.cartodb.com/api/v1/sql?q=SELECT%20*%20FROM%20sewer_line%20WHERE%20the_geom%20%26%26%20st_setsrid(st_makebox2d(st_point(-80.67024581684115,35.050634204320026),st_point(-80.6590341831589,35.05538572656619)),4326)%20LIMIT%201000&format=geojson
	    // If we don't have a uniqueField value
	    // it's hard to tell if new features are
	    //duplicates so clear them all
	    if (!this.options.uniqueField) {
	        this._clearFeatures();
	    }
	    
	    // Build URL
	    var url = "http://" + this.options.user + ".cartodb.com/api/v" + this.options.version + "/sql" + // The API entry point
	        "?returnGeometry=true" + // The SQL statement
	        "&spatialRel=esriSpatialRelIntersects" + // Find stuff that intersects this envelope
	        "&f=json" + // Wish it were GeoJSON, but we'll take it
	        "&outFields=" + this.options.fields + // Please return the following fields
	        "&where=" + this.options.where + // By default return all feature (1=1) but could pass SQL statement (value<90)
	        "&geometryType=esriGeometryEnvelope" + // Our "geometry" url param will be an envelope
	        "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
	    if (!this.options.showAll) {
	        url += "&geometry=" + this._buildBoundsString(this.options.map.getBounds()); // Build envelope geometry
	    }
	    
	    // Dynamically load JSONP
	    var head = document.getElementsByTagName("head")[0];
	    var script = document.createElement("script");
	    script.type = "text/javascript";
	    script.src = url;
	    head.appendChild(script);*/
	},
	
	_processFeatures: function(data) {
	    var bounds = this.options.map.getBounds();
	    
	    // Check to see if the _lastQueriedBounds is the same as the new bounds
	    // If true, don't bother querying again.
	    if (this._lastQueriedBounds && this._lastQueriedBounds.equals(bounds) && !this._autoUpdateInterval) {
	        return;
	    }
	    
	    // Store the bounds in the _lastQueriedBounds member so we don't have
	    // to query the layer again if someone simply turns a layer on/off
	    this._lastQueriedBounds = bounds;
	    
	    // If "data.features" exists and there's more than one feature in the array
	    if (data && data.features && data.features.length) {
	        
	        // Loop through the return features
	        for (var i = 0; i < data.features.length; i++) {
	        
	            // All objects are assumed to be false until proven true (remember COPS?)
	            var onMap = false;
	        
	            // If we have a "uniqueField" for this layer
	            if (this.options.uniqueField) {
	                
	                // Loop through all of the features currently on the map
	                for (var i2 = 0; i2 < this._vectors.length; i2++) {
	                
	                    // Does the "uniqueField" attribute for this feature match the feature on the map
	                    if (data.features[i].attributes[this.options.uniqueField] == this._vectors[i2].attributes[this.options.uniqueField]) {
	                        // The feature is already on the map
	                        onMap = true;
	                        
	                        // We're only concerned about updating layers that are dynamic (options.dynamic = true).
	                        if (this.options.dynamic) {
	                        
	                            // The feature's geometry might have changed, let's check.
	                            if (!isNaN(data.features[i].geometry.x) && !isNaN(data.features[i].geometry.y)) {
	                                
	                                // It's a point feature, these are the only ones we're updating for now
	                                // In the future it might be helpful to use something similar to Underscore's isEqual object equality checker
	                                if (!(data.features[i].geometry.x == this._vectors[i2].geometry.x && data.features[i].geometry.y == this._vectors[i2].geometry.y)) {
	                                    this._vectors[i2].geometry = data.features[i].geometry;
	                                    this._vectors[i2].vector.setPosition(new google.maps.LatLng(this._vectors[i2].geometry.y, this._vectors[i2].geometry.x));
	                                }
	                                
	                            }
	                            
	                            var attributesChanged = this._getAttributesChanged(this._vectors[i2].attributes, data.features[i].attributes);
	                            
	                            if (attributesChanged) {
	                                this._vectors[i2].attributes = data.features[i].attributes;
	                                if (this.options.infoWindowTemplate) {
	                                    this._setInfoWindowContent(this._vectors[i2]);
	                                }
	                                if (this.options.symbology && this.options.symbology.type != "single") {
	                                    this._vectors[i2].vector.setOptions(this._getFeatureVectorOptions(this._vectors[i2]));
	                                }
	                            }
	                        
	                        }
	                        
	                    }
	                    
	                }
	                
	            }
	            
	            // If the feature isn't already or the map OR the "uniqueField" attribute doesn't exist
	            if (!onMap || !this.options.uniqueField) {
	                
	                // Convert Esri JSON to Google Maps vector (Point, Polyline, Polygon)
	                this._esriJsonToGoogle(data.features[i], this._getFeatureVectorOptions(data.features[i]));
	                
	                // Show this vector on the map
	                data.features[i].vector.setMap(this.options.map);
	                
	                // Store the vector in an array so we can remove it later
	                this._vectors.push(data.features[i]);
	                
	                if (this.options.infoWindowTemplate) {
	                    
	                    var me = this;
	                    var feature = this._vectors[i2];
	                    
	                    this._setInfoWindowContent(feature);
	                    
	                    (function(feature){
	                        google.maps.event.addListener(feature.vector, "click", function(evt) {
	                            me._showInfoWindow(feature, evt);
	                        });
	                    }(feature));
	                    
	                }
	            
	            }
	            
	        }
	        
	    }
	
	}
	
});
