// Shaders
const DEVICE_VERTEX_SHADER = `
	varying vec2 vUv;
	varying vec3 vNormal;

	void main() {
		vUv = uv;
		vNormal = normalMatrix * normal;

	 	gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
	}
`

const DEVICE_FRAGMENT_SHADER = `
#if NUM_DIR_LIGHTS > 0
    struct DirectionalLight {
        vec3 direction;
        vec3 color;
        int shadow;
        float shadowBias;
        float shadowRadius;
        vec2 shadowMapSize;
     };
    uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
#endif
	uniform vec3 ambientLightColor;
	
	varying vec2 vUv;
	varying vec3 vNormal;

	uniform sampler2D map;
	uniform vec3 mycolor;

	void main() {
		vec4 tex_color = texture2D(map, vUv) + vec4(mycolor, 1.0);
		vec4 light = vec4(0, 0, 0, 1.0);
		
		vec3 norm = normalize(vNormal);

		for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
			vec3 lightdir = normalize(directionalLights[i].direction);
			light.rgb += clamp(
							dot(
								lightdir,
                               	norm
                            ), 
                            0.0, 
                            1.0
                            )
                         * directionalLights[i].color
                         * vec3(1,1,1);
		}

		gl_FragColor = tex_color * (light + vec4(ambientLightColor, 0.0));
	}
`


// Shortcut
function $WGL_V3(x,y,z) {return new THREE.Vector3(x,y,z)}
function $WGL_V2(x,y) {return new THREE.Vector2(x,y)}
function $WGL_F3(a,b,c) {return new THREE.Face3(a,b,c)}

function WGL_initialize() {
}

function WGL_createDeviceMaterial(parameters) {
	let uniforms = THREE.UniformsUtils.merge( [
			THREE.UniformsLib[ "common" ],
    		THREE.UniformsLib[ "lights" ],
    		{
    			mycolor: {type: 'c', value: new THREE.Color() }
    		},
		]);
	uniforms.map.value = parameters.map;
	uniforms.mycolor.value = new THREE.Color(parameters.mycolor);

	let material = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: DEVICE_VERTEX_SHADER,
    	fragmentShader: DEVICE_FRAGMENT_SHADER,

    	lights: true,
	});

	return material;
}
function WGL_loadFont(url, obj) {
	obj.font = new THREE.FontLoader().parse(WGL_FONT);
}

