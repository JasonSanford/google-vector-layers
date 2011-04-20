var map;

var layers = [
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

$(document).ready(function(){
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(39.5756, -105.0205),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    var layersHtml = '';
    $.each(layers, function(i, o){
    	var opts = {
    		url: o.url
    	};
    	if (o.fields) opts.fields = o.fields;
    	if (o.uniqueField) opts.uniqueField = o.uniqueField;
    	o.layer = new vectors.AGS(opts);
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