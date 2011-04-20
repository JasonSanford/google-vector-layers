var vectors = {

    AGS: function(opts){
        
        // TODO - Error out if we don't have url or uniqeField members
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
                url: opts.url,
                uniqueField: opts.uniqueField
            },
            
            _show: function(){
                console.log("I'm going to show this layer!");
                this._addListener();
                google.maps.event.trigger(this._options.map, "idle");
            },
            
            _hide: function(){
                console.log("I'm going to hide this layer!");
                if (this._listener) google.maps.event.removeListener(this._listener);
                for (var i = 0; i < this._vectors.length; i++){
                	this._vectors[i].vector.setMap(null);
                }
                this._vectors = [];
            },
            
            _addListener: function(){
            	console.log("Added listener");
            	var me = this;
            	this._listener = google.maps.event.addListener(this._options.map, "idle", function(){
            		me._getFeatures();
            		console.log("idling " + Math.random());
            	});
            },
            
            _getFeatures: function(){
            	var bounds = this._options.map.getBounds();
            	console.log("Getting Features");
            	var xMin = bounds.getSouthWest().lng();
            	var yMin = bounds.getSouthWest().lat();
            	var xMax = bounds.getNorthEast().lng();
            	var yMax = bounds.getNorthEast().lat();
            	var url = this._options.url + "query?returnGeometry=true&inSR=4326&outSR=4326&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&f=json&outFields=" + this._options.fields + "&where=" + this._options.where + "&geometry=" + xMin + "," + yMin + "," + xMax + "," + yMax + "&callback=?";
            	// Assuming you're using jQuery. You can replace this with your choice of XMLHTTPRequest
            	var me = this;
            	jQuery.getJSON(url, function(data){
            		if (data.features && data.features.length){
            			for (var i = 0; i < data.features.length; i++){
            				var onMap = false;
            				for (var i2 = 0; i2 < me._vectors.length; i2++){
            					if (data.features[i].attributes[me._options.uniqueField] == me._vectors[i2].attributes[me._options.uniqueField]) onMap = true;
            				}
            				if (!onMap){
            					me._esriJsonToGoogle(data.features[i]);
            					data.features[i].vector.setMap(me._options.map);
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