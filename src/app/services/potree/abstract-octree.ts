import { BBox } from './bounding-box';


export abstract class AbstractOctreeNode {
  children : AbstractOctreeNode[] = [];
  visible : boolean = false;

  getChildren() : AbstractOctreeNode[] {
    let children : AbstractOctreeNode[] = [];

    for (let i = 0; i < 8; i++) {
      if (this.children[i]) {
        children.push(this.children[i]);
      }
    }

    return children;
  }

  abstract getLevel() : number;

  abstract getName() : string;

  abstract getBoundingBox() : BBox | undefined;

  abstract isLoaded() : boolean;

  abstract isGeometryNode() : boolean;

  abstract isTreeNode() : boolean;

  abstract getNumPoints() : number;

  abstract getSpacing() : number | undefined;
}

export abstract class AbstractOctree {
  root? : AbstractOctreeNode;

  getRoot() {
    return this.root;
  }
}

export interface INodeLoader {
  offset: number;
  load(node : AbstractOctreeNode): void;
}
