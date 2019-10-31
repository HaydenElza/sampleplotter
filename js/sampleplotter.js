// Create range from 0 to k-1
function range(k) {
	return Array.apply(null, Array(k)).map(function (_, i) {return i;})
}

function genPlots(inJSON) {
	var n = Number(document.getElementById("sample_number").value);
	var check_topology = $('input[name="check_topology"]:checked').val();
	var rot = Number(document.getElementById("rotation-input").value)
	var extent = turf.bbox(inJSON);

	// Adjust n for topology check
	if (check_topology) {var n = parseInt(n * (turf.area(turf.bboxPolygon(turf.bbox(inJSON)))/turf.area(inJSON)) );}
	// Adjust n for rotation
	if (rot != 0) {
		var c = Math.sqrt(Math.pow(Math.abs(extent[0]-extent[2]),2)+Math.pow(Math.abs(extent[1]-extent[3]),2));
		var n = parseInt(n*(Math.pow(c,2))/(Math.abs(extent[0]-extent[2])*Math.abs(extent[1]-extent[3])));
		var extent = [extent[0]-((c-Math.abs(extent[0]-extent[2]))/2),extent[1]-((c-Math.abs(extent[1]-extent[3]))/2),extent[2]+((c-Math.abs(extent[0]-extent[2]))/2),extent[3]+((c-Math.abs(extent[1]-extent[3]))/2)];
	}
	
	// Sample types
	if ($('input[name="sample_type"]:checked').val() == "random_sample"){
		var points = randomSample(inJSON,n,extent);
		var outJSON = turf.featureCollection(points);
	}
	else if ($('input[name="sample_type"]:checked').val() == "systematic_sample") {
		var points = systematicSample(inJSON,n,extent);
		var outJSON = turf.featureCollection(points);
	}
	else if ($('input[name="sample_type"]:checked').val() == "equidistant_sample") {
		var points = equidistantSample(inJSON,n,extent);
		var outJSON = turf.featureCollection(points);
	}
	else if ($('input[name="sample_type"]:checked').val() == "hex_grid") {
		var outJSON = hexGrid(inJSON,n,extent,check_topology);
	}
	else if ($('input[name="sample_type"]:checked').val() == undefined) {
		alert("You must choose a sample type.")
	}

	// Rotate
	if (rot != 0) {
		var origin  = turf.center(outJSON);
		var originX = origin.geometry.coordinates[0];
		var originY = origin.geometry.coordinates[1];
		
		var rotPoints = [];
		for (i in range(outJSON.features.length)) {
			var pointX = outJSON.features[i].geometry.coordinates[0];
			var pointY = outJSON.features[i].geometry.coordinates[1];
			var rotCoords = rotate_point(pointX, pointY, originX, originY, rot);
			var rotPoint = turf.point(
				[rotCoords.x, rotCoords.y],
				{ "fid": i }
			);
			rotPoints.push(rotPoint)
		}
		var outJSON = turf.featureCollection(rotPoints);
	}

	// Check Topology
	if (check_topology) {
		if (outJSON.features[0].geometry.type==='Point') {
			var outJSON = turf.within(outJSON,inJSON);
		} else {
			// turf.featureEach(outJSON, function (currentFeature, featureIndex) {
			// 	if (turf.booleanOverlap(currentFeature,inJSON)==true) {
			// 		console.log('intersects')
			// 	}
			// });
		}
		
	}

	// Update actual number of points
	document.getElementById('point-number').innerHTML = outJSON.features.length;

	// Export and Display on Map
	exportAndDisplay(inJSON,outJSON)
}

function rotate_point(pointX, pointY, originX, originY, angle) {
	angle = angle * Math.PI / 180.0;
	return {
		x: (Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY)) + originX,
		y: (Math.sin(angle) * (pointX-originX) + Math.cos(angle)* (pointY-originY)) + originY
	};
}
	
function displayOnMap(inJSON,outJSON) {
	if (typeof geojsonLayer != 'undefined'){ m.removeLayer(geojsonLayer); };
	geojsonLayer = L.geoJson([outJSON], {
		pointToLayer: function (feature, latlng) {                    
			return new L.CircleMarker(latlng, {
				radius: 5,
				fillColor: "#fff",
				color: "#000",
				weight: 1,
				opacity: 1,
				fillOpacity: 1.0
			});
		},
	});
	geojsonLayer.addTo(m);
}

