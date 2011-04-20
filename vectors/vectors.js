var vectors = {

    AGS: function(opts){
        
        // TODO - Error out if we don't have url or uniqeField members
        // TODO - Find a better way to detect duplicate features than relying on a user inputing a uniqueField paramter
        //if (!opts.url) Error out!
        // if(!opts.uniqueField) Error out!
        if (opts.url.substr(opts.url.length-1, 1) !== "/") opts.url += "/";
        
        var layer = {
            
            setMap: function(map){
            	this._options.map = map;
            	this[map ? "_show" : "_hide"]();
            },
            
            getMap: function(){
            	return this._options.map;
            },
            
            setOptions: function(o){
                // TODO - Merge new options (o) with current options (this._options)
            },
            
            _vectors: [],
            
            _options: {
                fields: opts.fields || "",
                dynamic: opts.dynamic || false,
                where: opts.where || "1=1",
                map: opts.map || null,
                uniqueField: opts.uniqueField || null,
                url: opts.url
            },
            
            _show: function(){
                this._addListener();
                google.maps.event.trigger(this._options.map, "idle");
            },
            
            _hide: function(){
                if (this._listener) google.maps.event.removeListener(this._listener);
                this._clearFeatures();
            },
            
            _clearFeatures: function(){
            	for (var i = 0; i < this._vectors.length; i++){
            		this._vectors[i].vector.setMap(null);
            	}
            	this._vectors = [];
            },
            
            _addListener: function(){
            	var me = this;
            	this._listener = google.maps.event.addListener(this._options.map, "idle", function(){
            		me._getFeatures();
            	});
            },
            
            _getFeatures: function(){
            	// If we don't have a uniqueField value
            	// it's hard to tell if new features are
            	//duplicates so clear them all
            	if (!this._options.uniqueField) this._clearFeatures();
            	
            	// Get coordinates for SoutWest and NorthEast corners of current map extent,
            	// will use later when building "esriGeometryEnvelope"
            	var bounds = this._options.map.getBounds();
            	var xMin = bounds.getSouthWest().lng();
            	var yMin = bounds.getSouthWest().lat();
            	var xMax = bounds.getNorthEast().lng();
            	var yMax = bounds.getNorthEast().lat();
            	
            	// Build URL
            	var url = this._options.url + "query" + /* Query this layer */
            	"?returnGeometry=true" + /* Of course we want geometry */
				"&inSR=4326&outSR=4326" + /* request/receive geometry in WGS 84 Lat/Lng. Esri got this right.*/
				"&spatialRel=esriSpatialRelIntersects" + /* Find stuff that intersects this envelope */
				"&f=json" + /* Wish it were GeoJSON, but we'll take it */
				"&outFields=" + this._options.fields + /* Please return the following fields */
				"&where=" + this._options.where + /* By default return all (1=1) but could pass SQL statement (value<90) */
				"&geometryType=esriGeometryEnvelope" + /* Our "geometry" url param will be an envelope */
				"&geometry=" + xMin + "," + yMin + "," + xMax + "," + yMax + /* Build envelope geometry */
				"&callback=?"; /* Need this for jQuery JSONP */
				
            	// "this" means something different inside "jQuery.getJSON" so assignt it to "me"
            	var me = this;
            	
            	// Assuming you're using jQuery. You can replace this with your choice of XMLHTTPRequest
            	jQuery.getJSON(url, function(data){
            		
            		// If "data.features" exists and there's more than one feature in the array
            		if (data.features && data.features.length){
            			
            			// Loop through the return features
            			for (var i = 0; i < data.features.length; i++){
            			
            				// If we have a "uniqueField" for this layer
            				if (me._options.uniqueField){
            					
            					// All objects are assumed to be false until proven true (remember COPS?)
	            				var onMap = false;
	            				
	            				// Loop through all of the features currently on the map
	            				for (var i2 = 0; i2 < me._vectors.length; i2++){
	            				
	            					// Does the "uniqueField" attribute for this feature match the feature on the map
	            					if (data.features[i].attributes[me._options.uniqueField] == me._vectors[i2].attributes[me._options.uniqueField]){
	            						// The feature is already on the map
	            						onMap = true;
	            					}
	            				}
	            			}
	            			
	            			// If the feature isn't already or the map OR the "uniqueField" attribute doesn't exist
            				if (!onMap || !me._options.uniqueField){
            					
            					// Convert Esri JSON to Google Maps vector (Point, Polyline, Polygon)
            					me._esriJsonToGoogle(data.features[i]);
            					
            					// Show this vector on the map
            					data.features[i].vector.setMap(me._options.map);
            					
            					// Store the vector in an array so we can remove it later
            					me._vectors.push(data.features[i]);
            				
            				}
            				
            			}
            			
            		}
            		
            	});
            },
            
            _esriJsonToGoogle: function(feature){
            	var vector;
            	if (feature.geometry.x && feature.geometry.y){
            		vector = new google.maps.Marker({
            			position: new google.maps.LatLng(feature.geometry.y, feature.geometry.x)
            		});
            	}else if(feature.geometry.paths){
            		var path = [];
            		for (var i = 0; i < feature.geometry.paths.length; i++){
            			for (var i2 = 0; i2 < feature.geometry.paths[i].length; i2++){
            				path.push(new google.maps.LatLng(feature.geometry.paths[i][i2][1], feature.geometry.paths[i][i2][0]));
            			}
            		}
            		vector = new google.maps.Polyline({
            			path: path
            		});
            	}else if(feature.geometry.rings){
            		var paths = [];
            		for (var i = 0; i < feature.geometry.rings.length; i++){
            			var path = [];
            			for (var i2 = 0; i2 < feature.geometry.rings[i].length; i2++){
            				path.push(new google.maps.LatLng(feature.geometry.rings[i][i2][1], feature.geometry.rings[i][i2][0]));
            			}
            			paths.push(path);
            		}
            		vector = new google.maps.Polygon({
            			paths: paths
            		});
            	}
            	feature.vector = vector;
            }
        };
        
        return layer;
    }

};