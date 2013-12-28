
var windDirection = new THREE.Vector3( 0, 1, 0);
var tolerance = .1;

var rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .01, 0, 'XYZ'));


var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var cameraContainer = new THREE.Object3D();
scene.add(cameraContainer);

THREE.SceneUtils.attach(camera, scene, cameraContainer);
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//drawAdjacency(baseGeometry, preprocessGeometry(baseGeometry));
//drawWireTriangles(baseGeometry);
render();


function render() {
	 setTimeout(function() {
        requestAnimationFrame(render);
		cameraContainer.quaternion.multiply(rot);		
		renderer.render(scene, camera);		
    }, 1000 / 60);
}		

/*
We can use DCEL but we may miss some 'extraordinary vertices'.
We can store neighborhood defined by maximum vine step (resulting in a disk).
We can store face adjacency by vertex. We may miss (and thus have to clamp) some long vine steps if an adjacent triangle is too small

Or we could just do O(n^2) in runtime, heh.
*/
function preprocessGeometry(geometry) {

	function vertexIsSimilar(v, w) {
		return v.distanceTo(w) < 0.01;
	}

	function faceIsAdjacent(face, otherFace) {
		var v1 = geometry.vertices[face.a];
		var v2 = geometry.vertices[face.b];
		var v3 = geometry.vertices[face.c];

		var w1 = geometry.vertices[otherFace.a];
		var w2 = geometry.vertices[otherFace.b];
		var w3 = geometry.vertices[otherFace.c];

		return vertexIsSimilar(v1, w1) || vertexIsSimilar(v1, w2) || vertexIsSimilar(v1, w3) ||
			vertexIsSimilar(v2, w1) || vertexIsSimilar(v2, w2) || vertexIsSimilar(v2, w3) ||
			vertexIsSimilar(v3, w1) || vertexIsSimilar(v3, w2) || vertexIsSimilar(v3, w3);
	}

	function faceIsClose(face, otherFace) {
		return face.centroid.distanceTo(otherFace.centroid) < 1;
	}

	// Two faces are defined as adjacent if they share vertices
	var faceAdjacency = new Array(geometry.faces.length);

	for(var i = 0; i < geometry.faces.length; i++) {
		var face = geometry.faces[i];
		var adj = new Array();
		faceAdjacency[i] = adj;

		// Looks heavy due to O(n^2), but it's faster than alt method
		for(var j = 0; j < geometry.faces.length; j++) {
			var otherFace = geometry.faces[j];
			//if(/*otherFace != face && */ adj.indexOf(j) == -1 && faceIsAdjacent(face, otherFace))
			if(adj.indexOf(j) == -1 && faceIsClose(face, otherFace))	
				adj.push(j);
		}
	}

	return faceAdjacency;
}

// Debug
function drawFaceAdjacents(geometry, faceAdjacency) {

	faceAdjacency[267].forEach(function(adjFaceIndex) {	
		var face = geometry.faces[adjFaceIndex];

		var v1 = geometry.vertices[face.a];
		var v2 = geometry.vertices[face.b];
		var v3 = geometry.vertices[face.c];

		var lineGeometry = new THREE.Geometry();
		var vertArray = lineGeometry.vertices;
		vertArray.push(v1, v2, v3);
		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0x228822 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	});
}

// Debug
function drawWireTriangles(geometry) {
	geometry.faces.forEach(function(face) {	
		var v1 = geometry.vertices[face.a];
		var v2 = geometry.vertices[face.b];
		var v3 = geometry.vertices[face.c];

		var lineGeometry = new THREE.Geometry();
		var vertArray = lineGeometry.vertices;
		vertArray.push(v1, v2, v3);
		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0x114411 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	});
}

function sampleGeometry(geometry, sampleDensity) {

	// Current problem: we cant have lower densities than smallest triangle
	// TODO: find all tris that pass the tolerance test and search sample in area space (with binary search)
	function getMinimumArea()
	{
		var minArea = Infinity;
 
		for(var i = 0; i < geometry.faces.length; i++) {
			var face = geometry.faces[i];

			var v1 = geometry.vertices[face.a];
			var v2 = geometry.vertices[face.b];
			var v3 = geometry.vertices[face.c];

			var area = THREE.GeometryUtils.triangleArea(v1, v2, v3);

			if(area < minArea)
				minArea = area;
		}

		return minArea;
	}

	var minArea = getMinimumArea();
	var samples = new Array();
	
	for(var faceIndex = 0; faceIndex < geometry.faces.length; faceIndex++) {

		var face = geometry.faces[faceIndex];

		// Only sample faces facing windDirection
		if(face.normal.dot(windDirection) > 1 - tolerance * 2) {

			var v1 = geometry.vertices[face.a];
			var v2 = geometry.vertices[face.b];
			var v3 = geometry.vertices[face.c];

			var area = THREE.GeometryUtils.triangleArea(v1, v2, v3) * sampleDensity / minArea;

			for(var i = 0; i < area; i++) {

				// TODO: threejs' randomPointInTriangle can be optimized by removing the branch
				var p = THREE.GeometryUtils.randomPointInTriangle(v1, v2, v3);

				samples.push({point : p, direction : randomVector(), faceIndex : faceIndex});
			}
		}
	}

	return samples;
}

