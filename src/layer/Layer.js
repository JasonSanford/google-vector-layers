/*
 * gvector.Layer is a base class for rendering vector layers on a Google Maps API map. It's inherited by AGS, A2E GeoIQ, etc.
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
        symbology: null,
        showAll: false
    },

    initialize: function(options) {
        gvector.Util.setOptions(this, options);
    },
    
    _vectors: [],
    
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
        
        var iwContent = this.options.infoWindowTemplate;
        for (var prop in atts) {
            var re = new RegExp("{" + prop + "}", "g");
            iwContent = iwContent.replace(re, atts[prop]);
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
        feature.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
        var me = this;
        
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
        // Don't ask, I don't know.
        setTimeout(function() {
            feature.infoWindow.open(me.options.map, isLineOrPolygon ? new google.maps.Marker({position: evt.latLng}) : feature.vector);
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
            
            case "MultiLineString":
                vectors = [];
                for (var i = 0; i < feature.coordinates.length; i++){
                    var path = [];
                    for (var j = 0; j < feature.coordinates[i].length; j++){
                        var coord = feature.coordinates[i][j];
                        var ll = new google.maps.LatLng(coord[1], coord[0]);
                        path.push(ll);
                    }
                    opts.path = path;
                    vectors.push(new google.maps.Polyline(opts));
                }
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
});