/// <reference lib="webworker" />

import {PointAttribute, PointAttributeTypes} from "../point-attributes";

const typedArrayMapping : { [type: string] : any; } = {
	"int8":   Int8Array,
	"int16":  Int16Array,
	"int32":  Int32Array,
	"int64":  Float64Array,
	"uint8":  Uint8Array,
	"uint16": Uint16Array,
	"uint32": Uint32Array,
	"uint64": Float64Array,
	"float":  Float32Array,
	"double": Float64Array,
};

addEventListener('message', (e) => {
	let {buffer, pointAttributes, scale, min, size, offset, numPoints} = e.data;

	let view = new DataView(buffer);

	let attributeBuffers : { [id: string] : any; } = {};
	let attributeOffset = 0;

	let bytesPerPoint = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		bytesPerPoint += pointAttribute.byteSize;
	}

	let gridSize = 32;
	let grid = new Uint32Array(gridSize ** 3);
	let toIndex = (x : number, y : number, z : number) => {
		// min is already subtracted
		let dx = gridSize * x / size.x;
		let dy = gridSize * y / size.y;
		let dz = gridSize * z / size.z;

		let ix = Math.min(Math.floor(dx), gridSize - 1);
		let iy = Math.min(Math.floor(dy), gridSize - 1);
		let iz = Math.min(Math.floor(dz), gridSize - 1);

		let index = ix + iy * gridSize + iz * gridSize * gridSize;

		return index;
	};

	let numOccupiedCells = 0;

	for (let pointAttribute of pointAttributes.attributes) {
		if(["POSITION_CARTESIAN", "position"].includes(pointAttribute.name)){
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {

				let pointOffset = j * bytesPerPoint;

        let x = view.getInt32(pointOffset + attributeOffset + 0, true);
        let y = view.getInt32(pointOffset + attributeOffset + 4, true);
        let z = view.getInt32(pointOffset + attributeOffset + 8, true);

				x = (x * scale[0]) + offset[0] - min[0];
				y = (y * scale[1]) + offset[1] - min[1];
				z = (z * scale[2]) + offset[2] - min[2];

				let index = toIndex(x, y, z);
				let count = grid[index]++;
				if(count === 0){
					numOccupiedCells++;
				}

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = {
        buffer: buff,
        attribute: pointAttribute
      };
		}else if(["RGBA", "rgba"].includes(pointAttribute.name)){
			let buff = new ArrayBuffer(numPoints * 4 * 4);
			let colors = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;

				let r = view.getUint16(pointOffset + attributeOffset + 0, true);
				let g = view.getUint16(pointOffset + attributeOffset + 2, true);
				let b = view.getUint16(pointOffset + attributeOffset + 4, true);

				colors[4 * j + 0] = r > 255 ? (r / 256) * (1.0/255.0) : r * (1.0 / 255.0);
				colors[4 * j + 1] = g > 255 ? (g / 256) * (1.0/255.0) : g * (1.0 / 255.0);
				colors[4 * j + 2] = b > 255 ? (b / 256) * (1.0/255.0) : b * (1.0 / 255.0);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}else{
			let buff = new ArrayBuffer(numPoints * 4);
			let f32 = new Float32Array(buff);

			let TypedArray = typedArrayMapping[pointAttribute.type.name];
			let preciseBuffer = new TypedArray(numPoints);

			let [offset, scale] = [0, 1];

			const getterMap : { [type : string] : any; } = {
				"int8":   view.getInt8,
				"int16":  view.getInt16,
				"int32":  view.getInt32,
				// "int64":  view.getInt64,
				"uint8":  view.getUint8,
				"uint16": view.getUint16,
				"uint32": view.getUint32,
				// "uint64": view.getUint64,
				"float":  view.getFloat32,
				"double": view.getFloat64,
			};
			const getter = getterMap[pointAttribute.type.name].bind(view);

			// compute offset and scale to pack larger types into 32 bit floats
			if(pointAttribute.type.size > 4){
				let [amin, amax] = pointAttribute.range;
				offset = amin;
				scale = 1 / (amax - amin);
			}

			for(let j = 0; j < numPoints; j++){
				let pointOffset = j * bytesPerPoint;
				let value = getter(pointOffset + attributeOffset, true);

				f32[j] = (value - offset) * scale;
				preciseBuffer[j] = value;
			}

			attributeBuffers[pointAttribute.name] = {
				buffer: buff,
				preciseBuffer: preciseBuffer,
				attribute: pointAttribute,
				offset: offset,
				scale: scale,
			};
		}

		attributeOffset += pointAttribute.byteSize;


	}

	let occupancy = Math.floor(numPoints / numOccupiedCells);

	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}

		attributeBuffers["INDICES"] = { buffer: buff, attribute: PointAttribute.INDICES };
	}


	{ // handle attribute vectors
		let vectors = pointAttributes.vectors;

		for(let vector of vectors){

			let {name, attributes} = vector;
			let numVectorElements = attributes.length;
			let buffer = new ArrayBuffer(numVectorElements * numPoints * 4);
			let f32 = new Float32Array(buffer);

			let iElement = 0;
			for(let sourceName of attributes){
				let sourceBuffer = attributeBuffers[sourceName];
				let {offset, scale} = sourceBuffer;
				let view = new DataView(sourceBuffer.buffer);

				const getter = view.getFloat32.bind(view);

				for(let j = 0; j < numPoints; j++){
					let value = getter(j * 4, true);

					f32[j * numVectorElements + iElement] = (value / scale) + offset;
				}

				iElement++;
			}

			let vecAttribute = new PointAttribute(name, PointAttributeTypes.DATA_TYPE_FLOAT, 3);

			attributeBuffers[name] = {
				buffer: buffer,
				attribute: vecAttribute,
			};

		}

	}

	let message = {
		buffer: buffer,
		attributeBuffers: attributeBuffers,
		density: occupancy,
	};

	let transferables : any[] = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(buffer);

	postMessage(message, transferables);
});
