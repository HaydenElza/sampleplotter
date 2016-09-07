# Sample Plotter
#### Generate sample points for a study area and all in your browser!

This is a small project to provide a web app to generate sample plots given an area of interest.

#### Webapp: [sampleplotter.com](http://www.sampleplotter.com)

[![](http://i.imgur.com/0Hrvvmn.png)](http://www.sampleplotter.com)

===

### Sample Types:

| **Random** | **Systematic** | **Equidistant**  |
|---|---|---|
| ![](https://github.com/HaydenElza/plots/blob/master/examples/random_1000.png?raw=true) |  ![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000.png?raw=true)  |

| `sample_type` | Description |
---|:--
random | Randomly creates the specified number of points.
systematic | Given a target number of points (n), a systematic grid of points is created. A between point distance (d) is calculated to get the total number of points as close to n as possible. Initial point is randomly chosen between 0 and d for both x and y axes.
equidistant | Given a number of points (n), a systematic triangular grid of points is created. Points are equidistant from each other. A between point distance (d) is calculated to get the total number of points as close to n as possible. Initial point is randomly chosen between 0 and d for both x and y axes.

### Check Topology:

If "check_topology" is on, as close to n points as possible will be created *only* within study area.

| Random | Systematic | Equidistant |
|---|---|---|
![](https://github.com/HaydenElza/plots/blob/master/examples/random_1000_checktopology.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000_checktopology.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000_checktopology.png?raw=true)

### Rotation:

Rotation in degrees of point array in counter-clockwise direction about extent center. (Currently broken in web app, something funky is going on.)

| Systematic | Equidistant |
|---|---|
![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000_checktopology_-15rotation.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000_checktopology_-15rotation.png?raw=true)
