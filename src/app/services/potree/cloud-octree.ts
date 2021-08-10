import { Color3,
         Mesh,
         //MeshBuilder,
         Scene,
         StandardMaterial,
         TransformNode,
         Vector3,
         VertexData,
} from 'babylonjs';
import { BBox } from './bounding-box';
import { AbstractOctree, AbstractOctreeNode } from './abstract-octree';
import { GeometryOctree, GeometryOctreeNode } from './geometry-octree';
import { Pointcloud } from './pointcloud';

export class CloudOctreeNode extends AbstractOctreeNode {
  public sceneNode? : Mesh;
  // public pointcloud? : PointCloudOctree;
  // private needsTransformUpdate = true;

  constructor (public geometryNode : GeometryOctreeNode) {
    super();
  }

  getLevel () : number {
    return this.geometryNode.level || 0;
  }

  getName() : string {
    return this.geometryNode.name;
  }

  getBoundingBox () : BBox {
    return this.geometryNode.boundingBox;
  }

  isLoaded () {
    return true;
  }

  isGeometryNode () {
    return false;
  }

  isTreeNode () {
    return true;
  }

  getNumPoints () {
    return this.geometryNode.numPoints;
  }

  getSpacing() {
    return this.geometryNode.getSpacing() || 0;
  }
  
};

export class CloudOctree extends AbstractOctree {
  public visibleNodes : CloudOctreeNode[];
  public visibleGeometry : any[];

  protected pointBudget : number;
  protected boundingBox : BBox;
  protected level : number;
  protected material : StandardMaterial;
  // protected wireframeMaterial : StandardMaterial;
  protected anchor : TransformNode;

  constructor (protected geometry : GeometryOctree,
               scene : Scene) {
    super();

    this.pointBudget = Infinity;
    this.boundingBox = this.geometry.boundingBox;
    this.level = 0;

    this.material = new StandardMaterial("pointcloud_material", scene);
    this.material.emissiveColor = new Color3(1, 1, 1);
    this.material.disableLighting = true;
    this.material.pointsCloud = true;
    this.material.pointSize = 3;

    // this.wireframeMaterial = new StandardMaterial("wire", scene);
    // this.wireframeMaterial.wireframe = true;
    // this.wireframeMaterial.emissiveColor = new Color3(1, 0, 0);

    this.anchor = new TransformNode("anchor", scene);
    this.anchor.position = this.geometry.offset.clone();
    this.anchor.rotate(Vector3.Right(), -0.5 * Math.PI);

    // this.visibleBounds = new BBox();
    this.visibleNodes = [];
    this.visibleGeometry = [];
    this.root = this.geometry.root;
  }

  initialized() {
    return this.root !== null;
  }

  getGlobalTransform() {
    return this.anchor.getWorldMatrix();
  }

  toTreeNode (geometryNode : GeometryOctreeNode,
              parent : CloudOctreeNode | undefined,
              scene : Scene) {
    let node = new CloudOctreeNode(geometryNode);

    let bbox = geometryNode.getBoundingBox();

    const vbo = geometryNode.geometry as VertexData;
    node.sceneNode = new Pointcloud(geometryNode.name,
                                    vbo,
                                    scene,
                                    parent?.sceneNode || this.anchor);
    let offset = bbox.minimum.clone();
    node.sceneNode.material = this.material;
    if (parent) {
      offset.subtractInPlace(parent.getBoundingBox().minimum);
    }
    node.sceneNode.position = offset;

    // DEBUG bounding box rendering
    // let size = bbox.extendSize.scale(2.0);
    // let mesh = MeshBuilder.CreateBox("bbox_" + geometryNode.name,
    //                                  {
    //                                    width: size.x,
    //                                    height: size.y,
    //                                    depth: size.z
    //                                  },
    //                                  scene);
    // mesh.material = this.wireframeMaterial;
    // mesh.parent = this.anchor;
    // mesh.position = bbox.center.clone();
    // END DEBUG

    node.geometryNode = geometryNode;
    node.children = [];
    for(let i = 0; i < 8; i++){
      node.children[i] = geometryNode.children[i];
    }

    if (!parent) {
      this.root = node;
    } else {
      let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
      parent.children[childIndex] = node;
    }

    let disposeListener = function () {
      let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
      (parent as CloudOctreeNode).sceneNode?.removeChild(node.sceneNode as Mesh);
      node.sceneNode?.dispose();
      (parent as CloudOctreeNode).children[childIndex] = geometryNode;
    };
    geometryNode.oneTimeDisposeHandlers.push(disposeListener);

    return node;
  }

