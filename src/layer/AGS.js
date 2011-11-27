gvector.AGS = gvector.Layer.extend({
    initialize: function(options) {
        this._vectors = [];
        for (var i = 0, len = this._requiredParams.length; i < len; i++) {
            if (!options[this._requiredParams[i]]) {
                throw new Error("No \"" + this._requiredParams[i] + "\" parameter found.");
            }
        }
        if (options.url.substr(options.url.length - 1, 1) !== "/") {
            options.url += "/";
        }
        gvector.Layer.prototype.initialize.call(this, options);
        this._globalPointer = "AGS_" + Math.floor(Math.random() * 100000);
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
        where: "1=1",
        url: null
    },
    
    _requiredParams: ["url"],
    
    _getFeatures: function() {
        // If we don't have a uniqueField value it's hard to tell if new features are duplicates so clear them all
        if (!this.options.uniqueField) {
            this._clearFeatures();
        }
        
        // Build URL
        var url = this.options.url + "query" + // Query this layer
            "?returnGeometry=true" + // Of course we want geometry
            "&outSR=4326" + // receive geometry in WGS 84 Lat/Lng.
            "&f=json" + // Wish it were GeoJSON, but we'll take it
            "&outFields=" + this.options.fields + // Please return the following fields
            "&where=" + this.options.where + // By default return all feature (1=1) but could pass SQL statement (value<90)
            "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
        if (!this.options.showAll) {
            url += "&inSR=4326" + // request geometry in WGS 84 Lat/Lng.
            "&spatialRel=esriSpatialRelIntersects" + // Find stuff that intersects this envelope
            "&geometryType=esriGeometryEnvelope" + // Our "geometry" url param will be an envelope
            "&geometry=" + this._buildBoundsString(this.options.map.getBounds()); // Build envelope geometry
        }
        
        // Dynamically load JSONP
        var head = document.getElementsByTagName("head")[0];
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = url;
        head.appendChild(script);
    },
    
    _processFeatures: function(data) {
        //
        // Sometimes requests take a while to come back and
        // the user might have turned the layer off
        //
        if (!this.options.map) {
            return;
        }
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
                                if (this._getGeometryChanged(this._vectors[i2].geometry, data.features[i].geometry)) {
                                    
                                    // Check to see if it's a point feature, these are the only ones we're updating for now
                                    if (!isNaN(data.features[i].geometry.x) && !isNaN(data.features[i].geometry.y)) {
                                        this._vectors[i2].geometry = data.features[i].geometry;
                                        this._vectors[i2].vector.setPosition(new google.maps.LatLng(this._vectors[i2].geometry.y, this._vectors[i2].geometry.x));
                                    }
                                    
                                }
                                
                                var propertiesChanged = this._getPropertiesChanged(this._vectors[i2].attributes, data.features[i].attributes);
                                
                                if (propertiesChanged) {
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
                    var vector_or_vectors = this._esriJsonGeometryToGoogle(data.features[i].geometry, this._getFeatureVectorOptions(data.features[i]));
                    data.features[i][vector_or_vectors instanceof Array ? "vectors" : "vector"] = vector_or_vectors;
                    
                    // Show the vector or vectors on the map
                    if (data.features[i].vector) {
                        data.features[i].vector.setMap(this.options.map);
                    } else if (data.features[i].vectors && data.features[i].vectors.length) {
                        for (var i3 = 0; i3 < data.features[i].vectors.length; i3++) {
                            data.features[i].vectors[i3].setMap(this.options.map);
                        }
                    }
                    
                    // Store the vector in an array so we can remove it later
                    this._vectors.push(data.features[i]);
                    
                    if (this.options.infoWindowTemplate) {
                        
                        var me = this;
                        var feature = data.features[i];
                        
                        this._setInfoWindowContent(feature);
                        
                        (function(feature){
                            if (feature.vector) {
                                google.maps.event.addListener(feature.vector, "click", function(evt) {
                                    me._showInfoWindow(feature, evt);
                                });
                            } else if (feature.vectors) {
                                for (var i3 = 0, len = feature.vectors.length; i3 < len; i3++) {
                                    google.maps.event.addListener(feature.vectors[i3], "click", function(evt) {
                                        me._showInfoWindow(feature, evt);
                                    });
                                }
                            }
                        }(feature));
                        
                    }
                
                }
                
            }
            
        }
    
    }
    
});
