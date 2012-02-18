//
// Extend Layer to support EsriJSON geometry parsing
//
gvector.EsriJSONLayer = gvector.Layer.extend({
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
    }
});
