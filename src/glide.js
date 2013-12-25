
var windDirection = new THREE.Vector3( 0, 1, 0);
var tolerance = .85;

var rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .01, 0, 'XYZ'));

function render() {
	 setTimeout(function() {
        requestAnimationFrame(render);
		cameraContainer.quaternion.multiply(rot);		
		renderer.render(scene, camera);		
    }, 1000 / 60);
}		

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var cameraContainer = new THREE.Object3D();
scene.add(cameraContainer);

var samplesContainer = new THREE.Object3D();
scene.add(samplesContainer);

THREE.SceneUtils.attach(camera, scene, cameraContainer);
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var baseGeometry = new THREE.SphereGeometry(2.5, 12, 12);

drawAdjacency(baseGeometry, preprocessGeometry(baseGeometry));
drawWireTriangles(baseGeometry);
sampleGeometry(baseGeometry, 2);	
render();

function clearScene(scene) {
	var obj;
	for (var i = scene.children.length - 1; i >= 0; i--) {
	    obj = scene.children[i];

	    if (obj !== camera)
	        scene.remove(obj);
	}
}

/*
We can use DCEL but we may miss some 'extraordinary vertices'.
We can store neighborhood defined by maximum vine step (resulting in a disk).
We can store face adjacency by vertex. We may miss (and thus have to clamp) some long vine steps if an adjacent triangle is too small

Or we could just do O(n^2) in runtime, heh.
*/
function preprocessGeometry(geometry) {

	function vertexIsSimilar(v, w)
	{
		return v.distanceTo(w) < 0.01;
	}

	function faceIsAdjacent(face, otherFace)
	{
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

	// Two faces are defined as adjacent if they share vertices
	var faceAdjacency = new Array(geometry.faces.length);

	for(var i = 0; i < geometry.faces.length; i++) {
		var face = geometry.faces[i];
		var adj = new Array();
		faceAdjacency[i] = adj;

		// Looks heavy due to O(n^2), but it's faster than alt method
		geometry.faces.forEach(function(otherFace) {	
			if(otherFace != face && adj.indexOf(otherFace) == -1 && faceIsAdjacent(geometry.faces[i], otherFace))
				adj.push(otherFace);
		});
	}

	return faceAdjacency;
}

/*
// Just for reference:
// This method is a little bit heavier, because of duplicated vertices due to uv/normal seams
function preprocessGeometry(geometry) {

	function addAdjacentFaces(vertexIndex) {
		var vertexAdj = vertexFaceAdjacency[vertexIndex];
		for(var j = 0; j < vertexAdj.length; j++)
		{
			var adjFace = vertexAdj[j];		
			if(adjFace != face && adj.indexOf(adjFace) == -1)
				adj.push(adjFace);
		}
	}

	// Get all faces adjacent to each vertex
	var vertexFaceAdjacency = new Array(geometry.vertices.length);

	for(var i = 0; i < geometry.vertices.length; i++) 
		vertexFaceAdjacency[i] = new Array();

	geometry.faces.forEach(function(face) {	
		vertexFaceAdjacency[face.a].push(face);
		vertexFaceAdjacency[face.b].push(face);
		vertexFaceAdjacency[face.c].push(face);
	});

	// Now find similar vertices and fix adj... heavy.
	for(var i = 0; i < geometry.vertices.length; i++) 
		for(var j = 0; j < geometry.vertices.length; j++) 
			if(i != j && geometry.vertices[i].distanceTo(geometry.vertices[j]) < 0.01) {
				vertexFaceAdjacency[i] = vertexFaceAdjacency[i].concat(vertexFaceAdjacency[j]);
				vertexFaceAdjacency[j] = vertexFaceAdjacency[i].slice(0);
			}

	// Two faces are defined as adjacent if they share vertices
	var faceAdjacency = new Array(geometry.faces.length);

	for(var i = 0; i < geometry.faces.length; i++) {
		var face = geometry.faces[i];
		var adj = new Array();

		addAdjacentFaces(face.a);
		addAdjacentFaces(face.b);
		addAdjacentFaces(face.c);

		faceAdjacency[i] = adj;
	}

	return faceAdjacency;
}*/

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
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0x228822 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	});
}

// Debug
function drawAdjacency(geometry, faceAdjacency) {
	for(var i = 0; i < geometry.faces.length; i++) {
		var face = geometry.faces[i];

		var normal = new THREE.ArrowHelper(face.normal, face.centroid, .3, 0x4444cc);
		scene.add(normal);

		var lineGeometry = new THREE.Geometry();	
		var vertArray = lineGeometry.vertices;	

		faceAdjacency[i].forEach(function(adjacentFace) {
			var dir = new THREE.Vector3();	
			dir.subVectors(adjacentFace.centroid, face.centroid);
	
			vertArray.push(face.centroid, dir.multiplyScalar(.25).add(face.centroid));	

		//	var arrow = new THREE.ArrowHelper(dir, face.centroid, face.centroid.distanceTo(adjacentFace.centroid) * .25, 0xcc4444 );
		//	scene.add(arrow);
		});

		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0xcc4444 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	}
}

function sampleGeometry(geometry, surfaceDensity) {

	clearScene(samplesContainer);
	
	geometry.faces.forEach(function(face) {	

		// Only sample faces facing windDirection
		if(face.normal.dot(windDirection) > 1 - tolerance * 2) {

			var v1 = geometry.vertices[face.a];
			var v2 = geometry.vertices[face.b];
			var v3 = geometry.vertices[face.c];

			// TODO: threejs' triangleArea can be optimized by removing the branch
			var area = THREE.GeometryUtils.triangleArea(v1, v2, v3) * surfaceDensity;

			for(var i = 0; i < area; i++) {

				var p = THREE.GeometryUtils.randomPointInTriangle(v1, v2, v3);

				// Debug thingies
				var g = new THREE.SphereGeometry(.025, 2, 2);
				var material = new THREE.MeshBasicMaterial({ color : 0xcccccc });
				var cube = new THREE.Mesh( g, material );
				cube.position = p;

				samplesContainer.add( cube );
			}
		}
	});
}