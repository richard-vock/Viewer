// import * as THREE from "three";
import { VertexData } from 'babylonjs';
import { BBox } from '../bounding-box';
import { GeometryOctree, GeometryOctreeNode } from '../geometry-octree';

export let maxNodesLoading = 4;
export let numNodesLoading = 0;

export class NodeLoader {
  public scale : number;
  public offset : number;
  private url : string;
  // private workers : object;

  constructor(url : string,
              metadata : any) {
    this.url = url;
    // this.workers = {};
    this.scale = metadata.scale;
    this.offset = metadata.offset;
  }

  async load(node : GeometryOctreeNode){
    if(node.loaded || node.loading){
      return;
    }

    node.loading = true;
    numNodesLoading++;

    try{
      if(node.nodeType === 2){
        await this.loadHierarchy(node);
      }

      let {byteOffset, byteSize} = node;


      let urlOctree = `${this.url}/../octree.bin`;

      let first = byteOffset;
      let last = byteOffset + byteSize - BigInt(1);

      let buffer;

      if(byteSize === BigInt(0)){
        buffer = new ArrayBuffer(0);
        console.warn(`loaded node with 0 bytes: ${node.name}`);
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

        node.density = data.density;
        node.geometry = geometry;
        node.loaded = true;
        node.loading = false;
        numNodesLoading--;
      };

      let pointAttributes = node.octree.pointAttributes;
      let scale = node.octree.scale;

      let box = node.boundingBox;
      let min = node.octree.offset.clone().add(box.minimum);
      let size = box.maximum.clone().subtract(box.minimum);
      let max = min.clone().add(size);
      let numPoints = node.numPoints;
      let offset = node.octree.loader.offset;

      let message = {
        name: node.name,
        buffer: buffer,
        pointAttributes: pointAttributes,
        scale: scale,
        min: [min.x, min.y, min.z],
        max: max,
        size: size,
        offset: offset,
        numPoints: numPoints
      };

      worker.postMessage(message, [message.buffer]);
    }catch(e){
      node.loaded = false;
      node.loading = false;
      numNodesLoading--;

      console.log(`failed to load ${node.name}`);
      console.log(e);
      console.log(`trying again!`);
    }
  }

  parseHierarchy(node : GeometryOctreeNode,
                 buffer : ArrayBuffer){
    let view = new DataView(buffer);

    let bytesPerNode = 22;
    let numNodes = buffer.byteLength / bytesPerNode;

    let octree = node.octree;
    let nodes = new Array(numNodes);
    nodes[0] = node;
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
        let child = new GeometryOctreeNode(childName, childAABB, octree);
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

  async loadHierarchy(node : GeometryOctreeNode){
    let {hierarchyByteOffset, hierarchyByteSize} = node;
    let hierarchyPath = `${this.url}/../hierarchy.bin`;

    let first = hierarchyByteOffset;
    let last = first + hierarchyByteSize - BigInt(1);

    let response = await fetch(hierarchyPath, {
      headers: {
        'content-type': 'multipart/byteranges',
        'Range': `bytes=${first}-${last}`,
      },
    });

    let buffer = await response.arrayBuffer();
    this.parseHierarchy(node, buffer);
  }
}

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

export class OctreeLoader{
  static async load(url : string){
    let response = await fetch(url);
    let metadata = await response.json();

    let loader = new NodeLoader(url, metadata);

    let octree = new GeometryOctree(metadata, loader);

    loader.load(octree.root as GeometryOctreeNode);

    let result = {
      geometry: octree,
    };

    return result;

  }

};
