import * as THREE from 'three';
function assertLoader(loader){
    if(!loader||typeof loader.load!=='function')throw new TypeError('Texture loader must provide load()');
}
function resolveTextureUrl(source){
    if(!source)return null;
    if(/^(https?:)?\/\//i.test(source)||source.startsWith('data:')||source.startsWith('blob:'))return source;
    const base=typeof window!=='undefined'?window.UBUILD_CONFIG?.themeUrl:null;
    if(!base)return source;
    return `${base.replace(/\/$/,'')}/${source.replace(/^\/+/,'')}`;
}
function configureTexture(texture,definition,colorTexture){
    texture.wrapS=THREE.RepeatWrapping;
    texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(definition.repeat.x,definition.repeat.y);
    texture.rotation=definition.rotation;
    texture.anisotropy=16;
    texture.colorSpace=colorTexture?THREE.SRGBColorSpace:THREE.NoColorSpace;
    return texture;
}
function loadTexture(loader,source,definition,colorTexture,onLoaded,onError){
    if(!source)return null;
    const url=resolveTextureUrl(source);
    const texture=loader.load(
        url,
        loadedTexture=>{
            configureTexture(loadedTexture,definition,colorTexture);
            loadedTexture.needsUpdate=true;
            if(typeof onLoaded==='function')onLoaded(loadedTexture,url);
        },
        undefined,
        error=>{
            if(typeof onError==='function')onError(error,url);
        }
    );
    configureTexture(texture,definition,colorTexture);
    texture.userData=texture.userData||{};
    texture.userData.source=url;
    texture.userData.isUBuildManagedTexture=true;
    return texture;
}
export function createTextureManager({loader,catalog,onTextureLoaded,onTextureError}){
    assertLoader(loader);
    if(!catalog||typeof catalog!=='object')throw new TypeError('Texture catalog is required');
    const textures=new Map();
    function get(name){
        if(!catalog[name])throw new RangeError(`Unknown texture: ${name}`);
        if(textures.has(name))return textures.get(name);
        const definition=catalog[name];
        const bundle=Object.freeze({
            colorMap:loadTexture(loader,definition.colorMap,definition,true,onTextureLoaded,onTextureError),
            normalMap:loadTexture(loader,definition.normalMap,definition,false,onTextureLoaded,onTextureError),
            bumpMap:loadTexture(loader,definition.bumpMap,definition,false,onTextureLoaded,onTextureError),
            roughnessMap:loadTexture(loader,definition.roughnessMap,definition,false,onTextureLoaded,onTextureError)
        });
        textures.set(name,bundle);
        return bundle;
    }
    function has(name){
        return textures.has(name);
    }
    function clear(name){
        const bundle=textures.get(name);
        if(!bundle)return;
        disposeBundle(bundle);
        textures.delete(name);
    }
    function clearAll(){
        for(const bundle of textures.values())disposeBundle(bundle);
        textures.clear();
    }
    function disposeBundle(bundle){
        const disposed=new Set();
        for(const texture of Object.values(bundle)){
            if(!texture||disposed.has(texture))continue;
            texture.dispose();
            disposed.add(texture);
        }
    }
    function getLoadedNames(){
        return [...textures.keys()];
    }
    return Object.freeze({
        get,
        has,
        clear,
        clearAll,
        getLoadedNames,
        resolveTextureUrl
    });
}