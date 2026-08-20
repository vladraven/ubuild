import * as THREE from 'three';
import { generatePanelNormalMap } from '../../panels/PanelProfiles.js';
function assertContext(context) {
    if (!context || typeof context !== 'object') throw new TypeError('Element context is required');
    if (!context.geometry?.roof) throw new TypeError('Roof geometry is required');
    if (!context.panelGeometry?.roof) throw new TypeError('Roof panel geometry is required');
    if (!context.materials) throw new TypeError('Material system is required');
}
function resolveMaterial(context) {
    const profileId = context.model?.roof?.profile || 'awr';
    const normalMap = generatePanelNormalMap(profileId);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(Math.max(1, context.model?.dimensions?.length || 10) * 0.8, Math.max(1, context.model?.dimensions?.width || 10) * 1.5);
    normalMap.needsUpdate = true;
    if (typeof context.materials.get === 'function') {
        const mat = context.materials.get('roofMetal', context.colors?.roof, { normalMap });
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
        return mat;
    }
    if (context.materials.roofMetal) return context.materials.roofMetal;
    if (context.materials.roof) return context.materials.roof;
    throw new Error('Roof material is not available');
}
function createPlaneGeometry(corners) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([corners[0].x,corners[0].y,corners[0].z,corners[1].x,corners[1].y,corners[1].z,corners[2].x,corners[2].y,corners[2].z,corners[3].x,corners[3].y,corners[3].z]);
    const uvs = new Float32Array([0,0,1,0,1,1,0,1]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
    geometry.setIndex([0,1,2,0,2,3]);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}
function createPanelMesh(panel,material) {
    const geometry=createPlaneGeometry(panel.corners);
    const mesh=new THREE.Mesh(geometry,material);
    mesh.userData.element='roof';
    mesh.userData.panelIndex=panel.index;
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    return mesh;
}
function createPlaneGroup(planeId,panels,material) {
    const group=new THREE.Group();
    group.name=`roof-${planeId}`;
    for(const panel of panels) group.add(createPanelMesh(panel,material));
    return group;
}
function createObject(context) {
    assertContext(context);
    const root=new THREE.Group();
    root.name='roof';
    if(context.model?.visibility?.roof===false) return root;
    const material=resolveMaterial(context);
    for(const [planeId,panels] of Object.entries(context.panelGeometry.roof)) if(Array.isArray(panels)&&panels.length) root.add(createPlaneGroup(planeId,panels,material));
    return root;
}
function disposeObject(object) {
    if(!object) return;
    object.traverse(child=>{if(child.isMesh) child.geometry?.dispose();});
    while(object.children.length>0) object.remove(object.children[0]);
    object.removeFromParent();
}
export const RoofOrchestrator=Object.freeze({
    id:'roof',
    create(context){return createObject(context);},
    update(object,context){if(!object)return createObject(context);disposeObject(object);return createObject(context);},
    dispose(object){disposeObject(object);}
});