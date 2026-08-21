import * as THREE from 'three';
import { createTextureCatalog } from '../resources/textures/TextureCatalog.js';
import { createTextureManager } from '../resources/textures/TextureManager.js';
const SEASONS_NORTH=Object.freeze({11:'winter',0:'winter',1:'winter',2:'spring',3:'spring',4:'spring',5:'summer',6:'summer',7:'summer',8:'autumn',9:'autumn',10:'autumn'});
const SEASONS_SOUTH=Object.freeze({11:'summer',0:'summer',1:'summer',2:'autumn',3:'autumn',4:'autumn',5:'winter',6:'winter',7:'winter',8:'spring',9:'spring',10:'spring'});
const SEASON_PROFILES=Object.freeze({
    winter:Object.freeze({groundColor:0xffffff,groundRoughness:0.96,skyTop:0x7f9bb6,skyBottom:0xdce7f3,fogColor:0xdce7f3,fogDensity:0.00075,ambientTint:0xd4e4f7,vegetationDensity:0.1}),
    spring:Object.freeze({groundColor:0xffffff,groundRoughness:0.86,skyTop:0x5f9fd0,skyBottom:0xdceef8,fogColor:0xc5dce9,fogDensity:0.0006,ambientTint:0xf4f9e8,vegetationDensity:0.6}),
    summer:Object.freeze({groundColor:0xffffff,groundRoughness:0.8,skyTop:0x438cc7,skyBottom:0xd9efff,fogColor:0xdce7f3,fogDensity:0.0006,ambientTint:0xffffff,vegetationDensity:1}),
    autumn:Object.freeze({groundColor:0xffffff,groundRoughness:0.9,skyTop:0x7899b0,skyBottom:0xe6d9c7,fogColor:0xd1dbe2,fogDensity:0.0007,ambientTint:0xfbeed9,vegetationDensity:0.4})
});
function getSeason(dateInput,hemisphere='north'){
    let month=5;
    if(typeof dateInput==='string'){
        const parts=dateInput.split('-');
        if(parts.length>=2){
            const parsed=parseInt(parts[1],10);
            if(Number.isFinite(parsed))month=(parsed-1)%12;
        }
    }else if(dateInput instanceof Date){
        month=dateInput.getMonth();
    }
    const seasons=hemisphere==='south'?SEASONS_SOUTH:SEASONS_NORTH;
    return seasons[month]||'summer';
}
function createTextureRuntime(initialTextureManager){
    if(initialTextureManager&&typeof initialTextureManager.get==='function')return initialTextureManager;
    const catalog=createTextureCatalog();
    return createTextureManager({
        loader:new THREE.TextureLoader(),
        catalog
    });
}
function getGroundTextureName(season){
    if(season==='spring')return 'springGround';
    if(season==='summer')return 'summerGround';
    if(season==='autumn')return 'fallGround';
    return 'winterGround';
}
function createTerrainGeometry(){
    const size=3000;
    const segments=128;
    const geometry=new THREE.PlaneGeometry(size,size,segments,segments);
    const position=geometry.attributes.position;
    for(let i=0;i<position.count;i++){
        const x=position.getX(i);
        const z=position.getY(i);
        const distance=Math.sqrt(x*x+z*z);
        const factor=Math.min(1,Math.max(0,(distance-70)/350));
        const hills=(Math.sin(x*0.012)*Math.cos(z*0.012)*3+Math.sin(x*0.003)*Math.cos(z*0.004)*5+Math.sin((x+z)*0.0017)*4)*factor;
        position.setZ(i,hills);
    }
    geometry.computeVertexNormals();
    geometry.rotateX(-Math.PI/2);
    return geometry;
}
function createSkyTexture(season){
    const profile=SEASON_PROFILES[season]||SEASON_PROFILES.summer;
    const canvas=document.createElement('canvas');
    canvas.width=16;
    canvas.height=512;
    const context=canvas.getContext('2d');
    const gradient=context.createLinearGradient(0,0,0,512);
    gradient.addColorStop(0,new THREE.Color(profile.skyTop).getStyle());
    gradient.addColorStop(1,new THREE.Color(profile.skyBottom).getStyle());
    context.fillStyle=gradient;
    context.fillRect(0,0,16,512);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=THREE.ClampToEdgeWrapping;
    texture.wrapT=THREE.ClampToEdgeWrapping;
    return texture;
}
function createSky(season){
    const texture=createSkyTexture(season);
    const geometry=new THREE.SphereGeometry(1800,64,32);
    const material=new THREE.MeshBasicMaterial({
        map:texture,
        side:THREE.BackSide,
        depthWrite:false,
        fog:false
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name='environment-sky';
    mesh.frustumCulled=false;
    return {mesh,geometry,material,texture};
}
export function createEnvironmentSystem(initialConfig={}){
    let currentState={
        date:initialConfig.date||'2026-06-21',
        hemisphere:initialConfig.hemisphere||'north',
        weather:initialConfig.weather||'clear',
        location:initialConfig.location||{
            latitude:49.8951,
            longitude:-97.1384,
            timezone:'America/Winnipeg'
        },
        season:'summer'
    };
    currentState.season=getSeason(currentState.date,currentState.hemisphere);
    const group=new THREE.Group();
    group.name='environment-system';
    const textureManager=createTextureRuntime(initialConfig.textureManager);
    const terrainGeometry=createTerrainGeometry();
    const groundMaterial=new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:0.8,
        metalness:0,
        side:THREE.FrontSide
    });
    const groundMesh=new THREE.Mesh(terrainGeometry,groundMaterial);
    groundMesh.name='environment-ground';
    groundMesh.position.set(0,-0.01,0);
    groundMesh.receiveShadow=true;
    group.add(groundMesh);
    let sky=createSky(currentState.season);
    group.add(sky.mesh);
    const hazeGeometry=new THREE.SphereGeometry(1750,48,24);
    const hazeMaterial=new THREE.MeshBasicMaterial({
        color:SEASON_PROFILES[currentState.season].fogColor,
        transparent:true,
        opacity:0.035,
        side:THREE.BackSide,
        depthWrite:false,
        fog:false
    });
    const hazeMesh=new THREE.Mesh(hazeGeometry,hazeMaterial);
    hazeMesh.name='environment-haze';
    hazeMesh.frustumCulled=false;
    group.add(hazeMesh);
    function applyGroundTexture(season){
        const textureName=getGroundTextureName(season);
        const bundle=textureManager.get(textureName);
        if(!bundle?.colorMap)throw new Error(`Ground texture is missing: ${textureName}`);
        if(groundMaterial.map!==bundle.colorMap){
            groundMaterial.map=bundle.colorMap;
            groundMaterial.map.colorSpace=THREE.SRGBColorSpace;
            groundMaterial.map.needsUpdate=true;
        }
        groundMaterial.color.setHex(0xffffff);
        groundMaterial.needsUpdate=true;
    }
    function applySky(season){
        const nextSky=createSky(season);
        const oldSky=sky;
        sky=nextSky;
        group.add(sky.mesh);
        group.remove(oldSky.mesh);
        oldSky.geometry.dispose();
        oldSky.material.dispose();
        oldSky.texture.dispose();
    }
    function applyProfile(season,weather){
        const profile=SEASON_PROFILES[season]||SEASON_PROFILES.summer;
        applyGroundTexture(season);
        groundMaterial.roughness=weather==='rain'?0.3:profile.groundRoughness;
        groundMaterial.metalness=0;
        groundMaterial.needsUpdate=true;
        hazeMaterial.color.setHex(profile.fogColor);
        hazeMaterial.opacity=weather==='fog'?0.11:weather==='cloudy'?0.065:weather==='rain'?0.055:0.035;
        hazeMaterial.needsUpdate=true;
        applySky(season);
    }
    applyProfile(currentState.season,currentState.weather);
    function update(input={}){
        if(input.date!==undefined)currentState.date=input.date;
        if(input.hemisphere!==undefined)currentState.hemisphere=input.hemisphere;
        if(input.weather!==undefined)currentState.weather=input.weather;
        if(input.location!==undefined)currentState.location=input.location;
        currentState.season=getSeason(currentState.date,currentState.hemisphere);
        applyProfile(currentState.season,currentState.weather);
        return getState();
    }
    function updateBounds(buildingBounds){
        if(!buildingBounds?.center)return;
        const x=buildingBounds.center.x;
        const z=buildingBounds.center.z;
        groundMesh.position.x=x;
        groundMesh.position.z=z;
        sky.mesh.position.set(x,0,z);
        hazeMesh.position.set(x,0,z);
    }
    function getState(){
        const profile=SEASON_PROFILES[currentState.season]||SEASON_PROFILES.summer;
        return Object.freeze({
            ...currentState,
            groundProfile:Object.freeze({
                texture:getGroundTextureName(currentState.season),
                color:groundMaterial.color.getHexString(),
                roughness:groundMaterial.roughness
            }),
            atmosphericProfile:Object.freeze({
                fogColor:profile.fogColor,
                fogDensity:profile.fogDensity,
                ambientTint:profile.ambientTint,
                hazeDensity:hazeMaterial.opacity
            })
        });
    }
    function dispose(){
        terrainGeometry.dispose();
        groundMaterial.map=null;
        groundMaterial.dispose();
        sky.geometry.dispose();
        sky.material.dispose();
        sky.texture.dispose();
        hazeGeometry.dispose();
        hazeMaterial.dispose();
        group.clear();
        group.removeFromParent();
    }
    return Object.freeze({
        group,
        update,
        updateBounds,
        getState,
        dispose
    });
}
export { getSeason };