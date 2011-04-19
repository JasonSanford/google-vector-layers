var vectors = {

    AGS: function(opts){
        
        //if (!opts.url) Error out!
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
                url: opts.url
            },
            
            _show: function(){
                console.log("I'm going to show this layer!");
                this._addListener();
                // TODO - Not sure if "google.maps.event.trigger" exists
                google.maps.event.trigger(this._listener);
            },
            
            _hide: function(){
                console.log("I'm going to hide this layer!");
                // TODO - Not sure if "google.maps.event.removeListener" exists
                if (this._listener) google.maps.event.removeListener(this._listener);
                for (var i = 0; i < this._vectors.length; i++){
                	this._vectors[i].setMap(null);
                }
                this._vectors = [];
            },
            
            _addListener: function(){
            	this._listener = google.maps.event.addListener(this._options.map, "idle", function(){
            		this._getFeatures(this._options.map.getBounds());
            	})
            },
            
            _getFeatures: function(bounds){
            	var xMin = bounds.getSouthWest().lng();
            	var yMin = bounds.getSouthWest().lat();
            	var xMax = bounds.getNorthEast().lng();
            	var yMax = bounds.getNorthEast().lat();
            	var url = this._options.url + "query?returnGeometry=true&inSR=4326&outSR=4326&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&f=json&outFields=" + this._options.fields + "&where=" + this._options.where + "&geometry=" + xMin + "," + yMin + "," + xMax + "," + yMax;
            	// Assuming you're using jQuery. You can replace this with your choice of XMLHTTPRequest
            	jQuery.getJSON(url, this._showFeatures);
            },
            
            _showFeatures: function(data){
            	// TODO - Not sure the Esri JSON format for feature count
            	if (!(data.features && data.features.length)){
            		for (var i = 0; i < data.features.length; i++){
            			var vector = _esriJsonToGoogle(data.features[i]);
            			vector.setMap(this._options.map);
            			this._vectors.push(vector);
            		}
            	}
            },
            
            _esriJsonToGoogle: function(feature){
            	// TODO - Not sure the Esri geometry format for feature count
            	var vector;
            	if (feature.geometry.x && feature.geometry.y){
            		vector = new google.maps.Marker({
            			position: new google.maps.LatLng(feature.geometry.y, feature.geometry.x)
            		});
            	}else if(feature.geometry.paths){
            		var path = [];
            		for (var i = 0; i < feature.geometry.paths.length; i++){
            			for (var i2 = 0; i2 < feature.geometry.paths[i].length; i2++){
            				path.push(new google.maps.LatLng(feature.geometry.paths[i][i2].y feature.geometry.paths[i][i2].x));
            			}
            		}
            		vector = new google.maps.Polyline({
            			path: path
            		});
            	}else if(feature.geometry.rings){
            		
            	}
            	return vector;
            }
        };
    }

};