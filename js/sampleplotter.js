// Create range from 0 to k-1
function range(k) {
	return Array.apply(null, Array(k)).map(function (_, i) {return i;})
}

function genPlots(inJSON) {
	if ($('input[name="sample_type"]:checked').val() == "random_sample"){
		randomSample(inJSON)
	}
	else if ($('input[name="sample_type"]:checked').val() == "systematic_sample") {
		systematicSample(inJSON)
	}
	else if ($('input[name="sample_type"]:checked').val() == "equidistant_sample") {
		equidistantSample(inJSON)
	}
	else if ($('input[name="sample_type"]:checked').val() == undefined) {
		alert("You must first upload a dataset.")
	}
	else {
		alert("You must choose a sample type.");
	}
}

function rotate_point(pointX, pointY, originX, originY, angle) {
	angle = angle * Math.PI / 180.0;
	//var originX = 15;
	//var originY = 15;
	return {
		x: (Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY)) + originX,
		y: (Math.sin(angle) * (pointX-originX) + Math.cos(angle)* (pointY-originY)) + originY
	};
}
	
function displayOnMap(inJSON,outJSON) {
	// Remove previous map on resubmission
	//if (document.getElementById('map').style['position'] != "") {
	//	map.remove()
	//}
	// Make map
	//map = L.map('map');

	// Add both GeoJSONs
	//var indata = L.geoJson([inJSON,outJSON])
	//indata.addTo(map);
	//map.fitBounds(indata.getBounds());
	if (typeof geojsonLayer != 'undefined'){ m.removeLayer(geojsonLayer); };
	geojsonLayer = L.geoJson([outJSON]);
	geojsonLayer.addTo(m);
}

function randomSample(inJSON) {
	var bounds =  L.geoJson(inJSON).getBounds();
	var extent = [bounds._southWest.lng, bounds._northEast.lng, bounds._southWest.lat, bounds._northEast.lat]  // Extent: minx, maxx, miny, maxy
	var rangeX = extent[1]-extent[0];
	var rangeY = extent[3]-extent[2];
	var n = Number(document.getElementById("sample_number").value);

	// Generate points
	var points = [];
	for (var fid in range(n)) {
		var newPoint = turf.point(
			[
				extent[0]+(rangeX*Math.random()), 
				extent[2]+(rangeY*Math.random())
			],
			{ "fid": fid }
		);
		points.push(newPoint)
	}

	// Create output geojson
	var outJSON = turf.featurecollection(points);

	exportAndDisplay(inJSON,outJSON)
}

function systematicSample(inJSON) {

	var bounds =  L.geoJson(inJSON).getBounds();
	var extent = [bounds._southWest.lng, bounds._northEast.lng, bounds._southWest.lat, bounds._northEast.lat]  // Extent: minx, maxx, miny, maxy
	var rangeX = extent[1]-extent[0];
	var rangeY = extent[3]-extent[2];
	var centerX = (extent[0]+extent[1])/2;
	var centerY = (extent[2]+extent[3])/2;
	var n = Number(document.getElementById("sample_number").value);
	var rot = Number(document.getElementById("rotation-input").value);

	/*if (rot != 0) {
		var c = Math.sqrt(Math.pow(Math.abs(extent[0]-extent[1]),2)+Math.pow(Math.abs(extent[2]-extent[3]),2));
		var n = parseInt(n*(Math.pow(c,2))/(Math.abs(extent[0]-extent[1])*Math.abs(extent[2]-extent[3])));
		var extent = [extent[0]-((c-Math.abs(extent[0]-extent[1]))/2),extent[1]+((c-Math.abs(extent[0]-extent[1]))/2),extent[2]-((c-Math.abs(extent[2]-extent[3]))/2),extent[3]+((c-Math.abs(extent[2]-extent[3]))/2)];
	}*/
		
	// Create object to form geojson
	var points = [];

	// Calculate variables
	var dX = Math.max(extent[0],extent[1])-Math.min(extent[0],extent[1]);
	var dY = Math.max(extent[2],extent[3])-Math.min(extent[2],extent[3]);
	var nX = parseInt(Math.round(Math.sqrt((n*dX)/dY),0));
	var nY = parseInt(Math.round(Math.sqrt((n*dY)/dX),0));
	var d = dX/(nX);

	var xStart = extent[0]+(d*Math.random());
	var yStart = extent[2]+(d*Math.random());
	var fid = 0;

	for (var u in range(nX)) {
		var x = xStart + (u*d);
		for (var v in range(nY)) {
			var y = yStart + (v*d);

			if (rot != 0) {
				newPoint = rotate_point(x,y,centerX,centerY,rot)
				var x = newPoint.x;
				var y = newPoint.y;
				console.log(x,y)
			}

			var newPoint = turf.point(
				[x,y],
				{ "fid": fid }
			);
			points.push(newPoint)
			fid++
		}		
	}
		
	// Create output geojson
	var outJSON = turf.featurecollection(points);

	exportAndDisplay(inJSON,outJSON)
}

