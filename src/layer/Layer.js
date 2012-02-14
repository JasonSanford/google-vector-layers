/*
 * gvector.Layer is a base class for rendering vector layers on a Google Maps API map. It's inherited by AGS, A2E, CartoDB, GeoIQ, etc.
 */

gvector.Layer = gvector.Class.extend({
    
    //
    // Default options for all layers
    //
    options: {
        fields: "",
        scaleRange: null,
        map: null,
        uniqueField: null,
        visibleAtScale: true,
        dynamic: false,
        autoUpdate: false,
        autoUpdateInterval: null,
        infoWindowTemplate: null,
        singleInfoWindow: false,
        symbology: null,
        showAll: false
    },

    initialize: function(options) {
        gvector.Util.setOptions(this, options);
    },
    
    //
    // Show this layer on the map provided
    //
    setMap: function(map) {
        if (map && this.options.map) {
            return;
        }
        this.options.map = map;
        if (map && this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2) {
            var z = this.options.map.getZoom();
            var sr = this.options.scaleRange;
            this.options.visibleAtScale = (z >= sr[0] && z <= sr[1]);
        }
        this[map ? "_show" : "_hide"]();
    },
    
    //
    // Get the map (if any) that the layer has been added to
    //
    getMap: function() {
        return this.options.map;
    },
    
    setOptions: function(o) {
        // TODO - Merge new options (o) with current options (this.options)
    },
    
    _show: function() {
        this._addIdleListener();
        if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2) {
            this._addZoomChangeListener();
        }
        if (this.options.visibleAtScale) {
            if (this.options.autoUpdate && this.options.autoUpdateInterval) {
                var me = this;
                this._autoUpdateInterval = setInterval(function() {
                    me._getFeatures();
                }, this.options.autoUpdateInterval);
            }
            google.maps.event.trigger(this.options.map, "zoom_changed");
            google.maps.event.trigger(this.options.map, "idle");
        }
    },
    
    _hide: function() {
        if (this._idleListener) {
            google.maps.event.removeListener(this._idleListener);
        }
        if (this._zoomChangeListener) {
            google.maps.event.removeListener(this._zoomChangeListener);
        }
        if (this._autoUpdateInterval) {
            clearInterval(this._autoUpdateInterval);
        }
        this._clearFeatures();
        this._lastQueriedBounds = null;
        if (this._gotAll) {
            this._gotAll = false;
        }
    },
    
    //
    // Hide the vectors in the layer. This might get called if the layer is still on but out of scaleRange.
    //
    _hideVectors: function() {
        for (var i = 0; i < this._vectors.length; i++) {
            if (this._vectors[i].vector) {
                this._vectors[i].vector.setMap(null);
                if (this._vectors[i].infoWindow) {
                    this._vectors[i].infoWindow.close()
                } else if (this.infoWindow && this.infoWindow.get("associatedFeature") && this.infoWindow.get("associatedFeature") == this._vectors[i]) {
                    this.infoWindow.close();
                    this.infoWindow = null;
                }
            }
            if (this._vectors[i].vectors && this._vectors[i].vectors.length) {
                for (var i2 = 0; i2 < this._vectors[i].vectors.length; i2++) {
                    this._vectors[i].vectors[i2].setMap(null);
                    if (this._vectors[i].vectors[i2].infoWindow) {
                        this._vectors[i].vectors[i2].infoWindow.close();
                    } else if (this.infoWindow && this.infoWindow.get("associatedFeature") && this.infoWindow.get("associatedFeature") == this._vectors[i]) {
                        this.infoWindow.close();
                        this.infoWindow = null;
                    }
                }
            }
        }
    },
    
    //
    // Show the vectors in the layer. This might get called if the layer is on and came back into scaleRange.
    //
    _showVectors: function() {
        for (var i = 0; i < this._vectors.length; i++) {
            if (this._vectors[i].vector) {
                this._vectors[i].vector.setMap(this.options.map);
            }
            if (this._vectors[i].vectors && this._vectors[i].vectors.length) {
                for (var i2 = 0; i2 < this._vectors[i].vectors.length; i2++) {
                    this._vectors[i].vectors[i2].setMap(this.options.map);
                }
            }
        }
    },
    
    //
    // Hide the vectors, then empty the vectory holding array
    //
    _clearFeatures: function() {
        // TODO - Check to see if we even need to hide these before we remove them from the DOM
        this._hideVectors();
        this._vectors = [];
    },
    
    //
    // Add an event hanlder to detect a zoom change on the map
    //
    _addZoomChangeListener: function() {
        //
        // "this" means something different inside "google.maps.event.addListener" so assign it to "me"
        //
        var me = this;
        
        //
        // Whenever the map's zoom changes, check the layer's visibility (this.options.visibleAtScale)
        //
        this._zoomChangeListener = google.maps.event.addListener(this.options.map, "zoom_changed", function() {
            me._checkLayerVisibility();
        });
    },
    
    //
    // Add an event hanlder to detect an idle (pan or zoom) on the map
    //
    _addIdleListener: function() {
        //
        // "this" means something different inside "google.maps.event.addListener" so assign it to "me"
        //
        var me = this;
        
        //
        // Whenever the map idles (pan or zoom) get the features in the current map extent
        //
        this._idleListener = google.maps.event.addListener(this.options.map, "idle", function() {
            if (me.options.visibleAtScale) {
                //
                // Do they use the showAll parameter to load all features once?
                //
                if (me.options.showAll) {
                    //
                    // Have we already loaded these features
                    //
                    if (!me._gotAll) {
                        //
                        // Grab the features and note that we've already loaded them (no need to _getFeatures again
                        //
                        me._getFeatures();
                        me._gotAll = true;
                    }
                } else {
                    me._getFeatures();
                }
            }
        });
    },
    
    //
    // Get the current map zoom and check to see if the layer should still be visible
    //
    _checkLayerVisibility: function() {
        //
        // Store current visibility so we can see if it changed
        //
        var visibilityBefore = this.options.visibleAtScale;
        
        //
        // Check current map scale and see if it's in this layer's range
        //
        var z = this.options.map.getZoom();
        var sr = this.options.scaleRange;
        this.options.visibleAtScale = (z >= sr[0] && z <= sr[1]);
        
        //
        // Check to see if the visibility has changed
        //
        if (visibilityBefore !== this.options.visibleAtScale) {
            //
            // It did, hide or show vectors
            //
            this[this.options.visibleAtScale ? "_showVectors" : "_hideVectors"]();
        }
        
        //
        // Check to see if we need to set or clear any intervals for auto-updating layers
        //
        if (visibilityBefore && !this.options.visibleAtScale && this._autoUpdateInterval) {
            clearInterval(this._autoUpdateInterval);
        } else if (!visibilityBefore && this.options.autoUpdate && this.options.autoUpdateInterval) {
            var me = this;
            this._autoUpdateInterval = setInterval(function() {
                me._getFeatures();
            }, this.options.autoUpdateInterval);
        }
        
    },
    
    //
    // Set the InfoWindow content for the feature
    //
    _setInfoWindowContent: function(feature) {
        //
        // Store previous InfoWindow content so we can check to see if it changed. If it didn't no sense changing the content as this has an ugly flashing effect.
        //
        var previousContent = feature.iwContent
        
        //
        // Esri calls them attributes. GeoJSON calls them properties.
        //
        var atts = feature.attributes || feature.properties
        
        var iwContent;
        
        //
        // Check to see if it's a string-based infoWindowTemplate or function
        //
        if (typeof this.options.infoWindowTemplate == "string") {
            //
            // Store the string-based infoWindowTemplate
            //
            iwContent = this.options.infoWindowTemplate;
            
            //
            // Loop through the properties and replace mustache-wrapped property names with actual values
            //
            for (var prop in atts) {
                var re = new RegExp("{" + prop + "}", "g");
                iwContent = iwContent.replace(re, atts[prop]);
            }
        } else if (typeof this.options.infoWindowTemplate == "function") {
            //
            // It's a function-based infoWindowTempmlate, so just call this function and pass properties
            //
            iwContent = this.options.infoWindowTemplate(atts);
        } else {
            //
            // Ummm, that's all we support. Seeya!
            //
            return;
        }
        
        //
        // Store the InfoWindow content
        //
        feature.iwContent = iwContent;
        
        //
        // If the feature's InfoWindow already exists and the previous content is differentt than the current content, set the content
        //
        if (feature.infoWindow) {
            if (feature.iwContent != previousContent) {
                feature.infoWindow.setContent(feature.iwContent);
            }
        } else if (this.infoWindow && this.infoWindow.get("associatedFeature") == feature) {
            if (feature.iwContent != previousContent) {
                this.infoWindow.setContent(feature.iwContent);
            }
        }
    },
    
    //
    // Show the feature's (or layer's) InfoWindow
    //
    _showInfoWindow: function(feature, evt) {
        //
        // Set the content
        //
        var infoWindowOptions = {
            content: feature.iwContent
        };
        
        //
        // Create a variable to hold a reference to the object that owns the InfoWindow so we can show it later
        //
        var ownsInfoWindow;
        
        //
        // If the layer isn't set to show a single InfoWindow
        //
        if (!this.options.singleInfoWindow) {
            //
            // Create an InfoWindow and store it in the feature
            //
            feature.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            ownsInfoWindow = feature;
        } else {
            if (this.infoWindow) {
                //
                // If the layer already has an InfoWindow created, close and delete it
                //
                this.infoWindow.close();
                this.infoWindow = null;
            }
            
            //
            // Create a new InfoWindow
            //
            this.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            
            //
            // Store the associated feature reference in the InfoWindow so we can close and clear it later
            //
            this.infoWindow.set("associatedFeature", feature);
            
            ownsInfoWindow = this;
        }
        
        //
        // InfoWindows on Lines and Polygons are opened slightly different, make note of it
        //
        var isLineOrPolygon = false;
        if (feature.vector) {
            if (feature.vector.getPaths || feature.vector.getPath) {
                isLineOrPolygon = true;
            }
        } else if (feature.vectors && feature.vectors.length) {
            if (feature.vectors[0].getPaths || feature.vectors[0].getPath) {
                isLineOrPolygon = true
            }
        }
        
        //
        // "this" means something different inside of the setTimeout function so assigned it to "me"
        //
        var me = this;
        
        //
        // Don't ask about the InfoWindow.open timeout, I'm not sure why it fails if you open it immediately
        //
        setTimeout(function() {
            ownsInfoWindow.infoWindow.open(me.options.map, isLineOrPolygon ? new google.maps.Marker({position: evt.latLng}) : feature.vector);
        }, 200);
    },
    
    //
    // Build a string to pass in a URL for a bbox url parameter (&bbox=-81,35,-80,36)
    //
    _buildBoundsString: function(gBounds) {
        var gBoundsParts = gBounds.toUrlValue().split(",");
        return gBoundsParts[1] + "," + gBoundsParts[0] + "," + gBoundsParts[3] + "," + gBoundsParts[2];
    },
    
    //
    // Get the appropriate Google Maps vector options for this feature
    //
    _getFeatureVectorOptions: function(feature) {
        //
        // Create an empty vectorOptions object to add to, or leave as is if no symbology can be found
        //
        var vectorOptions = {};
        
        //
        // Esri calls them attributes. GeoJSON calls them properties.
        //
        var atts = feature.attributes || feature.properties
        
        //
        // Is there a symbology set for this layer?
        //
        if (this.options.symbology) {
            switch (this.options.symbology.type) {
                case "single":
                    //
                    // It's a single symbology for all features so just set the key/value pairs in vectorOptions
                    //
                    for (var key in this.options.symbology.vectorOptions) {
                        vectorOptions[key] = this.options.symbology.vectorOptions[key];
                    }
                    break;
                case "unique":
                    //
                    // It's a unique symbology. Check if the feature's property value matches that in the symbology and style accordingly
                    //
                    var att = this.options.symbology.property;
                    for (var i = 0, len = this.options.symbology.values.length; i < len; i++) {
                        if (atts[att] == this.options.symbology.values[i].value) {
                            for (var key in this.options.symbology.values[i].vectorOptions) {
                                vectorOptions[key] = this.options.symbology.values[i].vectorOptions[key];
                            }
                        }
                    }
                    break;
                case "range":
                    //
                    // It's a range symbology. Check if the feature's property value is in the range set in the symbology and style accordingly
                    //
                    var att = this.options.symbology.property;
                    for (var i = 0, len = this.options.symbology.ranges.length; i < len; i++) {
                        if (atts[att] >= this.options.symbology.ranges[i].range[0] && atts[att] <= this.options.symbology.ranges[i].range[1]) {
                            for (var key in this.options.symbology.ranges[i].vectorOptions) {
                                vectorOptions[key] = this.options.symbology.ranges[i].vectorOptions[key];
                            }
                        }
                    }
                    break;
            }
        }
        return vectorOptions;
    },
    
    //
    // Check to see if any attributes have changed
    //
    _getPropertiesChanged: function(oldAtts, newAtts) {
        var changed = false;
        for (var key in oldAtts) {
            if (oldAtts[key] != newAtts[key]) {
                changed = true;
            }
        }
        return changed;
    },
    
    //
    // Check to see if the geometry has changed
    //
    _getGeometryChanged: function(oldGeom, newGeom) {
        //
        // TODO: make this work for points, linestrings and polygons
        //
        var changed = false;
        if (oldGeom.coordinates && oldGeom.coordinates instanceof Array) {
            //
            // It's GeoJSON
            //
            
            //
            // For now only checking for point changes
            //
            if (!(oldGeom.coordinates[0] == newGeom.coordinates[0] && oldGeom.coordinates[1] == newGeom.coordinates[1])) {
                changed = true;
            }
        } else {
            //
            // It's EsriJSON
            //
            
            //
            // For now only checking for point changes
            //
            if (!(oldGeom.x == newGeom.x && oldGeom.y == newGeom.y)) {
                changed = true;
            }
        }
        return changed;
    },
    
    //
    // Turn EsriJSON into Google Maps API vectors
    //
    _esriJsonGeometryToGoogle: function(geometry, opts) {
        //
        // Create a variable for a single vector and for multi part vectors. The Google Maps API has no real support for these so we keep them in an array.
        //
        var vector, vectors;
        
        if (geometry.x && geometry.y) {
            //
            // A Point
            //
            opts.position = new google.maps.LatLng(geometry.y, geometry.x);
            vector = new google.maps.Marker(opts);
        } else if (geometry.points) {
            //
            // A MultiPoint
            //
            vectors = [];
            for (var i = 0, len = geometry.points.length; i < len; i++) {
                opts.position = new google.maps.LatLng(geometry.points[i].y, geometry.points[i].x);
                vectors.push(new google.maps.Marker(opts));
            }
        } else if (geometry.paths) {
            if (geometry.paths.length > 1) {
                //
                // A MultiLineString
                //
                vectors = [];
                for (var i = 0, len = geometry.paths.length; i < len; i++) {
                    var path = [];
                    for (var i2 = 0, len2 = geometry.paths[i].length; i2 < len2; i2++) {
                        path.push(new google.maps.LatLng(geometry.paths[i][i2][1], geometry.paths[i][i2][0]));
                    }
                    opts.path = path
                    vectors.push(new google.maps.Polyline(opts));
                }
            } else {
                //
                // A LineString
                //
                var path = [];
                for (var i = 0, len = geometry.paths[0].length; i < len; i++) {
                    path.push(new google.maps.LatLng(geometry.paths[0][i][1], geometry.paths[0][i][0]));
                }
                opts.path = path;
                vector = new google.maps.Polyline(opts);
            }
        } else if (geometry.rings) {
            if (geometry.rings.length > 1) {
                //
                // A MultiPolygon
                //
                vectors = [];
                for (var i = 0, len = geometry.rings.length; i < len; i++) {
                    var paths = [];
                    var path = [];
                    for (var i2 = 0, len2 = geometry.rings[i].length; i2 < len2; i2++) {
                        path.push(new google.maps.LatLng(geometry.rings[i][i2][1], geometry.rings[i][i2][0]));
                    }
                    paths.push(path);
                    opts.paths = paths;
                    vectors.push(new google.maps.Polygon(opts));
                }
            } else {
                //
                // A Polygon
                //
                var paths = [];
                var path = [];
                for (var i = 0, len = geometry.rings[0].length; i < len; i++) {
                    path.push(new google.maps.LatLng(geometry.rings[0][i][1], geometry.rings[0][i][0]));
                }
                paths.push(path);
                opts.paths = paths;
                vector = new google.maps.Polygon(opts);
            }
        }
        return vector || vectors;
    },
    
    //
    // Convert GeoJSON to Google Maps API vectors using portions of https://github.com/JasonSanford/GeoJSON-to-Google-Maps
    //
    _geoJsonGeometryToGoogle: function(geometry, opts) {
        //
        // Create a variable for a single vector and for multi part vectors. The Google Maps API has no real support for these so we keep them in an array.
        //
        var vector, vectors;
        
        switch (geometry.type) {
            case "Point":
                opts.position = new google.maps.LatLng(geometry.coordinates[1], geometry.coordinates[0]);
                vector = new google.maps.Marker(opts);
                break;
            
            case "MultiPoint":
                vectors = [];
                for (var i = 0, len = geometry.coordinates.length; i < len; i++) {
                    opts.position = new google.maps.LatLng(geometry.coordinates[i][1], geometry.coordinates[i][0]);
                    vectors.push(new google.maps.Marker(opts));
                }
                break;
                        
            case "LineString":
                var path = [];
                for (var i = 0, len = geometry.coordinates.length; i < len; i++) {
                    var ll = new google.maps.LatLng(geometry.coordinates[i][1], geometry.coordinates[i][0]);
                    path.push(ll);
                }
                opts.path = path;
                vector = new google.maps.Polyline(opts);
                break;
            
            case "MultiLineString":
                vectors = [];
                for (var i = 0, len = geometry.coordinates.length; i < len; i++){
                    var path = [];
                    for (var i2 = 0, len2 = geometry.coordinates[i].length; i2 < len2; i2++){
                        var coord = geometry.coordinates[i][i2];
                        var ll = new google.maps.LatLng(coord[1], coord[0]);
                        path.push(ll);
                    }
                    opts.path = path;
                    vectors.push(new google.maps.Polyline(opts));
                }
                break;
                
            case "Polygon":
                var paths = [];
                for (var i = 0, len = geometry.coordinates.length; i < len; i++) {
                    var path = [];
                    for (var i2 = 0, len2 = geometry.coordinates[i].length; i2 < len2; i2++) {
                            var ll = new google.maps.LatLng(geometry.coordinates[i][i2][1], geometry.coordinates[i][i2][0]);
                        path.push(ll);
                    }
                    paths.push(path);
                }
                opts.paths = paths;
                vector = new google.maps.Polygon(opts);
                break;
            
            case "MultiPolygon":
                vectors = [];
                for (var i = 0, len = geometry.coordinates.length; i < len; i++) {
                    paths = [];
                    for (var i2 = 0, len2 = geometry.coordinates[i].length; i2 < len2; i2++) {
                        var path = [];
                        for (var i3 = 0, len3 = geometry.coordinates[i][i2].length; i3 < len3; i3++) {
                            path.push(new google.maps.LatLng(geometry.coordinates[i][i2][i3][1], geometry.coordinates[i][i2][i3][0]));
                        }
                        paths.push(path);
                    }
                    opts.paths = paths;
                    vectors.push(new google.maps.Polygon(opts));
                }
                break;
                
            case "GeometryCollection":
                vectors = [];
                for (var i = 0, len = geometry.geometries.length; i < len; i++) {
                    vectors.push(this._geoJsonGeometryToGoogle(geometry.geometries[i], opts));
                }
                break;
        }
        return vector || vectors;
    },
    
    _makeJsonpRequest: function(url) {
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
        if (this._lastQueriedBounds && this._lastQueriedBounds.equals(bounds) && !this.options.autoUpdate) {
            return;
        }
        
        // Store the bounds in the _lastQueriedBounds member so we don't have
        // to query the layer again if someone simply turns a layer on/off
        this._lastQueriedBounds = bounds;
        
        // GeoIQ layers return JSON string-wrapped, so JSON.parse it
        if (this.LAYER_TYPE == "GeoIQ") {
             data = JSON.parse(data);
        }
        
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
                                if (this._getGeometryChanged(this._vectors[i2].geometry, data.features[i].geometry)) {
                                    
                                    // Check to see if it's a point feature, these are the only ones we're updating for now
                                    if (!isNaN(data.features[i].geometry.coordinates[0]) && !isNaN(data.features[i].geometry.coordinates[1])) {
                                        this._vectors[i2].geometry = data.features[i].geometry;
                                        this._vectors[i2].vector.setPosition(new google.maps.LatLng(this._vectors[i2].geometry.coordinates[1], this._vectors[i2].geometry.coordinates[0]));
                                    }
                                    
                                }
                                
                                var propertiesChanged = this._getPropertiesChanged(this._vectors[i2].properties, data.features[i].properties);
                                
                                if (propertiesChanged) {
                                    this._vectors[i2].properties = data.features[i].properties;
                                    if (this.options.infoWindowTemplate) {
                                        this._setInfoWindowContent(this._vectors[i2]);
                                    }
                                    if (this.options.symbology && this.options.symbology.type != "single") {
                                        if (this._vectors[i2].vector) {
                                            this._vectors[i2].vector.setOptions(this._getFeatureVectorOptions(this._vectors[i2]));
                                        } else if (this._vectors[i2].vectors) {
                                            for (var i3 = 0, len = this._vectors[i2].vectors.length; i3 < len; i3++) {
                                                this._vectors[i2].vectors[i3].setOptions(this._getFeatureVectorOptions(this._vectors[i2]));
                                            }
                                        }
                                    }
                                }
                            
                            }
                            
                        }
                        
                    }
                    
                }
                
                // If the feature isn't already or the map OR the "uniqueField" attribute doesn't exist
                if (!onMap || !this.options.uniqueField) {
                    
                    // Convert GeoJSON to Google Maps vector (Point, Polyline, Polygon)
                    var vector_or_vectors = this._geoJsonGeometryToGoogle(data.features[i].geometry, this._getFeatureVectorOptions(data.features[i]));
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
