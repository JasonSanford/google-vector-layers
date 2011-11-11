# Update

Some of these docs are out of date and incorrect as I've been making lots of improvements recently. Stay tuned for a blog post over at http://geojason.info

This library will add Google Maps vector (Point, Polyline, Polygon) layers from multiple geo web services including ArcGIS Server, GeoIQ, Arc2Earth, etc.

## ArcGIS Server (vectors.AGS)

ArcGIS Server layers have one mandatory option, a url.

I suggest also adding a uniqueField option. You can most likely use your OBJECTID field if you've left this visible in your map service. This helps determine if the features returned by the API request are already on the map. If no uniqueField option is given, all features are removed after each map pan/zoom.  :-( I'm sure there's a better way, but that's what I've got for now.
    
    var myAgsLayer = new vectors.AGS({
        url: "http://my-arcgis-server.com/arcgis/rest/services/MyMapService/MapServer/11" 
    });
    myAgsLayer.setMap(myMap);
    
Some other optional parameters for ArcGIS Server layers:

* fields (string) - comma separated fields you want returned, returns all fields by default
* where (string) - additional SQL where clause to filter features, return all features by default - ex. "road_type = 'paved'"
* scaleRange (array) - min and max Google Maps scales to draw this feature - ex. [13, 21]
* vectorOptions (object) - Google Maps vector options specific to feature type - ex. {strokeWeight: 3, strokeColor: "#ff0099"}
* map (google.maps.Map object) - if you pass this in initially, there's no need to call setMap(my_map)
    
## Arc2Earth (vectors.A2E)

Arc2Earth layers have one mandatory option, a url.

    myA2eLayer = new vectors.A2E({
    	url: "http://jeesanford.appspot.com/a2e/data/datasources/wtr_main"
    });

Some other optional parameters for Arc2Earth layers:

* where (string) - additional SQL where clause to filter features, return all features by default - ex. "PROJECT_NAME='Stoney Creek'"
* scaleRange (array) - min and max Google Maps scales to draw this feature - ex. [13, 21]
* vectorOptions (object) - Google Maps vector options specific to feature type - ex. {strokeWeight: 3, strokeColor: "#ff0099"}
* map (google.maps.Map object) - if you pass this in initially, there's no need to call setMap(my_map)https://github.com/JasonSanford/google-vector-layers/blob/master/README

## Geocommons (vectors.Geocommons)

Geocommons layers have one mandatory option, a dataset. All datasets in Geocommons have a unique dataset id.

There is currently an issue requesting GeoJSON features from Geocommons where other URL parameters aren't honored. For now, all features are pull with each map pan/zoom. (not ideal!) For details see http://getsatisfaction.com/geocommons/topics/features_api_doesnt_honor_url_parameters_when_requesting_geojson

    myGeocommonsLayer = new vectors.Geocommons({
        dataset: 111601
    });

Some other optional parameters for Geocommons layers:

* scaleRange (array) - min and max Google Maps scales to draw this feature - ex. [13, 21]
* vectorOptions (object) - Google Maps vector options specific to feature type - ex. {strokeWeight: 3, strokeColor: "#ff0099"}
* map (google.maps.Map object) - if you pass this in initially, there's no need to call setMap(my_map)