var map;

var agsLayers = [
	{
		id: 79,
		name: "Subidivisions",
		url: "http://gis.co.arapahoe.co.us/ArcGIS/rest/services/ArapaMAP/MapServer/79",
		fields: "*",
		uniqueField: "CODE",
		scale_range: []
	},{
		id: 93,
		name: "Trails",
		url: "http://gis.co.arapahoe.co.us/ArcGIS/rest/services/ArapaMAP/MapServer/93",
		/*fields: "*",
		uniqueField: "Shape_Length",*/
		scale_range: []
	},{
		id: 2,
		name: "Sex Offenders",
		url: "http://gis.co.arapahoe.co.us/ArcGIS/rest/services/ArapaMAP/MapServer/2",
		fields: "*",
		uniqueField: "Reg_Num",
		scale_range: []
	}
];

var geocommonsLayers = [
	{
		id: 1,
		name: "Real Estate",
		dataset: 68302,
		uniqueField: "name"
	}
];

var arcToEarthLayers = [
	{
		id: 2,
		name: "Sewer Lines",
		url: "http://jeesanford.appspot.com/a2e/data/datasources/swr_gravity"
	},{
		id: 3,
		name: "Sewer Man Holes",
		url: "http://jeesanford.appspot.com/a2e/data/datasources/swr_mh"
	},{
		id: 4,
		name: "Parcels",
		url: "http://jeesanford.appspot.com/a2e/data/datasources/parcels"
	}
];

$(document).ready(function(){
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(39.5756, -105.0205),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    var agsLayersHtml = '';
    $.each(agsLayers, function(i, o){
    	var opts = {
    		url: o.url
    	};
    	if (o.fields) opts.fields = o.fields;
    	if (o.uniqueField) opts.uniqueField = o.uniqueField;
    	o.layer = new vectors.AGS(opts);
    	agsLayersHtml += '<div><input type="checkbox" id="layer-ags-' + o.id + '" class="layer ags" /> <label for="layer-ags-' + o.id + '">' + o.name + '</label></div>';
    });
    $("#ags-layers").html(agsLayersHtml);
    
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
    $("#geocommons-layers").html(geocommonsLayersHtml);
    
    var arcToEarthLayersHtml = '';
    $.each(arcToEarthLayers, function(i, o){
    	var opts = {
    		url: o.url
    	};
    	o.layer = new vectors.ArcToEarth(opts);
    	arcToEarthLayersHtml += '<div><input type="checkbox" id="layer-a2e-' + o.id + '" class="layer a2e" /> <label for="layer-a2e-' + o.id + '">' + o.name + '</label></div>';
    });
    $("#a2e-layers").html(arcToEarthLayersHtml);
    
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