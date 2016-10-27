require(['catiline'], function(cw) {
    var worker = cw({
        init: function(scope) {
            importScripts('js/require.js');
            require.config({
                baseUrl: this.base
            });
            require(['shp'], function(shp) {
                scope.shp = shp;
            });
        },
        data: function(data, cb, scope) {
            this.shp(data).then(function(geoJson){
                if(Array.isArray(geoJson)){
                    geoJson.forEach(function(geo){
                        scope.json([geo, geo.fileName, true],true,scope);
                    });
                }else{
                    scope.json([geoJson, geoJson.fileName, true],true,scope);
                }
            }, function(e) {
                console.log('shit', e);
            });

        },
        color:function(s){
            //from http://stackoverflow.com/a/15710692
            importScripts('js/colorbrewer.js');
            return colorbrewer.Spectral[11][Math.abs(JSON.stringify(s).split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 11];
        },
        makeString:function(buffer) {
                var array = new Uint8Array(buffer);
                var len = array.length;
                var outString = "";
                var i = 0;
                while (i < len) {
                    outString += String.fromCharCode(array[i++]);
                }
                return outString;
            },
        json: function(data, cb, scope) {
            importScripts('js/topojson.v1.min.js');
            var name = data[1];
            //console.log(name);
            var json = data.length === 2 ? JSON.parse(scope.makeString(data[0])) : data[0];
            var nom;
            if (json.type === 'Topology') {
                for (nom in json.objects) {
                    scope.layer(topojson.feature(json, json.objects[nom]), nom, scope);
                }
            }
            else {
                scope.layer(json, name, scope);
            }
        },layer:function(json,name,scope){
            
            json.features.forEach(function(feature){
                feature.properties.__color__ = scope.color(feature);
            });
            scope.fire('json',[json,name]);
        },
        base: cw.makeUrl('.')
    });
    function readerLoad() {
        if (this.readyState !== 2 || this.error) {
            return;
        }
        else {
            worker.data(this.result, [this.result]);
        }
    }

    function handleZipFile(file) {
        
        var reader = new FileReader();
        reader.onload = readerLoad;
        reader.readAsArrayBuffer(file);
    }

    function handleFile(file) {

        m.spin(true);
        if (file.name.slice(-3) === 'zip') {
            return handleZipFile(file);
        }
        var reader = new FileReader();
        reader.onload = function() {
            var ext;
            if (reader.readyState !== 2 || reader.error) {
                return;
            }
            else {
                ext = file.name.split('.');
                ext = ext[ext.length - 1];


                worker.json([reader.result, file.name.slice(0, (0 - (ext.length + 1)))], [reader.result]);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function makeDiv() {
        var div = L.DomUtil.create('form', 'bgroup');
        div.id = "dropzone";
        return div;
    }

    function makeUp(div, handleFile) {
        var upButton = L.DomUtil.create('input', 'upStuff', div);
        upButton.type = "file";
        upButton.id = "input";
        upButton.onchange = function() {
            document.getElementById("dropzone").style.display = "none";
            var file = document.getElementById("input").files[0];

            handleFile(file);
        };
        return upButton;
    }

    function setWorkerEvents() {
        worker.on('json', function(e) {
            m.spin(false);
            geoJSON = e[0];
            lc.addOverlay(L.geoJson(e[0], options).addTo(m), e[1]);
            m.fitBounds(L.geoJson(e[0], options).getBounds());

        });
        worker.on('error', function(e) {
            console.warn(e);
        });
    }

    function makeDone(div, upButton) {
        var doneButton = L.DomUtil.create('button', "btn  btn-primary span3", div);
        doneButton.type = "button";
        doneButton.innerHTML = "Upload File<br />(or Drag and Drop Anywhere)<br />GeoJSON, TopoJSON, or Zipped Shapefile Work";
        L.DomEvent.addListener(doneButton, "click", function() {
            upButton.click();
        });
        return doneButton;
    }

    function addFunction(map) {
        // create the control container with a particular class name
        var div = makeDiv();
        var upButton = makeUp(div, handleFile);
        setWorkerEvents()
        var doneButton = makeDone(div, upButton);






        var dropbox = document.getElementById("map");
        dropbox.addEventListener("dragenter", dragenter, false);
        dropbox.addEventListener("dragover", dragover, false);
        dropbox.addEventListener("drop", drop, false);
        dropbox.addEventListener("dragleave", function() {
            m.scrollWheelZoom.enable();
        }, false);

        function dragenter(e) {
            e.stopPropagation();
            e.preventDefault();
            m.scrollWheelZoom.disable();
        }

        function dragover(e) {
            e.stopPropagation();
            e.preventDefault();
        }

        function drop(e) {
            e.stopPropagation();
            e.preventDefault();
            m.scrollWheelZoom.enable();
            var dt = e.dataTransfer;
            var files = dt.files;

            var i = 0;
            var len = files.length;
            if (!len) {
                return
            }
            while (i < len) {
                handleFile(files[i]);
                i++;
            }
        }
        return div;
    }
    var NewButton = L.Control.extend({ //creating the buttons
        options: {
            position: 'topleft'
        },
        onAdd: addFunction
    });
    //add them to the map
    m.addControl(new NewButton());

});

function testData1() {
    var json = {"type": "FeatureCollection", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, "features": [{ "type": "Feature", "properties": { "MINX": -51.190203, "MINY": 0.010940, "MAXX": -51.185213, "MAXY": 0.016550, "CNTX": -51.187708, "CNTY": 0.013745, "AREA": 0.000028, "PERIM": 0.021199, "HEIGHT": 0.005610, "WIDTH": 0.004990 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ -51.190203007240143, 0.010939970659779 ], [ -51.190203007240143, 0.01654966489734 ], [ -51.185213168573867, 0.01654966489734 ], [ -51.185213168573867, 0.010939970659779 ], [ -51.190203007240143, 0.010939970659779 ] ] ] ] } } ] }

    geoJSON = json;
    lc.addOverlay(L.geoJson(json, options).addTo(m), "Test Box");
    m.fitBounds(L.geoJson(json, options).getBounds());
}

