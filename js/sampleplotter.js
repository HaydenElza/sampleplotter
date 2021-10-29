// Create range from 0 to k-1
function range(k) {
	return Array.apply(null, Array(k)).map(function (_, i) {return i;})
}

function enableOptions(pointGrid,type) {
	function options(enableDisable, ids) {
		if (enableDisable=='enable') {
			ids.forEach(function(id){
				$('#'+id).prop('disabled', false);
				$('#'+id).parent().parent().find('div.bg-secondary').addClass('active');
			})
		} else if (enableDisable=='disable') {
			ids.forEach(function(id){
				$('#'+id).prop('disabled', true);
				$('#'+id).parent().parent().find('div.bg-secondary').removeClass('active');
			})
		}
	}

	if (pointGrid=='point') {
		
		options('enable',['sample-number','rotation-input'])
		options('disable',['cell-side'])
		if (type=='random') {
			options('disable',['rotation-input']);
			$('#rotation-input').val('0')
		} else {
			options('enable',['rotation-input']);
		}
	} else if (pointGrid=='grid') {
		options('enable',['cell-side'])
		options('disable',['sample-number'])
	}
	
}

function getCellSide(pointGrid, n, bbox) {
	if (pointGrid=='grid') {
		return Number(document.getElementById("cell-side").value);
	} else if (pointGrid=='point') {
		var dX = Math.max(bbox[0],bbox[2])-Math.min(bbox[0],bbox[2]);
		var dY = Math.max(bbox[1],bbox[3])-Math.min(bbox[1],bbox[3]);
		var nX = parseInt(Math.round(Math.sqrt((n*dX)/dY),0));
		var d = dX/(nX);

		return d
	}
}

function rotatePoints(points, rot){
	var origin  = turf.center(points);
	var originX = origin.geometry.coordinates[0];
	var originY = origin.geometry.coordinates[1];
	
	var rotPoints = [];
	for (i in range(points.features.length)) {
		var pointX = points.features[i].geometry.coordinates[0];
		var pointY = points.features[i].geometry.coordinates[1];
		var rotCoords = rotate_point(pointX, pointY, originX, originY, rot);
		var rotPoint = turf.point(
			[rotCoords.x, rotCoords.y],
			{ "fid": i }
		);
		rotPoints.push(rotPoint)
	}
	var outJSON = turf.featureCollection(rotPoints);

	return outJSON
}


function genPlots(inJSON) {
	var n = Number(document.getElementById("sample-number").value);
	var check_topology = $('input[name="check-topology"]:checked').val();
	var rot = Number(document.getElementById("rotation-input").value)
	var extent = turf.bbox(inJSON);
	if(check_topology){
		var mask = turf.flatten(inJSON).features[0];
	} else {undefined}

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
		var outJSON = hexGrid(inJSON,n,extent,mask,rot);
	}
	else if ($('input[name="sample_type"]:checked').val() == "square_grid") {
		var outJSON = squareGrid(inJSON,n,extent,mask);
	}
	else if ($('input[name="sample_type"]:checked').val() == "triangle_grid") {
		var outJSON = triangleGrid(inJSON,n,extent,mask);
	}
	else if ($('input[name="sample_type"]:checked').val() == undefined) {
		alert("You must choose a sample type.")
	}

	// Rotate
	if (rot != 0) {
		// outJSON = rotatePoints(outJSON, rot)
		var origin  = turf.center(outJSON);
		outJSON = turf.transformRotate(outJSON, rot, {pivot: origin})
	}

	// Check Topology
	if (check_topology) {
		if (outJSON.features[0].geometry.type==='Point') {
			var outJSON = turf.within(outJSON,inJSON);
		} else {
			var features = [];
			turf.featureEach(outJSON, function (currentFeature, featureIndex) {
				if (turf.booleanIntersects(currentFeature,inJSON)==true) {
					features.push(currentFeature)
				}
			});
			var outJSON = turf.featureCollection(features);
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

	if (outJSON.features[0].geometry.type==='Point') {
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
	} else {
		var polygonStyle = {
			"color": "#ffffff",
			"weight": 3,
			"opacity": 0.65
		};
		geojsonLayer = L.geoJson([outJSON], {style: polygonStyle});
	}

	
	geojsonLayer.addTo(m);
}

function randomSample(mask,n,extent) {
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

function systematicPoints(inJSON,n,bbox,mask) {
	var cellSide = getCellSide('point', n, bbox);
	var options = {
		units: 'degrees',
		mask: mask
	};

	// Randomize bbox size to randomize start of grid
	var bbox = turf.bbox(turf.buffer(turf.bboxPolygon(bbox),cellSide*(1+Math.random()),{units: 'degrees'}))

	var features = turf.pointGrid(bbox, cellSide, options);

	return features
}

function hexGrid(inJSON,n,bbox,mask,rot) {
	var cellSide = getCellSide('grid');
	var options = {
		units: 'meters'
	};

	// Increase bbox size so grid covers all of AOI, Math.random() added to randomize start of grid
	var bbox = turf.bbox(turf.buffer(turf.bboxPolygon(bbox),cellSide*2*(1+Math.random()),{units: 'meters'}))

	var features = turf.hexGrid(bbox, cellSide, options);

	return features
}

function squareGrid(inJSON,n,bbox,mask) {
	var cellSide = getCellSide('grid');
	var options = {
		units: 'meters'
	};

	// Increase bbox size so grid covers all of AOI, Math.random() added to randomize start of grid
	var bbox = turf.bbox(turf.buffer(turf.bboxPolygon(bbox),cellSide*2*(1+Math.random()),{units: 'meters'}))

	var features = turf.squareGrid(bbox, cellSide, options);

	return features
}

function triangleGrid(inJSON,n,bbox,mask) {
	var cellSide = getCellSide('grid');
	var options = {
		units: 'meters',
		triangles: true
	};

	// Increase bbox size so grid covers all of AOI, Math.random() added to randomize start of grid
	var bbox = turf.bbox(turf.buffer(turf.bboxPolygon(bbox),cellSide*2*(1+Math.random()),{units: 'meters'}))

	var features = turf.hexGrid(bbox, cellSide, options);

	return features
}

function exportAndDisplay (inJSON,outJSON) {
	var json = JSON.stringify(outJSON);
	var blob = new Blob([json], {type: "application/json"});
	var url  = URL.createObjectURL(blob)

	var a = document.createElement('a');
	a.download    = "SamplePoints.geojson";
	a.href        = url;
	a.textContent = "Download Sample Plots";
	a.className   = "btn btn-dark p-3"

	document.getElementById('save-as').replaceChild(a,document.getElementById('save-as').firstChild);
	displayOnMap(inJSON,outJSON)
}