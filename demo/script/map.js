var map;

$(function(){  
	
	map = new google.maps.Map(document.getElementById("map_container"), {
		center: new google.maps.LatLng(39.5756, -105.0205),
		zoom: 14,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});
	
	  
});