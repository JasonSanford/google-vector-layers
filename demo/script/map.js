var map;

var agsLayers = [
	/*{
		id: 79,
		name: "Subidivisions",
		url: "http://gis.co.arapahoe.co.us/ArcGIS/rest/services/ArapaMAP/MapServer/79",
		fields: "*",
		uniqueField: "CODE",
		scaleRange: [],
		vectorOptions: {
			strokeWeight: 1,
			fillColor: "#004a00",
			fillOpacity: 0.5
		}
	},*/{
		id: 10,
		name: "Sewer Mains",
		url: "http://gisapps.co.union.nc.us/ArcGIS/rest/services/PWSWR/MapServer/10",
		fields: "OBJECTID,WWTP,PIPE_DIA,PIPE_MAT",
		uniqueField: "OBJECTID",
		scaleRange: [15, 21],
		vectorOptions: {
			strokeWeight: 6,
			strokeOpacity: 0.75,
			strokeColor: "#004a00"
		}
	},{
		id: 2,
		name: "Sewer Manholes",
		url: "http://gisapps.co.union.nc.us/ArcGIS/rest/services/PWSWR/MapServer/0",
		fields: "OBJECTID,MH_DIA,MH_DEPTH,GROUND_ELEV",
		uniqueField: "OBJECTID",
		scaleRange: [16, 21],
		vectorOptions: {
			icon: new google.maps.MarkerImage('img/markers/manhole.png',new google.maps.Size(16, 16), new google.maps.Point(0, 0), new google.maps.Point(8, 8))
		}
	}
];

var geocommonsLayers = [
	{
		id: 1,
		name: "Parcels",
		dataset: 111601,
		uniqueField: "OBJECTID"
	}
];

var arcToEarthLayers = [
	{
		id: 2,
		name: "Water Mains",
		url: "http://jeesanford.appspot.com/a2e/data/datasources/wtr_main",
		vectorOptions: {
			strokeColor: "#2f2ff0",
			strokeWeight: 1.5
		}
	},{
		id: 3,
		name: "Hydrants",
		url: "http://jeesanford.appspot.com/a2e/data/datasources/wtr_hydrant",
		vectorOptions: {
			icon: new google.maps.MarkerImage('img/markers/hydrant.png',new google.maps.Size(17, 28), new google.maps.Point(0, 0), new google.maps.Point(7, 8))
		}
	}
];

$(function(){  
	
	map = new google.maps.Map(document.getElementById("map_container"), {
		center: new google.maps.LatLng(35.05399, -80.66651),
		zoom: 17,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});
	
	var agsLayersHtml = '';
	$.each(agsLayers, function(i, o){
		var opts = {
			url: o.url
		};
		if (o.fields) opts.fields = o.fields;
		if (o.uniqueField) opts.uniqueField = o.uniqueField;
		if (o.scaleRange) opts.scaleRange = o.scaleRange;
		if (o.vectorOptions) opts.vectorOptions = o.vectorOptions;
		o.layer = new vectors.AGS(opts);
		agsLayersHtml += '<div><input type="checkbox" id="layer-ags-' + o.id + '" class="layer ags" /> <label for="layer-ags-' + o.id + '">' + o.name + '</label></div>';
	});
	$("#ags-layers").append(agsLayersHtml);
	
	var geocommonsLayersHtml = '';
	$.each(geocommonsLayers, function(i, o){
		var opts = {
			dataset: o.dataset
		};
		if (o.fields) opts.fields = o.fields;
		if (o.uniqueField) opts.uniqueField = o.uniqueField;
		o.layer = new vectors.Geocommons(opts);
		geocommonsLayersHtml += '<div><input type="checkbox" id="layer-geocommons-' + o.id + '" class="layer geocommons" /> <label for="layer-geocommons-' + o.id + '">' + o.name + '</label></div>';
	});
	$("#geocommons-layers").append(geocommonsLayersHtml);
	
	var arcToEarthLayersHtml = '';
	$.each(arcToEarthLayers, function(i, o){
		var opts = {
			url: o.url
		};
		if (o.scaleRange) opts.scaleRange = o.scaleRange;
		if (o.vectorOptions) opts.vectorOptions = o.vectorOptions;
		o.layer = new vectors.ArcToEarth(opts);
		arcToEarthLayersHtml += '<div><input type="checkbox" id="layer-a2e-' + o.id + '" class="layer a2e" /> <label for="layer-a2e-' + o.id + '">' + o.name + '</label></div>';
	});
	$("#a2e-layers").append(arcToEarthLayersHtml);
	
	$(".layer").click(function(){
		var theLayer;
		if ($(this).hasClass("ags")){
	    	for (var i = 0; i < agsLayers.length; i++){
	    		var o = agsLayers[i];
	    		var layerId = $(this).attr("id").split("-")[2];
	    		if (layerId == o.id) theLayer = o;
	    	}
	    }else if ($(this).hasClass("geocommons")){
	    	for (var i = 0; i < geocommonsLayers.length; i++){
	    		var o = geocommonsLayers[i];
	    		var layerId = $(this).attr("id").split("-")[2];
	    		if (layerId == o.id) theLayer = o;
	    	}
	    }else if ($(this).hasClass("a2e")){
	    	for (var i = 0; i < arcToEarthLayers.length; i++){
	    		var o = arcToEarthLayers[i];
	    		var layerId = $(this).attr("id").split("-")[2];
	    		if (layerId == o.id) theLayer = o;
	    	}
	    }
		theLayer.layer.setMap($(this).attr("checked") ? map : null);
	});
	  
});