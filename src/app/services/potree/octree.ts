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
import { PointAttribute, PointAttributes, TypenameTypeattributeMap } from './point-attributes';
import { Pointcloud } from './pointcloud';

export class OctreeNode  {
  public visible : boolean = false;
  public loading : boolean;
  public loaded : boolean;
  public nodeType : number | null;
  public spacing? : number;
  public level : number;
  public parent? : OctreeNode | null;
  public mesh? : Mesh;
  public numPoints : number;
  public hierarchyByteOffset : bigint;
  public hierarchyByteSize : bigint;
  public hasChildren : boolean;
  public byteOffset : bigint;
  public byteSize : bigint;
  public geometry? : VertexData;
  public density : number;
  public oneTimeDisposeHandlers : { ():void; }[];
  protected children : OctreeNode[] = [];

  private id : number;
  static numNodesLoading : number = 0;
  static nodeCount : number = 0;

  constructor(public name : string,
              public boundingBox : BBox,
              public octree : Octree) {
    this.loading = false;
    this.loaded = false;
    this.nodeType = null;
    this.level = 0;
    this.numPoints = 0;
    this.hierarchyByteOffset = BigInt(0);
    this.hierarchyByteSize = BigInt(0);
    this.hasChildren = false;
    this.byteOffset = BigInt(0);
    this.byteSize = BigInt(0);
    this.density = 0;

    this.id = OctreeNode.nodeCount++;
    this.oneTimeDisposeHandlers = [];
  }

  getID() : number {
    return this.id;
  }

  getName() : string {
    return this.name;
  }

  getChildren() : OctreeNode[] {
    let children : OctreeNode[] = [];

    for (let i = 0; i < 8; i++) {
      if (this.children[i]) {
        children.push(this.children[i]);
      }
    }

    return children;
  }

  getLevel() : number {
    return this.level;
  }

  getBoundingBox() : BBox {
    return this.boundingBox;
  }

  isLoaded() : boolean {
    return this.loaded;
  }

  hasMesh() : boolean {
    return this.mesh !== undefined;
  }

  getNumPoints() : number {
    return this.numPoints;
  }

  getSpacing() : number {
    return this.spacing || 0;
  }

  dispose(){
    if (this.geometry && this.parent) {
      // this.geometry.dispose();
      this.geometry = undefined;
      this.loaded = false;
      this.parent.mesh?.removeChild(this.mesh as Mesh);
      this.mesh?.dispose();
    }
  }

  async load() {
    if(this.loaded || this.loading){
      return;
    }

    this.loading = true;
    OctreeNode.numNodesLoading++;

    try{
      if(this.nodeType === 2){
        await this.loadHierarchy();
      }

      let urlOctree = `${this.octree.url}/../octree.bin`;

      let first = this.byteOffset;
      let last = this.byteOffset + this.byteSize - BigInt(1);

      let buffer;
      if(this.byteSize === BigInt(0)){
        buffer = new ArrayBuffer(0);
        console.warn(`loaded node with 0 bytes: ${this.name}`);
      } else {
        let response = await fetch(urlOctree, {
          headers: {
            'content-type': 'multipart/byteranges',
            'Range': `bytes=${first}-${last}`,
          },
        });

        buffer = await response.arrayBuffer();
      }

      const worker = new Worker('./decoder.worker', { type: 'module' });

      worker.onmessage = (e) => {
        let data = e.data;
        let buffers = data.attributeBuffers;

        // Potree.workerPool.returnWorker(workerPath, worker);

        let geometry = new VertexData();

        for(let property in buffers){
          let buffer = buffers[property].buffer;

          if(property === "position"){
            geometry.positions = new Float32Array(buffer);
          }else if(property === "rgba"){
            geometry.colors = new Float32Array(buffer);
          }else if(property === "NORMAL"){
            geometry.normals = new Float32Array(buffer);
          }else if (property === "INDICES") {
            // geometry.indices = new Uint32Array(buffer);
            // let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
            // bufferAttribute.normalized = true;
            // geometry.setAttribute('indices', bufferAttribute);
          }
        }

        this.density = data.density;
        this.geometry = geometry;
        this.loaded = true;
        this.loading = false;
        OctreeNode.numNodesLoading--;
      };

      let pointAttributes = this.octree.pointAttributes;
      let scale = this.octree.scale;

      let box = this.boundingBox;
      let min = this.octree.offset.clone().add(box.minimum);
      let size = box.maximum.clone().subtract(box.minimum);
      let max = min.clone().add(size);

      let message = {
        name: this.name,
        buffer: buffer,
        pointAttributes: pointAttributes,
        scale: scale,
        min: [min.x, min.y, min.z],
        max: max,
        size: size,
        offset: this.octree.floatOffset,
        numPoints: this.numPoints
      };

      worker.postMessage(message, [message.buffer]);
    }catch(e){
      this.loaded = false;
      this.loading = false;
      OctreeNode.numNodesLoading--;

      console.log(`failed to load ${this.name}`);
      console.log(e);
      console.log(`trying again!`);
    }
  }