function testData2() {
    var json = {"type": "FeatureCollection", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, "features": [{ "type": "Feature", "properties": { "id": null }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ -51.186390894470264, 0.011575322775824 ], [ -51.186305664306701, 0.011288639504133 ], [ -51.186305664306701, 0.011133675573351 ], [ -51.186437383650386, 0.011017452625233 ], [ -51.18658459938743, 0.010939970659779 ], [ -51.186731815124475, 0.010963215249423 ], [ -51.186778304304596, 0.011102682787198 ], [ -51.18679380069797, 0.011304135897191 ], [ -51.186855786271465, 0.011420358845208 ], [ -51.187041742991951, 0.011505589007058 ], [ -51.187235447909117, 0.011552078186244 ], [ -51.187514382989839, 0.011536581793186 ], [ -51.18787080003743, 0.011544329989709 ], [ -51.188188476101587, 0.01160631556194 ], [ -51.188242713478388, 0.011699293920261 ], [ -51.188351188232012, 0.011854257850725 ], [ -51.188413173805507, 0.012040214567165 ], [ -51.188242713478388, 0.011978228995035 ], [ -51.1881807279049, 0.012125444728811 ], [ -51.188203972494968, 0.012303653248563 ], [ -51.188203972494968, 0.012567091929706 ], [ -51.188219468888342, 0.012784041431625 ], [ -51.188165231511526, 0.012962249950932 ], [ -51.188250461675082, 0.013179199452507 ], [ -51.188428670198874, 0.013310918792666 ], [ -51.18858363413262, 0.01348912731159 ], [ -51.18861462691936, 0.013706076812708 ], [ -51.188568137739239, 0.013892033527799 ], [ -51.18831244724857, 0.01393852270654 ], [ -51.187894044627491, 0.013969515492376 ], [ -51.187529879383213, 0.013969515492376 ], [ -51.18742915282629, 0.013907529920717 ], [ -51.18763835413683, 0.014039249260468 ], [ -51.1877700734805, 0.014201961385953 ], [ -51.187684843316951, 0.014426659082855 ], [ -51.18763835413683, 0.014604867600928 ], [ -51.187894044627491, 0.014612615797361 ], [ -51.188250461675082, 0.014573874815181 ], [ -51.188575885935919, 0.014457651868615 ], [ -51.188746346263031, 0.014434407279289 ], [ -51.188986540360318, 0.014473148261495 ], [ -51.189118259704003, 0.014380169904204 ], [ -51.189002036753692, 0.014139975814345 ], [ -51.188986540360318, 0.01393852270654 ], [ -51.189164748884124, 0.013892033527799 ], [ -51.189420439374778, 0.013969515492376 ], [ -51.189544410521769, 0.014039249260468 ], [ -51.189676129865447, 0.014341428921985 ], [ -51.189831093799178, 0.014442155475735 ], [ -51.190017050519664, 0.014271695153982 ], [ -51.190203007240143, 0.014302687939754 ], [ -51.190148769863335, 0.014566126618748 ], [ -51.189955064946169, 0.014852809886711 ], [ -51.189722619045568, 0.015162737743542 ], [ -51.189621892488638, 0.01547266559994 ], [ -51.189784604619057, 0.015573392153181 ], [ -51.189745863635622, 0.01570511149194 ], [ -51.189412691178092, 0.01581358624145 ], [ -51.189095015113935, 0.015782593455881 ], [ -51.188909058393456, 0.01582908263424 ], [ -51.189071770523881, 0.016015039347537 ], [ -51.188932302983517, 0.016278478024419 ], [ -51.188761842656405, 0.016046032133068 ], [ -51.188653367902788, 0.015960801972846 ], [ -51.188258209871769, 0.016208744257039 ], [ -51.187956030200986, 0.016270729828049 ], [ -51.1877700734805, 0.016355959988156 ], [ -51.187367167252795, 0.016503175719146 ], [ -51.187157965942255, 0.01654966489734 ], [ -51.187126973155515, 0.016235862944365 ], [ -51.187003002008524, 0.015887194107173 ], [ -51.18677830430461, 0.01577871935769 ], [ -51.18667757774768, 0.015530777072975 ], [ -51.186569102994063, 0.015251842002311 ], [ -51.186274671519975, 0.014980655127723 ], [ -51.185848520702187, 0.014817943002811 ], [ -51.185678060375082, 0.014957410538461 ], [ -51.185747794145264, 0.015081381681181 ], [ -51.185802031522066, 0.015267338395152 ], [ -51.185771038735325, 0.015352568555654 ], [ -51.185956995455797, 0.015468791501762 ], [ -51.185956995455797, 0.01567024460818 ], [ -51.185786535128685, 0.015724481982948 ], [ -51.185569585621465, 0.01567024460818 ], [ -51.185360384310918, 0.015561769858582 ], [ -51.185213168573867, 0.015445546912538 ], [ -51.185267405950682, 0.015321575770021 ], [ -51.18550760004797, 0.015352568555654 ], [ -51.185546341031397, 0.015220849216666 ], [ -51.185592830211519, 0.014996151520565 ], [ -51.185685808571762, 0.014833439395665 ], [ -51.185926002669049, 0.014709468252793 ], [ -51.186297916110021, 0.014771453824235 ], [ -51.186669829550979, 0.015220849216666 ], [ -51.186917771844961, 0.01552302887658 ], [ -51.187095980368753, 0.015585014447794 ], [ -51.187266440695865, 0.015701237393762 ], [ -51.187560872169961, 0.015507532483777 ], [ -51.187700339710325, 0.015461043305354 ], [ -51.1877700734805, 0.01532932396643 ], [ -51.188118742331419, 0.015399057734102 ], [ -51.188327943641958, 0.015259590198732 ], [ -51.188661116099482, 0.015089129877602 ], [ -51.188738598066358, 0.01490317316349 ], [ -51.18861462691936, 0.014817943002811 ], [ -51.188250461675082, 0.014879928574215 ], [ -51.187700339710325, 0.014895424967069 ], [ -51.18732842626936, 0.014887676770636 ], [ -51.187165714138942, 0.014662979074192 ], [ -51.187212203319064, 0.014384044002433 ], [ -51.187196706925683, 0.014221331877088 ], [ -51.186979757418456, 0.014012130572887 ], [ -51.186817045288031, 0.0139578931977 ], [ -51.186545858403996, 0.013841670250816 ], [ -51.186398642666944, 0.013609224356882 ], [ -51.186150700372977, 0.013531742392191 ], [ -51.185933750865743, 0.013462008623946 ], [ -51.185895009882309, 0.013276051908524 ], [ -51.186305664306701, 0.013082346996478 ], [ -51.18678605250129, 0.013105591585931 ], [ -51.186910023648274, 0.013260555515568 ], [ -51.187111476762134, 0.013400023052147 ], [ -51.18732842626936, 0.013438764034518 ], [ -51.187661598726898, 0.013562735178077 ], [ -51.187692591513638, 0.013462008623946 ], [ -51.187351670859421, 0.013299296497964 ], [ -51.187243196105804, 0.013128836175384 ], [ -51.187297433482605, 0.012904138477261 ], [ -51.187382663646169, 0.012725929957929 ], [ -51.187219951515743, 0.012408253901407 ], [ -51.187080483975379, 0.012292030953811 ], [ -51.186677577747673, 0.012385009311891 ], [ -51.186336657093449, 0.012261038167771 ], [ -51.186119707586222, 0.012113822434046 ], [ -51.186204937749778, 0.011912369324625 ], [ -51.186282419716647, 0.011765153590722 ], [ -51.186390894470264, 0.011575322775824 ] ] ] ] } } ] }

    geoJSON = json;
    lc.addOverlay(L.geoJson(json, options).addTo(m), "Test Box");
    m.fitBounds(L.geoJson(json, options).getBounds());
}