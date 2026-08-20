import * as THREE from 'three';
export function createCameraControls({camera,domElement,onUpdate}){
    if(!camera||!domElement)throw new TypeError('Camera and DOM element are required for CameraControls');
    let isPointerDown=false;
    let pointerButton=0;
    const startPointer=new THREE.Vector2();
    const prevPointer=new THREE.Vector2();
    const target=new THREE.Vector3(0,2,0);
    const spherical=new THREE.Spherical();
    let insideView=false;
    spherical.setFromVector3(camera.position.clone().sub(target));
    function syncFromCamera(){
        spherical.setFromVector3(camera.position.clone().sub(target));
        spherical.makeSafe();
    }
    function setView(position,newTarget){
        if(position)camera.position.copy(position);
        if(newTarget)target.copy(newTarget);
        syncFromCamera();
        camera.lookAt(target);
        if(typeof onUpdate==='function')onUpdate();
    }
    function getView(){
        return {position:camera.position.clone(),target:target.clone()};
    }
    function setInsideView(value,position,newTarget){
        insideView=Boolean(value);
        if(insideView){
            if(position)camera.position.copy(position);
            if(newTarget)target.copy(newTarget);
            syncFromCamera();
            camera.lookAt(target);
        }else{
            syncFromCamera();
            camera.lookAt(target);
        }
        if(typeof onUpdate==='function')onUpdate();
    }
    function onPointerDown(e){
        isPointerDown=true;
        pointerButton=e.button;
        startPointer.set(e.clientX,e.clientY);
        prevPointer.set(e.clientX,e.clientY);
    }
    function onPointerMove(e){
        if(!isPointerDown)return;
        const deltaX=e.clientX-prevPointer.x;
        const deltaY=e.clientY-prevPointer.y;
        prevPointer.set(e.clientX,e.clientY);
        if(pointerButton===0){
            spherical.theta-=deltaX*0.005;
            spherical.phi-=deltaY*0.005;
            spherical.phi=Math.max(0.05,Math.min(Math.PI/2-0.01,spherical.phi));
        }else if(pointerButton===2){
            const panSpeed=spherical.radius*0.001;
            const right=new THREE.Vector3();
            const up=new THREE.Vector3(0,1,0);
            camera.getWorldDirection(right);
            right.cross(up).normalize();
            target.addScaledVector(right,-deltaX*panSpeed);
            target.y+=deltaY*panSpeed;
        }
        updateCameraPosition();
    }
    function onPointerUp(){
        isPointerDown=false;
    }
    function onWheel(e){
        e.preventDefault();
        const factor=e.deltaY>0?1.08:0.92;
        spherical.radius=Math.max(0.15,Math.min(1500,spherical.radius*factor));
        updateCameraPosition();
    }
    function onContextMenu(e){
        e.preventDefault();
    }
    function updateCameraPosition(){
        spherical.makeSafe();
        const offset=new THREE.Vector3().setFromSpherical(spherical);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
        if(typeof onUpdate==='function')onUpdate();
    }
    domElement.addEventListener('pointerdown',onPointerDown);
    window.addEventListener('pointermove',onPointerMove);
    window.addEventListener('pointerup',onPointerUp);
    domElement.addEventListener('wheel',onWheel,{passive:false});
    domElement.addEventListener('contextmenu',onContextMenu);
    function frameBounds(bounds){
        if(!bounds||!bounds.center)return;
        insideView=false;
        target.set(bounds.center.x,bounds.center.y,bounds.center.z);
        const maxDim=Math.max(bounds.width||10,bounds.height||5,bounds.length||10);
        const fovRad=(camera.fov*Math.PI)/180;
        const fitDistance=maxDim/2/Math.tan(fovRad/2);
        spherical.radius=fitDistance*1.5;
        spherical.phi=Math.PI/3;
        spherical.theta=Math.PI/4;
        updateCameraPosition();
    }
    function dispose(){
        domElement.removeEventListener('pointerdown',onPointerDown);
        window.removeEventListener('pointermove',onPointerMove);
        window.removeEventListener('pointerup',onPointerUp);
        domElement.removeEventListener('wheel',onWheel);
        domElement.removeEventListener('contextmenu',onContextMenu);
    }
    return Object.freeze({target,frameBounds,updateCameraPosition,setView,getView,setInsideView,dispose});
}