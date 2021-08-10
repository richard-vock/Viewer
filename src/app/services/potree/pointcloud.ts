import { Mesh,
         Node,
         Scene,
         VertexData,
       } from 'babylonjs';

export class Pointcloud extends Mesh {
    constructor(name : string,
                data : VertexData,
                scene : Scene,
                parent : Node) {
        super(name, scene, parent);
        data.applyToMesh(this);
    }
}
