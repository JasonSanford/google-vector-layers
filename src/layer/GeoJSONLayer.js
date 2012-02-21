//
// Extend Layer to support GeoJSON geometry parsing
//
gvector.GeoJSONLayer = gvector.Layer.extend({
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
    }
});
