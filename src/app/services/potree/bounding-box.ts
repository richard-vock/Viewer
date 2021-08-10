import { BoundingBox,
         Camera,
         Frustum,
         Matrix,
         Vector3,
} from 'babylonjs';


export class BBox extends BoundingBox {
  constructor(min? : Vector3, max? : Vector3) {
    super(min || new Vector3(Infinity, Infinity, Infinity),
          max || new Vector3(-Infinity, -Infinity, -Infinity));
  }

  extend(pnt : Vector3) {
    this.reConstruct(Vector3.Minimize(this.minimum, pnt),
                     Vector3.Maximize(this.maximum, pnt));
  }

  transform(m : Matrix) : BBox {
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const corner of this.vectors) {
      const pnt = Vector3.TransformCoordinates(corner, m);
      min = Vector3.Minimize(min, pnt);
      max = Vector3.Maximize(max, pnt);
    }
    this.reConstruct(min, max);
    return this;
  }

  transformed(m : Matrix) : BBox {
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const corner of this.vectors) {
      const pnt = Vector3.TransformCoordinates(corner, m);
      min = Vector3.Minimize(min, pnt);
      max = Vector3.Maximize(max, pnt);
    }
    return new BBox(min, max);
  }

  merge(box : BBox) : BBox {
    let min = this.minimum;
    let max = this.maximum;
    const { minimum, maximum } = box;

    min = Vector3.Minimize(min, minimum);
    min = Vector3.Minimize(min, maximum);
    max = Vector3.Maximize(max, minimum);
    max = Vector3.Maximize(max, maximum);

    this.reConstruct(min, max);

    return this;
  }

  visibleInCamera(camera : Camera, transform? : Matrix) : boolean {
    const planes = Frustum.GetPlanes(camera.getTransformationMatrix());
    let corners = transform ? this.vectorsWorld.map((v) => {
      return Vector3.TransformCoordinates(v, transform);
    })
      : this.vectorsWorld;
      return BoundingBox.IsInFrustum(corners, planes);
  }
}
