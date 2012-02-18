gvector.GeoServer = gvector.GeoJSONLayer.extend({
    initialize: function(options) {
        
        // Check for required parameters
        for (var i = 0, len = this._requiredParams.length; i < len; i++) {
            if (!options[this._requiredParams[i]]) {
                throw new Error("No \"" + this._requiredParams[i] + "\" parameter found.");
            }
        }
        
        // Extend Layer to create PRWSF
        gvector.Layer.prototype.initialize.call(this, options);
        
        // _globalPointer is a string that points to a global function variable
        // Features returned from a JSONP request are passed to this function
        this._globalPointer = "GeoServer_" + Math.floor(Math.random() * 100000);
        window[this._globalPointer] = this;
        
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
    },
    
    options: {
        limit: null,
        uniqueField: null
    },
    
    _requiredParams: ["url", "typeName"],
    
    _getFeatures: function() {        
        
        // Build Query
        //http://demo.opengeo.org/geoserver/wfs?SERVICE=WFS&version=1.0.0&request=GetFeature&typeName=tiger:tiger_roads&maxFeatures=500&BBOX=-74.02,40.69,-73.96,40.75&outputFormat=json&format_options=callback:processFeatures
        if (!this.options.showAll) {
            var bounds = this.options.map.getBounds();
            where += where.length ? " AND " : "";
            if (this.options.srid) {
                where += this.options.geomFieldName + " && transform(st_setsrid(st_makebox2d(st_point(" + sw.lng() + "," + sw.lat() + "),st_point(" + ne.lng() + "," + ne.lat() + ")),4326)," + this.options.srid + ")";
            } else {
                where += "transform(" + this.options.geomFieldName + ",4326) && st_setsrid(st_makebox2d(st_point(" + sw.lng() + "," + sw.lat() + "),st_point(" + ne.lng() + "," + ne.lat() + ")),4326)";
            }
        }
        
        // Limit returned features
        if (this.options.limit) {
            where += (where.length ? " " : "") + "limit " + this.options.limit;
        }
        
        // Build fields
        var fields = (this.options.fields.length ? this.options.fields + "," : "") + "st_asgeojson(transform(" + this.options.geomFieldName + ",4326)) as geojson";
        
        // Build URL
        var url = this.options.url + "v1/ws_geo_attributequery.php" + // The attribute query service
            "?parameters=" + encodeURIComponent(where) + // The SQL where statement
            "&geotable=" + this.options.geotable + // The table name
            "&fields=" + encodeURIComponent(fields) + //
            "&format=json" + // JSON please
            "&callback=" + this._globalPointer + "._processFeatures"; // Need this for JSONP
        
        // JSONP request
        this._makeJsonpRequest(url);
    }    
});
