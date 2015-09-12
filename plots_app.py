from flask import Flask, request, send_from_directory, render_template, abort, make_response
from werkzeug import secure_filename
import os, time, datetime, sys, numpy, ogr

UPLOAD_FOLDER = '/home/elza/mysite/uploads'
OUTPUT_FOLDER = '/home/elza/mysite/output'
ALLOWED_EXTENSIONS = set(['shp','shx'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

def rotate(p0_x,p0_y,extent,rotation):
    rotation = rotation*numpy.pi/180  # Convert degrees to radians
    f_x = (extent[0]+extent[1])/2
    f_y = (extent[2]+extent[3])/2
    a0 = p0_x-f_x
    b0 = p0_y-f_y
    a1 = a0*numpy.cos(rotation)-b0*numpy.sin(rotation)
    b1 = a0*numpy.sin(rotation)+b0*numpy.cos(rotation)
    p1_x = a1+f_x
    p1_y = b1+f_y
    return p1_x,p1_y

def write_point(x,y,poly,extent,plots,plots_def,point,check_topology,rotation=0):
    if rotation != 0:
        x,y = rotate(x,y,extent,rotation)

    if check_topology:
        if point_in_poly(x,y,poly):
            point.AddPoint(x,y)  # Add geometry
            plots_feature = ogr.Feature(plots_def)  # Create empty feature
            plots_feature.SetGeometry(point)  # Create geometry
            plots.CreateFeature(plots_feature)  # Add feature to layer
    else:
        point.AddPoint(x,y)  # Add geometry
        plots_feature = ogr.Feature(plots_def)  # Create empty feature
        plots_feature.SetGeometry(point)  # Create geometry
        plots.CreateFeature(plots_feature)  # Add feature to layer

def point_in_poly(x,y,poly):
    point = ogr.Geometry(ogr.wkbPoint)  # Create empty point
    point.AddPoint(x,y)
    cross = poly.Intersects(point)
    return cross

def random_sample(poly,extent,plots,plots_def,point,n,check_topology,rotation):
    for i in range(0,n):
        x = numpy.random.uniform(min(extent[0],extent[1]),max(extent[0],extent[1]))
        y = numpy.random.uniform(min(extent[2],extent[3]),max(extent[2],extent[3]))
        if check_topology:
            while not point_in_poly(x,y,poly):
                x = numpy.random.uniform(min(extent[0],extent[1]),max(extent[0],extent[1]))
                y = numpy.random.uniform(min(extent[2],extent[3]),max(extent[2],extent[3]))
            write_point(x,y,poly,extent,plots,plots_def,point,check_topology)
        else: write_point(x,y,poly,extent,plots,plots_def,point,check_topology)

def systematic_grid(poly,extent,plots,plots_def,point,n,check_topology,rotation):
    # Calculate variables
    d_x = max(extent[0],extent[1])-min(extent[0],extent[1])
    d_y = max(extent[2],extent[3])-min(extent[2],extent[3])
    n_x = int(numpy.round(numpy.sqrt((n*d_x)/d_y),0))
    n_y = int(numpy.round(numpy.sqrt((n*d_y)/d_x),0))
    d = d_x/(n_x)

    x_start = numpy.random.uniform(min(extent[0],extent[1]),min(extent[0],extent[1])+d)
    y_start = numpy.random.uniform(min(extent[2],extent[3]),min(extent[2],extent[3])+d)

    for u in range(0,n_x):
        x = x_start + (u*d)
        for v in range(0,n_y):
            y = y_start + (v*d)
            write_point(x,y,poly,extent,plots,plots_def,point,check_topology,rotation)

def equidistant(poly,extent,plots,plots_def,point,n,check_topology,rotation):
    # Calculate variables
    d_x = max(extent[0],extent[1])-min(extent[0],extent[1])
    d_y = max(extent[2],extent[3])-min(extent[2],extent[3])
    n_x = int(numpy.round((-1+numpy.sqrt(1-(16*(-2*numpy.sqrt(2)*d_x*n/d_y))))/8,0))
    n_y = int(numpy.round(n/n_x,0))
    d = d_x/(n_x)

    x_start = numpy.random.uniform(min(extent[0],extent[1]),min(extent[0],extent[1])+(d/2))
    y_start = numpy.random.uniform(min(extent[2],extent[3]),min(extent[2],extent[3])+(d*numpy.sqrt(2)/2))


    for v in range(0,n_y):
        y = y_start + (v*d*numpy.sqrt(2)/2)
        if v%2==0:
            for u in range(0,n_x):
                x = x_start + (u*d)
                write_point(x,y,poly,extent,plots,plots_def,point,check_topology,rotation)
        else:
            for u in range(0,n_x):
                x = x_start + ((u)*d) + (d/2)
                write_point(x,y,poly,extent,plots,plots_def,point,check_topology,rotation)

def main(sample_type=None,input_path=None,output_dir=None,n=None,check_topology=True,rotation=0,timestamp="0"):
    # Cast arguments
    n = int(n)
    rotation = float(rotation)

    required = {"sample_type":sample_type,"input_path":input_path,"output_dir":output_dir,"n":n}
    for key, value in required.iteritems():
        if value == None:
            #print key,"is required. Use --help for more info."
            abort(make_response(str(key)+" is required. Use --help for more info.", 400))
            #sys.exit(2)

    # Check if output folder exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    #--------------------
    # Prepare Study Area
    #--------------------

    # Check if file exists
    if not os.path.isfile(input_path):
        #print "The specified file for the study area does not exist."
        abort(make_response("The specified file for the study area does not exist.", 400))

    # Get appropriate driver
    driver = ogr.GetDriverByName('ESRI Shapefile')

    # Open the file using the driver
    study_area = driver.Open(input_path, 0)

    # Verify if the file was opened, if not exit
    if study_area is None:
        #print "Failed to open file."
        abort(make_response("Failed to open file.", 400))
        #sys.exit(-1)

    # Get first layer
    study_area_layer = study_area.GetLayer(0)

    # Get fist feature
    study_area_feature = study_area_layer.GetFeature(0)

    poly = study_area_feature.GetGeometryRef()

    # Feature count
    feature_count1 = study_area_layer.GetFeatureCount()
    if feature_count1 > 1:
        #print "This data set contains more than one feature. Please use a study area with a single feature."
        abort(make_response("This data set contains more than one feature. Please use a study area with a single feature.", 400))
        #sys.exit(-1)

    # Get extent
    extent = study_area_layer.GetExtent()

    #----------------
    # Prepare Points
    #----------------

    # Check if path exists
    if os.path.isfile(os.path.join(output_dir,timestamp+".shp")):
        #print os.path.join(output_dir,"plots.shp"), "already exists. Move or rename and run again."
        abort(make_response(str(os.path.join(output_dir,"plots.shp"))+" already exists. Move or rename and run again.", 400))
        #sys.exit(-1)

    # Create shapefile
    plots_dst = driver.CreateDataSource(os.path.join(output_dir,timestamp+".shp"))
    plots = plots_dst.CreateLayer('foolayer',geom_type=ogr.wkbPoint)

    # Validate creation
    if plots is None:
        #print "Could not create plots layer."
        abort(make_response("Could not create plots layer.", 400))
        #sys.exit(-1)

    plots_def = plots.GetLayerDefn() # Every feature in layer will have this

    #-------
    # Other
    #-------

    # Create point geometry
    point = ogr.Geometry(ogr.wkbPoint)

    # Adjust n for topology check
    if (check_topology and sample_type != "random_sample"): n = int(n*(abs(extent[0]-extent[1])*abs(extent[2]-extent[3]))/poly.GetArea())
    # Adjust n for rotation
    if (rotation != 0 and sample_type != "random_sample"):
        c = numpy.sqrt(abs(extent[0]-extent[1])**2+abs(extent[2]-extent[3])**2)
        n = int(n*(c**2)/(abs(extent[0]-extent[1])*abs(extent[2]-extent[3])))
        extent = [extent[0]-((c-abs(extent[0]-extent[1]))/2),extent[1]+((c-abs(extent[0]-extent[1]))/2),extent[2]-((c-abs(extent[2]-extent[3]))/2),extent[3]+((c-abs(extent[2]-extent[3]))/2)]

    # Choose sample method
    if sample_type == "random_sample":
        if rotation != 0: rotation = 0
        random_sample(poly,extent,plots,plots_def,point,n,check_topology,rotation)
    elif sample_type == "systematic_grid": systematic_grid(poly,extent,plots,plots_def,point,n,check_topology,rotation)
    elif sample_type == "equidistant": equidistant(poly,extent,plots,plots_def,point,n,check_topology,rotation)
    else:
        #print "Sample type '"+sample_type+"' not recognized."
        abort(make_response("Sample type '"+sample_type+"' not recognized.", 400))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=["POST"])
def upload():
    uploaded_files = request.files.getlist("file[]")
    upload_filenames = []
    timestamp = datetime.datetime.fromtimestamp(time.time()).strftime("%Y%m%d%H%M%S")
    for file in uploaded_files:
        if file and allowed_file(file.filename):
            filename = timestamp+"_"+secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            upload_filenames.append(filename)
    sample_type = str(request.form.get("sample_type"))
    n = str(request.form.get("n"))
    if request.form.getlist("check_topology") == []: check_topology = False
    else: check_topology = True
    rotation = str(request.form.get("rotation"))
    main(sample_type,os.path.join(app.config['UPLOAD_FOLDER'], upload_filenames[0]),OUTPUT_FOLDER,n,check_topology,rotation,timestamp)
    output_filenames = [timestamp+".shp",timestamp+".shx",timestamp+".dbf"]

    return render_template('upload.html', upload_filenames=upload_filenames, output_filenames=output_filenames)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'],filename)

@app.route('/output/<filename>')
def output_file(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'],filename)

@app.errorhandler(400)
def not_found(error):
    resp = make_response("Integrity Error", 400)
    return resp