// Class
class WGL {
	constructor(domelement) {
		this.global_settings = {
        	show_device_name: true,
        	grid: {
        		active: true,
        		x: .5,
        		z: .5,
        		angle: 15,
        		resize: .25,
        	},
        	format: {
        		use_standard_color: true,
        		color1: 0x888888,
        		color2: 0x444444,
        		scale: 1,

        		use_standard_link: true,
        		link_weight: 0.025,
        		link_height: .25,
        		link_color: 0x888888,
        		
        		use_standard_text: true,
        		text_color: 0x000000,
        		text_rx: -Math.PI/4,
        		text_height: .3,
        		text_align: "l",
        		text_rotation_x: 0,
		        text_bg_color: 0xffffff,
		        text_border_color: 0x000000,
		        text_bg_type: "n",
		        text_bg_show: false,
		        text_border_show: false,
		        text_border_width: .1,
		        text_bg_depth: .1,
		        text_rotation_x: 0,
        	}
    	}

		this.domelement = domelement;
		this.scene = {
			L2: new THREE.Scene(),
			L3: new THREE.Scene(),
		};
		this.view = "L2";

		let cam_ratio = domelement.clientWidth / domelement.clientHeight;
		
		let initial_ortho_size = 7;

		this.camera = {
			L2: {
				persp: new THREE.PerspectiveCamera( 30, cam_ratio, 0.1, 1000 ),
				ortho: new THREE.OrthographicCamera( -initial_ortho_size * cam_ratio, initial_ortho_size * cam_ratio, initial_ortho_size, -initial_ortho_size, 1, 200),
				ortho_size: initial_ortho_size,
			},
			L3: {
				persp: new THREE.PerspectiveCamera( 30, cam_ratio, 0.1, 1000 ),
				ortho: new THREE.OrthographicCamera( -initial_ortho_size * cam_ratio, initial_ortho_size * cam_ratio, initial_ortho_size, -initial_ortho_size, 1, 200),
				ortho_size: initial_ortho_size,
			},
			current: "persp",
		}

		this.camera.L2.persp.position.y = 30;
		this.camera.L2.persp.position.z = 30;
		this.camera.L2.persp.rotation.x = -Math.PI/4.0;
		this.camera.L2.persp.rotation.order="YXZ";

		this.camera.L3.persp.position.y = 30;
		this.camera.L3.persp.position.z = 30;
		this.camera.L3.persp.rotation.x = -Math.PI/4.0;
		this.camera.L3.persp.rotation.order="YXZ";

		this.camera.L2.ortho.position.y = 30;
		this.camera.L2.ortho.rotation.x = -Math.PI/2.0;
		this.camera.L2.ortho.rotation.order="YXZ";

		this.camera.L3.ortho.position.y = 30;
		this.camera.L3.ortho.rotation.x = -Math.PI/2.0;
		this.camera.L3.ortho.rotation.order="YXZ";

		this.renderer = new THREE.WebGLRenderer( {
			antialias:true,
		});
		this.renderer.setClearColor(0xf0f0f0);
		this.renderer.setSize( domelement.clientWidth, domelement.clientHeight );
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;

		// Lighting
		this.ambientlightL2 = new THREE.AmbientLight(0xFFFFFF, 0.7);
		this.directionallightL2 = new THREE.DirectionalLight(0xFFFFFF, .4);
		this.directionallightL2.castShadow = true;
		this.directionallightL2.position.set(40,100,60);
		this.directionallightL2.shadow.camera.left = -50;
		this.directionallightL2.shadow.camera.right = 50;
		this.directionallightL2.shadow.camera.bottom = -50;
		this.directionallightL2.shadow.camera.top = 50;
		this.directionallightL2.shadow.camera.far = 200;
		this.directionallightL2.shadow.mapSize.width = 4096;
		this.directionallightL2.shadow.mapSize.height = 4096;
		this.scene.L2.add(this.ambientlightL2);
		this.scene.L2.add(this.directionallightL2);
		
		this.ambientlightL3 = new THREE.AmbientLight(0xFFFFFF, 0.7);
		this.directionallightL3 = new THREE.DirectionalLight(0xFFFFFF, .4);
		this.directionallightL3.castShadow = true;
		this.directionallightL3.position.set(40,100,60);
		this.directionallightL3.shadow.camera.left = -50;
		this.directionallightL3.shadow.camera.right = 50;
		this.directionallightL3.shadow.camera.bottom = -50;
		this.directionallightL3.shadow.camera.top = 50;
		this.directionallightL3.shadow.camera.far = 200;
		this.directionallightL3.shadow.mapSize.width = 4096;
		this.directionallightL3.shadow.mapSize.height = 4096;
		this.scene.L3.add(this.ambientlightL3);
		this.scene.L3.add(this.directionallightL3);

		domelement.appendChild( this.renderer.domElement );

		this.raycaster = new THREE.Raycaster();
		this.pickvector = $WGL_V2(0,0);
		
		this.tempVector = $WGL_V3(0,0,0);

		this.font = new THREE.FontLoader().parse(WGL_FONT);
		this.namematerial = new THREE.MeshStandardMaterial({color: 0x000000});

		//var helper = new THREE.CameraHelper( this.directionallightL2.shadow.camera );
		//this.scene.L2.add(helper);
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	setBGColor(color) {
		this.renderer.setClearColor(color);
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	} 

	resize() {
		let cam_ratio = this.domelement.clientWidth / this.domelement.clientHeight;
		this.camera.L2.persp.aspect = cam_ratio;
		this.camera.L2.persp.updateProjectionMatrix();
		
		this.camera.L3.persp.aspect = cam_ratio;
		this.camera.L3.persp.updateProjectionMatrix();
		
		this.camera.L2.ortho.left = -this.camera.L2.ortho_size * cam_ratio;
		this.camera.L2.ortho.right = this.camera.L2.ortho_size * cam_ratio;
		this.camera.L2.ortho.updateProjectionMatrix();

		this.camera.L3.ortho.left = -this.camera.L3.ortho_size * cam_ratio;
		this.camera.L3.ortho.right = this.camera.L3.ortho_size * cam_ratio;
		this.camera.L3.ortho.updateProjectionMatrix();
		
		this.renderer.setSize(this.domelement.clientWidth, this.domelement.clientHeight)
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	setView(view) {
		this.view = view;
		this.adjustLabelsToCamera();
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	draw() {
		if(this.draw_needed) {
			this.renderer.render( this.scene[this.view], this.camera[this.view][this.camera.current] );
			this.draw_needed = false;
		}
	}

	processLoadedTexture(texture) {
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.anisotropy = 4;

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	settingsBackground(bg_color) {
		this.setBGColor(bg_color);
	}
	// ***********************************************
	// Camera Functions
	// ***********************************************
	setCamera(px, py, pz, rx, ry, rz) {
		let ac = this.camera[this.view][this.camera.current];
		ac.position.x = px;
		ac.position.y = py;
		ac.position.z = pz;
		ac.rotation.x = rx;
		ac.rotation.y = ry;
		ac.rotation.z = rz;
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});		
	}
	moveCamera(dx, dy) {
		let ac = this.camera[this.view][this.camera.current];
		let sin = Math.sin(ac.rotation.y);
		let cos = Math.cos(ac.rotation.y);
		ac.position.x -= dx * .1 * cos + dy * .1 * sin;
		ac.position.z -= -dx * .1 * sin + dy * .1 * cos;

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	adjustLabelsToCamera() {
		let angle = this.camera[this.view][this.camera.current].rotation.y;
		let view = this.scene[this.view];

		view.children.forEach((base_element) => {
			if(base_element.userData.type === "base") {
				base_element.children.forEach((device) => {
					if((device.userData.type === "device") || (device.userData.type === "vrf") || (device.userData.type === "l2segment"))
						this.adjustDeviceNameRotation(device);
				})
			}
		})

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	rotateCamera(dx, dy) {
		let ac = this.camera[this.view][this.camera.current];

		if(this.camera.current == "persp") {
			ac.rotation.y += dx/100.0;
			ac.rotation.x += dy/100.0;
			if (ac.rotation.x > Math.PI*.5)
				ac.rotation.x = Math.PI*.5
			if (ac.rotation.x < -Math.PI*.5)
				ac.rotation.x = -Math.PI*.5

		}
		else {
			ac.rotation.y += dx/100.0;
		}

		this.adjustLabelsToCamera();
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	zoomCamera(dy) {
		let ac = this.camera[this.view][this.camera.current];

		if(this.camera.current == "persp") {
			ac.translateZ(dy*.1);
		}
		else {
			this.camera[this.view].ortho_size += dy*.1;
			if(this.camera[this.view].ortho_size < 1)
				this.camera[this.view].ortho_size = 1;
			if(this.camera[this.view].ortho_size > this.domelement.clientHeight*.1)
				this.camera[this.view].ortho_size = this.domelement.clientHeight*.1;
			
			let os = this.camera[this.view].ortho_size;

			let cam_ratio = this.domelement.clientWidth / this.domelement.clientHeight;

			ac.left = -this.camera[this.view].ortho_size * cam_ratio;
			ac.right = this.camera[this.view].ortho_size * cam_ratio;
			ac.top = this.camera[this.view].ortho_size;
			ac.bottom = -this.camera[this.view].ortho_size;
			ac.updateProjectionMatrix();
		}
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	toggleCamera() {
		this.camera.current = this.camera.current == "ortho" ? "persp" : "ortho"
		
		this.adjustLabelsToCamera();

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});

		return this.camera.current;
	}


	findMesh(type, id, basemesh) {
		for(let x = 0; x < basemesh.children.length; x++) {
			let c = basemesh.children[x];
			if((c.userData.type === type) && (c.userData.id === id))
				return c;

			let r = this.findMesh(type, id, c);
			if(r)
				return r
		}

		return null
	}

	findLinksOfDevice(devid, basemesh) {
		let meshlist = []
		for(let x = 0; x < basemesh.children.length; x++) {
			let c = basemesh.children[x];
			if(c.userData.type === "link") {
				for(let y = 0; y < c.userData.e.devs.length; y++) {
					if (c.userData.e.devs[y].id == devid) {
						meshlist.push(c);
						break;
					}
				}
			}
		}
		return meshlist;
	}

	findLinksOfBase(base, basemesh) {
		let linklist = {
			link: {},
			l2link: {},
			interface: {},
			svi_interface: {},
			p2p_interface: {}
		};
		let devids = new Set();
		let vrfids = new Set();
		let l2segmentids = new Set();

		base.children.forEach((element) => {
			if(element.userData.type === "device")
				devids.add(element.userData.id);
			if(element.userData.type === "l2segment")
				l2segmentids.add(element.userData.id);
			if(element.userData.type === "vrf")
				vrfids.add(element.userData.id);
		});

		basemesh.children.forEach((c) => {
			if(c.userData.type === "link") {
				for(let y = 0; y < c.userData.e.devs.length; y++) {
					if (devids.has(c.userData.e.devs[y].id)) {
						linklist.link[c.userData.id] = c;
						break;
					}
				}
			}
			else if((c.userData.type === "l2link") && ( 
				l2segmentids.has(c.userData.e.l3_reference.src_l2segment_id) || 
				l2segmentids.has(c.userData.e.l3_reference.dst_l2segment_id) 
				))
				linklist.l2link[c.userData.id] = c;
			else if((c.userData.type === "interface") && ( 
				vrfids.has(c.userData.e.l3_reference.vrf_id) || 
				l2segmentids.has(c.userData.e.l3_reference.l2segment_id) 
				))
				linklist.interface[c.userData.id] = c;
			else if((c.userData.type === "svi_interface") && ( 
				vrfids.has(c.userData.e.l3_reference.vrf_id) || 
				l2segmentids.has(c.userData.e.l3_reference.l2segment_id) 
				))
				linklist.svi_interface[c.userData.id] = c;
			else if((c.userData.type === "p2p_interface") && ( 
				vrfids.has(c.userData.e.l3_reference.src_vrf_id) || 
				vrfids.has(c.userData.e.l3_reference.dst_vrf_id) 
				))
				linklist.p2p_interface[c.userData.id] = c;
		});

		return linklist;
	}

	findLinksOfL2Segment(id) {
		let linklist = {
			l2link: {},
			interface: {},
			svi_interface: {},
		};

		for(let x = 0; x < this.scene.L3.children.length; x++) {
			let element = this.scene.L3.children[x];
			if((element.userData.type == "l2link") && (
					(element.userData.e.l3_reference.src_l2segment_id === id) ||
					(element.userData.e.l3_reference.dst_l2segment_id === id)
				))
				linklist.l2link[element.userData.id] = element;
			else if((element.userData.type == "interface") && (element.userData.e.l3_reference.l2segment_id === id))
				linklist.interface[element.userData.id] = element;
			else if((element.userData.type == "svi_interface") && (element.userData.e.l3_reference.l2segment_id === id))
				linklist.svi_interface[element.userData.id] = element;
		}

		return linklist;
	}

	findLinksOfVrf(id) {
		let linklist = {
			p2p_interface: {},
			interface: {},
			svi_interface: {},
		};

		for(let x = 0; x < this.scene.L3.children.length; x++) {
			let element = this.scene.L3.children[x];
			if((element.userData.type == "p2p_interface") && (
					(element.userData.e.l3_reference.src_vrf_id === id) ||
					(element.userData.e.l3_reference.dst_vrf_id === id)
				))
				linklist.p2p_interface[element.userData.id] = element;
			else if((element.userData.type == "interface") && (element.userData.e.l3_reference.vrf_id === id))
				linklist.interface[element.userData.id] = element;
			else if((element.userData.type == "svi_interface") && (element.userData.e.l3_reference.vrf_id === id))
				linklist.svi_interface[element.userData.id] = element;
		}

		return linklist;
	}

	findClosestLinkJointIndex(view, element_type, linkid, x, y, z) {
		let mesh = this.getMesh(view, element_type, linkid);
		let distance = 10000;
		let index = -1;
		for(let i = 0; i < mesh.userData.e.linedata.points.length; i++) {
			let point = mesh.userData.e.linedata.points[i];
			let newdistance = (point[0]-x)*(point[0]-x)+(point[1]-y)*(point[1]-y)+(point[2]-z)*(point[2]-z);
			if ( newdistance < distance) {
				distance = newdistance;
				index = i;
			}
		}
		return index;
	}

	getMesh(view, type, id) {
		return this.findMesh(type, id, this.scene[view]);
	}

	getMeshPosition(view, type, id) {
		let mesh = this.findMesh(type, id, this.scene[view]);
		let r = {x: mesh.position.x, y: mesh.position.y, z: mesh.position.z};
		if(mesh.userData.type === "text")
			r.y = mesh.userData.e.py;
		if("base" in mesh.userData.e)
			r.base = mesh.userData.e.base;

		return r;
	}

	getMeshRotation(view, type, id) {
		return this.findMesh(type, id, this.scene[view]).rotation;
	}

	getMeshSize(view, type, id) {
		let o = this.findMesh(type, id, this.scene[view])
		this.tempVector.x = o.userData.e.sx;
		this.tempVector.y = o.userData.e.sy;
		this.tempVector.z = o.userData.e.sz;
		return this.tempVector;
	}

	moveMesh(view, type, id, x, y, z, base, alignToGrid) {
		let mesh = this.findMesh(type, id, this.scene[view]);
		if(mesh) {
			if(x !== undefined) {
				mesh.position.x = x;
			}
			if(y !== undefined) {
				mesh.position.y = y;
			}
			if(z !== undefined) {
				mesh.position.z = z;
			}

			if(alignToGrid) {
				this.alignVectorToGrid(mesh.position);
			}

			if(x !== undefined)
				mesh.userData.e.px = mesh.position.x;
			if(y !== undefined) {
				if(mesh.userData.type == "text") {
					let basemesh = this.findMesh("base", mesh.userData.e.base, this.scene[view]);
					mesh.userData.e.py = mesh.position.y - basemesh.userData.e.sy;
				}
				else
					mesh.userData.e.py = mesh.position.y;
			}
			if(z !== undefined)
				mesh.userData.e.pz = mesh.position.z;

			if(base != null) {
				mesh.userData.e.base = base;
				let basemesh = this.findMesh("base", base, this.scene[view]);
				basemesh.add(mesh);
				if(type == "text")
					mesh.position.y = basemesh.userData.e.sy + mesh.userData.e.py;
			}

			mesh.updateMatrixWorld();

			if(type === "device") {
				let listlinks = this.findLinksOfDevice(id, this.scene[view]);
				for (let x = 0; x < listlinks.length; x++) {
					this.updateLinkGeometry("link", listlinks[x], view);
				}
				// In case of devices, we have to adjust the rotation of the name to face the camera
				// in this case, this is only a problem if the device is changing base
				this.adjustDeviceNameRotation(mesh);
			}
			else if(type === "base") {
				let links = this.findLinksOfBase(mesh, this.scene[view]);
				for(let link_type in links)
					for(let link_id in links[link_type])
						this.updateLinkGeometry(link_type, links[link_type][link_id], view);
			}
			else if(type === "l2segment") {
				let links = this.findLinksOfL2Segment(id);
				for(let link_type in links) {
					for(let link_id in links[link_type]) {
						this.updateLinkGeometry(link_type, links[link_type][link_id], view);
					}
				}
			}
			else if(type === "vrf") {
				let links = this.findLinksOfVrf(id);
				for(let link_type in links) {
					for(let link_id in links[link_type]) {
						this.updateLinkGeometry(link_type, links[link_type][link_id], view);
					}
				}
			}

			this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
		}
	}

	rotateMesh(view, type, id, rx, ry, rz, alignToGrid) {
		let mesh = this.findMesh(type, id, this.scene[view]);
		let grid_angle = this.global_settings.grid.angle * Math.PI / 180;
		if(mesh) {
			if(rx !== undefined) {
				mesh.rotation.x = rx;
				if(alignToGrid && this.global_settings.grid.active)
					mesh.rotation.x = Math.round(mesh.rotation.x / grid_angle) * grid_angle;
				mesh.userData.e.rx = mesh.rotation.x;
			}
			if(ry !== undefined) {
				mesh.rotation.y = ry;
				if(alignToGrid && this.global_settings.grid.active)
					mesh.rotation.y = Math.round(mesh.rotation.y / grid_angle) * grid_angle;
				mesh.userData.e.ry = mesh.rotation.y;
			}
			if(rz !== undefined) {
				mesh.rotation.z = rz;
				if(alignToGrid && this.global_settings.grid.active)
					mesh.rotation.z = Math.round(mesh.rotation.z / grid_angle) * grid_angle;
				mesh.userData.e.rz = mesh.rotation.z;
			}

			mesh.updateMatrixWorld();

			if(type == "base") {
				let links = this.findLinksOfBase(mesh, this.scene[view]);
				for(let link_type in links)
					for(let link_id in links[link_type])
						this.updateLinkGeometry(link_type, links[link_type][link_id], view);
				this.adjustLabelsToCamera();
			}
			if(type == "device") {
				// In case of devices, we have to adjust the rotation of the name to face the camera
				this.adjustDeviceNameRotation(mesh);
			}

			this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
		}

	}

	resizeMesh(view, type, id, sx, sy, sz, alignToGrid) {
		let mesh = this.findMesh(type, id, this.scene[view]);
		let resize_step = this.global_settings.grid.resize;
		if(mesh) {
			if (sx != null) {
				if(alignToGrid && this.global_settings.grid.active)
					sx = Math.round(sx / resize_step) * resize_step;
				if(sx >= .1)
					mesh.userData.e.sx = sx;
			}
			if (sy != null) {
				if(alignToGrid && this.global_settings.grid.active)
					sy = Math.round(sy / resize_step) * resize_step;
				if(sy >= .1)
					mesh.userData.e.sy = sy;
			}
			if (sz != null) {
				if(alignToGrid && this.global_settings.grid.active)
					sz = Math.round(sz / resize_step) * resize_step;
				if(sz >= .1)
					mesh.userData.e.sz = sz;
			}
			if((type === "device") || (type === "vrf")) {
				this.updateDeviceGeometry(type, id, view);
				this.addDeviceName(mesh);
			}
			else if(type == "symbol")
				this.updateSymbolGeometry(mesh);
			else if(type == "l2segment")
				this.updateL2SegmentGeometry(mesh);

			this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
		}
	}

	resizeMesh_Base(view, id, sx, sy, sz, alignToGrid) {
		let mesh = this.findMesh("base", id, this.scene[view]);
		let resize_step = this.global_settings.grid.resize;
		
		if(mesh) {
			if (sx != null) {
				if(alignToGrid && this.global_settings.grid.active)
					sx = Math.round(sx / resize_step) * resize_step;
				if(sx < 1) sx = 1;
				mesh.userData.e.sx = sx;
			}
			if (sy != null) {
				if(alignToGrid && this.global_settings.grid.active)
					sy = Math.round(sy / resize_step) * resize_step;
				if(sy < .5) sy = .5;
				mesh.userData.e.sy = sy;
			}
			if (sz != null) { 
				if(alignToGrid && this.global_settings.grid.active)
					sz = Math.round(sz / resize_step) * resize_step;
				if(sz < 1) sz = 1;
				mesh.userData.e.sz = sz;
			}
			this.updateCubeFloorGeometry(id, view);			
		}	
	}

	settingsMesh_Base(view, id, name, subtype, color1, color2, opacity, t1name, t2name, sy, tsx, tsy) {
		let mesh = this.findMesh("base", id, this.scene[view]);

		if (mesh) {
			mesh.userData.e.name = name;
			mesh.userData.e.subtype = subtype;
			mesh.userData.e.color1 = color1;
			mesh.userData.e.color2 = color2;
			mesh.userData.e.opacity = opacity;
			mesh.userData.e.t1name = t1name;
			mesh.userData.e.t2name = t2name;
			mesh.userData.e.sy = sy;
			mesh.userData.e.tsx = tsx;
			mesh.userData.e.tsy = tsy;
			this.updateCubeFloorGeometry(id, view);
			this.updateCubeFloorTextures(id, view);

			for(let x = 0; x < mesh.children.length; x++) {
				if(mesh.children[x].userData.type == "device") {
					mesh.children[x].position.y = sy;

					let listlinks = this.findLinksOfDevice(mesh.children[x].userData.id, this.scene[view]);
					for (let x = 0; x < listlinks.length; x++) {
						this.updateLinkGeometry("link", listlinks[x], view);
					}
				}
				else if(mesh.children[x].userData.type == "text") {
					mesh.children[x].position.y = sy + mesh.children[x].userData.e.py;
				}
				else if(mesh.children[x].userData.type == "symbol") {
					mesh.children[x].position.y = sy;
				}
			}
		}
	}

	settingsMesh_Device(id, name, color1, color2, ifnaming) {
		let mesh = this.findMesh("device", id, this.scene["L2"]);
		if(mesh) {
			mesh.userData.e.name = name;
			mesh.userData.e.color1 = color1;
			mesh.userData.e.color2 = color2;
			mesh.userData.e.ifnaming = ifnaming
			this.updateDeviceColor("device", id, "L2");
			this.addDeviceName(mesh);
		}
	}

	settingsMesh_Vrf(id, color1, color2) {
		let mesh = this.findMesh("vrf", id, this.scene["L3"]);
		if(mesh) {
			mesh.userData.e.color1 = color1;
			mesh.userData.e.color2 = color2;
			this.updateDeviceColor("vrf", id, "L3");
		}
	}

	settingsMesh_L2Segment(id, color1) {
		let mesh = this.findMesh("l2segment", id, this.scene["L3"]);
		if(mesh) {
			mesh.userData.e.color1 = color1;
			this.updateL2SegmentColor(id);
		}
	}

	settingsMesh_Link(view, type, id, link_type, order, color, weight, height) {
		let mesh = this.findMesh(type, id, this.scene[view]);
		if(mesh) {
			mesh.userData.e.type = link_type;
			mesh.userData.e.order = order;
			mesh.userData.e.linedata.color = color;
			mesh.userData.e.linedata.weight = weight;
			mesh.userData.e.linedata.height = height;
			this.updateLinkGeometry(type, mesh, view);
		}
	}

	settingsMesh_Text(view, id, text, py, height, color, text_align, bg_type, bg_show, bg_color, border_show, border_color, border_width, bg_depth, rotation_x) {
		let mesh = this.findMesh("text", id, this.scene[view]);
		let textMesh = null, bgMesh = null, borderMesh = null;
		for(let x = 0; x < mesh.children.length; x++) {
			if(mesh.children[x].userData.subtype === "text")
				textMesh = mesh.children[x];
			if(mesh.children[x].userData.subtype === "bg")
				bgMesh = mesh.children[x];
			if(mesh.children[x].userData.subtype === "border")
				borderMesh = mesh.children[x];
		}
		if(mesh) {
			mesh.userData.e.text = text;
			mesh.userData.e.py = py;
			mesh.userData.e.height = height;
			mesh.userData.e.color = color;
			mesh.userData.e.text_align = text_align;
			mesh.userData.e.bg_type = bg_type;
			mesh.userData.e.bg_show = bg_show;
			mesh.userData.e.bg_color = bg_color;
			mesh.userData.e.border_show = border_show;
			mesh.userData.e.border_color = border_color;
			mesh.userData.e.border_width = border_width;
			mesh.userData.e.bg_depth = bg_depth;
			mesh.userData.e.rotation_x = rotation_x;

			textMesh.geometry = this.createTextGeometry(text, height, text_align, rotation_x);
			[bgMesh.geometry, borderMesh.geometry] = this.createTextBGGeometry(textMesh.geometry, mesh.userData.e);

			textMesh.material = new THREE.MeshPhongMaterial({color: color, side: THREE.DoubleSide});
			bgMesh.material = new THREE.MeshPhongMaterial({color: bg_color});
			borderMesh.material = new THREE.MeshPhongMaterial({color: border_color});

			mesh.position.y = py + mesh.parent.userData.e.sy;

			this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
		}
	}

	settingsMesh_Symbol(view, id, data) {
		let mesh = this.findMesh("symbol", id, this.scene[view]);
		if(mesh) {
			if(mesh.userData.e.type == "F") {
				mesh.userData.e.color = data.color;
				mesh.userData.e.cd.flagcolor = data.flagcolor;
				this.updateSymbolColor("symbol", id, view);
				//this.updateSymbolGeometryFlag(mesh);
			}
		}
	}

	configMesh_L2Device(id, name, vlans, vrfs, svis, los) {
		let mesh = this.findMesh("device", id, this.scene["L2"]);
		if(mesh) {
			mesh.userData.e.vlans = vlans;
			mesh.userData.e.vrfs = vrfs;
			mesh.userData.e.svis = svis;
			mesh.userData.e.los = los;
		}
	}

	configMesh_L2Link(id, ifbindings, lag_name, lacp, transceiver) {
		let mesh = this.findMesh("link", id, this.scene["L2"]);
		if(mesh) {
			if(!("phy" in mesh.userData.e)) {
				mesh.userData.e.phy = {};
			}
			mesh.userData.e.phy.ifbindings = ifbindings;
			mesh.userData.e.phy.lag_name = lag_name;
			mesh.userData.e.phy.lacp = lacp;
			mesh.userData.e.phy.transceiver = transceiver;
		}
	}

	configMesh_L2LinkDevice(id, dev_index, if_function, vlans, native_vlan, subinterfaces) {
		let mesh = this.findMesh("link", id, this.scene["L2"]);
		if(mesh) {
			if(!("data" in mesh.userData.e.devs[dev_index])) {
				mesh.userData.e.devs[dev_index].data = {
					function: "none", function_data: {}
				};
			}
			
			mesh.userData.e.devs[dev_index].data.function = if_function;
			if(if_function == "switching") {
				mesh.userData.e.devs[dev_index].data.function_data = {
					vlans: vlans,
					native_vlan: native_vlan,
				}
			}
			else if(if_function == "routing") {
				mesh.userData.e.devs[dev_index].data.function_data = {
					subinterfaces: subinterfaces
				}
			}
			else
				mesh.userData.e.devs[dev_index].data.function_data = {};	
		}		
	}

	deleteMesh(view, type, id) {
		let mesh = this.findMesh(type, id, this.scene[view]);
		while(mesh) {
			mesh.parent.remove(mesh);

			if (type == "device") {
				let listlinks = this.findLinksOfDevice(id, this.scene[view]);
				for (let x = 0; x < listlinks.length; x++) {
					listlinks[x].parent.remove(listlinks[x]);
				}
			}
			mesh = this.findMesh(type, id, this.scene[view]);
		}
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	deleteJoint(view, element_type, link_id, joint_index) {
		let mesh = this.findMesh(element_type, link_id, this.scene[view]);
		if(mesh) {
			mesh.userData.e.linedata.points.splice(joint_index, 1);
			this.updateLinkGeometry(element_type, mesh, view);
		}
	}

	changeNameVRF(id, newname) {
		let mesh = this.findMesh("vrf", id, this.scene.L3);
		if(mesh) {
			mesh.userData.e.name = newname;
			this.addDeviceName(mesh);
		}
	}

	pickObject(x, y) {
		this.pickvector.x = ((x-this.domelement.offsetLeft) / this.domelement.clientWidth) * 2 - 1;
		this.pickvector.y = ((-y+this.domelement.offsetTop) / this.domelement.clientHeight) * 2 + 1;
		this.raycaster.setFromCamera( this.pickvector, this.camera[this.view][this.camera.current] );

		let intersects = this.raycaster.intersectObjects( this.scene[this.view].children, true );

		let result = [];

		for ( let i = 0; i < intersects.length; i++ ) {
			if("id" in intersects[i].object.userData) {
				result.push( {
					view: this.view, 
					p: intersects[i].point,
					mesh: intersects[i].object,
				});
			}
		}

		return result;
	}
	
	pickLevel(x,y, height) {
		this.pickvector.x = (x / this.domelement.clientWidth) * 2 - 1;
		this.pickvector.y = (-y / this.domelement.clientHeight) * 2 + 1;
		this.raycaster.setFromCamera( this.pickvector, this.camera[this.view][this.camera.current] );

		let plane = new THREE.Plane($WGL_V3(0,1,0), -height);
		return this.raycaster.ray.intersectPlane( plane );
	}

	convertWorld2MeshCoordinates(view, type, id, x, y, z) {
		let mesh = this.findMesh(type, id, this.scene[view]);

		this.tempVector.set(x,y,z);
		mesh.worldToLocal(this.tempVector);

		return this.tempVector;
	}

	convertMesh2WorldCoordinates(view, type, id, x, y, z) {
		let mesh = this.findMesh(type, id, this.scene[view]);

		this.tempVector.set(x,y,z);
		mesh.localToWorld(this.tempVector);

		return this.tempVector;
	}

	updateGlobalSettings_show_device_name(show_device_name) {
		this.global_settings.show_device_name = show_device_name;
		
		// Update visibilit of device names
		for(let view in this.scene) {
			for(let x = 0; x < this.scene[view].children.length; x++) {
				let be = this.scene[view].children[x];
				if (be.userData.type === "base") {
					for(let y = 0; y < be.children.length; y++) {
						if((be.children[y].userData.type === "device") || (be.children[y].userData.type === "vrf") || (be.children[y].userData.type === "l2segment")) {
							this.updateDeviceNameVisibility(be.children[y]);
						}
					}
				}
			}
		}

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	updateGlobalSettings_grid(active, x, z, angle, resize) {
		this.global_settings.grid.active = active;
		this.global_settings.grid.x = parseFloat(x);
		this.global_settings.grid.z = parseFloat(z);
		this.global_settings.grid.angle = parseFloat(angle);
		this.global_settings.grid.resize = parseFloat(resize);
	}

	updateFormatSettingsColor(win) {
		this.global_settings.format.color1 = parseInt(win.color1.value);
		this.global_settings.format.color2 = parseInt(win.color2.value);
		this.global_settings.format.use_standard_color = !win.use_standard_color.checked;
	}

	updateFormatSettingsText(win) {
		this.global_settings.format.use_standard_text = !win.use_standard_text.checked;
		this.global_settings.format.text_color = parseInt(win.color.value);
		this.global_settings.format.text_height = parseFloat(win.height.value);
		this.global_settings.format.text_align = win.text_align.value;
		this.global_settings.format.text_bg_type = win.bg_type.value;
		this.global_settings.format.text_bg_color = parseInt(win.bg_color.value);
		this.global_settings.format.text_bg_show = win.bg_show.checked;
		this.global_settings.format.text_border_color = parseInt(win.border_color.value);
		this.global_settings.format.text_border_show = win.border_show.checked;
		this.global_settings.format.text_border_width = parseFloat(win.border_width.value);
		this.global_settings.format.text_bg_depth = parseFloat(win.bg_depth.value);
		this.global_settings.format.text_rotation_x = parseFloat(win.rotation_x.value);
	}

	updateFormatSettingsLink(win) {
		this.global_settings.format.use_standard_link = !win.use_standard_link.checked;
		this.global_settings.format.link_color = parseInt(win.color.value);
		this.global_settings.format.link_height = parseFloat(win.height.value);
		this.global_settings.format.link_weight = parseFloat(win.weight.value);
	}

	alignVectorToGrid(vector) {
		if(this.global_settings.grid.active) {
			vector.x = Math.round(vector.x / this.global_settings.grid.x) * this.global_settings.grid.x;
			vector.z = Math.round(vector.z / this.global_settings.grid.z) * this.global_settings.grid.z;
		}
	}

	// ***********************************************
	// Functions to create/update meshes
	// ***********************************************
	findMeshesOfGroup(meshgroup) {
		let m1 = null; let m2 = null;
		for(let x = 0; x < meshgroup.children.length; x++) {
			if (meshgroup.children[x].userData.submesh === 1)
				m1 = meshgroup.children[x];
			else if (meshgroup.children[x].userData.submesh === 2)
				m2 = meshgroup.children[x];

			if((m1 != null) && (m2 != null))
				break;
		}

		return [m1, m2];
	}

	addListVertex(l, vl) {
		for(let x = 0; x < vl.length; x++) {
			l.push($WGL_V3(vl[x][0], vl[x][1], vl[x][2]));
		}
	}

	addListFaces(l, l2, fl, uvl) {
		for(let x = 0; x < fl.length; x++) {
			l.push($WGL_F3(fl[x][0], fl[x][1],fl[x][2]))
			l2.push([
				$WGL_V2(uvl[x][0][0], uvl[x][0][1]),
				$WGL_V2(uvl[x][1][0], uvl[x][1][1]),
				$WGL_V2(uvl[x][2][0], uvl[x][2][1]),
				])
		}
	}

	addCubeToGeometry(g, x1, x2, y1, y2, z1, z2, tu1, tu2, tv1, tv2) {
		let v = g.vertices;
		let f = g.faces;
		let uv = g.faceVertexUvs[0];
		let i = v.length;

		this.addListVertex(v, [
			[x2, y1, z1], [x1,y1,z1], [x1, y1, z2], [x2, y1, z2],
			[x2, y2, z1], [x1,y2,z1], [x1, y2, z2], [x2, y2, z2],
			]);
		this.addListFaces(f, uv,
			[
				[i, i+1, i+5], [i, i+5, i+4],
				[i+1, i+2, i+6], [i+1, i+6, i+5],
				[i+2, i+3, i+7], [i+2, i+7, i+6],
				[i+3, i, i+4], [i+3, i+4, i+7],
				[i, i+2, i+1], [i, i+3, i+2],
				[i+4, i+5, i+6], [i+4, i+6, i+7],
			],
			[ 
				[[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
				[[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
				[[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
				[[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
				[[tu1, tu1], [tu2, tu2], [tu2, tu1]], [[tu1, tu1], [tu1, tu2], [tu2, tu2]], 
				[[tu1, tu1], [tu2, tu1], [tu2, tu2]], [[tu1, tu1], [tu2, tu2], [tu1, tu2]], 
			]);
	}

	setGeometryUpdated(geometry_list, flat_normals) {
		for(let x = 0; x < geometry_list.length; x++) {
			geometry_list[x].verticesNeedUpdate = true;
			geometry_list[x].elementsNeedUpdate = true;
			geometry_list[x].uvsNeedUpdate = true;

			geometry_list[x].computeBoundingBox();
			geometry_list[x].computeBoundingSphere();
			if(flat_normals) {
				geometry_list[x].computeFaceNormals();
				geometry_list[x].computeFlatVertexNormals();
			}
			else {
				geometry_list[x].computeVertexNormals();
			}
		}

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	updateCubeFloorGeometry_height_float(g, w2, h, b, d2, tu1, tv1) {
		let v = g.vertices;
		let f = g.faces;
		let uv = g.faceVertexUvs[0];

		v.push($WGL_V3(	-w2, 	h, 		d2));
		v.push($WGL_V3(	w2, 	h, 		d2));
		v.push($WGL_V3(	w2, 	h, 		-d2));
		v.push($WGL_V3(	-w2, 	h, 		-d2));

		v.push($WGL_V3(	-w2-.10, 	h-.05, 	d2+.10));
		v.push($WGL_V3(	w2+.10, 	h-.05, 	d2+.10));
		v.push($WGL_V3(	w2+.10, 	h-.05, 	-d2-.10));
		v.push($WGL_V3(	-w2-.10, 	h-.05, 	-d2-.10));

		v.push($WGL_V3(	-w2-.10, 	b, 	d2+.10));
		v.push($WGL_V3(	w2+.10, 	b, 	d2+.10));
		v.push($WGL_V3(	w2+.10, 	b, 	-d2-.10));
		v.push($WGL_V3(	-w2-.10, 	b, 	-d2-.10));

		for(let i = 0; i < 8; i+=4) {
			let tv = .1;
			if(i > 0)
				tv = h-b;
			for(let x = 0; x < 4; x++) {
				let x1 = i + x;
				let x2 = i + (x+1)%4;
				let tf=.5;
				f.push($WGL_F3(x1, 4+x2,   x2));
				f.push($WGL_F3(x1, 4+x1, 4+x2));
				uv.push([$WGL_V2(0,tv*tf), $WGL_V2(w2*tf*2,0), $WGL_V2(w2*tf*2,tv*tf)] )
				uv.push([$WGL_V2(0,tv*tf), $WGL_V2(0,0), $WGL_V2(w2*tf*2,0)] )
			}
		}
		f.push($WGL_F3(8, 10, 9));
		uv.push([$WGL_V2(0,0), $WGL_V2(tu1, tv1), $WGL_V2(0,tv1)])
		f.push($WGL_F3(8, 11, 10));
		uv.push([$WGL_V2(0,0), $WGL_V2(tu1, 0), $WGL_V2(tu1,tv1)])
	}

	updateCubeFloorGeometry_height_platform(g, w2, h, b, d2, tu1, tv1) {
		this.updateCubeFloorGeometry_height_float(g, w2, h, b, d2, tu1, tv1);

		// Add 4 columns to the geometry
		let col_x = w2*.89;
		let col_w = w2*.1;
		let col_z = d2*.89;
		let col_d = d2*.1;
		this.addCubeToGeometry(g, -col_x-col_w, -col_x+col_w, 0, h-.1, -col_z-col_d, -col_z+col_d, 0, col_w, 0, h*.5);
		this.addCubeToGeometry(g, -col_x-col_w, -col_x+col_w, 0, h-.1, col_z-col_d, col_z+col_d, 0, col_w, 0, h*.5);
		this.addCubeToGeometry(g, col_x-col_w, col_x+col_w, 0, h-.1, -col_z-col_d, -col_z+col_d, 0, col_w, 0, h*.5);
		this.addCubeToGeometry(g, col_x-col_w, col_x+col_w, 0, h-.1, col_z-col_d, col_z+col_d, 0, col_w, 0, h*.5);
	}

	updateCubeFloorGeometry(id, sceneid) {
		let meshgroup = this.findMesh("base", id, this.scene[sceneid]);
		let m = this.findMeshesOfGroup(meshgroup);
		let g = [m[0].geometry, m[1].geometry]
		let subtype = meshgroup.userData.e.subtype;
		let sx = meshgroup.userData.e.sx;
		let sz = meshgroup.userData.e.sz;
		let h = meshgroup.userData.e.sy;
		let tu1 = sx * meshgroup.userData.e.tsx;
		let tv1 = sz * meshgroup.userData.e.tsy;

		let w2 = sx/2.0;
		let d2 = sz/2.0;

		// The flat surface
		g[0].vertices = [];
		g[0].faces = []
		g[0].faceVertexUvs[0] = []
		let v1 = g[0].vertices;
		let f1 = g[0].faces;
		let uv1 = g[0].faceVertexUvs[0];

		v1.push($WGL_V3(-w2, h, d2));
		v1.push($WGL_V3(w2, h, d2));
		v1.push($WGL_V3(w2, h, -d2));
		v1.push($WGL_V3(-w2, h, -d2));

		f1.push($WGL_F3(0,1,2));
		uv1.push([$WGL_V2(0,tv1), $WGL_V2(tu1,tv1), $WGL_V2(tu1,0)])
		f1.push($WGL_F3(0,2,3));
		uv1.push([$WGL_V2(0,tv1), $WGL_V2(tu1,0), $WGL_V2(0,0)])

		// The elevation part
		g[1].vertices = [];
		g[1].faces = [];
		g[1].faceVertexUvs[0] = [];

		if(subtype == "n") {}
		else if(subtype == "f") {
			this.updateCubeFloorGeometry_height_float(g[1], w2, h, h-.1, d2, tu1, tv1);
		}
		else if(subtype == "p") {
			this.updateCubeFloorGeometry_height_platform(g[1], w2, h, h-.1, d2, tu1, tv1);
		}
		else
			this.updateCubeFloorGeometry_height_float(g[1], w2, h, 0, d2, tu1, tv1);

		// Set the right render order on geometry 0 as it might have transparencies
		m[0].renderOrder = meshgroup.userData.e.sy;
		m[1].renderOrder = meshgroup.userData.e.sy;
		// Mark vertex, faces, normals as updated and compute bounding boxes
		this.setGeometryUpdated(g, true);
	}

	updateCubeFloorTextures(id, sceneid) {
		let meshgroup = this.findMesh("base", id, this.scene[sceneid]);
		let m = this.findMeshesOfGroup(meshgroup);

		let color1 = meshgroup.userData.e.color1;
		let color2 = meshgroup.userData.e.color2;
		let t1name = meshgroup.userData.e.t1name;
		let t2name = meshgroup.userData.e.t2name;
		
		let texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + t1name + ".png", (t) => {this.processLoadedTexture(t)} );
		let texture2 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + t2name + ".png", (t) => {this.processLoadedTexture(t)} );
		//let material1 = new THREE.MeshLambertMaterial({map: texture1})
		//let material2 = new THREE.MeshLambertMaterial({map: texture2})
		let material1 = new THREE.MeshStandardMaterial({map: texture1, bumpMap: texture1, metalness:.05, bumpScale:.2, transparent: true})
		let material2 = new THREE.MeshStandardMaterial({map: texture2, bumpMap: texture2, metalness:.05, bumpScale:.2, transparent: true})

		material1.opacity = (meshgroup.userData.e.opacity) ? meshgroup.userData.e.opacity : 1;
		material2.opacity = (meshgroup.userData.e.opacity) ? meshgroup.userData.e.opacity : 1;

		material1.color.r = (color1 >> 16) / 256;
		material1.color.g = ((color1 >> 8) & 0xFF) / 256;
		material1.color.b = (color1 & 0xFF) / 256;

		material2.color.r = (color2 >> 16) / 256;
		material2.color.g = ((color2 >> 8) & 0xFF) / 256;
		material2.color.b = (color2 & 0xFF) / 256;

		m[0].material = material1;
		m[1].material = material2;

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	addCubeFloor(id, sceneid, e) {
		let geometry1 = new THREE.Geometry();
		let geometry2 = new THREE.Geometry();
		let texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + e.t1name + ".png", (t) => {this.processLoadedTexture(t)} );
		let texture2 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + e.t2name + ".png", (t) => {this.processLoadedTexture(t)} );
		
		let material1 = new THREE.MeshStandardMaterial({map: texture1, bumpMap: texture1, metalness:.05, bumpScale:.2, transparent: true})
		let material2 = new THREE.MeshStandardMaterial({map: texture2, bumpMap: texture2, metalness:.05, bumpScale:.2, transparent: true})

		material1.opacity = (e.opacity) ? e.opacity : 1;
		material2.opacity = (e.opacity) ? e.opacity : 1;

		material1.color.r = (e.color1 >> 16) / 256;
		material1.color.g = ((e.color1 >> 8) & 0xFF) / 256;
		material1.color.b = (e.color1 & 0xFF) / 256;
		material2.color.r = (e.color2 >> 16) / 256;
		material2.color.g = ((e.color2 >> 8) & 0xFF) / 256;
		material2.color.b = (e.color2 & 0xFF) / 256;

		let mesh1 = new THREE.Mesh( geometry1, material1 );
		mesh1.userData.submesh = 1;		
		let mesh2 = new THREE.Mesh( geometry2, material2 );
		mesh2.userData.submesh = 2;

		let group = new THREE.Group();

		group.add(mesh1);
		group.add(mesh2);

		mesh1.userData.id = id;
		mesh1.userData.type = "base";
		mesh1.userData.e = e;
		mesh2.userData.id = id;
		mesh2.userData.type = "base";
		mesh2.userData.e = e;
		group.userData.id = id;
		group.userData.type = "base";
		group.userData.e = e;

		this.scene[sceneid].add(group);

		this.updateCubeFloorGeometry(id, sceneid);

		group.position.x = e.px;
		group.position.y = e.py;
		group.position.z = e.pz;
		group.rotation.x = e.rx;
		group.rotation.y = e.ry;
		group.rotation.z = e.rz;

		group.updateMatrixWorld();

		mesh1.receiveShadow = true;
		mesh2.receiveShadow = true;
		group.receiveShadow = true;
		mesh1.castShadow = true;
		mesh2.castShadow = true;

		return id;
	}

	updateDeviceCubeGeometry(meshgroup, base_sx, base_sy, base_sz) {
		let m = this.findMeshesOfGroup(meshgroup);
		let g = [m[0].geometry, m[1].geometry]
		
		let sx = meshgroup.userData.e.sx * base_sx;
		let sz = meshgroup.userData.e.sz * base_sz;
		let h = meshgroup.userData.e.sy * base_sy;

		// Set to 0
		g[0].vertices = [];
		g[0].faces = []
		g[0].faceVertexUvs[0] = []
		g[1].vertices = [];
		g[1].faces = []
		g[1].faceVertexUvs[0] = []
		let v1 = g[0].vertices;
		let f1 = g[0].faces;
		let uv1 = g[0].faceVertexUvs[0];
		let v2 = g[1].vertices;
		let f2 = g[1].faces;
		let uv2 = g[1].faceVertexUvs[0];

		v1.push($WGL_V3(-sx*.45, h, sz*.45)); 
		v1.push($WGL_V3(sx*.45, h, sz*.45)); 
		v1.push($WGL_V3(sx*.45, h, -sz*.45)); 
		v1.push($WGL_V3(-sx*.45, h, -sz*.45))
		f1.push($WGL_F3(0,1,2)); f1.push($WGL_F3(0,2,3))
		uv1.push([$WGL_V2(0,1), $WGL_V2(1,1), $WGL_V2(1,0)])
		uv1.push([$WGL_V2(0,1), $WGL_V2(1,0), $WGL_V2(0,0)])
		v1.push($WGL_V3(-sx*.45, 0, sz*.45))
		v1.push($WGL_V3(sx*.45, 0, sz*.45))
		v1.push($WGL_V3(sx*.45, 0, -sz*.45))
		v1.push($WGL_V3(-sx*.45, 0, -sz*.45))
		f1.push($WGL_F3(4,6,5)); f1.push($WGL_F3(4,7,6))
		uv1.push([$WGL_V2(0,1), $WGL_V2(1,0), $WGL_V2(1,1)])
		uv1.push([$WGL_V2(0,1), $WGL_V2(0,0), $WGL_V2(1,0)])

		v2.push($WGL_V3(-sx*.45, h, sz*.45)); 
		v2.push($WGL_V3(sx*.45, h, sz*.45)); 
		v2.push($WGL_V3(sx*.45, h, -sz*.45)); 
		v2.push($WGL_V3(-sx*.45, h, -sz*.45))
		v2.push($WGL_V3(-sx*.5, h, sz*.5)); 
		v2.push($WGL_V3(sx*.5, h, sz*.5)); 
		v2.push($WGL_V3(sx*.5, h, -sz*.5)); 
		v2.push($WGL_V3(-sx*.5, h, -sz*.5))
		v2.push($WGL_V3(-sx*.5, 0, sz*.5)); 
		v2.push($WGL_V3(sx*.5, 0, sz*.5)); 
		v2.push($WGL_V3(sx*.5, 0, -sz*.5)); 
		v2.push($WGL_V3(-sx*.5, 0, -sz*.5))
		v2.push($WGL_V3(-sx*.45, 0, sz*.45)); 
		v2.push($WGL_V3(sx*.45, 0, sz*.45)); 
		v2.push($WGL_V3(sx*.45, 0, -sz*.45)); 
		v2.push($WGL_V3(-sx*.45, 0, -sz*.45))
		for(let x = 0; x < 12; x+=4) {
			f2.push($WGL_F3(x+0,x+5,x+1)); f2.push($WGL_F3(x+0,x+4,x+5))
			f2.push($WGL_F3(x+1,x+6,x+2)); f2.push($WGL_F3(x+1,x+5,x+6))
			f2.push($WGL_F3(x+2,x+7,x+3)); f2.push($WGL_F3(x+2,x+6,x+7))
			f2.push($WGL_F3(x+3,x+4,x+0)); f2.push($WGL_F3(x+3,x+7,x+4))
			if(x == 4) {
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,h), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sx,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,h), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sz,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,h), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sx,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,h), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sz,h)])
			}
			else {
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,sz*.05), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sz*.05),  $WGL_V2(sx,sz*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,sx*.05), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sx*.05),  $WGL_V2(sz,sx*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,sz*.05), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sz*.05),  $WGL_V2(sx,sz*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,sx*.05), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sx*.05),  $WGL_V2(sz,sx*.05)])
			}
		}
		// Mark vertex, faces, normals as updated and compute bounding boxes
		this.setGeometryUpdated(g, true);
	}


	updateDeviceLBGeometry(meshgroup, base_sx, base_sy, base_sz, back_factor_x, back_factor_y) {
		let m = this.findMeshesOfGroup(meshgroup);
		let g = [m[0].geometry, m[1].geometry]
		
		let sx = meshgroup.userData.e.sx * base_sx;
		let sz = meshgroup.userData.e.sz * base_sz;
		let h = meshgroup.userData.e.sy * base_sy;

		// Set to 0
		g[0].vertices = [];
		g[0].faces = []
		g[0].faceVertexUvs[0] = []
		g[1].vertices = [];
		g[1].faces = []
		g[1].faceVertexUvs[0] = []
		let v1 = g[0].vertices;
		let f1 = g[0].faces;
		let uv1 = g[0].faceVertexUvs[0];
		let v2 = g[1].vertices;
		let f2 = g[1].faces;
		let uv2 = g[1].faceVertexUvs[0];

		let fxt = (1-back_factor_x)*.5;
		v1.push($WGL_V3(-sx*.45, h, sz*.45)); 
		v1.push($WGL_V3(sx*.45, h, sz*.45)); 
		v1.push($WGL_V3(sx*.45*back_factor_x, h*back_factor_y, -sz*.45)); 
		v1.push($WGL_V3(-sx*.45*back_factor_x, h*back_factor_y, -sz*.45))
		f1.push($WGL_F3(0,1,2)); f1.push($WGL_F3(0,2,3))
		uv1.push([$WGL_V2(0,1), $WGL_V2(1,1), $WGL_V2(1-fxt,0)])
		uv1.push([$WGL_V2(0,1), $WGL_V2(1-fxt,0), $WGL_V2(fxt,0)])
		v1.push($WGL_V3(-sx*.45, 0, sz*.45))
		v1.push($WGL_V3(sx*.45, 0, sz*.45))
		v1.push($WGL_V3(sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45))
		v1.push($WGL_V3(-sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45))
		f1.push($WGL_F3(4,6,5)); f1.push($WGL_F3(4,7,6))
		uv1.push([$WGL_V2(0,1), $WGL_V2(1-fxt,0), $WGL_V2(1,1)])
		uv1.push([$WGL_V2(0,1), $WGL_V2(fxt,0), $WGL_V2(1-fxt,0)])

		v2.push($WGL_V3(-sx*.45, h, sz*.45)); 
		v2.push($WGL_V3(sx*.45, h, sz*.45)); 
		v2.push($WGL_V3(sx*.45*back_factor_x, h*back_factor_y, -sz*.45)); 
		v2.push($WGL_V3(-sx*.45*back_factor_x, h*back_factor_y, -sz*.45))
		v2.push($WGL_V3(-sx*.5, h, sz*.5)); 
		v2.push($WGL_V3(sx*.5, h, sz*.5)); 
		v2.push($WGL_V3(sx*.5*back_factor_x, h*back_factor_y, -sz*.5)); 
		v2.push($WGL_V3(-sx*.5*back_factor_x, h*back_factor_y, -sz*.5))
		v2.push($WGL_V3(-sx*.5, 0, sz*.5)); 
		v2.push($WGL_V3(sx*.5, 0, sz*.5)); 
		v2.push($WGL_V3(sx*.5*back_factor_x, h*(1-back_factor_y), -sz*.5)); 
		v2.push($WGL_V3(-sx*.5*back_factor_x, h*(1-back_factor_y), -sz*.5))
		v2.push($WGL_V3(-sx*.45, 0, sz*.45)); 
		v2.push($WGL_V3(sx*.45, 0, sz*.45)); 
		v2.push($WGL_V3(sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45)); 
		v2.push($WGL_V3(-sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45))
		for(let x = 0; x < 12; x+=4) {
			f2.push($WGL_F3(x+0,x+5,x+1)); f2.push($WGL_F3(x+0,x+4,x+5))
			f2.push($WGL_F3(x+1,x+6,x+2)); f2.push($WGL_F3(x+1,x+5,x+6))
			f2.push($WGL_F3(x+2,x+7,x+3)); f2.push($WGL_F3(x+2,x+6,x+7))
			f2.push($WGL_F3(x+3,x+4,x+0)); f2.push($WGL_F3(x+3,x+7,x+4))
			if(x == 4) {
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,h), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sx,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,h), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sz,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,h), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sx,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,h), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sz,h)])
			}
			else {
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,sz*.05), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sz*.05),  $WGL_V2(sx,sz*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,sx*.05), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sx*.05),  $WGL_V2(sz,sx*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,sz*.05), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sz*.05),  $WGL_V2(sx,sz*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,sx*.05), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sx*.05),  $WGL_V2(sz,sx*.05)])
			}
		}
		// Mark vertex, faces, normals as updated and compute bounding boxes
		this.setGeometryUpdated(g, true);
	}

	updateStandardGeometry(meshgroup, geometry_type) {
		let template_geometry = GEOMETRY[geometry_type].UNKNOWN;
		if(meshgroup.userData.e.type in GEOMETRY[geometry_type])
			template_geometry = GEOMETRY[geometry_type][meshgroup.userData.e.type];

		let m = this.findMeshesOfGroup(meshgroup);
		let g = [m[0].geometry, m[1].geometry]

		g[1].vertices = [];
		g[1].faces = []
		g[1].faceVertexUvs[0] = []

		for(let g_index = 0; g_index < 2; g_index++) {
			g[g_index].vertices = [];
			g[g_index].faces = [];
			g[g_index].faceVertexUvs[0] = [];
			if(! (g_index in template_geometry.v))
				continue;
			let v = g[g_index].vertices
			let f = g[g_index].faces;
			let uv = g[g_index].faceVertexUvs[0];

			for(let i = 0; i < template_geometry.v[g_index].length; i++) {
				let tv = template_geometry.v[g_index][i];
				v.push($WGL_V3(
					tv[0] * meshgroup.userData.e.sx * template_geometry.base_scale[0],
					tv[1] * meshgroup.userData.e.sy * template_geometry.base_scale[1],
					tv[2] * meshgroup.userData.e.sz * template_geometry.base_scale[2]
					));
			}
			for(let i = 0; i < template_geometry.f[g_index].length; i++) {
				let tf = template_geometry.f[g_index][i];
				let tuv = template_geometry.uv[g_index][i];
				f.push($WGL_F3(tf[0], tf[1], tf[2]))
				uv.push([
					$WGL_V2(tuv[0][0], tuv[0][1]),
					$WGL_V2(tuv[1][0], tuv[1][1]),
					$WGL_V2(tuv[2][0], tuv[2][1]),
					])				
			}
		}
		this.setGeometryUpdated(g, template_geometry.flat_normals);
	}

	updateDeviceGeometry(type, id, sceneid) {
		let meshgroup = this.findMesh(type, id, this.scene[sceneid]);

		if(meshgroup.userData.e.type == "S")
			this.updateDeviceCubeGeometry(meshgroup, 1, .4, 1);
		else if(meshgroup.userData.e.type == "LB")
			this.updateDeviceLBGeometry(meshgroup, 1, .4, 1, .6, .8);
		else
			this.updateStandardGeometry(meshgroup, "DEVICE");
	}

	updateDeviceColor(type, id, sceneid) {
		let meshgroup = this.findMesh(type, id, this.scene[sceneid]);
		let m = this.findMeshesOfGroup(meshgroup);

		let color = [meshgroup.userData.e.color1, meshgroup.userData.e.color2];

		
		for(let x = 0; x < 2; x++) {
			
			m[x].material.uniforms.mycolor.value.r = (color[x] >> 16) / 256;
			m[x].material.uniforms.mycolor.value.g = ((color[x] >> 8) & 0xFF) / 256;
			m[x].material.uniforms.mycolor.value.b = (color[x] & 0xFF) / 256;
		}
		
		this.draw_needed = true; requestAnimationFrame( () => {this.draw()});
	}

	getDeviceTextureByType(type, index) {
		if(type in GEOMETRY.DEVICE)
			return GEOMETRY.DEVICE[type].texture[index];
		else if(type == "S")
			return "S_" + (index+1) + ".png";
		else if (type == "LB")
			return "LB_" + (index+1) + ".png";
		else
			return GEOMETRY.DEVICE["UNKNOWN"].texture[index];
	}

	addDevice(type, id, sceneid, e, alignToGrid) {
		let geometry1 = new THREE.Geometry();
		let geometry2 = new THREE.Geometry();
		let texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + this.getDeviceTextureByType(e.type, 0), (t) => {this.processLoadedTexture(t)} );
		let texture2 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + this.getDeviceTextureByType(e.type, 1), (t) => {this.processLoadedTexture(t)} );		
		//let material1 = new THREE.MeshLambertMaterial({lightMap: texture1, lightMapIntensity:8})
		//let material2 = new THREE.MeshLambertMaterial({map: texture2})
		let material1 = WGL_createDeviceMaterial({map: texture1, mycolor: e.color1})
		let material2 = WGL_createDeviceMaterial({map: texture2, mycolor: e.color2})

		let mesh1 = new THREE.Mesh( geometry1, material1 );
		mesh1.userData.submesh = 1;
		let mesh2 = new THREE.Mesh( geometry2, material2 );
		mesh2.userData.submesh = 2;

		let group = new THREE.Group();

		group.add(mesh1);
		group.add(mesh2);

		mesh1.userData.id = id;
		mesh1.userData.type = type;
		mesh1.userData.e = e
		mesh2.userData.id = id;
		mesh2.userData.type = type;
		mesh2.userData.e = e
		group.userData.id = id;
		group.userData.type = type;
		group.userData.e = e

		let basemesh = this.findMesh("base", e.base, this.scene[sceneid]);
		basemesh.add(group);

		this.updateDeviceGeometry(type, id, sceneid);
		this.updateDeviceColor(type, id, sceneid);

		this.moveMesh(sceneid, type, id, e.px, basemesh.userData.e.sy, e.pz, null, alignToGrid);
		group.rotation.x = e.rx;
		group.rotation.y = e.ry;
		group.rotation.z = e.rz;
		group.updateMatrixWorld();

		mesh1.castShadow = true;
		mesh2.castShadow = true;

		// Name
		this.addDeviceName(group);	

		return id;
	}

	updateDeviceNameVisibility(group) {
		for(let x = 0; x < group.children.length; x++) {
			if (group.children[x].userData.submesh === "name") {
				group.children[x].visible = this.global_settings.show_device_name;
				break;
			}
		}
	}

	addDeviceName(group, size) {
		if(!size)
			size = .3;
		let name = group.userData.e.name;

		let m = null;
		let height = 0;
		for(let x = 0; x < group.children.length; x++) {
			if (group.children[x].userData.submesh === "name") {
				m = group.children[x];
			}
			else {
				if(group.children[x].geometry.boundingBox.max.y > height)
					height = group.children[x].geometry.boundingBox.max.y;
			}
		}
		if(m != null) {
			group.remove(m);
		}

		if(name == "")
			return;

		let g = this.createTextGeometry(name, size, "c")

		let material = this.namematerial;
		let mesh = new THREE.Mesh(g, material);
		mesh.userData.id = group.userData.id;
		mesh.userData.type = group.userData.type;
		mesh.userData.e = group.userData.e;
		mesh.userData.submesh = "name";

		mesh.position.x = 0;
		mesh.position.y = height+.5;
		mesh.position.z = 0;
		mesh.rotation.order = "YXZ";
		mesh.rotation.x = this.camera[this.view][this.camera.current].rotation.x;

		group.add(mesh);

		this.adjustDeviceNameRotation(group);

		mesh.visible = this.global_settings.show_device_name;

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	adjustDeviceNameRotation(device) {
		device.children.forEach((label) => {
			if(label.userData.submesh === "name") {
				label.rotation.y = this.camera[this.view][this.camera.current].rotation.y - device.rotation.y - device.parent.rotation.y; 
				label.rotation.x = this.camera[this.view][this.camera.current].rotation.x;
			}
		})
	}

	updateLinkSegmentGeometryLine(g, x1, y1, z1, x2, y2, z2, radius) {
		g.vertices = [];
		g.faces = [];
		g.faceVertexUvs[0] = [];

		let dir_vector = new THREE.Vector3(x2-x1, y2-y1, z2-z1);
		let length = dir_vector.length();

		let vl = [];
		let fl = [];
		let uvl = [];
		let w2 = 2*Math.PI/8;
		for(let y = 0; y < 2; y++) 
			for(let x = 0; x < 8; x++) {
				vl.push([
						Math.sin(x*2*Math.PI/8)*radius, 
						Math.cos(x*2*Math.PI/8)*radius,
						y*length,
					]);
			}
		for(let x = 0; x < 8; x++) {
			let x2 = (x+1)%8;
			fl.push([ x, x+8, x2+8]);
			fl.push([ x, x2+8, x2]);
			uvl.push([ [0,0], [0,length], [w2,length] ]);
			uvl.push([ [0,0], [w2,length], [w2,0] ]);
		}
		this.addListVertex(g.vertices, vl);
		this.addListFaces(g.faces, g.faceVertexUvs[0], fl, uvl);

		g.lookAt(dir_vector);

		this.setGeometryUpdated([g], false);
	}

	addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y2, z2, material, index) {
		let g = new THREE.Geometry();
		this.updateLinkSegmentGeometryLine(g, x1, y1, z1, x2, y2, z2, e.linedata.weight);
		let m = new THREE.Mesh(g, material);
		m.position.x = x1; m.position.y = y1; m.position.z = z1;

		m.userData.id = id;
		m.userData.type = type;
		m.userData.subtype = "segment";
		m.userData.index = index;
		m.userData.e = e
		m.castShadow = true;
		meshgroup.add(m);
	}

	addLinkJoint(type, id, e, meshgroup, x, y, z, material, index) {
		let g = new THREE.SphereGeometry(e.linedata.weight*1.0, 10,10);
		let m = new THREE.Mesh(g, material);
		m.position.x = x, m.position.y = y, m.position.z = z;
		m.userData.id = id;
		m.userData.type = type;
		m.userData.subtype = "joint";
		m.userData.joint_index = index;
		m.userData.e = e
		meshgroup.add(m);		
	}

	updateLinkGeometry(type, meshgroup, sceneid) {
		meshgroup.children = [];
		
		let e = meshgroup.userData.e;
		let id = meshgroup.userData.id;

		let material = new THREE.MeshPhongMaterial({color: e.linedata.color});

		let dev1 = null;
		let dev2 = null;
		if(type === "link") {
			dev1 = this.findMesh("device", e.devs[0].id, this.scene[sceneid]);
			dev2 = this.findMesh("device", e.devs[1].id, this.scene[sceneid]);
		}
		else if(type === "l2link") {
			dev1 = this.findMesh("l2segment", e.l3_reference.src_l2segment_id, this.scene[sceneid]);
			dev2 = this.findMesh("l2segment", e.l3_reference.dst_l2segment_id, this.scene[sceneid]);
		}
		else if(type === "interface") {
			dev1 = this.findMesh("vrf", e.l3_reference.vrf_id, this.scene[sceneid]);
			dev2 = this.findMesh("l2segment", e.l3_reference.l2segment_id, this.scene[sceneid]);
		}
		else if(type === "svi_interface") {
			dev1 = this.findMesh("vrf", e.l3_reference.vrf_id, this.scene[sceneid]);
			dev2 = this.findMesh("l2segment", e.l3_reference.l2segment_id, this.scene[sceneid]);
		}
		else if(type === "p2p_interface") {
			dev1 = this.findMesh("vrf", e.l3_reference.src_vrf_id, this.scene[sceneid]);
			dev2 = this.findMesh("vrf", e.l3_reference.dst_vrf_id, this.scene[sceneid]);
		}

		this.tempVector = dev1.getWorldPosition();
		let x1 = this.tempVector.x;
		let y1 = this.tempVector.y+e.linedata.height;
		let z1 = this.tempVector.z;
		let points = e.linedata.points;

		if(e.type == 0) {
			for(let x = 0; x < points.length; x++) {
				// Create intermediate link segmnets
				this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, points[x][0], points[x][1], points[x][2], material, x);

				// Create joint
				this.addLinkJoint(type, id, e, meshgroup, points[x][0], points[x][1], points[x][2], material, x);

				x1 = points[x][0]; y1 = points[x][1]; z1 = points[x][2];
			}

			dev2.getWorldPosition(this.tempVector);
			let x2 = this.tempVector.x;
			let y2 = this.tempVector.y+e.linedata.height;
			let z2 = this.tempVector.z;
			// Create last segment
			this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y2, z2, material, points.length);

		}
		else if (e.type == 1) {
			dev2.getWorldPosition(this.tempVector);
			let x2 = this.tempVector.x;
			let y2 = this.tempVector.y+e.linedata.height;
			let z2 = this.tempVector.z;

			for(let x = 0; x < 2; x++) {
				if ((e.order[x] == "X") && (x1 !== x2)) {
					this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y1, z1, material, 0);
					if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
						this.addLinkJoint(type, id, e, meshgroup, x2, y1, z1, material, 0);
					x1 = x2;
				}
				else if ((e.order[x] == "Y") && (y1 !== y2)) {
					this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x1, y2, z1, material, 0);
					if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
						this.addLinkJoint(type, id, e, meshgroup, x1, y2, z1, material, 0);
					y1 = y2;
				}
				else if ((e.order[x] == "Z") && (z1 !== z2)) {
					this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x1, y1, z2, material, 0);
					if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
						this.addLinkJoint(type, id, e, meshgroup, x1, y1, z2, material, 0);
					z1 = z2;
				}
			}
			if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
				this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y2, z2, material, 0);
		}
	}

	addLink(type, id, sceneid, e) {
		let meshgroup = new THREE.Group ();

		meshgroup.userData.id = id;
		meshgroup.userData.type = type;
		meshgroup.userData.e = e

		this.updateLinkGeometry(type, meshgroup, sceneid);

		this.scene[sceneid].add(meshgroup);

		return meshgroup;
	}

	addJoint(type, link_id, joint_index, sceneid, px, py, pz) {
		let link = this.getMesh(sceneid, type, link_id);
		link.userData.e.linedata.points.splice(joint_index, 0, [px, py, pz]);
        d.wgl.updateLinkGeometry(type, link, sceneid);
	}

	updateLine(mesh) {
		let e = mesh.userData.e;
		mesh.position.x = e.x1;
		mesh.position.y = e.y1;
		mesh.position.z = e.z1;
		this.updateLinkSegmentGeometryLine(mesh.geometry, e.x1, e.y1, e.z1, e.x2, e.y2, e.z2, e.radius);
	}

	updateLineColor(mesh) {
		if (mesh.material.color.getHex() != mesh.userData.e.color) {
			mesh.material.color.set(mesh.userData.e.color);
			mesh.material.needsUpdate = true;
		}
	}

	addLine(id, sceneid, e) {
		let material = new THREE.MeshStandardMaterial({color: e.color});
		let g = new THREE.Geometry();
		let mesh = new THREE.Mesh(g, material);
		mesh.userData.id = id;
		mesh.userData.type = "line";
		mesh.userData.e = e;
		this.updateLine(mesh);

		this.scene[sceneid].add(mesh);

		return mesh;
	}

	emptyTextBuffer() {
		if(this.font === null)
			return;

		while(this.textBuffer.length > 0) {
			let textdata = this.textBuffer.pop();
			this[textdata[0]](textdata[1]);
		}
	}

	alignText(geometry, alignment) {
		geometry.computeBoundingBox();

		let b = geometry.boundingBox;
		if(alignment === "center")
			geometry.translate(
				-b.min.x - (b.max.x-b.min.x)/2,
				0,
				-b.min.z - (b.max.z-b.min.z)/2
			);
		else if (alignment === "left")
			geometry.translate(
				-b.min.x,
				0,
				-b.min.z - (b.max.z-b.min.z)/2
			);
		else if (alignment === "right")
			geometry.translate(
				-b.max.x,
				0,
				-b.min.z - (b.max.z-b.min.z)/2
			);

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	createTextGeometry(text, height, alignment, rotationX) {
		/*
		let g = new THREE.TextGeometry(text, {
			font: this.font,
			size: height,
			height: depth,
			curveSegments: 2,
			bevelEnabled: false,
		});
		this.alignText(g, alignment);

		return g;
		*/
		if(!rotationX)
			rotationX = 0;

		let finalGeometry = new THREE.Geometry();
		let text_break = text.split("\n");
		text_break.forEach((line) => {
			let shapes = this.font.generateShapes( line, height, 2 );
			let geometry = new THREE.ShapeGeometry( shapes, 4 );
			if(alignment == "c") this.alignText(geometry, "center");
			if(alignment == "l") this.alignText(geometry, "left");
			if(alignment == "r") this.alignText(geometry, "right");
			geometry.rotateX(rotationX * Math.PI/180);
			finalGeometry.translate(0, height*1.2, 0);

			finalGeometry.merge(geometry);
		})
		

		finalGeometry.computeVertexNormals();
		finalGeometry.computeFlatVertexNormals();

		return finalGeometry;
	}

	createTextBGGeometry_addFaces(g, vertex_per_face, segments, isClosed) {
		let facelist = [];
		let uvlist = [];
		if(isClosed)
		for(let x = 0; x < vertex_per_face - 2; x++) {
			facelist.push([0, x+1, x+2]);
			uvlist.push([[0,0],[0,0],[0,0]]);
			facelist.push([vertex_per_face * segments, vertex_per_face * segments + x+2, vertex_per_face * segments + x+1]);
			uvlist.push([[0,0],[0,0],[0,0]]);
		}
		
		for(let y = 0; y < segments; y++) {
			for(let x = 0; x < vertex_per_face; x++) {
				let x2 = (x+1) % vertex_per_face;
				facelist.push([y * vertex_per_face + x, (y+1) * vertex_per_face + x2, y * vertex_per_face + x2]);
				uvlist.push([[0,0],[0,0],[0,0]]);
				facelist.push([y * vertex_per_face + x, (y+1) * vertex_per_face + x, (y+1) * vertex_per_face + x2]);
				uvlist.push([[0,0],[0,0],[0,0]]);
			}	
		}

		this.addListFaces(g.faces, g.faceVertexUvs[0], facelist, uvlist);

		g.computeVertexNormals();
		g.computeFlatVertexNormals();
	}

	createTextBGGeometry(text_geometry, e) {
		text_geometry.computeBoundingBox();
		let b = text_geometry.boundingBox;
		let bg_g = new THREE.Geometry();
		let border_g = new THREE.Geometry();
		let xmin = b.min.x - e.height/2;
		let xmax = b.max.x + e.height/2;
		let ymin = b.min.y - e.height/2;
		let ymax = b.max.y + e.height/2;
		let zmin = b.min.z;
		let zmax = b.max.z;
		let CB = e.border_width*.2;

		if(e.bg_show) {
			if(e.bg_type === "r") {
				this.addListVertex(bg_g.vertices, [
					[xmin, ymin, zmin - e.bg_depth+.01], [xmax, ymin, zmin - e.bg_depth+.01], [xmax, ymax, zmin - e.bg_depth+.01], [xmin, ymax, zmin - e.bg_depth+.01],
					[xmin, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
				]);
				this.createTextBGGeometry_addFaces(bg_g, 4, 1, true);
			}
			if(e.bg_type === "c") {
				let vertexlist = [];
				let xsize = (xmax-xmin)*.707;
				let ysize = (ymax-ymin)*.707;
				let displacex = xmax - (xmax-xmin)/2;
				let displacey = ymax - (ymax-ymin)/2;
				let num_points = 32;
				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth+.01]);
				}
				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth]);
				}
				this.addListVertex(bg_g.vertices, vertexlist);
				this.createTextBGGeometry_addFaces(bg_g, num_points, 1, true);
			}
			if(e.bg_type === "h") {
				let diffx = xmax-xmin;
				let diffy = ymax-ymin;
				let xmed = xmin + (xmax-xmin)/2;
				let ymed = ymin + (ymax-ymin)/2;

				this.addListVertex(bg_g.vertices, [
					[xmed-diffx, ymed, zmin - e.bg_depth+.01], [xmed, ymed-diffy, zmin - e.bg_depth+.01], [xmed+diffx, ymed, zmin - e.bg_depth+.01], [xmed, ymed+diffy, zmin - e.bg_depth+.01],
					[xmed-diffx, ymed, zmin - e.bg_depth], [xmed, ymed-diffy, zmin - e.bg_depth], [xmed+diffx, ymed, zmin - e.bg_depth], [xmed, ymed+diffy, zmin - e.bg_depth],
				]);
				this.createTextBGGeometry_addFaces(bg_g, 4, 1, true);
			}
			if(e.bg_type === "p") {
				let diffy = ymax-ymin;
				this.addListVertex(bg_g.vertices, [
					[xmin-diffy, ymin, zmin - e.bg_depth+.01], [xmax, ymin, zmin - e.bg_depth+.01], [xmax+diffy, ymax, zmin - e.bg_depth+.01], [xmin, ymax, zmin - e.bg_depth+.01],
					[xmin-diffy, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax+diffy, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
				]);
				this.createTextBGGeometry_addFaces(bg_g, 4, 1, true);
			}
		}
		if(e.border_show) {
			if(e.bg_type === "r") {
				this.addListVertex(border_g.vertices, [
					[xmin, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
					[xmin, ymin, zmin], [xmax, ymin, zmin], [xmax, ymax, zmin], [xmin, ymax, zmin],
					[xmin-CB, ymin-CB, zmin+CB], [xmax+CB, ymin-CB, zmin+CB], [xmax+CB, ymax+CB, zmin+CB], [xmin-CB, ymax+CB, zmin+CB],
					
					[xmin+CB - e.border_width, ymin+CB - e.border_width, zmin+CB], [xmax-CB + e.border_width, ymin+CB - e.border_width, zmin+CB], 
					[xmax-CB + e.border_width, ymax-CB + e.border_width, zmin+CB], [xmin+CB - e.border_width, ymax-CB + e.border_width, zmin+CB],
					[xmin - e.border_width, ymin - e.border_width, zmin], [xmax + e.border_width, ymin - e.border_width, zmin], 
					[xmax + e.border_width, ymax + e.border_width, zmin], [xmin - e.border_width, ymax + e.border_width, zmin],

					[xmin - e.border_width, ymin - e.border_width, zmin - e.bg_depth], [xmax + e.border_width, ymin - e.border_width, zmin - e.bg_depth], 
					[xmax + e.border_width, ymax + e.border_width, zmin - e.bg_depth], [xmin - e.border_width, ymax + e.border_width, zmin - e.bg_depth],

					[xmin, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
				]);
				this.createTextBGGeometry_addFaces(border_g, 4, 6, false);
			}
			if(e.bg_type === "c") {
				let vertexlist = [];
				let xsize = (xmax-xmin)*.707;
				let ysize = (ymax-ymin)*.707;
				let displacex = xmax - (xmax-xmin)/2;
				let displacey = ymax - (ymax-ymin)/2;
				let num_points = 32;

				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth]);
				}
				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin]);
				}

				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*(xsize+CB)+displacex, Math.sin(angle)*(ysize+CB)+displacey, zmin+CB]);
				}
				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*(xsize+e.border_width-CB)+displacex, Math.sin(angle)*(ysize+e.border_width-CB)+displacey, zmin+CB]);
				}

				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*(xsize+e.border_width)+displacex, Math.sin(angle)*(ysize+e.border_width)+displacey, zmin]);
				}
				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*(xsize+e.border_width)+displacex, Math.sin(angle)*(ysize+e.border_width)+displacey, zmin - e.bg_depth]);
				}
				for(let x = 0; x < num_points; x++) {
					let angle = x/num_points*2*Math.PI;
					vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth]);
				}
				this.addListVertex(border_g.vertices, vertexlist);				
				this.createTextBGGeometry_addFaces(border_g, num_points, 6, false);
			}
			if(e.bg_type === "h") {
				let diffx = xmax-xmin;
				let diffy = ymax-ymin;
				let xmed = xmin + (xmax-xmin)/2;
				let ymed = ymin + (ymax-ymin)/2;
				let wx = e.border_width * diffx/diffy;
				let wy = e.border_width;
				this.addListVertex(border_g.vertices, [
					[xmed-diffx, ymed, zmin - e.bg_depth], [xmed, ymed-diffy, zmin - e.bg_depth], [xmed+diffx, ymed, zmin - e.bg_depth], [xmed, ymed+diffy, zmin - e.bg_depth],
					[xmed-diffx, ymed, zmin], [xmed, ymed-diffy, zmin], [xmed+diffx, ymed, zmin], [xmed, ymed+diffy, zmin],
					[xmed-diffx-CB, ymed, zmin+CB], [xmed, ymed-diffy-CB, zmin+CB], [xmed+diffx+CB, ymed, zmin+CB], [xmed, ymed+diffy+CB, zmin+CB],
					
					[xmed-diffx+CB-wx, ymed, zmin+CB], [xmed, ymed-diffy+CB-wy, zmin+CB], [xmed+diffx-CB+wx, ymed, zmin+CB], [xmed, ymed+diffy-CB+wy, zmin+CB],
					[xmed-diffx-wx, ymed, zmin], [xmed, ymed-diffy-wy, zmin], [xmed+diffx+wx, ymed, zmin], [xmed, ymed+diffy+wy, zmin],
					[xmed-diffx-wx, ymed, zmin-e.bg_depth], [xmed, ymed-diffy-wy, zmin-e.bg_depth], [xmed+diffx+wx, ymed, zmin-e.bg_depth], [xmed, ymed+diffy+wy, zmin-e.bg_depth],
					[xmed-diffx, ymed, zmin - e.bg_depth], [xmed, ymed-diffy, zmin - e.bg_depth], [xmed+diffx, ymed, zmin - e.bg_depth], [xmed, ymed+diffy, zmin - e.bg_depth],
				]);
				this.createTextBGGeometry_addFaces(border_g, 4, 6, false);
			}
			if(e.bg_type === "p") {
				let diffy = ymax-ymin;
				this.addListVertex(border_g.vertices, [
					[xmin-diffy, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax+diffy, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
					[xmin-diffy, ymin, zmin], [xmax, ymin, zmin], [xmax+diffy, ymax, zmin], [xmin, ymax, zmin],

					[xmin-diffy-CB*3, ymin-CB, zmin+CB], [xmax+CB, ymin-CB, zmin+CB], [xmax+diffy+CB*3, ymax+CB, zmin+CB], [xmin-CB, ymax+CB, zmin+CB],
					
					[xmin-diffy - (e.border_width-CB)*3, ymin + CB - e.border_width, zmin+CB], [xmax - CB + e.border_width, ymin + CB - e.border_width, zmin+CB], 
					[xmax+diffy + (e.border_width-CB)*3, ymax - CB + e.border_width, zmin+CB], [xmin + CB - e.border_width, ymax - CB + e.border_width, zmin+CB],

					[xmin-diffy - e.border_width*3, ymin - e.border_width, zmin], [xmax + e.border_width, ymin - e.border_width, zmin], 
					[xmax+diffy + e.border_width*3, ymax + e.border_width, zmin], [xmin - e.border_width, ymax + e.border_width, zmin],

					[xmin-diffy - e.border_width*3, ymin - e.border_width, zmin - e.bg_depth], [xmax + e.border_width, ymin - e.border_width, zmin - e.bg_depth], 
					[xmax+diffy + e.border_width*3, ymax + e.border_width, zmin - e.bg_depth], [xmin - e.border_width, ymax + e.border_width, zmin - e.bg_depth],

					[xmin-diffy, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax+diffy, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
				]);
				this.createTextBGGeometry_addFaces(border_g, 4, 6, false);
			}
		}

		return [bg_g, border_g];
	}

	addText(id, sceneid, e, alignToGrid) {
		let base = this.findMesh("base", e.base, this.scene[sceneid]);

		let group = new THREE.Group();
		let g = this.createTextGeometry(e.text, e.height, e.text_align, e.rotation_x);
		let bg_g, border_g;
		[bg_g, border_g] = this.createTextBGGeometry(g, e);

		let material = new THREE.MeshPhongMaterial({color: e.color, side: THREE.DoubleSide});
		let bg_material = new THREE.MeshPhongMaterial({color: (e.bg_color !== undefined) ? e.bg_color : 0xffffff});
		let border_material = new THREE.MeshPhongMaterial({color: (e.border_color !== undefined) ? e.border_color : 0x000000});

		let textMesh = new THREE.Mesh(g, material);
		let bgMesh = new THREE.Mesh(bg_g, bg_material);
		let borderMesh = new THREE.Mesh(border_g, border_material);

		textMesh.userData.id = id;
		textMesh.userData.type = "text";
		textMesh.userData.subtype = "text";
		textMesh.userData.e = e;
		bgMesh.userData.id = id;
		bgMesh.userData.type = "text";
		bgMesh.userData.subtype = "bg";
		bgMesh.userData.e = e;
		borderMesh.userData.id = id;
		borderMesh.userData.type = "text";
		borderMesh.userData.subtype = "border";
		borderMesh.userData.e = e;
		group.userData.id = id;
		group.userData.type = "text";
		group.userData.e = e;

		base.add(group);
		group.add(textMesh);
		group.add(bgMesh);
		group.add(borderMesh);

		this.moveMesh(sceneid, "text", id, e.px, e.py + base.userData.e.sy, e.pz, null, alignToGrid);
		group.rotation.order = "YXZ";
		group.rotation.x = e.rx;
		group.rotation.y = e.ry;

		textMesh.castShadow = true;
		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});

		return group;
	}


	updateSymbolGeometryFlag(meshgroup) {
		return;
		let e = meshgroup.userData.e;

		let g1 = new THREE.Geometry();
		let g2 = new THREE.Geometry();

		let m1 = new THREE.MeshPhongMaterial({color: e.color});
		let m2 = new THREE.MeshPhongMaterial({color: e.cd.flagcolor});

		let WB = .2, WT = .07, HM = .1, H = 1, HP = 1.2, WF = 1, DF = .05, HF = .5;
		let fvuv = []
		for(let x = 0; x < 26; x++)
			fvuv.push([[0,0],[0,0],[0,0]]);
		this.addListVertex(g1.vertices, [
			[0,0,WB], [WB,0,0], [0,0,-WB], [-WB,0,0],
			[0,HM,WT], [WT,HM,0], [0,HM,-WT], [-WT,HM,0],
			[0,H,WT], [WT,H,0], [0,H,-WT], [-WT,H,0],
			[0,HP,0]
		]);
		this.addListFaces(g1.faces, g1.faceVertexUvs[0], [
			[0,2,1], [0,3,2],
			[0,1,5], [0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
			[4,5,9], [4,9,8], [5,6,10],[5,10,9], [6,7,11],[6,11,10], [7,4,8],[7,8,11],
			[8,9,12], [9,10,12],[10,11,12], [11,8,12],
		], fvuv);

		let mesh1 = new THREE.Mesh(g1, m1);
		meshgroup.add(mesh1);

		this.addListVertex(g2.vertices, [
			[WT,H,DF], [WF, H, DF], [WF, HF, DF], [WT, HF, DF],
			[WT,H,-DF], [WF, H, -DF], [WF, HF, -DF], [WT, HF, -DF],
			])
		this.addListFaces(g2.faces, g2.faceVertexUvs[0], [
			[0,2,1], [0,3,2],
			[4,5,6], [4,6,7],
			[0,1,5], [0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
		], fvuv);

		let mesh2 = new THREE.Mesh(g2, m2);
		meshgroup.add(mesh2);

		mesh1.userData.id = meshgroup.userData.id;
		mesh1.userData.type = meshgroup.userData.type;
		mesh1.userData.e = meshgroup.userData.e
		mesh2.userData.id = meshgroup.userData.id;
		mesh2.userData.type = meshgroup.userData.type;
		mesh2.userData.e = meshgroup.userData.e

		mesh1.castShadow = true;
		mesh2.castShadow = true;

		this.setGeometryUpdated([g1, g2], true);
	}

	getDummyFVUVs(faces) {
		let fvuvs = []
		for(let x = 0; x < faces.length; x++)
			fvuvs.push([[0,0],[0,0],[0,0]]);

		return fvuvs;
	}

	getDataSymbolFlag(meshgroup) {
		let data = [{color: meshgroup.userData.e.color}, {color: meshgroup.userData.e.cd.flagcolor}]

		let WB = .2, WT = .07, HM = .1, H = 1, HP = 1.2, WF = 1, DF = .05, HF = .5;

		data[0].vertices = [
			[0,0,WB], [WB,0,0], [0,0,-WB], [-WB,0,0],
			[0,HM,WT], [WT,HM,0], [0,HM,-WT], [-WT,HM,0],
			[0,H,WT], [WT,H,0], [0,H,-WT], [-WT,H,0],
			[0,HP,0]
		];

		data[0].faces = [
			[0,2,1], [0,3,2],
			[0,1,5], [0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
			[4,5,9], [4,9,8], [5,6,10],[5,10,9], [6,7,11],[6,11,10], [7,4,8],[7,8,11],
			[8,9,12], [9,10,12],[10,11,12], [11,8,12],
		];

		data[0].fvuvs = this.getDummyFVUVs(data[0].faces);

		data[1].vertices = [
			[WT,H,DF], [WF, H, DF], [WF, HF, DF], [WT, HF, DF],
			[WT,H,-DF], [WF, H, -DF], [WF, HF, -DF], [WT, HF, -DF],
			]
		
		data[1].faces = [
			[0,2,1], [0,3,2],
			[4,5,6], [4,6,7],
			[0,1,5], [0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
		];

		data[1].fvuvs = this.getDummyFVUVs(data[1].faces);

		return data;
	}

	getDataSymbolX(meshgroup) {
		let data = [{color: meshgroup.userData.e.color}];
		data[0].vertices = [ 
			[-.5,.9,.1],  [-.4,1,.1],  [.4,1,.1],  [.5,.9,.1],  [.5,.1,.1],  [.4,0,.1],  [-.4,0,.1],  [-.5,.1,.1],
			[-.5,.9,-.1], [-.4,1,-.1], [.4,1,-.1], [.5,.9,-.1], [.5,.1,-.1], [.4,0,-.1], [-.4,0,-.1], [-.5,.1,-.1],
		]
		data[0].faces = [
			[0,4,1], [0,5,4], [2,6,3], [2,7,6],
			[8,9,12], [8,12,13], [10,11,14], [10,14,15],
			[0,9,8], [0,1,9], [1,4,12], [1,12,9], [4,5,13], [4,13,12], [5,0,8], [5,8,13],
			[2,11,10], [2,3,11], [3,6,14], [3,14,11], [6,7,15], [6,15,14], [7,2,10], [7,10,15]
		];
		data[0].fvuvs = this.getDummyFVUVs(data[0].faces);

		return data;
	}

	getDataSymbolV(meshgroup) {
		let data = [{color: meshgroup.userData.e.color}];
		data[0].vertices = [ 
			[-.5,.6,.1],  [-.3,.6,.1],  [.3,1,.1],  [.5,1,.1],  [.1,0,.1],  [-.1,0,.1],  [.1,0,.1],  [-.1,0,.1],
			[-.5,.6,-.1], [-.3,.6,-.1], [.3,1,-.1], [.5,1,-.1], [.1,0,-.1], [-.1,0,-.1], [.1,0,-.1], [-.1,0,-.1],
		]
		data[0].faces = [
			[0,4,1], [0,5,4], [2,6,3], [2,7,6],
			[8,9,12], [8,12,13], [10,11,14], [10,14,15],
			[0,9,8], [0,1,9], [1,4,12], [1,12,9], [4,5,13], [4,13,12], [5,0,8], [5,8,13],
			[2,11,10], [2,3,11], [3,6,14], [3,14,11], [6,7,15], [6,15,14], [7,2,10], [7,10,15]
		];
		data[0].fvuvs = this.getDummyFVUVs(data[0].faces);

		return data;
	}

	updateSymbolColor(type, id, sceneid) {
		let meshgroup = this.findMesh(type, id, this.scene[sceneid]);
		let m = this.findMeshesOfGroup(meshgroup);
			
		m[0].material.uniforms.mycolor.value.r = (meshgroup.userData.e.color >> 16) / 256;
		m[0].material.uniforms.mycolor.value.g = ((meshgroup.userData.e.color >> 8) & 0xFF) / 256;
		m[0].material.uniforms.mycolor.value.b = (meshgroup.userData.e.color & 0xFF) / 256;
		
		if(meshgroup.userData.e.type === "F") {
			m[1].material.uniforms.mycolor.value.r = (meshgroup.userData.e.cd.flagcolor >> 16) / 256;
			m[1].material.uniforms.mycolor.value.g = ((meshgroup.userData.e.cd.flagcolor >> 8) & 0xFF) / 256;
			m[1].material.uniforms.mycolor.value.b = (meshgroup.userData.e.cd.flagcolor & 0xFF) / 256;
		}

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	updateSymbolGeometry(meshgroup) {
		this.updateStandardGeometry(meshgroup, "SYMBOL");
		return;
	}

	getSymbolTextureByType(type, index) {
		if(type in GEOMETRY.SYMBOL)
			return GEOMETRY.SYMBOL[type].texture[index];
		else
			return GEOMETRY.SYMBOL["UNKNOWN"].texture[index];
	}

	addSymbol(id, sceneid, e, alignToGrid) {
		let geometry1 = new THREE.Geometry();
		let geometry2 = new THREE.Geometry();
		let texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + this.getSymbolTextureByType(e.type, 0), (t) => {this.processLoadedTexture(t)} );
		let texture2 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + this.getSymbolTextureByType(e.type, 1), (t) => {this.processLoadedTexture(t)} );		
		let material1 = WGL_createDeviceMaterial({map: texture1, mycolor: e.color1})
		let material2 = WGL_createDeviceMaterial({map: texture2, mycolor: e.color2})

		let mesh1 = new THREE.Mesh( geometry1, material1 );
		mesh1.userData.submesh = 1;
		let mesh2 = new THREE.Mesh( geometry2, material2 );
		mesh2.userData.submesh = 2;

		let group = new THREE.Group();

		group.add(mesh1);
		group.add(mesh2);

		mesh1.userData.id = id;
		mesh1.userData.type = "symbol";
		mesh1.userData.e = e
		mesh2.userData.id = id;
		mesh2.userData.type = "symbol";
		mesh2.userData.e = e
		group.userData.id = id;
		group.userData.type = "symbol";
		group.userData.e = e

		let basemesh = this.findMesh("base", e.base, this.scene[sceneid]);
		basemesh.add(group);

		this.updateSymbolGeometry(group);
		this.updateSymbolColor("symbol", id, sceneid);

		this.moveMesh(sceneid, "symbol", id, e.px, basemesh.userData.e.sy, e.pz, null, alignToGrid);
		group.rotation.x = e.rx;
		group.rotation.y = e.ry;
		group.rotation.z = e.rz;
		group.updateMatrixWorld();

		mesh1.castShadow = true;
		mesh2.castShadow = true;

		return id;
	}

	updateL2SegmentGeometry(meshgroup) {
		let m = this.findMeshesOfGroup(meshgroup);
		let g = m[0].geometry;

		g.vertices = [];
		g.faces = [];
		g.faceVertexUvs[0] = [];

		let vertices = [];
		let faces = [];
		let fvuvs = [];
		let n_points = 16;
		let x_spacing = [[0,.6], [-.54,.65], [-.55,.7], [-.54,.9], [-.5,1], [.5,1], [.54,.9], [.55,.7], [.54,.65], [0,.6]];

		for(let x = 0; x < n_points+1; x++) {
			for(let y = 0; y < x_spacing.length; y++) {
				vertices.push([
					x_spacing[y][0] * meshgroup.userData.e.sx,
					(.5 + .5 * x_spacing[y][1] * Math.sin(2*x*Math.PI/n_points)) * meshgroup.userData.e.sy,
					(.5 * x_spacing[y][1] * Math.cos(2*x*Math.PI/n_points)) * meshgroup.userData.e.sz
				]);
			}
		}
		for(let x = 0; x < n_points; x++) {
			for(let y = 0; y < (x_spacing.length-1); y++) {
				faces.push([x*x_spacing.length+y, x*x_spacing.length+y+1, (x+1)*x_spacing.length + y+1]);
				faces.push([x*x_spacing.length+y, (x+1)*x_spacing.length+y+1, (x+1)*x_spacing.length + y]);
				fvuvs.push([[x_spacing[y][0]*meshgroup.userData.e.sx, 2*Math.PI*x/n_points], [x_spacing[y+1][0]*meshgroup.userData.e.sx, 2*Math.PI*x/n_points], [x_spacing[y+1][0]*meshgroup.userData.e.sx,2*Math.PI*(x+1)/n_points]]);
				fvuvs.push([[x_spacing[y][0]*meshgroup.userData.e.sx, 2*Math.PI*x/n_points], [x_spacing[y+1][0]*meshgroup.userData.e.sx, 2*Math.PI*(x+1)/n_points], [x_spacing[y][0]*meshgroup.userData.e.sx, 2*Math.PI*(x+1)/n_points]]);
			}
		}

		this.addListVertex(g.vertices, vertices);
		this.addListFaces(g.faces, g.faceVertexUvs[0], faces, fvuvs);

		g.verticesNeedUpdate = true;
		g.elementsNeedUpdate = true;
		g.uvsNeedUpdate = true;

		g.computeBoundingBox();
		g.computeBoundingSphere();
		g.computeVertexNormals();
		//g.computeFlatVertexNormals();

		this.draw_needed = true;requestAnimationFrame( () => {this.draw()});
	}

	updateL2SegmentColor(id) {
		let meshgroup = this.findMesh("l2segment", id, this.scene["L3"]);
		let m = this.findMeshesOfGroup(meshgroup);

		let color = meshgroup.userData.e.color1;

		m[0].material.uniforms.mycolor.value.r = (color >> 16) / 256;
		m[0].material.uniforms.mycolor.value.g = ((color >> 8) & 0xFF) / 256;
		m[0].material.uniforms.mycolor.value.b = (color & 0xFF) / 256;

		this.draw_needed = true; requestAnimationFrame( () => {this.draw()});
	}

	addL2Segment(id, e, alignToGrid) {
		let geometry1 = new THREE.Geometry();
		let texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/basic.png", (t) => {this.processLoadedTexture(t)} );
		
		//let material1 = new THREE.MeshLambertMaterial({map: texture1, color: 0x888888})
		let material1 = WGL_createDeviceMaterial({map: texture1, mycolor: e.color1});
		let mesh1 = new THREE.Mesh( geometry1, material1 );
		mesh1.userData.submesh = 1;

		let group = new THREE.Group();

		group.add(mesh1);

		mesh1.userData.id = id;
		mesh1.userData.type = "l2segment";
		mesh1.userData.e = e
		group.userData.id = id;
		group.userData.type = "l2segment";
		group.userData.e = e

		let basemesh = this.findMesh("base", e.base, this.scene.L3);
		basemesh.add(group);

		this.updateL2SegmentGeometry(group);

		this.moveMesh("L3", "l2segment", id, e.px, basemesh.userData.e.sy, e.pz, null, alignToGrid);
		group.rotation.x = e.rx;
		group.rotation.y = e.ry;
		group.rotation.z = e.rz;
		group.updateMatrixWorld();

		mesh1.castShadow = true;

		this.addDeviceName(group, .2);

		return group;
	}
}