  // updateVisibleBounds () {
  //   let bounds = new BBox();
  //   for (let i = 0; i < this.visibleNodes.length; i++) {
  //     let node = this.visibleNodes[i];
  //     let isLeaf = true;
  //
  //     for (let j = 0; j < node.children.length; j++) {
  //       let child = node.children[j];
  //       if (child instanceof CloudOctreeNode) {
  //         isLeaf = isLeaf && !child.sceneNode?.isVisible;
  //       }
  //     }
  //
  //     if (isLeaf) {
  //       const bbox = node.getBoundingBox();
  //       if (bbox) {
  //         bounds.merge(bbox);
  //       }
  //     }
  //   }
  //
  //   this.visibleBounds = bounds;
  // }

  // updateMaterial (material, visibleNodes, camera, renderer) {
  // 	material.fov = camera.fov * (Math.PI / 180);
  // 	material.screenWidth = renderer.domElement.clientWidth;
  // 	material.screenHeight = renderer.domElement.clientHeight;
  // 	material.spacing = this.geometry.spacing; // * Math.max(this.scale.x, this.scale.y, this.scale.z);
  // 	material.near = camera.near;
  // 	material.far = camera.far;
  // 	material.uniforms.octreeSize.value = this.geometry.boundingBox.getSize(new THREE.Vector3()).x;
  // }

  // computeVisibilityTextureData(nodes, camera){
  //
  // 	if(Potree.measureTimings) performance.mark("computeVisibilityTextureData-start");
  //
  // 	let data = new Uint8Array(nodes.length * 4);
  // 	let visibleNodeTextureOffsets = new Map();
  //
  // 	// copy array
  // 	nodes = nodes.slice();
  //
  // 	// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
  // 	let sort = function (a, b) {
  // 		let na = a.geometryNode.name;
  // 		let nb = b.geometryNode.name;
  // 		if (na.length !== nb.length) return na.length - nb.length;
  // 		if (na < nb) return -1;
  // 		if (na > nb) return 1;
  // 		return 0;
  // 	};
  // 	nodes.sort(sort);
  //
  // 	let worldDir = new THREE.Vector3();
  //
  // 	let nodeMap = new Map();
  // 	let offsetsToChild = new Array(nodes.length).fill(Infinity);
  //
  // 	for(let i = 0; i < nodes.length; i++){
  // 		let node = nodes[i];
  //
  // 		nodeMap.set(node.name, node);
  // 		visibleNodeTextureOffsets.set(node, i);
  //
  // 		if(i > 0){
  // 			let index = parseInt(node.name.slice(-1));
  // 			let parentName = node.name.slice(0, -1);
  // 			let parent = nodeMap.get(parentName);
  // 			let parentOffset = visibleNodeTextureOffsets.get(parent);
  //
  // 			let parentOffsetToChild = (i - parentOffset);
  //
  // 			offsetsToChild[parentOffset] = Math.min(offsetsToChild[parentOffset], parentOffsetToChild);
  //
  // 			data[parentOffset * 4 + 0] = data[parentOffset * 4 + 0] | (1 << index);
  // 			data[parentOffset * 4 + 1] = (offsetsToChild[parentOffset] >> 8);
  // 			data[parentOffset * 4 + 2] = (offsetsToChild[parentOffset] % 256);
  // 		}
  //
  // 		let density = node.geometryNode.density;
  // 		
  // 		if(typeof density === "number"){
  // 			let lodOffset = Math.log2(density) / 2 - 1.5;
  //
  // 			let offsetUint8 = (lodOffset + 10) * 10;
  //
  // 			data[i * 4 + 3] = offsetUint8;
  // 		}else{
  // 			data[i * 4 + 3] = 100;
  // 		}
  //
  // 	}
  //
  // 	if(Potree.measureTimings){
  // 		performance.mark("computeVisibilityTextureData-end");
  // 		performance.measure("render.computeVisibilityTextureData", "computeVisibilityTextureData-start", "computeVisibilityTextureData-end");
  // 	}
  //
  // 	return {
  // 		data: data,
  // 		offsets: visibleNodeTextureOffsets
  // 	};
  // }

