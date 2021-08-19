import {
  Injectable,
} from '@angular/core';

import {
  Camera,
  Scene,
  Vector3,
} from 'babylonjs';
import { BBox } from './bounding-box';

import { BinaryHeap } from './binary-heap';
import { LRU } from './LRU';
import { Octree, OctreeNode } from './octree';
import { PotreeConfig } from './config';

class QueueItem {
  constructor(public node : OctreeNode,
              public weight : number,
              public parent? : OctreeNode) {
              }
}

@Injectable({
  providedIn: 'root',
})
export class PotreeService {
  constructor(
    private lru : LRU
  ) {
  }

  public loadEntity (
    rootUrl: string,
    scene : Scene,
  ) {
    return this.loadCloud(rootUrl, scene);
  }

  async loadCloud(url : string,
                  scene : Scene) {
    let response = await fetch(url);
    let metadata = await response.json();
    let octree = new Octree(url, metadata, scene);
    await octree.root.load();

    return octree;
  }

  public update(cloud : Octree,
                scene : Scene,
                camera : Camera,
                canvasHeight : number) {
    let queue = new BinaryHeap<QueueItem>((x : QueueItem) => { return 1 / x.weight; });
    queue.push(new QueueItem(cloud.root as OctreeNode, Number.MAX_VALUE));

    let visibleNodes : OctreeNode[] = [];
    let visibleGeometry  : OctreeNode[] = [];
    let unloadedGeometry  : OctreeNode[] = [];
    let numVisiblePoints = 0;
    let lowestSpacing = Infinity;
    let loadedToGPUThisFrame = 0;

    while (queue.size() > 0) {
      let { node, parent } = queue.pop();

      const bbox = node.getBoundingBox() as BBox;
      const nPoints = node.getNumPoints();
      const level = node.getLevel();
      const spacing = node.getSpacing();

      let maxLevel = Infinity;//cloud.maxLevel || Infinity;
      let visible = bbox.visibleInCamera(camera, cloud.getGlobalTransform());
      visible = visible && !(numVisiblePoints + nPoints > PotreeConfig.pointBudget);
      visible = visible && level < maxLevel;
      visible = visible || level <= 2;

      if (spacing) {
        lowestSpacing = Math.min(lowestSpacing, spacing);
      }

      if (numVisiblePoints + nPoints > PotreeConfig.pointBudget) {
        break;
      }

      if (!visible) {
        continue;
      }

      numVisiblePoints += nPoints;

      if (!node.hasMesh() && (!parent || parent.hasMesh())) {
        if (node.isLoaded() && loadedToGPUThisFrame < 2) {
          node.buildMesh(scene, parent);
          node.visible = true;
          loadedToGPUThisFrame++;
        } else {
          unloadedGeometry.push(node);
          visibleGeometry.push(node);
        }
      }

      if (node.hasMesh()) {
        this.lru.touch(node);
        visibleNodes.push(node);
        // cloud.visibleNodes.push(node);
      }

      let children = node.getChildren();
      for (const child of children) {
        if (!child) {
          continue;
        }

        const childBBox = child.getBoundingBox();
        if (!childBBox) {
          continue;
        }

        let weight = 0;
        let distance = Vector3.Distance(childBBox.center, camera.position);

        let radius = 0.5 * Vector3.Distance(childBBox.minimum,
                                            childBBox.maximum);

        let fov = (camera.fov * Math.PI) / 180;
        let slope = Math.tan(fov / 2);
        let projFactor = (0.5 * canvasHeight) / (slope * distance);
        let screenPixelRadius = radius * projFactor;

        if(screenPixelRadius < PotreeConfig.minimumNodePixelSize){
          continue;
        }

        weight = screenPixelRadius;

        if(distance - radius < 0){
          weight = Number.MAX_VALUE;
        }

        queue.push(new QueueItem(child, weight, node));
      }
    }

    for (let i = 0; i < Math.min(PotreeConfig.maxNodesLoading, unloadedGeometry.length); i++) {
      unloadedGeometry[i].load();
    }

    // cloud.updateVisibleBounds();
    this.lru.freeMemory();
  }
}
