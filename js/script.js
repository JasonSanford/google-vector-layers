var map;

var layers = [
	{
		id: 82,
		name: "Parcels",
		url: "http://gis.co.arapahoe.co.us/ArcGIS/rest/services/ArapaMAP/MapServer/82",
		fields: "*",
		uniqueField: "PARCEL_ID",
		scale_range: []
	},{
		id: 93,
		name: "Trails",
		url: "http://gis.co.arapahoe.co.us/ArcGIS/rest/services/ArapaMAP/MapServer/93",
		fields: "*",
		uniqueField: "Shape_Length",
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

$(document).ready(function(){
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(39.5756, -105.0205),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    var layersHtml = '';
    $.each(layers, function(i, o){
    	o.layer = new vectors.AGS({
    		url: o.url,
    		fields: o.fields,
    		uniqueField: o.uniqueField
    	});
    	layersHtml += '<div><input type="checkbox" id="layer-' + o.id + '" class="layer" /> <label for="layer-' + o.id + '">' + o.name + '</label></div>';
    });
    $("#layers").html(layersHtml);
    
    $(".layer").click(function(){
    	var theLayer;
    	for (var i = 0; i < layers.length; i++){
    		var o = layers[i];
    		var layerId = $(this).attr("id").split("-")[1];
    		if (layerId == o.id) theLayer = o;
    	}
    	theLayer.layer.setMap($(this).attr("checked") ? map : null);
    });
});