// Debug
function drawWireVines(vineArray) {
	vineArray.forEach(function(vine) {
		var lineGeometry = new THREE.Geometry();
		var vertArray = lineGeometry.vertices;

		if(vine.points.length > 1)
			vine.points.forEach(function(p){
				vertArray.push(p);//, new THREE.Vector3(.05,0.05,0.05).add(p));
			});

		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0xFF2222 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	});
}

var baseGeometry = new THREE.SphereGeometry(2.5, 20, 20);
var faceAdjacency = preprocessGeometry(baseGeometry);
var vineArray = initializeVines(baseGeometry);


for(var i = 0; i < 50; i++)
	growRandomVine(baseGeometry, faceAdjacency, vineArray);

drawWireVines(vineArray);
//drawWireTriangles(baseGeometry);
//drawFaceAdjacents(baseGeometry, faceAdjacency);

function isPointInsideTriangle(point, v1, v2, v3) {

	var tmp = new THREE.Vector3();

	var area = .5 * tmp.crossVectors( new THREE.Vector3().subVectors(v2, v1), new THREE.Vector3().subVectors(v3, v1)).length();

	var u = tmp.crossVectors( new THREE.Vector3().subVectors(v2, point), new THREE.Vector3().subVectors(v3, point)).length() * .5 / area;
	var v = tmp.crossVectors( new THREE.Vector3().subVectors(v1, point), new THREE.Vector3().subVectors(v3, point)).length() * .5 / area;	

	return u >= 0 && v >= 0 && (1 - u - v) >= 0;
}

function randomVector() {
	return new THREE.Vector3(THREE.Math.random16() * 2 - 1, THREE.Math.random16() * 2 - 1, THREE.Math.random16() * 2 - 1).normalize();
}

function growRandomVine(geometry, faceAdjacency, vineArray) {

	var vineIndex = THREE.Math.randInt(0, vineArray.length - 1);

	var vine = vineArray[vineIndex];

	for(var k = 0; k < 100; k++) {

		var currentPoint = vine.points[vine.points.length - 1];
		var currentDirection = vine.currentDirection;
		var currentFaceIndex = vine.currentFaceIndex;

		var delta = .15;

		// nextPoint = currentPoint + currentDirection * delta
		var nextPoint = new THREE.Vector3();
		nextPoint.copy(currentDirection).multiplyScalar(delta).add(currentPoint);

		for(var i = 0; i < faceAdjacency[currentFaceIndex].length; i++) {
			var adjFaceIndex = faceAdjacency[currentFaceIndex][i];
			var adjFace = geometry.faces[adjFaceIndex];

			var v1 = geometry.vertices[adjFace.a];
			var v2 = geometry.vertices[adjFace.b];
			var v3 = geometry.vertices[adjFace.c];

			var dot = adjFace.normal.dot(new THREE.Vector3().subVectors(nextPoint, v1));
			var projectedPoint = new THREE.Vector3().subVectors(nextPoint, new THREE.Vector3().copy(adjFace.normal).multiplyScalar(dot));
			
			if(isPointInsideTriangle(projectedPoint, v1, v2, v3)) {
				vine.points.push(projectedPoint);
				vine.currentFaceIndex = adjFaceIndex;
				vine.currentDirection.add(randomVector()).normalize(); 
				i = Infinity; // kekekeke
			}
		}
	}
}

function initializeVines(geometry) {
	var samples = sampleGeometry(baseGeometry, 1);	
	var vineArray = new Array(samples.length);

	for(var i = 0; i < samples.length; i++)
		vineArray[i] = createVine(samples[i].point, samples[i].direction, samples[i].faceIndex);

	return vineArray;
}

function createVine(startPoint, startDirection, startFace) {
	var v = { points : new Array(), currentDirection : startDirection, currentFaceIndex : startFace};
	v.points.push(startPoint);
	//v.points.push(startPoint.clone().add(startDirection.clone().multiplyScalar(.2)));
	return v;
}

function log(s) {
	var div = document.getElementById("debug");
	var p = document.createElement("p");
	var t = document.createTextNode(s);
	p.appendChild(t);
	div.appendChild(p);
}