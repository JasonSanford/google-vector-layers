/*
 * gvector.Layer is a base class for rendering vector layers on a Google Maps API map. It's inherited by AGS, A2E, CartoDB, GeoIQ, etc.
 */

gvector.Layer = gvector.Class.extend({
    
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
    
    getMap: function() {
        return this.options.map;
    },
    
    setOptions: function(o) {
        // TODO - Merge new options (o) with current options (this.options)
    },
    
    _show: function() {
        if (!this.options.showAll) {
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
        } else {
            this._getFeatures();
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
    },
    
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
    
    _clearFeatures: function() {
        // TODO - Check to see if we even need to hide these before we remove them from the DOM
        this._hideVectors();
        this._vectors = [];
    },
    
    _addZoomChangeListener: function() {
        // "this" means something different inside "google.maps.event.addListener"
        // assign it to "me"
        var me = this;
        
        // Whenever the map's zoom changes, check the layer's visibility (this.options.visibleAtScale)
        this._zoomChangeListener = google.maps.event.addListener(this.options.map, "zoom_changed", function() {
            me._checkLayerVisibility();
        });
    },
    
    _addIdleListener: function() {
        // "this" means something different inside "google.maps.event.addListener"
        // assign it to "me"
        var me = this;
        
        // Whenever the map idles (pan or zoom). Get the features in the current map extent.
        this._idleListener = google.maps.event.addListener(this.options.map, "idle", function() {
            if (me.options.visibleAtScale) {
                me._getFeatures();
            }
        });
    },
    
    _checkLayerVisibility: function() {
        // Store current visibility so we can see if it changed
        var visibilityBefore = this.options.visibleAtScale;
        
        // Check current map scale and see if it's in this layer's range
        var z = this.options.map.getZoom();
        var sr = this.options.scaleRange;
        this.options.visibleAtScale = (z >= sr[0] && z <= sr[1]);
        
        // Check to see if the visibility has changed
        if (visibilityBefore !== this.options.visibleAtScale) {
            // It did.
            this[this.options.visibleAtScale ? "_showVectors" : "_hideVectors"]();
        }
        
        // Check to see if we need to set or clear any intervals for auto-updating layers
        if (visibilityBefore && !this.options.visibleAtScale && this._autoUpdateInterval) {
            clearInterval(this._autoUpdateInterval);
        } else if (!visibilityBefore && this.options.autoUpdate && this.options.autoUpdateInterval) {
            var me = this;
            this._autoUpdateInterval = setInterval(function() {
                me._getFeatures();
            }, this.options.autoUpdateInterval);
        }
        
    },
    
    _setInfoWindowContent: function(feature) {
        var previousContent = feature.iwContent
        
        // Esri calls them attributes. GeoJSON calls them properties
        var atts = feature.attributes || feature.properties
        
        var iwContent;
        if (typeof this.options.infoWindowTemplate == "string") {
            iwContent = this.options.infoWindowTemplate;
            for (var prop in atts) {
                var re = new RegExp("{" + prop + "}", "g");
                iwContent = iwContent.replace(re, atts[prop]);
            }
        } else if (typeof this.options.infoWindowTemplate == "function") {
            iwContent = this.options.infoWindowTemplate(atts);
        } else {
            return;
        }
        feature.iwContent = iwContent;
        
        if (feature.infoWindow && !(feature.iwContent == previousContent)) {
            feature.infoWindow.setContent(feature.iwContent);
        }
    },
    
    _showInfoWindow: function(feature, evt) {
        var infoWindowOptions = {
            content: feature.iwContent
        };
        
        var ownsInfoWindow;
        if (!this.options.singleInfoWindow) {
            feature.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            ownsInfoWindow = feature;
        } else {
            if (this.infoWindow) {
                this.infoWindow.close();
                this.infoWindow = null;
            }
            this.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            this.infoWindow.set("associatedFeature", feature);
            ownsInfoWindow = this;
        }
        
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
        
        var me = this;
        
        // Don't ask, I don't know.
        setTimeout(function() {
            ownsInfoWindow.infoWindow.open(me.options.map, isLineOrPolygon ? new google.maps.Marker({position: evt.latLng}) : feature.vector);
        }, 200);
    },
    
    _buildBoundsString: function(gBounds) {
        var gBoundsParts = gBounds.toUrlValue().split(",");
        return gBoundsParts[1] + "," + gBoundsParts[0] + "," + gBoundsParts[3] + "," + gBoundsParts[2];
    },
    
    _getFeatureVectorOptions: function(feature) {
        var vectorOptions = {};
        
        // Esri calls them attributes. GeoJSON calls them properties
        var atts = feature.attributes || feature.properties
        
        if (this.options.symbology) {
            switch (this.options.symbology.type) {
                case "single":
                    for (var key in this.options.symbology.vectorOptions) {
                        vectorOptions[key] = this.options.symbology.vectorOptions[key];
                    }
                    break;
                case "unique":
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
    
    _getPropertiesChanged: function(oldAtts, newAtts) {
        var changed = false;
        for (var key in oldAtts) {
            if (oldAtts[key] != newAtts[key]) {
                changed = true;
            }
        }
        return changed;
    },
    
    _getGeometryChanged: function(oldGeom, newGeom) {
        // TODO: make this work for points, linestrings and polygons
        var changed = false;
        if (oldGeom.coordinates && oldGeom.coordinates instanceof Array) {
            // It's GeoJSON
            
            // For now only checking for point changes
            if (!(oldGeom.coordinates[0] == newGeom.coordinates[0] && oldGeom.coordinates[1] == newGeom.coordinates[1])) {
                changed = true;
            }
        } else {
            // It's an EsriJSON
            
            // For now only checking for point changes
            if (!(oldGeom.x == newGeom.x && oldGeom.y == newGeom.y)) {
                changed = true;
            }
        }
        return changed;
    },
    
    _esriJsonGeometryToGoogle: function(geometry, opts) {
        var vector, vectors;
        if (geometry.x && geometry.y) {
            // A simple point
            opts.position = new google.maps.LatLng(geometry.y, geometry.x);
            vector = new google.maps.Marker(opts);
        } else if (geometry.points) {
            vectors = [];
            for (var i = 0, len = geometry.points.length; i < len; i++) {
                opts.position = new google.maps.LatLng(geometry.points[i].y, geometry.points[i].x);
                vectors.push(new google.maps.Marker(opts));
            }
        } else if (geometry.paths) {
            var path = [];
            for (var i = 0; i < geometry.paths.length; i++) {
                for (var i2 = 0; i2 < geometry.paths[i].length; i2++) {
                    path.push(new google.maps.LatLng(geometry.paths[i][i2][1], geometry.paths[i][i2][0]));
                }
            }
            opts.path = path;
            vector = new google.maps.Polyline(opts);
        } else if (geometry.rings) {
            var paths = [];
            for (var i = 0; i < geometry.rings.length; i++) {
                var path = [];
                for (var i2 = 0; i2 < geometry.rings[i].length; i2++) {
                    path.push(new google.maps.LatLng(geometry.rings[i][i2][1], geometry.rings[i][i2][0]));
                }
                paths.push(path);
            }
            opts.paths = paths;
            vector = new google.maps.Polygon(opts);
        }
        return vector || vectors;
    },
    
    // Using portions of https://github.com/JasonSanford/GeoJSON-to-Google-Maps
    _geoJsonGeometryToGoogle: function(geometry, opts) {
        
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
                    for (var j = 0; j < geometry.coordinates[i].length; j++){
                        var coord = geometry.coordinates[i][j];
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
                    for (var i2 = 0; i2 < geometry.coordinates[i].length; i2++) {
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
    }
});