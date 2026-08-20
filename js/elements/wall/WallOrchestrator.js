import * as THREE from 'three';
import { generatePanelNormalMap, applyPhysicalPanelUVs } from '../../panels/PanelProfiles.js';
const SIDE_MAP=Object.freeze({front:'F',back:'B',left:'L',right:'R'});
function assertContext(context) {
    if(!context||typeof context!=='object')throw new TypeError('Element context is required');
    if(!context.geometry?.walls)throw new TypeError('Wall geometry is required');
    if(!context.materials)throw new TypeError('Material system is required');
}
function getWallMaterial(context) {
    const profileId=context.model?.panels?.profile||'awr';
    const normalMap=generatePanelNormalMap(profileId);
    normalMap.wrapS=THREE.RepeatWrapping;
    normalMap.wrapT=THREE.RepeatWrapping;
    normalMap.repeat.set(Math.max(1,context.model?.dimensions?.length||10),Math.max(1,context.model?.dimensions?.height||5));
    normalMap.needsUpdate=true;
    if(typeof context.materials.get==='function'){
        const mat=context.materials.get('wallMetal',context.colors?.wall,{normalMap});
        mat.side=THREE.DoubleSide;
        mat.needsUpdate=true;
        return mat;
    }
    return context.materials.wallMetal||context.materials.wall;
}
function createWallMeshWithHoles(wallData,openings,wallKey,material,envelope,profileId) {
    const shape=new THREE.Shape();
    const sideCode=SIDE_MAP[wallKey];
    wallData.shapePoints.forEach((p,idx)=>{if(idx===0)shape.moveTo(p.x,p.y);else shape.lineTo(p.x,p.y);});
    openings.filter(op=>op.side===sideCode).forEach(op=>{
        const opW=op.dimensions.width;
        const opH=op.dimensions.height;
        const opY=op.bounds.min.y;
        let holeCenterX;
        if(sideCode==='F'||sideCode==='B')holeCenterX=op.x;
        else if(sideCode==='L')holeCenterX=op.x;
        else holeCenterX=envelope.length-op.x;
        const holeMinX=holeCenterX-opW/2;
        const holeMaxX=holeCenterX+opW/2;
        const holePath=new THREE.Path();
        holePath.moveTo(holeMinX,opY);
        holePath.lineTo(holeMaxX,opY);
        holePath.lineTo(holeMaxX,opY+opH);
        holePath.lineTo(holeMinX,opY+opH);
        holePath.closePath();
        shape.holes.push(holePath);
    });
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:wallData.thickness,bevelEnabled:false});
    applyPhysicalPanelUVs(geometry,envelope.width,wallData.height,profileId);
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=`wall-mesh-${sideCode}`;
    const t=wallData.thickness;
    if(sideCode==='F')mesh.position.set(0,0,0);
    else if(sideCode==='B')mesh.position.set(0,0,envelope.length-t);
    else if(sideCode==='L')mesh.position.set(-envelope.width/2+t,0,0);
    else if(sideCode==='R')mesh.position.set(envelope.width/2-t,0,envelope.length);
    if(sideCode==='L')mesh.rotation.y=-Math.PI/2;
    if(sideCode==='R')mesh.rotation.y=Math.PI/2;
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    return mesh;
}
function createObject(context) {
    assertContext(context);
    const root=new THREE.Group();
    root.name='walls';
    if(context.model?.visibility?.walls===false)return root;
    const profileId=context.model?.panels?.profile||'awr';
    const material=getWallMaterial(context);
    const openings=context.geometry.openings||[];
    const envelope=context.geometry.envelope;
    for(const [wallKey,wallData] of Object.entries(context.geometry.walls))if(wallData?.shapePoints)root.add(createWallMeshWithHoles(wallData,openings,wallKey,material,envelope,profileId));
    return root;
}
function disposeObject(object) {
    if(!object)return;
    object.traverse(child=>{if(child.isMesh)child.geometry?.dispose();});
    while(object.children.length>0)object.remove(object.children[0]);
    object.removeFromParent();
}
export const WallOrchestrator=Object.freeze({
    id:'walls',
    create(context){return createObject(context);},
    update(object,context){if(!object)return createObject(context);disposeObject(object);return createObject(context);},
    dispose(object){disposeObject(object);}
});