  async loadHierarchy(){
    let hierarchyPath = `${this.octree.url}/../hierarchy.bin`;

    let first = this.hierarchyByteOffset;
    let last = first + this.hierarchyByteSize - BigInt(1);

    let response = await fetch(hierarchyPath, {
      headers: {
        'content-type': 'multipart/byteranges',
        'Range': `bytes=${first}-${last}`,
      },
    });

    let buffer = await response.arrayBuffer();

    // parse hierarchy
    let view = new DataView(buffer);

    let bytesPerNode = 22;
    let numNodes = buffer.byteLength / bytesPerNode;

    let nodes = new Array(numNodes);
    nodes[0] = this;
    let nodePos = 1;

    for(let i = 0; i < numNodes; i++){
      let current = nodes[i];

      let type = view.getUint8(i * bytesPerNode + 0);
      let childMask = view.getUint8(i * bytesPerNode + 1);
      let numPoints = view.getUint32(i * bytesPerNode + 2, true);
      let byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
      let byteSize = view.getBigInt64(i * bytesPerNode + 14, true);

      if(current.nodeType === 2){
        // replace proxy with real node
        current.byteOffset = byteOffset;
        current.byteSize = byteSize;
        current.numPoints = numPoints;
      }else if(type === 2){
        // load proxy
        current.hierarchyByteOffset = byteOffset;
        current.hierarchyByteSize = byteSize;
        current.numPoints = numPoints;
      }else{
        // load real node
        current.byteOffset = byteOffset;
        current.byteSize = byteSize;
        current.numPoints = numPoints;
      }

      current.nodeType = type;

      if(current.nodeType === 2){
        continue;
      }

      for(let childIndex = 0; childIndex < 8; childIndex++){
        let childExists = ((1 << childIndex) & childMask) !== 0;

        if(!childExists){
          continue;
        }

        let childName = current.name + childIndex;

        let childAABB = createChildAABB(current.boundingBox, childIndex);
        let child = new OctreeNode(childName, childAABB, this.octree);
        child.name = childName;
        child.spacing = current.spacing / 2;
        child.level = current.level + 1;

        current.children[childIndex] = child;
        child.parent = current;

        // nodes.push(child);
        nodes[nodePos] = child;
        nodePos++;
      }
    }
  }

  buildMesh(scene : Scene,
            parent? : OctreeNode) {
    this.mesh = new Pointcloud(this.name,
                               this.geometry as VertexData,
                               scene,
                               parent?.mesh || this.octree.getAnchor());
    let offset = this.boundingBox.minimum.clone();
    this.mesh.material = this.octree.getPointMaterial();
    if (parent) {
      offset.subtractInPlace(parent.getBoundingBox().minimum);
    }
    this.mesh.position = offset;

    // DEBUG bounding box rendering
    // let size = this.boundingBox.extendSize.scale(2.0);
    // let mesh = MeshBuilder.CreateBox("bbox_" + geometryNode.name,
    //                                  {
    //                                    width: size.x,
    //                                    height: size.y,
    //                                    depth: size.z
    //                                  },
    //                                  scene);
    // mesh.material = this.wireframeMaterial;
    // mesh.parent = this.anchor;
    // mesh.position = this.boundingBox.center.clone();
    // END DEBUG
  }
};


export class Octree {
  public root : OctreeNode;
  public boundingBox : BBox;
  public offset : Vector3;
  public pointAttributes : PointAttributes;
  public scale : number;
  public spacing : number;
  public floatOffset : number;
  protected material : StandardMaterial;
  // protected wireframeMaterial : StandardMaterial;
  // public visibleNodes : OctreeNode[] = [];
  // public visibleGeometry : any[] = [];
  protected anchor : TransformNode;