function equidistantSample(inJSON) {

	var bounds =  L.geoJson(inJSON).getBounds();
	var extent = [bounds._southWest.lng, bounds._northEast.lng, bounds._southWest.lat, bounds._northEast.lat]  // Extent: minx, maxx, miny, maxy
	var rangeX = extent[1]-extent[0];
	var rangeY = extent[3]-extent[2];
	var centerX = (extent[0]+extent[1])/2;
	var centerY = (extent[2]+extent[3])/2;
	var n = Number(document.getElementById("sample_number").value);
	var rot = Number(document.getElementById("rotation-input").value);

	if (rot != 0) {
		var c = Math.sqrt(Math.pow(Math.abs(extent[0]-extent[1]),2)+Math.pow(Math.abs(extent[2]-extent[3]),2));
		var n = parseInt(n*(Math.pow(c,2))/(Math.abs(extent[0]-extent[1])*Math.abs(extent[2]-extent[3])));
		var extent = [extent[0]-((c-Math.abs(extent[0]-extent[1]))/2),extent[1]+((c-Math.abs(extent[0]-extent[1]))/2),extent[2]-((c-Math.abs(extent[2]-extent[3]))/2),extent[3]+((c-Math.abs(extent[2]-extent[3]))/2)];
	}
		
	var points = [];

	// Calculate variables
	var dX = Math.max(extent[0],extent[1])-Math.min(extent[0],extent[1]);
	var dY = Math.max(extent[2],extent[3])-Math.min(extent[2],extent[3]);
	var nX = parseInt(Math.round((-1+Math.sqrt(1-(16*(-2*Math.sqrt(2)*dX*n/dY))))/8,0));
	var nY = parseInt(Math.round(n/nX,0));
	var d = dX/(nX);

	var xStart = extent[0]+((d/2)*Math.random());
	var yStart = extent[2]+((d*Math.sqrt(2)/2)*Math.random());
	var fid = 0;

	for (var v in range(nY)) {
		y = yStart + (v*d*Math.sqrt(2)/2)
		for (var u in range(nX)){
			if (v%2==0){
				x = xStart + (u*d)

				if (rot != 0) {
					newPoint = rotate_point(x,y,centerX,centerY,rot)
					var x = newPoint.x;
					var y = newPoint.y;
				}
				
				var newPoint = turf.point(
					[x,y],
					{ "fid": fid }
				);
				points.push(newPoint)
				fid++
			}
			else {
				x = xStart + ((u)*d) + (d/2)

				if (rot != 0) {
					newPoint = rotate_point(x,y,centerX,centerY,rot)
					var x = newPoint.x;
					var y = newPoint.y;
				}

				var newPoint = turf.point(
					[x,y],
					{ "fid": fid }
				);
				points.push(newPoint)
				fid++
			}
		}
	}
		
	// Create output geojson
	var outJSON = turf.featurecollection(points);

	exportAndDisplay(inJSON,outJSON)
}

function exportAndDisplay (inJSON,outJSON) {
	var json = JSON.stringify(outJSON);
	var blob = new Blob([json], {type: "application/json"});
	var url  = URL.createObjectURL(blob)

	var a = document.createElement('a');
	a.download    = "SamplePoints.geojson";
	a.href        = url;
	a.textContent = "Download Sample Points";
	a.className   = "btn btn-default"

	document.getElementById('save-as').replaceChild(a,document.getElementById('save-as').firstChild);
	displayOnMap(inJSON,outJSON)
}