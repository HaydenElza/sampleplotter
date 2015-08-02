# Import ogr and gdal depending on system
try:
	import ogr
except:
	try:
		from osgeo import ogr
	except: 
		print "Import of ogr failed."

# Import other needed modules
import os, sys, gdalconst, numpy

# User variables
study_area_path = "E:/Hayden_Elza/plots/test_data/extent.shp"
n = 1000
output_dir = "E:/Hayden_Elza/plots/output"




def write_point(x,y):
	point.AddPoint(x,y)  # Add geometry
	# Create pls_prime geometry and fields
	plots_feature = ogr.Feature(plots_def)  # Create empty feature
	plots_feature.SetGeometry(point)  # Create geometry
	plots.CreateFeature(plots_feature)  # Add feature to layer

def point_in_poly(x,y,poly):
	point = ogr.Geometry(ogr.wkbPoint)  # Create empty point
	point.AddPoint(x,y)
	cross = poly.Intersects(point)
	return cross

def random_sample():
	for i in range(0,n):
		x = numpy.random.uniform(min(extent[0],extent[1]),max(extent[0],extent[1]))
		y = numpy.random.uniform(min(extent[2],extent[3]),max(extent[2],extent[3]))
		point.AddPoint(x,y)  # Add geometry

		# Create pls_prime geometry and fields
		plots_feature = ogr.Feature(plots_def)  # Create empty feature
		plots_feature.SetGeometry(point)  # Create geometry
		plots.CreateFeature(plots_feature)  # Add feature to layer

def systematic_grid():
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
			if point_in_poly(x,y,): write_point(x,y)

def equidistant():
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
				write_point(x,y)
		else:
			for u in range(0,n_x):
				x = x_start + ((u)*d) + (d/2)
				write_point(x,y)

#----------------------------------------------------
# Main
#----------------------------------------------------

# Check if output folder exists
if not os.path.exists(output_dir):
	os.makedirs(output_dir)


#--------------------
# Prepare Study Area
#--------------------

# Check if file exists
if not os.path.isfile(study_area_path):
	print "The specified file for the study area does not exist."

# Get appropriate driver
driver = ogr.GetDriverByName('ESRI Shapefile')

# Open the file using the driver
study_area = driver.Open(study_area_path, gdalconst.GA_ReadOnly)

# Verify if the file was opened, if not exit
if study_area is None:
	print "Failed to open file."
	sys.exit(-1)

# Get first layer
study_area_layer = study_area.GetLayer(0)

# Get fist feature
study_area_feature = study_area_layer.GetFeature(0)

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
if os.path.isfile(os.path.join(output_dir,"plots.shp")):
	print os.path.join(output_dir,"plots.shp"), "already exists. Move or rename and run again."
	sys.exit(-1)

# Create shapefile
plots_dst = driver.CreateDataSource(os.path.join(output_dir,"plots.shp"))
plots = plots_dst.CreateLayer('foolayer',geom_type=ogr.wkbPoint)

# Validate creation
if plots is None:
	print "Could not create plots layer."
	sys.exit(-1)

plots_def = plots.GetLayerDefn() # Every feature in layer will have this


#
#
#

# Create point geometry
point = ogr.Geometry(ogr.wkbPoint)

equidistant()



# Free Memory
plots = None
plots_feature = None
point = None
plots_def = None