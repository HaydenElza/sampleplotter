# Import ogr and gdal depending on system
try:
	import ogr
except:
	try:
		from osgeo import ogr
	except: 
		print "Import of ogr failed."

# Import other needed modules
import os, sys, gdalconst, numpy, getopt, time, datetime

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

def main(argv):
	#-----------------
	# Parse arguments
	#-----------------
	# Default values
	sample_type = None
	input_path = None
	output_dir = None
	n = None
	check_topology = True
	rotation = 0

	try:
		opts, args = getopt.getopt(sys.argv[1:],"hs:i:o:n:t:r:",["help","sample_type=","input_path=","output_dir=","plot_number=","check_topology","rotation"])
	except getopt.GetoptError:
		print "plots.py -s <sampletype> -i <inputfile> -o <outputfile> -n <numberofplots> {-t <checktopology> [default:True] -r <rotationindegrees> [defualt:0]}"
		sys.exit(2)
	for opt, arg in opts:
		if opt in ("-h","--help"):
			print "Options:"
			print "    -h --help              Show this screen."
			print "    -s --sample_type       Sample type."
			print "                           (random_sample|systematic_grid|equidistant)"
			print "    -i --input_path        Path to input shapefile."
			print "    -o --output_dir        Path to output directory."
			print "    -n --plot_number       Target number of plots to generate."
			print "    -t --check_topology    Only create points within study area."
			print "                           [default: True|False]"
			print "    -r --rotation          Counter-clockwise rotation, in degrees,"
			print "                           of point array about center of extent. [default: 0]"
			sys.exit()
		elif opt in ("-s","--sample_type"):
			sample_type = arg
		elif opt in ("-i","--input_path"):
			input_path = arg
		elif opt in ("-o","--output_dir"):
			output_dir = arg
		elif opt in ("-n","--plot_number"):
			n = int(arg)
		elif opt in ("-t","--check_topology"):
			check_topology = arg[0].upper()=="T"
		elif opt in ("-r","--rotation"):
			rotation = float(arg)

	required = {"sample_type":sample_type,"input_path":input_path,"output_dir":output_dir,"n":n}
	for key, value in required.iteritems():
		if value == None:
			print key,"is required. Use --help for more info."
			sys.exit(2)

	# End parse arguments--------------------------------------------------------


	# Check if output folder exists
	if not os.path.exists(output_dir):
		os.makedirs(output_dir)

	#--------------------
	# Prepare Study Area
	#--------------------

	# Check if file exists
	if not os.path.isfile(input_path):
		print "The specified file for the study area does not exist."

	# Get appropriate driver
	driver = ogr.GetDriverByName('ESRI Shapefile')

	# Open the file using the driver
	study_area = driver.Open(input_path, gdalconst.GA_ReadOnly)

	# Verify if the file was opened, if not exit
	if study_area is None:
		print "Failed to open file."
		sys.exit(-1)

	# Get first layer
	study_area_layer = study_area.GetLayer(0)

	# Get fist feature
	study_area_feature = study_area_layer.GetFeature(0)

	poly = study_area_feature.GetGeometryRef()

	# Feature count
	feature_count1 = study_area_layer.GetFeatureCount()
	if feature_count1 > 1:
		print "This data set contains more than one feature. Please use a study area with a single feature."
		sys.exit(-1)

	# Get extent
	extent = study_area_layer.GetExtent()

	#----------------
	# Prepare Points
	#----------------

	# Check if path exists
	if os.path.isfile(os.path.join(output_dir,datetime.datetime.fromtimestamp(time.time()).strftime("%Y%m%d%H%M%S")+".shp")):
		print os.path.join(output_dir,"plots.shp"), "already exists. Move or rename and run again."
		sys.exit(-1)

	# Create shapefile
	plots_dst = driver.CreateDataSource(os.path.join(output_dir,datetime.datetime.fromtimestamp(time.time()).strftime("%Y%m%d%H%M%S")+".shp"))
	plots = plots_dst.CreateLayer('foolayer',geom_type=ogr.wkbPoint)

	# Validate creation
	if plots is None:
		print "Could not create plots layer."
		sys.exit(-1)

	plots_def = plots.GetLayerDefn() # Every feature in layer will have this

	#-------
	# Other
	#-------

	# Prepare variables to be passed
	#options = [sample_type,input_path,output_dir,n,check_topology,rotation]
	#geom = [poly,extent,plots,plots_def,point]

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
	else: print "Sample type '"+sample_type+"' not recognized."


	# Free Memory
	driver = None
	study_area = None
	study_area_layer = None
	study_area_feature = None
	poly = None
	plots = None
	plots_def = None
	plots_feature = None
	point = None

if __name__ == "__main__":
   main(sys.argv[1:])