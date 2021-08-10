import { Vector3,
         VertexData,
} from 'babylonjs';
import { BBox } from './bounding-box';
import { PointAttribute, PointAttributes, TypenameTypeattributeMap } from './point-attributes';
import { AbstractOctreeNode, AbstractOctree, INodeLoader } from './abstract-octree';

export class GeometryOctreeNode extends AbstractOctreeNode  {
  public loading : boolean;
  public loaded : boolean;
  public nodeType : number | null;
  public spacing? : number;
  public level : number;
  public parent : AbstractOctreeNode | null;
  public numPoints : number;
  public hierarchyByteOffset : bigint;
  public hierarchyByteSize : bigint;
  public hasChildren : boolean;
  public byteOffset : bigint;
  public byteSize : bigint;
  public geometry? : VertexData;
  public density : number;
  public oneTimeDisposeHandlers : { ():void; }[];

  private id : number;

  constructor(public name : string,
              public boundingBox : BBox,
              public octree : GeometryOctree) {
    super();
    this.loading = false;
    this.loaded = false;
    this.nodeType = null;
    this.level = 0;
    this.parent = null;
    this.numPoints = 0;
    this.hierarchyByteOffset = BigInt(0);
    this.hierarchyByteSize = BigInt(0);
    this.hasChildren = false;
    this.byteOffset = BigInt(0);
    this.byteSize = BigInt(0);
    this.density = 0;

    this.id = IDCount++;
    this.oneTimeDisposeHandlers = [];
  }

  getID() {
    return this.id;
  }

  getLevel(){
    return this.level;
  }

  getName() {
    return this.name;
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  isLoaded () {
    return this.loaded;
  }

  isGeometryNode(){
    return true;
  }

  isTreeNode(){
    return false;
  }

  getNumPoints() {
    return this.numPoints;
  }

  getSpacing() {
    return this.spacing;
  }

  load() {
    if (this.octree.loader !== null) {
      this.octree.loader.load(this);
    }
  }

  dispose(){
    if (this.geometry && this.parent != null) {
      // this.geometry.dispose();
      this.geometry = undefined;
      this.loaded = false;

      // this.dispatchEvent( { type: 'dispose' } );
      for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
        let handler = this.oneTimeDisposeHandlers[i];
        handler();
      }
      this.oneTimeDisposeHandlers = [];
    }
  }

};

let IDCount = 0;

export class GeometryOctree extends AbstractOctree {
  public boundingBox : BBox;
  public offset : Vector3;
  public pointAttributes : PointAttributes;
  public scale : number;
  public spacing : number;

  constructor(metadata : any,
              public loader : INodeLoader){
    super();
    this.loader = loader;
    this.pointAttributes = GeometryOctree .parseAttributes(metadata.attributes);
    this.spacing = metadata.spacing;
    this.scale = metadata.scale;

    let min = new Vector3(...metadata.boundingBox.min);
    let max = new Vector3(...metadata.boundingBox.max);
    this.offset = min.clone();
    min.subtractInPlace(this.offset);
    max.subtractInPlace(this.offset);

    this.boundingBox = new BBox(min, max);

    let root = new GeometryOctreeNode("r", this.boundingBox, this);
    root.level = 0;
    root.nodeType = 2;
    root.hierarchyByteOffset = BigInt(0);
    root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
    root.hasChildren = false;
    root.spacing = this.spacing;
    root.byteOffset = BigInt(0);
    this.root = root;
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
};
