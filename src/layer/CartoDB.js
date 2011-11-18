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
		where: null,
		limit: null,
		uniqueField: "cartodb_id"
	},
	
	_requiredParams: ["user", "table"],
	
	_getFeatures: function() {
	    // http://geojason.cartodb.com/api/v1/sql?q=SELECT%20*%20FROM%20sewer_line%20LIMIT%20100&format=geojson
	    // http://geojason.cartodb.com/api/v1/sql
	    //    ?q=SELECT * FROM sewer_line WHERE the_geom && st_setsrid(st_makebox2d(st_point(-80.67024581684115,35.050634204320026),st_point(-80.6590341831589,35.05538572656619)),4326)  LIMIT 1000&format=geojson
	    // If we don't have a uniqueField value
	    // it's hard to tell if new features are
	    //duplicates so clear them all
	    //if (!this.options.uniqueField) {
	    //    this._clearFeatures();
	    //}
	    
	    // Build Query
	    var where = this.options.where || "";
	    if (!this.options.showAll) {
	        var bounds = this.options.map.getBounds();
	        var sw = bounds.getSouthWest();
	        var ne = bounds.getNorthEast();
	        where += (where.length ? " AND " : "") + "the_geom && st_setsrid(st_makebox2d(st_point(" + sw.lng() + "," + sw.lat() + "),st_point(" + ne.lng() + "," + ne.lat() + ")),4326)";
	    }
	    if (this.options.limit) {
	        where += (where.length ? " " : "") + "limit " + this.options.limit;
	    }
	    where = (where.length ? " " + where : "");
	    var query = "SELECT * FROM " + this.options.table + (where.length ? " WHERE " + where : "");
	    
	    // Build URL
	    var url = "http://" + this.options.user + ".cartodb.com/api/v" + this.options.version + "/sql" + // The API entry point
	        "?q=" + encodeURIComponent(query) + // The SQL statement
	        "&format=geojson" + // GeoJSON please
	        "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
	    
	    // Dynamically load JSONP
	    var head = document.getElementsByTagName("head")[0];
	    var script = document.createElement("script");
	    script.type = "text/javascript";
	    script.src = url;
	    head.appendChild(script);
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
	                
	                    // Does the "uniqueField" property for this feature match the feature on the map
	                    if (data.features[i].properties[this.options.uniqueField] == this._vectors[i2].properties[this.options.uniqueField]) {
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
	                            
	                            var propertiesChanged = this._getPropertiesChanged(this._vectors[i2].properties, data.features[i].properties);
	                            
	                            if (propertiesChanged) {
	                                this._vectors[i2].properties = data.features[i].properties;
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
	                
	                // Convert GeoJSON to Google Maps vector (Point, Polyline, Polygon)
	                //this._geojsonGeometryToGoogle(data.features[i].geometry, this._getFeatureVectorOptions(data.features[i]));
	                // Convert GeoJSON to Google Maps vector (Point, Polyline, Polygon)
	                var vector_or_vectors = this._geojsonGeometryToGoogle(data.features[i].geometry, this._getFeatureVectorOptions(data.features[i]));
	                data.features[i][vector_or_vectors instanceof Array ? "vectors" : "vector"] = vector_or_vectors;
	                
	                // Show this vector on the map
	                //data.features[i].vector.setMap(this.options.map);
	                // Show the vector or vectors on the map
	                if (data.features[i].vector) {
	                    data.features[i].vector.setMap(this.options.map);
	                }
	                if (data.features[i].vectors && data.features[i].vectors.length) {
	                    for (var i3 = 0; i3 < data.features[i].vectors.length; i3++) {
	                        data.features[i].vectors[i3].setMap(this.options.map);
	                    }
	                }
	                
	                // Store the vector in an array so we can remove it later
	                this._vectors.push(data.features[i]);
	                
	                if (this.options.infoWindowTemplate) {
	                    
	                    var me = this;
	                    var feature = this._vectors[i2];
	                    
	                    this._setInfoWindowContent(feature);
	                    
	                    if (feature.vector) {
	                        (function(feature){
	                            google.maps.event.addListener(feature.vector, "click", function(evt) {
	                                me._showInfoWindow(feature, evt);
	                            });
	                        }(feature));
	                    } else if (feature.vectors) {
	                        for (var i3 = 0, len = feature.vectors.length; i3 < len; i3++) {
	                            (function(feature){
	                                google.maps.event.addListener(feature.vectors[i3], "click", function(evt) {
	                                    me._showInfoWindow(feature, evt);
	                                });
	                            }(feature));
	                        }
	                    }
	                    
	                }
	            
	            }
	            
	        }
	        
	    }
	
	}
	
});
