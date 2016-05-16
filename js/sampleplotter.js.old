// Load in GeoJSON
function loadFile() {
	var input, file, fr;

	// Check support
	if (typeof window.FileReader !== 'function') {
		alert("The file API isn't supported on this browser yet.");
		return;
	}

	input = document.getElementById('fileinput');

	if (!input) {alert("Um, couldn't find the fileinput element.");}
	else if (!input.files) {alert("This browser doesn't seem to support the `files` property of file inputs.");}
	else if (!input.files[0]) {alert("Please select a file before clicking 'Submit'");}
	else if (input.files[0]['name'].split('.').pop() != 'geojson') {alert("Only .geojson extensions are supported.")}
	else {
		file = input.files[0];
		fr = new FileReader();
		fr.onload = parseJSON;
		fr.readAsText(file);
	}
}

function parseJSON(e) {
	var lines = e.target.result;
	var inJSON = JSON.parse(lines);
	sampleType(inJSON)
}

// Create range from 0 to k-1
function range(k) {
	return Array.apply(null, Array(k)).map(function (_, i) {return i;})
}

function sampleType(inJSON) {
	if ($('input[name="sample_type"]:checked').val() == "random_sample"){
		randomSample(inJSON)
	}
	else if ($('input[name="sample_type"]:checked').val() == "systematic_sample") {
		systematicSample(inJSON)
	}
	else if ($('input[name="sample_type"]:checked').val() == "equidistant_sample") {
		equidistantSample(inJSON)
	}
	else {
		alert("You must choose a sample type.");
	}
}

function getExtent(inJSON) {
	for (var n in range(inJSON['features'][0]['geometry']['coordinates'][0][0]['length'])) {
		// Set starting values on first run
		if (minX == undefined) {
			var minX = maxX = inJSON['features'][0]['geometry']['coordinates'][0][0][0][0];
			var minY = maxY = inJSON['features'][0]['geometry']['coordinates'][0][0][0][1];
		}

		// Update X min/max
		var x = inJSON['features'][0]['geometry']['coordinates'][0][0][n][0];
		if (x < minX) {
			var minX = x;
		}
		else if (x > maxX) {
			var maxX = x;
		}

		// Update Y min/max
		var y = inJSON['features'][0]['geometry']['coordinates'][0][0][n][1];
		if (y < minY) {
			var minY = y;
		}
		else if (y > maxY) {
			var maxY = y;
		}
	}
	return [minX, maxX, minY, maxY]
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
	
function displayOnMap(xCenterMap,yCenterMap,outJSON,inJSON) {
	// Remove previous map on resubmission
	if (document.getElementById('map').style['position'] != "") {
		map.remove()
	}
	// Make map and center it
	map = L.map('map').setView([yCenterMap,xCenterMap]);
	// Add both GeoJSONs
	var layers = L.geoJson([inJSON,outJSON]).addTo(map);
	// Fit bounds to layers
    map.fitBounds(layers.getBounds());
}

function randomSample(inJSON) {

	var extent = getExtent(inJSON);  // Extent: minx, maxx, miny, maxy
	var rangeX = extent[1]-extent[0];
	var rangeY = extent[3]-extent[2];
	var n = Number(document.getElementById("sample_number").value);

	// Create object to form geojson
	var geojson = {};
	geojson['type'] = "FeatureCollection";
	geojson['crs'] = { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }
	geojson['features'] = [];

	// Generate points
	for (var fid in range(n)) {
		var newPoint = {
			"type": "Feature",
			"properties": { 
				"FID": fid 
			}, 
			"geometry": { 
				"type": "MultiPoint", 
				"coordinates": [[ 
					extent[0]+(rangeX*Math.random()), 
					extent[2]+(rangeY*Math.random())
				]] 
			}
		}
		geojson['features'].push(newPoint)
	}
	var json = JSON.stringify(geojson);
	var blob = new Blob([json], {type: "application/json"});
	var url  = URL.createObjectURL(blob)

	var a = document.createElement('a');
	a.download    = "SamplePoints.geojson";
	a.href        = url;
	a.textContent = "Download Sample Points";
	a.className   = "btn btn-default"

	document.getElementById('save-as').replaceChild(a,document.getElementById('save-as').firstChild);
	displayOnMap((extent[0]+(0.5*rangeX)),(extent[2]+(0.5*rangeY)),geojson,inJSON)
}

function systematicSample(inJSON) {

	var extent = getExtent(inJSON);  // Extent: minx, maxx, miny, maxy
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
	var geojson = {};
	geojson['type'] = "FeatureCollection";
	geojson['crs'] = { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }
	geojson['features'] = [];

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

			var newPoint = {
				"type": "Feature",
				"properties": { 
					"FID": fid 
				}, 
				"geometry": { 
					"type": "MultiPoint", 
					"coordinates": [[x,y]] 
				}
			}
			geojson['features'].push(newPoint)
			fid++
		}		
	}
		
	var json = JSON.stringify(geojson);
	var blob = new Blob([json], {type: "application/json"});
	var url  = URL.createObjectURL(blob)

	var a = document.createElement('a');
	a.download    = "SamplePoints.geojson";
	a.href        = url;
	a.textContent = "Download Sample Points";
	a.className   = "btn btn-default"

	document.getElementById('save-as').replaceChild(a,document.getElementById('save-as').firstChild);
	displayOnMap((extent[0]+(0.5*rangeX)),(extent[2]+(0.5*rangeY)),geojson,inJSON)
}

function equidistantSample(inJSON) {

	var extent = getExtent(inJSON);  // Extent: minx, maxx, miny, maxy
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
		
	// Create object to form geojson
	var geojson = {};
	geojson['type'] = "FeatureCollection";
	geojson['crs'] = { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }
	geojson['features'] = [];

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
				
				var newPoint = {
					"type": "Feature",
					"properties": { 
						"FID": fid 
					}, 
					"geometry": { 
						"type": "MultiPoint", 
						"coordinates": [[x,y]] 
					}
				}
				geojson['features'].push(newPoint)
				fid++
			}
			else {
				x = xStart + ((u)*d) + (d/2)

				if (rot != 0) {
					newPoint = rotate_point(x,y,centerX,centerY,rot)
					var x = newPoint.x;
					var y = newPoint.y;
				}

				var newPoint = {
					"type": "Feature",
					"properties": { 
						"FID": fid 
					}, 
					"geometry": { 
						"type": "MultiPoint", 
						"coordinates": [[x,y]] 
					}
				}
				geojson['features'].push(newPoint)
				fid++
			}
		}
	}
		
	var json = JSON.stringify(geojson);
	var blob = new Blob([json], {type: "application/json"});
	var url  = URL.createObjectURL(blob)

	var a = document.createElement('a');
	a.download    = "SamplePoints.geojson";
	a.href        = url;
	a.textContent = "Download Sample Points";
	a.className   = "btn btn-default"

	document.getElementById('save-as').replaceChild(a,document.getElementById('save-as').firstChild);
	displayOnMap((extent[0]+(0.5*rangeX)),(extent[2]+(0.5*rangeY)),geojson,inJSON)
}