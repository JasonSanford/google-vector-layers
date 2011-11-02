var map, ags_swr_main, ags_swr_mh, geocommons_parcels, a2e_wtr_main, a2e_hydrants;

$(function(){  
	
	// Create Map
	map = new google.maps.Map(document.getElementById("map_container"), {
		center: new google.maps.LatLng(35.05399, -80.66651),
		zoom: 17,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});
	
	// Create Vector Layers
	ags_swr_main = new vectors.AGS({
		url: "http://gisapps.co.union.nc.us/ArcGIS/rest/services/PWSWR/MapServer/10",
		fields: "OBJECTID,WWTP,PIPE_DIA,PIPE_MAT",
		uniqueField: "OBJECTID",
		scaleRange: [15, 21],
		vectorOptions: {
			strokeWeight: 6,
			strokeOpacity: 0.5,
			strokeColor: "#004a00"
		}
	});
	
	ags_swr_mh = new vectors.AGS({
		url: "http://gisapps.co.union.nc.us/ArcGIS/rest/services/PWSWR/MapServer/0",
		fields: "OBJECTID,MH_DIA,MH_DEPTH,GROUND_ELEV",
		uniqueField: "OBJECTID",
		scaleRange: [16, 21],
		vectorOptions: {
			icon: new google.maps.MarkerImage('img/markers/manhole.png',new google.maps.Size(16, 16), new google.maps.Point(0, 0), new google.maps.Point(8, 8))
		}
	});
	
	geocommons_parcels = new vectors.Geocommons({
		dataset: 131518,
		uniqueField: "name",
		scaleRange: [17, 21],
		vectorOptions: {
			fillColor: "#4D8FFF",
			fillOpacity: 0.5,
			strokeWeight: 2,
			strokeColor: "#DFFF7A"
		}
	});
	
	a2e_wtr_main = new vectors.A2E({
		url: "http://jeesanford.appspot.com/a2e/data/datasources/wtr_main",
		scaleRange: [15, 21],
		vectorOptions: {
			strokeColor: "#2f2ff0",
			strokeWeight: 1.5
		}
	});
	
	a2e_hydrants = new vectors.A2E({
		url: "http://jeesanford.appspot.com/a2e/data/datasources/wtr_hydrant",
		scaleRange: [16, 21],
		vectorOptions: {
			icon: new google.maps.MarkerImage('img/markers/hydrant.png',new google.maps.Size(17, 28), new google.maps.Point(0, 0), new google.maps.Point(7, 8))
		}
	});
	
	// Respond to checkbox clicks
	$(".layer").click(function(){
		eval($(this).attr("id")).setMap($(this).attr("checked") ? map : null);
	});
	  
});