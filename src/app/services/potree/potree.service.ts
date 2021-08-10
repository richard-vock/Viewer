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
import { OctreeLoader } from './loader/octree-loader';
import { AbstractOctreeNode } from './abstract-octree';
import { CloudOctree, CloudOctreeNode } from './cloud-octree';
import { GeometryOctreeNode } from './geometry-octree';
import { PotreeConfig } from './config';

class QueueItem {
  constructor(public node : AbstractOctreeNode,
              public weight : number,
              public parent? : AbstractOctreeNode) {
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

  public loadEntity(
    rootUrl: string,
    scene : Scene,
  ) {
    return OctreeLoader.load(rootUrl).then((result) => {
      let geometry = result.geometry;
      let cloud = new CloudOctree(geometry, scene);
      return cloud;
    });
  }

  public update(cloud : CloudOctree,
                scene : Scene,
                camera : Camera,
                canvasHeight : number) {
    let queue = new BinaryHeap<QueueItem>((x : QueueItem) => { return 1 / x.weight; });
    queue.push(new QueueItem(cloud.root as AbstractOctreeNode, Number.MAX_VALUE));

    let visibleNodes : AbstractOctreeNode[] = [];
    let visibleGeometry  : AbstractOctreeNode[] = [];
    let unloadedGeometry  : AbstractOctreeNode[] = [];
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

      if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
        if (node.isLoaded() && loadedToGPUThisFrame < 2) {
          node = cloud.toTreeNode(node as GeometryOctreeNode,
                                  (parent || undefined) as (CloudOctreeNode | undefined),
                                  scene);
          loadedToGPUThisFrame++;
        } else {
          unloadedGeometry.push(node);
          visibleGeometry.push(node);
        }
      }

      if (node.isTreeNode()) {
        const gnode = (node as CloudOctreeNode).geometryNode;
        this.lru.touch(gnode);
        visibleNodes.push(node);
        cloud.visibleNodes.push(node as CloudOctreeNode);
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
      (unloadedGeometry[i] as GeometryOctreeNode).load();
    }

    // cloud.updateVisibleBounds();
    this.lru.freeMemory();
  }
}