  // nodeIntersectsProfile (node, profile) {
  // 	let bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
  // 	let bsWorld = bbWorld.getBoundingSphere(new THREE.Sphere());
  //
  // 	let intersects = false;
  //
  // 	for (let i = 0; i < profile.points.length - 1; i++) {
  //
  // 		let start = new THREE.Vector3(profile.points[i + 0].x, profile.points[i + 0].y, bsWorld.center.z);
  // 		let end = new THREE.Vector3(profile.points[i + 1].x, profile.points[i + 1].y, bsWorld.center.z);
  //
  // 		let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true, new THREE.Vector3());
  // 		let distance = closest.distanceTo(bsWorld.center);
  //
  // 		intersects = intersects || (distance < (bsWorld.radius + profile.width));
  // 	}
  //
  // 	//console.log(`${node.name}: ${intersects}`);
  //
  // 	return intersects;
  // }
  //
  // deepestNodeAt(position){
  // 	
  // 	const toObjectSpace = this.matrixWorld.clone().invert();
  //
  // 	const objPos = position.clone().applyMatrix4(toObjectSpace);
  //
  // 	let current = this.root;
  // 	while(true){
  //
  // 		let containingChild = null;
  //
  // 		for(const child of current.children){
  //
  // 			if(child !== undefined){
  // 				if(child.getBoundingBox().containsPoint(objPos)){
  // 					containingChild = child;
  // 				}
  // 			}
  // 		}
  //
  // 		if(containingChild !== null && containingChild instanceof CloudOctreeNode){
  // 			current = containingChild;
  // 		}else{
  // 			break;
  // 		}
  // 	}
  //
  // 	const deepest = current;
  //
  // 	return deepest;
  // }

      // nodesOnRay (nodes, ray) {
      // 	let nodesOnRay = [];
      //
      // 	let _ray = ray.clone();
      // 	for (let i = 0; i < nodes.length; i++) {
      // 		let node = nodes[i];
      // 		let sphere = node.getBoundingSphere().clone().applyMatrix4(this.matrixWorld);
      //
      // 		if (_ray.intersectsSphere(sphere)) {
      // 			nodesOnRay.push(node);
      // 		}
      // 	}
      //
      // 	return nodesOnRay;
      // }

      // updateMatrixWorld (force) {
      // 	if (this.matrixAutoUpdate === true) this.updateMatrix();
      //
      // 	if (this.matrixWorldNeedsUpdate === true || force === true) {
      // 		if (!this.parent) {
      // 			this.matrixWorld.copy(this.matrix);
      // 		} else {
      // 			this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
      // 		}
      //
      // 		this.matrixWorldNeedsUpdate = false;
      //
      // 		force = true;
      // 	}
      // }

      hideDescendants (root : AbstractOctreeNode) {
        let stack = [root,];
        while (stack.length > 0) {
          let node = stack.shift() as AbstractOctreeNode;

          if (node !== root) {
            node.visible = false;
          }

          for (const child of node.getChildren()) {
            if (child.visible) {
              stack.push(child);
            }
          }
        }
      }

      get visible(){
        if (!this.root) {
          return false;
        }
        let root = this.root as CloudOctreeNode;
        return root.sceneNode?.isVisible || false;
      }

      set visible(value){
        if (!this.root) {
          return;
        }
        let root = this.root as CloudOctreeNode;
        if(root.sceneNode && value !== root.sceneNode.isVisible){
          root.sceneNode.isVisible = value;
          //
          // this.dispatchEvent({type: 'visibility_changed', pointcloud: this});
        }

      }


    }
