(function() {

    var _vectors = {};

    var _base = {
        
        setMap: function(map) {
            this._options.map = map;
            this[map ? "_show" : "_hide"]();
        },
        
        getMap: function() {
            return this._options.map;
        },
        
        setOptions: function(o) {
            // TODO - Merge new options (o) with current options (this._options)
        },
        
        _show: function() {
            this._addIdleListener();
            if (this._options.scaleRange && this._options.scaleRange instanceof Array && this._options.scaleRange.length === 2) {
                this._addZoomChangeListener();
            }
            if (this._options.autoUpdate && this._options.autoUpdateInterval) {
                var me = this;
                this._autoUpdateInterval = setInterval(function() {
                    me._getFeatures();
                }, this._options.autoUpdateInterval);
            }
            google.maps.event.trigger(this._options.map, "zoom_changed");
            google.maps.event.trigger(this._options.map, "idle");
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
        },
        
        _hideVectors: function() {
            for (var i = 0; i < this._vectors.length; i++) {
                if (this._vectors[i].vector) {
                    this._vectors[i].vector.setMap(null);
                    if (this._vectors[i].infoWindow) {
                        this._vectors[i].infoWindow.close()
                    }
                }
                if (this._vectors[i].vectors && this._vectors[i].vectors.length) {
                    for (var i2 = 0; i2 < this._vectors[i].vectors.length; i2++) {
                        this._vectors[i].vectors[i2].setMap(null);
                        if (this._vectors[i].vectors[i2].infoWindow) {
                            this._vectors[i].vectors[i2].infoWindow.close();
                        }
                    }
                }
            }
        },
        
        _showVectors: function() {
            for (var i = 0; i < this._vectors.length; i++) {
                if (this._vectors[i].vector) {
                    this._vectors[i].vector.setMap(this._options.map);
                }
                if (this._vectors[i].vectors && this._vectors[i].vectors.length) {
                    for (var i2 = 0; i2 < this._vectors[i].vectors.length; i2++) {
                        this._vectors[i].vectors[i2].setMap(this._options.map);
                    }
                }
            }
        },
        
        _clearFeatures: function() {
            // TODO - Check to see if we even need to hide these before we remove them from the DOM
            this._hideVectors();
            this._vectors = [];
        },
        
        _addZoomChangeListener: function() {
            // "this" means something different inside "google.maps.event.addListener"
            // assign it to "me"
            var me = this;
            
            // Whenever the map's zoom changes, check the layer's visibility (this._options.visibleAtScale)
            this._zoomChangeListener = google.maps.event.addListener(this._options.map, "zoom_changed", function() {
                me._checkLayerVisibility();
            });
        },
        
        _addIdleListener: function() {
            // "this" means something different inside "google.maps.event.addListener"
            // assign it to "me"
            var me = this;
            
            // Whenever the map idles (pan or zoom). Get the features in the current map extent.
            this._idleListener = google.maps.event.addListener(this._options.map, "idle", function() {
                if (me._options.visibleAtScale) {
                    me._getFeatures();
                }
            });
        },
        
        _checkLayerVisibility: function() {
            // Store current visibility so we can see if it changed
            var visibilityBefore = this._options.visibleAtScale;
            
            // Check current map scale and see if it's in this layer's range
            var z = this._options.map.getZoom();
            var sr = this._options.scaleRange;
            this._options.visibleAtScale = (z >= sr[0] && z <= sr[1]);
            
            // Check to see if the visibility has changed
            if (visibilityBefore !== this._options.visibleAtScale) {
                // It did.
                this[this._options.visibleAtScale ? "_showVectors" : "_hideVectors"]();
            }
            
            // Check to see if we need to set or clear any intervals for auto-updating layers
            if (visibilityBefore && !this._options.visibleAtScale && this._autoUpdateInterval) {
                clearInterval(this._autoUpdateInterval);
            } else if (!visibilityBefore && this._options.autoUpdate && this._options.autoUpdateInterval) {
                var me = this;
                this._autoUpdateInterval = setInterval(function() {
                    me._getFeatures();
                }, this._options.autoUpdateInterval);
            }
            
        },
        
        _setInfoWindowContent: function(feature) {
            var previousContent = feature.iwContent
            
            // Esri calls them attributes. GeoJSON calls them properties
            var atts = feature.attributes || feature.properties
            
            var iwContent = this._options.infoWindowTemplate;
            for (var prop in atts) {
                var re = new RegExp("{" + prop + "}", "g");
                iwContent = iwContent.replace(re, atts[prop]);
            }
            feature.iwContent = iwContent
            
            if (feature.infoWindow && !(feature.iwContent == previousContent)) {
                feature.infoWindow.setContent(feature.iwContent)
            }
        },
        
        _showInfoWindow: function(feature, evt) {
            var infoWindowOptions = {
                content: feature.iwContent
            };
            feature.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            feature.infoWindow.open(this._options.map, feature.vector.getPaths || feature.vector.getPath ? new google.maps.Marker({position: evt.latLng}) : feature.vector);
        },
        
        _buildBoundsString: function(gBounds) {
            var gBoundsParts = gBounds.toUrlValue().split(",");
            return gBoundsParts[1] + "," + gBoundsParts[0] + "," + gBoundsParts[3] + "," + gBoundsParts[2];
        },
        
        _esriJsonToGoogle: function(feature, opts) {
            var vector;
            if (feature.geometry.x && feature.geometry.y) {
                opts.position = new google.maps.LatLng(feature.geometry.y, feature.geometry.x);
                vector = new google.maps.Marker(opts);
            } else if (feature.geometry.paths) {
                var path = [];
                for (var i = 0; i < feature.geometry.paths.length; i++) {
                    for (var i2 = 0; i2 < feature.geometry.paths[i].length; i2++) {
                        path.push(new google.maps.LatLng(feature.geometry.paths[i][i2][1], feature.geometry.paths[i][i2][0]));
                    }
                }
                opts.path = path;
                vector = new google.maps.Polyline(opts);
            } else if (feature.geometry.rings) {
                var paths = [];
                for (var i = 0; i < feature.geometry.rings.length; i++) {
                    var path = [];
                    for (var i2 = 0; i2 < feature.geometry.rings[i].length; i2++) {
                        path.push(new google.maps.LatLng(feature.geometry.rings[i][i2][1], feature.geometry.rings[i][i2][0]));
                    }
                    paths.push(path);
                }
                opts.paths = paths;
                vector = new google.maps.Polygon(opts);
            }
            feature.vector = vector;
        },
        
        // Using portions of https://github.com/JasonSanford/GeoJSON-to-Google-Maps
        _geojsonGeometryToGoogle: function(feature, opts) {
            
            var vector, vectors;
            switch (feature.type) {
                case "Point":
                    opts.position = new google.maps.LatLng(feature.coordinates[1], feature.coordinates[0]);
                    vector = new google.maps.Marker(opts);
                    break;
                            
                case "LineString":
                    var path = [];
                    for (var i = 0; i < feature.coordinates.length; i++) {
                        var ll = new google.maps.LatLng(feature.coordinates[i][1], feature.coordinates[i][0]);
                        path.push(ll);
                    }
                    opts.path = path;
                    vector = new google.maps.Polyline(opts);
                    break;
                    
                case "Polygon":
                    var paths = [];
                    for (var i = 0; i < feature.coordinates.length; i++) {
                        var path = [];
                        for (var i2 = 0; i2 < feature.coordinates[i].length; i2++) {
                                var ll = new google.maps.LatLng(feature.coordinates[i][i2][1], feature.coordinates[i][i2][0]);
                            path.push(ll);
                        }
                        paths.push(path);
                    }
                    opts.paths = paths;
                    vector = new google.maps.Polygon(opts);
                    break;
                    
                case "GeometryCollection":
                    vectors = [];
                    for (var i = 0; i < feature.geometries.length; i++) {
                        vectors.push(this._geojsonGeometryToGoogle(feature.geometries[i], opts));
                    }
                    break;
            }
            return vector || vectors;
        }
        
    };
    
    function _extend(target, obj) {
    
        for (mem in obj) {
            target[mem] = obj[mem];
        }
    
    }
    
    // A layer in an ArcGIS Server Map Service
    _vectors.AGS = function(opts) {
        
        // TODO - Find a better way to detect duplicate features than relying on a user inputing a uniqueField paramter
        if (!opts.url) {
            return {"error": true, "message": "No \"url\" parameter provided."};
        }
        
        if (opts.url.substr(opts.url.length-1, 1) !== "/") {
            opts.url += "/";
        }
        
        var layer = {
        
            _globalPointer: "AGS_" + Math.floor(Math.random() * 100000),
            
            _vectors: [],
            
            _options: {
                fields: opts.fields || "",
                where: opts.where || "1=1",
                scaleRange: opts.scaleRange || null,
                vectorOptions: opts.vectorOptions || {},
                map: opts.map || null,
                uniqueField: opts.uniqueField || null,
                visibleAtScale: true,
                url: opts.url,
                dynamic: opts.dynamic || false,
                autoUpdate: opts.autoUpdate || false,
                autoUpdateInterval: opts.autoUpdateInterval || null,
                infoWindowTemplate: opts.infoWindowTemplate || null
            },
            
            _getFeatures: function() {
                // If we don't have a uniqueField value
                // it's hard to tell if new features are
                //duplicates so clear them all
                if (!this._options.uniqueField) {
                    this._clearFeatures();
                }
                
                // Build URL
                var url = this._options.url + "query" + // Query this layer
                    "?returnGeometry=true" + // Of course we want geometry
                    "&inSR=4326&outSR=4326" + // request/receive geometry in WGS 84 Lat/Lng. Esri got this right.
                    "&spatialRel=esriSpatialRelIntersects" + // Find stuff that intersects this envelope
                    "&f=json" + // Wish it were GeoJSON, but we'll take it
                    "&outFields=" + this._options.fields + // Please return the following fields
                    "&where=" + this._options.where + // By default return all feature (1=1) but could pass SQL statement (value<90)
                    "&geometryType=esriGeometryEnvelope" + // Our "geometry" url param will be an envelope
                    "&geometry=" + this._buildBoundsString(this._options.map.getBounds()) + // Build envelope geometry
                    "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
                
                // Dynamically load JSONP
                var head = document.getElementsByTagName("head")[0];
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.src = url;
                head.appendChild(script);
            },
            
            _processFeatures: function(data) {
                var bounds = this._options.map.getBounds();
                
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
                        if (this._options.uniqueField) {
                            
                            // Loop through all of the features currently on the map
                            for (var i2 = 0; i2 < this._vectors.length; i2++) {
                            
                                // Does the "uniqueField" attribute for this feature match the feature on the map
                                if (data.features[i].attributes[this._options.uniqueField] == this._vectors[i2].attributes[this._options.uniqueField]) {
                                    // The feature is already on the map
                                    onMap = true;
                                    
                                    // We're only concerned about updating layers that are dynamic (options.dynamic = true).
                                    if (this._options.dynamic) {
                                    
                                        // The feature's geometry might have changed, let's check.
                                        if (!isNaN(data.features[i].geometry.x) && !isNaN(data.features[i].geometry.y)) {
                                            
                                            // It's a point feature, these are the only ones we're updating for now
                                            // In the future it might be helpful to use something similar to Underscore's isEqual object equality checker
                                            if (!(data.features[i].geometry.x == this._vectors[i2].geometry.x && data.features[i].geometry.y == this._vectors[i2].geometry.y)) {
                                                this._vectors[i2].geometry = data.features[i].geometry;
                                                this._vectors[i2].vector.setPosition(new google.maps.LatLng(this._vectors[i2].geometry.y, this._vectors[i2].geometry.x));
                                            }
                                            
                                        }
                                        
                                        this._vectors[i2].attributes = data.features[i].attributes;
                                        this._setInfoWindowContent(this._vectors[i2]);
                                    
                                    }
                                    
                                }
                                
                            }
                            
                        }
                        
                        // If the feature isn't already or the map OR the "uniqueField" attribute doesn't exist
                        if (!onMap || !this._options.uniqueField) {
                            
                            // Convert Esri JSON to Google Maps vector (Point, Polyline, Polygon)
                            this._esriJsonToGoogle(data.features[i], this._options.vectorOptions);
                            
                            // Show this vector on the map
                            data.features[i].vector.setMap(this._options.map);
                            
                            // Store the vector in an array so we can remove it later
                            this._vectors.push(data.features[i]);
                            
                            if (this._options.infoWindowTemplate) {
                                
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
            
        };
        
        _extend(layer, _base);
        
        window[layer._globalPointer] = layer;
        
        if (layer._options.map) {
            layer._show();
        }
        
        return layer;
    };
    
    // An Arc2Earth Datasource
    _vectors.A2E = function(opts) {
        
        if (!opts.url) {
            return {"error": true, "message": "No \"url\" parameter provided."};
        }
        
        if (opts.url.substr(opts.url.length-1, 1) !== "/") {
            opts.url += "/";
        }
        
        var layer = {
        
            _globalPointer: "A2E_" + Math.floor(Math.random() * 100000),
            
            _vectors: [],
            
            _options: {
                map: opts.map || null,
                where: opts.where || "",
                vectorOptions: opts.vectorOptions || {},
                scaleRange: opts.scaleRange || null,
                visibleAtScale: true,
                url: opts.url
            },
            
            _getFeatures: function() {
                // Build URL
                var url = this._options.url + "search" + // Arc2Earth datasource url + search service
                    "?f=gjson" + // Return GeoJSON formatted data
                    "&bbox=" + this._buildBoundsString(this._options.map.getBounds()) + // Build bbox geometry
                    "&q=" + this._options.where + // By default return all features but could pass SQL statement (value<90)
                    "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
                
                // Dynamically load JSONP
                var head = document.getElementsByTagName("head")[0];
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.src = url;
                head.appendChild(script);
            
            },
            
            _processFeatures: function(data) {
                var bounds = this._options.map.getBounds();
                
                // Check to see if the _lastQueriedBounds is the same as the new bounds
                // If true, don't bother querying again.
                if (this._lastQueriedBounds && this._lastQueriedBounds.equals(bounds)) {
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
                    
                        // If we have an "id" member for this GeoJSON object
                        if (data.features[i].id) {
                            
                            // Loop through all of the features currently on the map
                            for (var i2 = 0; i2 < this._vectors.length; i2++) {
                            
                                // Does the "id" member for this feature match the feature on the map
                                if (this._vectors[i2].id && data.features[i].id == this._vectors[i2].id) {
                                
                                    // The feature is already on the map
                                    onMap = true;
                                    
                                }
                                
                            }
                            
                        }
                        
                        // If the feature isn't already or the map
                        if (!onMap) {
                            
                            // Convert GeoJSON to Google Maps vector (Point, Polyline, Polygon)
                            var vector_or_vectors = this._geojsonGeometryToGoogle(data.features[i].geometry, this._options.vectorOptions);
                            data.features[i][vector_or_vectors instanceof Array ? "vectors" : "vector"] = vector_or_vectors;
                            
                            // Show the vector or vectors on the map
                            if (data.features[i].vector) data.features[i].vector.setMap(this._options.map);
                            if (data.features[i].vectors && data.features[i].vectors.length) {
                                for (var i3 = 0; i3 < data.features[i].vectors.length; i3++) {
                                    data.features[i].vectors[i3].setMap(this._options.map);
                                }
                            }
                            
                            // Store the vector in an array so we can remove it later
                            this._vectors.push(data.features[i]);
                        
                        }
                        
                    }
                    
                }
            
            }
            
        };
        
        _extend(layer, _base);
        
        window[layer._globalPointer] = layer;
        
        if (layer._options.map) {
            layer._show();
        }
        
        return layer;
        
    };
    
    // A Geocommons dataset
    _vectors.Geocommons = function(opts) {
        // TODO - Find a better way to detect duplicate features than relying on a user inputing a uniqueField paramter
        if (!opts.dataset) {
            return { "error": true, "message": "No \"dataset\" parameter provided." };
        }
        
        var layer = {
        
            _globalPointer: "Geocommons_" + Math.floor(Math.random() * 100000),
            
            _vectors: [],
            
            _options: {
                map: opts.map || null,
                uniqueField: opts.uniqueField || null,
                vectorOptions: opts.vectorOptions || {},
                scaleRange: opts.scaleRange || null,
                visibleAtScale: true,
                dataset: opts.dataset,
                infoWindowTemplate: opts.infoWindowTemplate || null
            },
            
            _getFeatures: function() {
                // If we don't have a uniqueField value
                // it's hard to tell if new features are
                //duplicates so clear them all
                if (!this._options.uniqueField) {
                    this._clearFeatures();
                }
                
                // Build URL
                var url = "http://geocommons.com/datasets/" + this._options.dataset + // Geocommons dataset ID
                    "/features.json?" + // JSON please
                    "&bbox=" + this._buildBoundsString(this._options.map.getBounds()) + // Build bbox geometry
                    "&geojson=1" + // Return GeoJSON formatted data
                    "&intersect=full" + // Return features that intersect this bbox, not just fully contained
                    "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
                
                // Dynamically load JSONP
                var head = document.getElementsByTagName("head")[0];
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.src = url;
                head.appendChild(script);
                
            },
            
            _processFeatures: function(data) {
                data = JSON.parse(data);
                var bounds = this._options.map.getBounds();
                
                // Check to see if the _lastQueriedBounds is the same as the new bounds
                // If true, don't bother querying again.
                if (this._lastQueriedBounds && this._lastQueriedBounds.equals(bounds)) {
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
                        if (this._options.uniqueField) {
                            
                            // Loop through all of the features currently on the map
                            for (var i2 = 0; i2 < this._vectors.length; i2++) {
                            
                                // Does the "uniqueField" property for this feature match the feature on the map
                                if (data.features[i].properties[this._options.uniqueField] == this._vectors[i2].properties[this._options.uniqueField]) {
                                    
                                    // The feature is already on the map
                                    onMap = true;
                                    
                                }
                                
                            }
                            
                        }
                        
                        // If the feature isn't already or the map OR the "uniqueField" attribute doesn't exist
                        if (!onMap || !this._options.uniqueField) {
                            
                            // Convert GeoJSON to Google Maps vector (Point, Polyline, Polygon)
                            var vector_or_vectors = this._geojsonGeometryToGoogle(data.features[i].geometry, this._options.vectorOptions);
                            data.features[i][vector_or_vectors instanceof Array ? "vectors" : "vector"] = vector_or_vectors;
                            
                            // Show the vector or vectors on the map
                            if (data.features[i].vector) {
                                data.features[i].vector.setMap(this._options.map);
                            }
                            if (data.features[i].vectors && data.features[i].vectors.length) {
                                for (var i3 = 0; i3 < data.features[i].vectors.length; i3++) {
                                    data.features[i].vectors[i3].setMap(this._options.map);
                                }
                            }
                            
                            // Store the vector in an array so we can remove it later
                            this._vectors.push(data.features[i]);
                            
                            if (this._options.infoWindowTemplate) {
                                
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
        };
        
        _extend(layer, _base);
        
        window[layer._globalPointer] = layer;
        
        if (layer._options.map) {
            layer._show();
        }
        
        return layer;
        
    };
    
    window.vectors = _vectors;
        
})()