function randomSample(inJSON,n,extent) {
	var rangeX = extent[2]-extent[0];
	var rangeY = extent[3]-extent[1];

	// Generate points
	var points = [];
	for (var fid in range(n)) {
		var newPoint = turf.point(
			[
				extent[0]+(rangeX*Math.random()), 
				extent[1]+(rangeY*Math.random())
			],
			{ "fid": fid }
		);
		points.push(newPoint)
	}
	return points
}

function systematicSample(inJSON,n,extent) {
	var rangeX = extent[2]-extent[0];
	var rangeY = extent[3]-extent[1];
	var centerX = (extent[0]+extent[2])/2;
	var centerY = (extent[1]+extent[3])/2;

	// Create object to form geojson
	var points = [];

	// Calculate variables
	var dX = Math.max(extent[0],extent[2])-Math.min(extent[0],extent[2]);
	var dY = Math.max(extent[1],extent[3])-Math.min(extent[1],extent[3]);
	var nX = parseInt(Math.round(Math.sqrt((n*dX)/dY),0));
	var nY = parseInt(Math.round(Math.sqrt((n*dY)/dX),0));
	var d = dX/(nX);

	var xStart = extent[0]+(d*Math.random());
	var yStart = extent[1]+(d*Math.random());
	var fid = 0;

	for (var u in range(nX)) {
		var x = xStart + (u*d);
		for (var v in range(nY)) {
			var y = yStart + (v*d);

			var newPoint = turf.point(
				[x,y],
				{ "fid": fid }
			);

			points.push(newPoint)
			fid++
		}		
	}

	return points
}

function equidistantSample(inJSON,n,extent) {
	var rangeX = extent[2]-extent[0];
	var rangeY = extent[3]-extent[1];
	var centerX = (extent[0]+extent[2])/2;
	var centerY = (extent[1]+extent[3])/2;

	// Create object to form geojson
	var points = [];

	// Calculate variables
	var dX = Math.max(extent[0],extent[2])-Math.min(extent[0],extent[2]);
	var dY = Math.max(extent[1],extent[3])-Math.min(extent[1],extent[3]);
	var nX = parseInt(Math.round((-1+Math.sqrt(1-(16*(-2*Math.sqrt(2)*dX*n/dY))))/8,0));
	var nY = parseInt(Math.round(n/nX,0));
	var d = dX/(nX);

	var xStart = extent[0]+((d/2)*Math.random());
	var yStart = extent[1]+((d*Math.sqrt(2)/2)*Math.random());
	var fid = 0;

	for (var v in range(nY)) {
		y = yStart + (v*d*Math.sqrt(2)/2)
		for (var u in range(nX)){
			if (v%2==0){
				x = xStart + (u*d)

				var newPoint = turf.point(
					[x,y],
					{ "fid": fid }
				);
				
				points.push(newPoint)
				fid++
			}
			else {
				x = xStart + ((u)*d) + (d/2)

				var newPoint = turf.point(
					[x,y],
					{ "fid": fid }
				);
				
				points.push(newPoint)
				fid++
			}
		}
	}
		
	return points
}

function hexGrid(inJSON,n,bbox,check_topology) {
	if(check_topology){var mask = turf.flatten(inJSON).features[0]} else {undefined};
	var cellSide = 55;
	var options = {
		units: 'meters',
		mask: mask
	};

	// Increase bbox size so grid covers all of AOI, random element to randomize start of grid
	var bbox = turf.bbox(turf.buffer(turf.bboxPolygon(bbox),cellSide*2*(1+Math.random()),{units: 'meters'}))

	console.log(turf.flatten(inJSON).features[0])
	var hexgrid = turf.hexGrid(bbox, cellSide, options);

	return hexgrid
}

function exportAndDisplay (inJSON,outJSON) {
	var json = JSON.stringify(outJSON);
	var blob = new Blob([json], {type: "application/json"});
	var url  = URL.createObjectURL(blob)

	var a = document.createElement('a');
	a.download    = "SamplePoints.geojson";
	a.href        = url;
	a.textContent = "Download Sample Points";
	a.className   = "btn btn-dark p-3"

	document.getElementById('save-as').replaceChild(a,document.getElementById('save-as').firstChild);
	displayOnMap(inJSON,outJSON)
}