import { serializeModelToURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';
const M_TO_FT=3.28084;
const FT_TO_M=0.3048;
const SAVED_DESIGNS_KEY='ubuild_saved_designs';
export function createUIAdapter(runtime){
    if(!runtime)throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    let isImperial=true;
    let savedOutsidePosition=null;
    let savedOutsideTarget=null;
    let insideView=false;
    function toDisplay(meters){
        if(meters===undefined||meters===null)return 0;
        return isImperial?(meters*M_TO_FT).toFixed(1):Number(meters).toFixed(2);
    }
    function toMeters(val){
        const num=parseFloat(val);
        if(!Number.isFinite(num))return 0;
        return isImperial?num*FT_TO_M:num;
    }
    function setElementVal(selectors,val){
        for(const s of selectors){
            const el=document.querySelector(s);
            if(!el)continue;
            el.value=val;
            if(el.tagName==='SPAN'||el.tagName==='B')el.textContent=val;
        }
    }
    function setElementChecked(selectors,checked){
        for(const s of selectors){
            const el=document.querySelector(s);
            if(el&&el.type==='checkbox')el.checked=checked;
        }
    }
    function getPitchLimits(){
        const constraints=window.ConfiguratorBackendConstraints||{};
        const profile=String(runtime.model.roof?.profile||'awr').toLowerCase();
        let min=Number(constraints.pitch_min??0.25);
        let max=Number(constraints.pitch_awr_max??constraints.pitch_awr??1);
        let step=Number(constraints.pitch_step??1/12);
        if(profile.includes('ssr')||profile.includes('snap')){
            min=Number(constraints.pitch_ssr24_min??min);
            max=Number(constraints.pitch_ssr24_max??constraints.pitch_ssr24??max);
            step=Number(constraints.pitch_ssr24_step??step);
        }
        if(!Number.isFinite(min)||min<=0)min=0.25;
        if(!Number.isFinite(max)||max<=min)max=1;
        if(!Number.isFinite(step)||step<=0)step=1/12;
        return {min,max,step};
    }
    function updatePitchControls(){
        const ratio=Number(runtime.model.roof?.pitchRatio??2/12);
        const limits=getPitchLimits();
        const value=Math.max(limits.min,Math.min(limits.max,ratio));
        const pitch12=value*12;
        setElementVal(['#inputPitch','#valPitch','#roof-pitch','#slider-pitch','#val-pitch'],Number(pitch12.toFixed(2)));
        for(const selector of ['#inputPitch','#roof-pitch','#slider-pitch']){
            const el=document.querySelector(selector);
            if(!el)continue;
            if(el.type==='range'){
                el.min=limits.min;
                el.max=limits.max;
                el.step=limits.step;
                el.value=value;
            }
        }
        const minLabel=document.querySelector('#lblMinPitch');
        const maxLabel=document.querySelector('#lblMaxPitch');
        if(minLabel)minLabel.textContent=`${(limits.min*12).toFixed(1).replace('.0','')}:12`;
        if(maxLabel)maxLabel.textContent=`${(limits.max*12).toFixed(1).replace('.0','')}:12`;
    }
    function updateInputsFromModel(){
        const model=runtime.model;
        const d=model.dimensions;
        setElementVal(['#inputW','#valW','#input-width','#slider-width','#val-width','#building-width','#width-ft'],toDisplay(d.width));
        setElementVal(['#inputL','#valL','#input-length','#slider-length','#val-length','#building-length','#length-ft'],toDisplay(d.length));
        setElementVal(['#inputH','#valH','#input-height','#slider-height','#val-height','#building-height','#height-ft'],toDisplay(d.height));
        document.querySelectorAll('.value-unit,.unit-label').forEach(el=>el.textContent=isImperial?'ft':'m');
        updatePitchControls();
        const roofType=model.roof?.type||'gabled';
        const roofProfile=model.roof?.profile||'awr';
        const wallProfile=model.panels?.profile||'awr';
        document.querySelectorAll('[data-roof-type],.roof-type-btn').forEach(btn=>{
            const type=btn.getAttribute('data-roof-type')||btn.value;
            btn.classList.toggle('active',type===roofType);
        });
        setElementVal(['#roofType','select[name="roof-type"]'],roofType);
        setElementVal(['#roofProfile','select[name="roof-profile"]'],roofProfile);
        setElementVal(['#wallProfile','select[name="wall-profile"]'],wallProfile);
        const ov=model.roof?.overhangs||{};
        setElementVal(['#inputOHF','#valOHF','#overhang-front','#val-overhang-front'],toDisplay(ov.front||0));
        setElementVal(['#inputOHB','#valOHB','#overhang-back','#val-overhang-back'],toDisplay(ov.back||0));
        setElementVal(['#inputOHL','#valOHL','#overhang-left','#val-overhang-left'],toDisplay(ov.left||0));
        setElementVal(['#inputOHR','#valOHR','#overhang-right','#val-overhang-right'],toDisplay(ov.right||0));
        const wsHeight=model.panels?.wainscotHeight||0;
        setElementVal(['#inputWS','#valWS','#wainscot-height','#slider-wainscot-height','#val-wainscot-height'],toDisplay(wsHeight));
        setElementChecked(['#wainscotToggle','#toggle-wainscot','#wainscot-toggle'],wsHeight>0);
        if(model.colors){
            for(const[key,hex]of Object.entries(model.colors)){
                setElementVal([`#color${key.charAt(0).toUpperCase()+key.slice(1)}`,`#color-${key}`,`[data-color-input="${key}"]`],hex);
            }
        }
        if(model.visibility){
            for(const[key,val]of Object.entries(model.visibility)){
                const id=`#check${key.charAt(0).toUpperCase()+key.slice(1)}`;
                setElementChecked([id,`#vis-${key}`,`[data-vis="${key}"]`],val!==false);
            }
        }
    }
    function update(patch){
        runtime.update({...runtime.model,...patch});
        updateInputsFromModel();
    }
    function handleDimensionChange(prop,value){
        const meters=toMeters(value);
        if(meters<=0)return;
        update({dimensions:{...runtime.model.dimensions,[prop]:meters}});
    }
    function handlePitchChange(value){
        const pitch12=parseFloat(value);
        if(!Number.isFinite(pitch12))return;
        const limits=getPitchLimits();
        const clamped=Math.max(limits.min*12,Math.min(limits.max*12,pitch12));
        update({roof:{...runtime.model.roof,pitchRatio:clamped/12}});
    }
    function bindDimension(ids,prop){
        const elements=document.querySelectorAll(ids);
        elements.forEach(el=>{
            el.addEventListener('input',e=>handleDimensionChange(prop,e.target.value));
            if(el.tagName==='INPUT'&&el.type!=='range')el.addEventListener('change',e=>handleDimensionChange(prop,e.target.value));
        });
    }
    function bindPitch(){
        const elements=document.querySelectorAll('#inputPitch,#valPitch,#roof-pitch,#slider-pitch,#val-pitch,select[name="roof-pitch"]');
        elements.forEach(el=>{
            el.addEventListener('input',e=>handlePitchChange(e.target.value));
            el.addEventListener('change',e=>handlePitchChange(e.target.value));
        });
        const roofProfile=document.querySelector('#roofProfile');
        if(roofProfile)roofProfile.addEventListener('change',updatePitchControls);
    }
    function bindRoofControls(){
        const roofType=document.querySelector('#roofType');
        if(roofType)roofType.addEventListener('change',e=>update({roof:{...runtime.model.roof,type:e.target.value}}));
        const roofProfile=document.querySelector('#roofProfile');
        if(roofProfile)roofProfile.addEventListener('change',e=>update({roof:{...runtime.model.roof,profile:e.target.value}}));
        const wallProfile=document.querySelector('#wallProfile');
        if(wallProfile)wallProfile.addEventListener('change',e=>update({panels:{...runtime.model.panels,profile:e.target.value}}));
    }
    function bindOverhangs(){
        for(const side of ['front','back','left','right']){
            const elements=document.querySelectorAll(`#inputOH${side==='front'?'F':side==='back'?'B':side==='left'?'L':'R'},#overhang-${side},#slider-overhang-${side},#val-overhang-${side}`);
            elements.forEach(el=>el.addEventListener('input',e=>update({roof:{...runtime.model.roof,overhangs:{...runtime.model.roof.overhangs,[side]:toMeters(e.target.value)}}})));
        }
    }
    function bindWainscot(){
        const toggle=document.querySelector('#wainscotToggle,#toggle-wainscot,#wainscot-toggle');
        if(toggle)toggle.addEventListener('change',e=>update({panels:{...runtime.model.panels,wainscotHeight:e.target.checked?0.9144:0},visibility:{...runtime.model.visibility,wainscot:e.target.checked}}));
        const height=document.querySelector('#inputWS,#wainscot-height,#slider-wainscot-height,#val-wainscot-height');
        if(height)height.addEventListener('input',e=>update({panels:{...runtime.model.panels,wainscotHeight:toMeters(e.target.value)}}));
    }
    function bindColors(){
        document.querySelectorAll('input[type="color"],[data-color-target]').forEach(input=>{
            const target=input.getAttribute('data-color-target')||input.id.replace(/^color/,'').replace(/^-/,'').toLowerCase();
            input.addEventListener('input',e=>runtime.update({...runtime.model,colors:{...runtime.model.colors,[target]:e.target.value}}));
            input.addEventListener('change',e=>runtime.update({...runtime.model,colors:{...runtime.model.colors,[target]:e.target.value}}));
        });
        document.querySelectorAll('.color-swatch,.color-btn').forEach(btn=>btn.addEventListener('click',()=>{
            const hex=btn.getAttribute('data-color')||btn.getAttribute('data-hex');
            const target=btn.getAttribute('data-target')||'wall';
            if(hex)runtime.update({...runtime.model,colors:{...runtime.model.colors,[target]:hex}});
        }));
    }
    function bindVisibility(){
        document.querySelectorAll('[id^="check"],[id^="vis-"],[data-vis]').forEach(el=>{
            const key=el.getAttribute('data-vis')||el.id.replace(/^check/,'').replace(/^vis-/,'').toLowerCase();
            if(el.type!=='checkbox')return;
            el.addEventListener('change',e=>runtime.update({...runtime.model,visibility:{...runtime.model.visibility,[key]:e.target.checked}}));
        });
    }
    function bindUnits(){
        const toggle=document.querySelector('#unitToggle,#unit-toggle,#unit-switch,[data-unit],.btn-unit-toggle');
        if(!toggle)return;
        toggle.addEventListener('change',e=>{isImperial=e.target.getAttribute('data-unit')?e.target.getAttribute('data-unit')==='imperial':!e.target.checked;updateInputsFromModel();});
        toggle.addEventListener('click',e=>{
            if(toggle.type==='checkbox')return;
            const requested=toggle.getAttribute('data-unit');
            isImperial=requested?requested==='imperial':!isImperial;
            updateInputsFromModel();
        });
    }
    function getSavedDesigns(){
        try{
            const data=JSON.parse(localStorage.getItem(SAVED_DESIGNS_KEY)||'[]');
            return Array.isArray(data)?data:[];
        }catch{
            return [];
        }
    }
    function setSavedDesigns(designs){
        localStorage.setItem(SAVED_DESIGNS_KEY,JSON.stringify(designs));
    }
 
    function createDesignSnapshot(name){
        const model=JSON.parse(JSON.stringify(runtime.model));
        let image=null;
        try{
            runtime.render();
            if(runtime.renderer?.domElement)image=runtime.renderer.domElement.toDataURL('image/jpeg',0.85);
        }catch{}
        return {
            id:`design-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
            name,
            createdAt:new Date().toISOString(),
            model,
            image
        };
    }
    function saveDesign(){
        const designs=getSavedDesigns();
        let name=window.prompt('Enter a unique name for this design:','My Design');
        if(name===null)return;
        name=name.trim();
        if(!name){
            showMessage('Design name is required.');
            return;
        }
        if(designs.some(design=>String(design.name||'').trim().toLowerCase()===name.toLowerCase())){
            showMessage('A design with this name already exists.');
            return;
        }
        designs.unshift(createDesignSnapshot(name));
        setSavedDesigns(designs.slice(0,50));
        showMessage(`Design "${name}" saved.`);
    }
    function showMessage(message){
        let el=document.getElementById('ubuild-ui-message');
        if(!el){
            el=document.createElement('div');
            el.id='ubuild-ui-message';
            el.style.cssText='position:fixed;right:20px;bottom:20px;z-index:1000000;background:#198754;color:#fff;padding:10px 16px;border-radius:4px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.2);';
            document.body.appendChild(el);
        }
        el.textContent=message;
        el.style.display='block';
        clearTimeout(el._timer);
        el._timer=setTimeout(()=>el.style.display='none',2500);
    }
    function loadDesign(design){
        if(!design?.model)return;
        runtime.update(design.model);
        updateInputsFromModel();
        if(runtime.autoFrame)runtime.autoFrame();
        closeOverlay('ubuild-gallery-overlay');
        closeOverlay('ubuild-compare-overlay');
    }
    function deleteDesign(id){
        setSavedDesigns(getSavedDesigns().filter(d=>d.id!==id));
        renderGallery();
        renderCompare();
    }
    function createOverlay(id,title){
        let overlay=document.getElementById(id);
        if(!overlay){
            overlay=document.createElement('div');
            overlay.id=id;
            overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.96);z-index:999999;overflow:auto;padding:30px;display:none;box-sizing:border-box;';
            overlay.innerHTML=`<div style="max-width:1200px;margin:0 auto;color:#fff;"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #475569;padding-bottom:15px;margin-bottom:20px;"><h3 style="margin:0;">${title}</h3><button type="button" data-close-overlay="${id}" class="btn btn-outline-light btn-sm">Close</button></div><div data-overlay-content></div></div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click',e=>{
                const close=e.target.closest('[data-close-overlay]');
                if(close)closeOverlay(close.getAttribute('data-close-overlay'));
            });
        }
        return overlay;
    }
    function closeOverlay(id){
        const overlay=document.getElementById(id);
        if(overlay)overlay.style.display='none';
    }
    function renderGallery(){
        const overlay=createOverlay('ubuild-gallery-overlay','Saved Designs');
        const content=overlay.querySelector('[data-overlay-content]');
        const designs=getSavedDesigns();
        content.innerHTML='';
        if(!designs.length){
            content.innerHTML='<div class="alert alert-secondary">No saved designs.</div>';
        }else{
            const grid=document.createElement('div');
            grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;';
            designs.forEach(design=>{
                const card=document.createElement('div');
                card.style.cssText='background:#fff;color:#111;border-radius:6px;overflow:hidden;';
                const img=design.image?`<img src="${design.image}" style="width:100%;height:160px;object-fit:cover;">`:'<div style="height:160px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;">No preview</div>';
				const d=design.model?.dimensions||{};
				const r=design.model?.roof||{};
				card.innerHTML=`${img}<div style="padding:15px;"><div style="font-size:18px;font-weight:700;">${design.name||'Unnamed Design'}</div><div style="margin-top:6px;">${toDisplay(d.width)} × ${toDisplay(d.length)} × ${toDisplay(d.height)} ${isImperial?'ft':'m'}</div><div style="color:#64748b;margin-top:5px;">${r.type||'gabled'} · ${(Number(r.pitchRatio||0)*12).toFixed(1)}:12</div><div style="color:#94a3b8;font-size:12px;margin-top:5px;">${new Date(design.createdAt).toLocaleString()}</div><div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="btn btn-primary btn-sm" data-load-design="${design.id}">Load</button><button type="button" class="btn btn-danger btn-sm" data-delete-design="${design.id}">Delete</button></div></div>`;
                card.addEventListener('click',e=>{
                    const load=e.target.closest('[data-load-design]');
                    const del=e.target.closest('[data-delete-design]');
                    if(load)loadDesign(designs.find(x=>x.id===load.getAttribute('data-load-design')));
                    if(del)deleteDesign(del.getAttribute('data-delete-design'));
                });
                grid.appendChild(card);
            });
            content.appendChild(grid);
        }
        overlay.style.display='block';
    }
    function renderCompare(){
        const overlay=createOverlay('ubuild-compare-overlay','Compare Saved Designs');
        const content=overlay.querySelector('[data-overlay-content]');
        const designs=getSavedDesigns();
        content.innerHTML='';
        if(designs.length<2){
            content.innerHTML='<div class="alert alert-warning">Save at least two designs to compare them.</div>';
            overlay.style.display='block';
            return;
        }
        const grid=document.createElement('div');
        grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;';
        designs.slice(0,2).forEach((design,index)=>{
            const card=document.createElement('div');
            card.style.cssText='background:#fff;color:#111;border-radius:6px;padding:15px;';
            const d=design.model?.dimensions||{};
            const r=design.model?.roof||{};
            const colors=design.model?.colors||{};
            card.innerHTML=`${design.image?`<img src="${design.image}" style="width:100%;height:260px;object-fit:cover;border-radius:4px;">`:''}<h4 style="margin-top:15px;">Design ${index+1}</h4><table class="table table-sm"><tr><td>Width</td><td>${toDisplay(d.width)} ${isImperial?'ft':'m'}</td></tr><tr><td>Length</td><td>${toDisplay(d.length)} ${isImperial?'ft':'m'}</td></tr><tr><td>Height</td><td>${toDisplay(d.height)} ${isImperial?'ft':'m'}</td></tr><tr><td>Roof</td><td>${r.type||'gabled'}</td></tr><tr><td>Pitch</td><td>${(Number(r.pitchRatio||0)*12).toFixed(1)}:12</td></tr><tr><td>Wall</td><td>${colors.wall||'—'}</td></tr><tr><td>Roof color</td><td>${colors.roof||'—'}</td></tr></table><button type="button" class="btn btn-primary btn-sm" data-load-design="${design.id}">Load Design</button>`;
            card.addEventListener('click',e=>{
                const load=e.target.closest('[data-load-design]');
                if(load)loadDesign(designs.find(x=>x.id===load.getAttribute('data-load-design')));
            });
            grid.appendChild(card);
        });
        content.appendChild(grid);
        overlay.style.display='block';
    }
    function toggleHelp(){
        const popover=document.getElementById('custom-help-popover');
        if(!popover)return;
        popover.classList.toggle('custom-popover-hidden');
        if(!popover.classList.contains('custom-popover-hidden')){
            popover.style.display='block';
        }else{
            popover.style.display='none';
        }
    }
    function bindTools(){
        const save=document.querySelector('#btnSaveDesign');
        if(save)save.addEventListener('click',e=>{e.preventDefault();saveDesign();});
        const gallery=document.querySelector('#btnGallery');
        if(gallery)gallery.addEventListener('click',e=>{e.preventDefault();renderGallery();});
        const share=document.querySelector('#btnShare,#btn-share,#share-config');
        if(share)share.addEventListener('click',async e=>{
            e.preventDefault();
            e.stopPropagation();
            try{
                const config=serializeModelToURL(runtime.model);
                const url=`${window.location.origin}${window.location.pathname}?config=${config}`;
                if(navigator.clipboard&&window.isSecureContext){
                    await navigator.clipboard.writeText(url);
                    showMessage('Link copied to clipboard.');
                }else{
                    const textarea=document.createElement('textarea');
                    textarea.value=url;
                    textarea.style.cssText='position:fixed;left:-9999px;top:0;';
                    document.body.appendChild(textarea);
                    textarea.select();
                    const copied=document.execCommand('copy');
                    textarea.remove();
                    if(copied)showMessage('Link copied to clipboard.');
                    else window.prompt('Copy configuration link:',url);
                }
            }catch(error){
                console.error('Share failed:',error);
                window.prompt('Copy configuration link:',`${window.location.origin}${window.location.pathname}?config=${serializeModelToURL(runtime.model)}`);
            }
        });
        const help=document.querySelector('#btnHelp');
        if(help)help.addEventListener('click',e=>{e.preventDefault();toggleHelp();});
        const closeHelp=document.querySelector('#btnCloseHelp');
        if(closeHelp)closeHelp.addEventListener('click',e=>{e.preventDefault();const p=document.getElementById('custom-help-popover');if(p){p.classList.add('custom-popover-hidden');p.style.display='none';}});
        const inside=document.querySelector('#viewInsideToggle');
        if(inside)inside.addEventListener('change',e=>{
            const camera=runtime.camera;
            const controls=runtime.controls;
            if(!camera||!controls)return;
            if(e.target.checked){
                savedOutsidePosition=camera.position.clone();
                savedOutsideTarget=controls.target.clone();
                insideView=true;
                const h=Number(runtime.model.dimensions?.height||4.88);
                controls.target.set(0,h*0.4,0);
                camera.position.set(0,1.7,0.1);
            }else{
                insideView=false;
                if(savedOutsidePosition&&savedOutsideTarget){
                    camera.position.copy(savedOutsidePosition);
                    controls.target.copy(savedOutsideTarget);
                }else if(runtime.autoFrame){
                    runtime.autoFrame();
                }
            }
            controls.update();
            runtime.render();
        });
        const compare=document.querySelector('#btnCompare');
        if(compare)compare.addEventListener('click',e=>{e.preventDefault();renderCompare();});
        const reset=document.querySelector('#btnReset');
        if(reset)reset.addEventListener('click',e=>{
            e.preventDefault();
            insideView=false;
            if(inside)inside.checked=false;
            if(runtime.autoFrame)runtime.autoFrame();
            else runtime.render();
        });
    }
    function bindActions(){
        bindTools();
        const quote=document.querySelector('#custom-gform-submit,#btn-quote-submit');
        if(quote)quote.addEventListener('click',e=>{
            e.preventDefault();
            submitToGravityForms({formId:4,snapshotFieldId:15,specFieldId:16,model:runtime.model,geometry:runtime.geometry,renderer:runtime.renderer});
        });
    }
	
    function init(){
        bindDimension('#inputW,#sliderW,#valW,#input-width,#slider-width,#val-width,#building-width,#width-ft','width');
        bindDimension('#inputL,#sliderL,#valL,#input-length,#slider-length,#val-length,#building-length,#length-ft','length');
        bindDimension('#inputH,#sliderH,#valH,#input-height,#slider-height,#val-height,#building-height,#height-ft','height');
        bindPitch();
        bindRoofControls();
        bindOverhangs();
        bindWainscot();
        bindColors();
        bindVisibility();
        bindUnits();
        bindActions();
        updateInputsFromModel();
    }
    return Object.freeze({init,updateInputsFromModel,toDisplay,toMeters,saveDesign,renderGallery,renderCompare});
}