# Plots

This is a small project to provide simple scripts to generate sample plots given an area of interest.

### Random
![](https://github.com/HaydenElza/plots/blob/master/examples/random_1000.png?raw=true)

Randomly creates the specified number of points.

### Systematic
![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000.png?raw=true)

Given a target number of points (n), a systematic grid of points is created. A between point distance (d) is calculated to get the total number of points as close to n as possible. Initial point is randomly chosen between 0 and d for both x and y axes.

### Equidistant
![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000.png?raw=true)

Given a number of points (n), a systematic triangular grid of points is created. Points are equidistant from each other. A between point distance (d) is calculated to get the total number of points as close to n as possible. Initial point is randomly chosen between 0 and d for both x and y axes. 