  constructor(public url : string,
              metadata : any,
              scene : Scene){
    this.pointAttributes = Octree.parseAttributes(metadata.attributes);
    this.spacing = metadata.spacing;
    this.scale = metadata.scale;
    this.floatOffset = metadata.offset;

    let min = new Vector3(...metadata.boundingBox.min);
    let max = new Vector3(...metadata.boundingBox.max);
    this.offset = min.clone();
    min.subtractInPlace(this.offset);
    max.subtractInPlace(this.offset);

    this.boundingBox = new BBox(min, max);

    this.material = new StandardMaterial("pointcloud_material", scene);
    this.material.emissiveColor = new Color3(1, 1, 1);
    this.material.disableLighting = true;
    this.material.pointsCloud = true;
    this.material.pointSize = 3;

    // this.wireframeMaterial = new StandardMaterial("wire", scene);
    // this.wireframeMaterial.wireframe = true;
    // this.wireframeMaterial.emissiveColor = new Color3(1, 0, 0);

    this.anchor = new TransformNode("anchor", scene);
    this.anchor.position = this.offset.clone();
    this.anchor.rotate(Vector3.Right(), -0.5 * Math.PI);

    let root = new OctreeNode("r", this.boundingBox, this);
    root.level = 0;
    root.nodeType = 2;
    root.hierarchyByteOffset = BigInt(0);
    root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
    root.hasChildren = false;
    root.spacing = this.spacing;
    this.root = root;
  }

  getAnchor() : TransformNode {
    return this.anchor;
  }

  getGlobalTransform() {
    return this.anchor.getWorldMatrix();
  }

  getPointMaterial() {
    return this.material;
  }


  static parseAttributes(jsonAttributes : any[]){

    let attributes = new PointAttributes();

    let replacements : { [key : string] : string } = {
      "rgb": "rgba",
    };

    for (const jsonAttribute of jsonAttributes) {
      let {name, numElements, min, max} = jsonAttribute;

      let type = TypenameTypeattributeMap[jsonAttribute.type];

      let potreeAttributeName = replacements[name] ? replacements[name] : name;

      let attribute = new PointAttribute(potreeAttributeName, type, numElements);

      if(numElements === 1){
        attribute.range = [min[0], max[0]];
      }else{
        attribute.range = [min, max];
      }

      if (name === "gps-time") { // HACK: Guard against bad gpsTime range in metadata, see potree/potree#909
        if (attribute.range[0] === attribute.range[1]) {
          attribute.range[1] += 1;
        }
      }

      attribute.initialRange = attribute.range;

      attributes.add(attribute);
    }

    {
      // check if it has normals
      let hasNormals =
        attributes.attributes.find(a => a.name === "NormalX") !== undefined &&
        attributes.attributes.find(a => a.name === "NormalY") !== undefined &&
        attributes.attributes.find(a => a.name === "NormalZ") !== undefined;

      if(hasNormals){
        let vector = {
          name: "NORMAL",
          attributes: ["NormalX", "NormalY", "NormalZ"],
        };
        attributes.addVector(vector);
      }
    }

    return attributes;
  }

  hideDescendants (root : OctreeNode) {
    let stack = [root,];
    while (stack.length > 0) {
      let node = stack.shift() as OctreeNode;

      if (node !== root) {
        // TODO: check that mesh is hidden properly
        node.visible = false;
      }

      for (const child of node.getChildren()) {
        if (child.visible) {
          stack.push(child);
        }
      }
    }
  }
};

function createChildAABB(aabb : BBox,
                         index : number){
  let min = aabb.minimum.clone();
  let max = aabb.maximum.clone();
  let size = max.subtract(min);

  if ((index & 0b0001) > 0) {
    min.z += size.z / 2;
  } else {
    max.z -= size.z / 2;
  }

  if ((index & 0b0010) > 0) {
    min.y += size.y / 2;
  } else {
    max.y -= size.y / 2;
  }

  if ((index & 0b0100) > 0) {
    min.x += size.x / 2;
  } else {
    max.x -= size.x / 2;
  }

  return new BBox(min, max);
}
