import * as THREE from 'three';
import { serializeModelToURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';
import { getBuildingModelDefaults, getBuildingModelLimits } from '../model/buildingModel.js';
const M_TO_FT=3.28084;
const FT_TO_M=0.3048;
const SAVED_DESIGNS_KEY='ubuild_saved_designs';
export function createUIAdapter(runtime){
    if(!runtime)throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    let isImperial=true;
    let savedOutsidePosition=null;
    let savedOutsideTarget=null;
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
    function formatPitchRatio(ratio){
        const pitch12=Number(ratio)*12;
        const formatted=parseFloat(pitch12.toFixed(1)).toString();
        return `${formatted}:12`;
    }
    function parsePitchInput(raw){
        if(raw===undefined||raw===null)return NaN;
        const str=String(raw).trim().replace(/:12$/i,'').trim();
        const num=parseFloat(str);
        if(!Number.isFinite(num))return NaN;
        // If the control is a range slider whose max is a small ratio (≤2),
        // treat the value as pitchRatio directly. Otherwise treat as rise-over-12.
        return num;
    }
    function getPitchLimits(){
        const constraints=window.ConfiguratorBackendConstraints||{};
        const profile=String(runtime.model.roof?.profile||'awr').toLowerCase();
        const roofType=String(runtime.model.roof?.type||'gabled').toLowerCase();
        // Prefer live DOM attributes (set by PHP) when available, then backend constraints.
        const pitchEl=document.getElementById('inputPitch');
        let min=Number(pitchEl?.min);
        let max=Number(pitchEl?.max);
        let step=Number(pitchEl?.step);
        if(!Number.isFinite(min)||min<0)min=Number(constraints.pitch_min??0);
        if(!Number.isFinite(max)||max<=0)max=Number(constraints.pitch_awr_max??constraints.pitch_awr??1);
        if(!Number.isFinite(step)||step<=0)step=Number(constraints.pitch_step??0.001);
        if(profile.includes('ssr')||profile.includes('snap')){
            min=Number(constraints.pitch_ssr24_min??min);
            max=Number(constraints.pitch_ssr24_max??constraints.pitch_ssr24??max);
            step=Number(constraints.pitch_ssr24_step??step);
        }
        // Legacy behaviour: single-slope roofs are limited to a shallower max pitch.
        if(roofType==='left-sloped'||roofType==='right-sloped'){
            max=Math.min(max,Number(constraints.pitch_sloped_max??0.1667));
        }
        if(!Number.isFinite(min)||min<0)min=0;
        if(!Number.isFinite(max)||max<=min)max=1;
        if(!Number.isFinite(step)||step<=0)step=0.001;
        return {min,max,step};
    }
    function updatePitchControls(){
        const ratio=Number(runtime.model.roof?.pitchRatio??0.05);
        const limits=getPitchLimits();
        const value=Math.max(limits.min,Math.min(limits.max,ratio));
        // Range slider always stores the pure pitch ratio (rise / run).
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
        // Text / number inputs show the conventional "X:12" notation.
        const formatted=formatPitchRatio(value);
        setElementVal(['#valPitch','#val-pitch'],formatted);
        const minLabel=document.querySelector('#lblMinPitch');
        const maxLabel=document.querySelector('#lblMaxPitch');
        if(minLabel)minLabel.textContent=formatPitchRatio(limits.min);
        if(maxLabel)maxLabel.textContent=formatPitchRatio(limits.max);
    }
    function updateInputsFromModel(){
        const model=runtime.model;
        const d=model.dimensions;
        // Keep data-current-m authoritative in metres for unit-switch logic.
        const setDim=(sliderId,valId,meters)=>{
            const display=toDisplay(meters);
            setElementVal([`#${sliderId}`,`#${valId}`],display);
            const slider=document.getElementById(sliderId);
            if(slider)slider.setAttribute('data-current-m',meters);
        };
        setDim('inputW','valW',d.width);
        setDim('inputL','valL',d.length);
        setDim('inputH','valH',d.height);
        setElementVal(['#input-width','#slider-width','#val-width','#building-width','#width-ft'],toDisplay(d.width));
        setElementVal(['#input-length','#slider-length','#val-length','#building-length','#length-ft'],toDisplay(d.length));
        setElementVal(['#input-height','#slider-height','#val-height','#building-height','#height-ft'],toDisplay(d.height));
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
    let dimensionToastEl=null;
    let dimensionToastTimer=null;
    function showDimensionToast(message){
        // Restored: legacy checkAspectRatioViolations()/showAspectRatioToast()
        // clamped out-of-range width/height to the system max and warned
        // the user with a Bootstrap toast. The refactor's handleDimensionChange
        // instead let createBuildingModel() throw an uncaught error on
        // out-of-range input, silently leaving the model unchanged with zero
        // user feedback.
        if(!dimensionToastEl){
            let container=document.getElementById('toast-container');
            if(!container){
                container=document.createElement('div');
                container.id='toast-container';
                container.className='toast-container position-fixed bottom-0 end-0 p-3';
                container.style.zIndex='999999';
                document.body.appendChild(container);
            }
            container.insertAdjacentHTML('beforeend',`
                <div id="dimension-limit-toast" class="toast align-items-center text-white bg-dark border-warning shadow" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body small"><span id="dimension-limit-toast-text"></span></div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>`);
            dimensionToastEl=document.getElementById('dimension-limit-toast');
        }
        const textEl=document.getElementById('dimension-limit-toast-text');
        if(textEl)textEl.textContent=message;
        if(window.bootstrap&&window.bootstrap.Toast){
            window.bootstrap.Toast.getOrCreateInstance(dimensionToastEl,{delay:4000}).show();
        }else{
            dimensionToastEl.classList.add('show');
            clearTimeout(dimensionToastTimer);
            dimensionToastTimer=setTimeout(()=>dimensionToastEl.classList.remove('show'),4000);
        }
    }
    function update(patch){
        runtime.update({...runtime.model,...patch});
        updateInputsFromModel();
    }
    function handleDimensionChange(prop,value){
        const meters=toMeters(value);
        if(meters<=0)return;
        // Prefer backend constraints / data-m-max when present, else model LIMITS.
        const constraints=window.ConfiguratorBackendConstraints||{};
        const limitMap={width:'max_width',length:'max_length',height:'max_height'};
        const limits=(getBuildingModelLimits()[prop])||{};
        let maxM=typeof limits.max==='number'?limits.max:Infinity;
        let minM=typeof limits.min==='number'?limits.min:0;
        if(limitMap[prop]&&Number.isFinite(Number(constraints[limitMap[prop]]))){
            maxM=Number(constraints[limitMap[prop]]);
        }
        // Also honour the slider's own data-m-max if tighter.
        const sliderId=prop==='width'?'inputW':prop==='length'?'inputL':prop==='height'?'inputH':null;
        if(sliderId){
            const slider=document.getElementById(sliderId);
            if(slider){
                const dm=parseFloat(slider.getAttribute('data-m-max'));
                if(Number.isFinite(dm)&&dm<maxM)maxM=dm;
                const dmin=parseFloat(slider.getAttribute('data-m-min'));
                if(Number.isFinite(dmin)&&dmin>minM)minM=dmin;
            }
        }
        let clamped=meters;
        let violated=false;
        if(clamped<minM){clamped=minM;violated=true;}
        if(clamped>maxM){clamped=maxM;violated=true;}
        // Keep data-current-m in sync for legacy-style unit switching.
        if(sliderId){
            const slider=document.getElementById(sliderId);
            if(slider)slider.setAttribute('data-current-m',clamped);
        }
        update({dimensions:{...runtime.model.dimensions,[prop]:clamped}});
        if(violated){
            const unit=isImperial?'ft':'m';
            const display=toDisplay(clamped);
            showDimensionToast(`Maximum ${prop} reached (${display} ${unit}).`);
        }
    }
    function handlePitchChange(rawValue,fromSlider){
        const limits=getPitchLimits();
        let ratio;
        if(fromSlider){
            // Slider always emits the pure pitch ratio.
            ratio=parseFloat(rawValue);
        }else{
            // Text input is conventionally "X:12" (or just the rise number).
            const rise=parsePitchInput(rawValue);
            if(!Number.isFinite(rise))return;
            ratio=rise/12;
        }
        if(!Number.isFinite(ratio))return;
        const clamped=Math.max(limits.min,Math.min(limits.max,ratio));
        update({roof:{...runtime.model.roof,pitchRatio:clamped}});
    }
    function bindDimension(ids,prop){
        const elements=document.querySelectorAll(ids);
        elements.forEach(el=>{
            el.addEventListener('input',e=>handleDimensionChange(prop,e.target.value));
            if(el.tagName==='INPUT'&&el.type!=='range')el.addEventListener('change',e=>handleDimensionChange(prop,e.target.value));
        });
    }
    function bindPitch(){
        // Range slider → pitch ratio
        document.querySelectorAll('#inputPitch,#roof-pitch,#slider-pitch').forEach(el=>{
            el.addEventListener('input',e=>handlePitchChange(e.target.value,true));
            el.addEventListener('change',e=>handlePitchChange(e.target.value,true));
        });
        // Text / number → "X:12" notation
        document.querySelectorAll('#valPitch,#val-pitch,select[name="roof-pitch"]').forEach(el=>{
            el.addEventListener('input',e=>handlePitchChange(e.target.value,false));
            el.addEventListener('change',e=>handlePitchChange(e.target.value,false));
        });
        const roofProfile=document.querySelector('#roofProfile');
        if(roofProfile)roofProfile.addEventListener('change',()=>{
            // Profile change may alter max pitch; re-clamp after model update.
            updatePitchControls();
        });
    }
    function bindRoofControls(){
        const roofType=document.querySelector('#roofType');
        if(roofType)roofType.addEventListener('change',e=>{
            update({roof:{...runtime.model.roof,type:e.target.value}});
            // Single-slope roofs have a tighter pitch limit (legacy behaviour).
            updatePitchControls();
        });
        const roofProfile=document.querySelector('#roofProfile');
        if(roofProfile)roofProfile.addEventListener('change',e=>update({roof:{...runtime.model.roof,profile:e.target.value}}));
        const wallProfile=document.querySelector('#wallProfile');
        if(wallProfile)wallProfile.addEventListener('change',e=>update({panels:{...runtime.model.panels,profile:e.target.value}}));
    }
    function bindOverhangs(){
        for(const side of ['front','back','left','right']){
            const suffix=side==='front'?'F':side==='back'?'B':side==='left'?'L':'R';
            const elements=document.querySelectorAll(`#inputOH${suffix},#overhang-${side},#slider-overhang-${side},#val-overhang-${side}`);
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
    function syncDistSlidersToUnit(){
        // Restore legacy dist-slider behaviour: min/max/step and displayed
        // value are expressed in the currently selected unit, while the
        // authoritative value stays in metres on data-current-m (or the model).
        document.querySelectorAll('.dist-slider').forEach(slider=>{
            const mMin=parseFloat(slider.getAttribute('data-m-min'));
            const mMax=parseFloat(slider.getAttribute('data-m-max'));
            const mStep=parseFloat(slider.getAttribute('data-m-step'));
            let currentM=parseFloat(slider.getAttribute('data-current-m'));
            if(!Number.isFinite(currentM)){
                // Fall back to model dimensions when data-current-m is absent.
                const id=slider.id||'';
                if(id.includes('W')||id.includes('width'))currentM=runtime.model.dimensions.width;
                else if(id.includes('L')||id.includes('length'))currentM=runtime.model.dimensions.length;
                else if(id.includes('H')||id.includes('height'))currentM=runtime.model.dimensions.height;
                else currentM=toMeters(slider.value);
            }
            if(Number.isFinite(mMin))slider.min=isImperial?(mMin*M_TO_FT).toFixed(2):mMin.toFixed(2);
            if(Number.isFinite(mMax))slider.max=isImperial?(mMax*M_TO_FT).toFixed(2):mMax.toFixed(2);
            if(Number.isFinite(mStep))slider.step=isImperial?(mStep*M_TO_FT).toFixed(2):mStep.toFixed(2);
            if(Number.isFinite(currentM)){
                const display=isImperial?currentM*M_TO_FT:currentM;
                slider.value=display.toFixed(2);
                slider.setAttribute('data-current-m',currentM);
                const targetId=slider.getAttribute('data-target');
                if(targetId){
                    const target=document.getElementById(targetId);
                    if(target)target.value=display.toFixed(isImperial?1:2);
                }
            }
        });
        // Update the "(Max: …)" labels next to the dimension controls.
        const constraints=window.ConfiguratorBackendConstraints||{};
        const pairs=[
            {lbl:'#lblMaxW',mKey:'max_width',fallback:91.44},
            {lbl:'#lblMaxL',mKey:'max_length',fallback:36.576},
            {lbl:'#lblMaxH',mKey:'max_height',fallback:9.144}
        ];
        for(const {lbl,mKey,fallback} of pairs){
            const el=document.querySelector(lbl);
            if(!el)continue;
            const mVal=Number(constraints[mKey]??fallback);
            el.textContent=isImperial?(mVal*M_TO_FT).toFixed(1):mVal.toFixed(2);
        }
    }
    function bindUnits(){
        const toggle=document.querySelector('#unitToggle,#unit-toggle,#unit-switch,[data-unit],.btn-unit-toggle');
        if(!toggle)return;
        const apply=()=>{
            syncDistSlidersToUnit();
            updateInputsFromModel();
        };
        toggle.addEventListener('change',e=>{
            isImperial=e.target.getAttribute('data-unit')?e.target.getAttribute('data-unit')==='imperial':!e.target.checked;
            apply();
        });
        toggle.addEventListener('click',()=>{
            if(toggle.type==='checkbox')return;
            const requested=toggle.getAttribute('data-unit');
            isImperial=requested?requested==='imperial':!isImperial;
            apply();
        });
    }
    function bindReferenceModels(){
        // Restores legacy external-references-models.js checkbox wiring,
        // which was left completely disconnected in the refactor (the
        // ReferenceModelsOrchestrator existed but nothing ever called it).
        const bc=window.ConfiguratorBackendConstraints||{};
        const modelMapping=[
            {id:'refVehicle',key:'allow_vehicle'},
            {id:'refForklift',key:'allow_forklift'},
            {id:'refAirplane',key:'allow_airplane'},
            {id:'refTruck',key:'allow_truck'}
        ];
        modelMapping.forEach(item=>{
            const checkbox=document.getElementById(item.id);
            if(!checkbox)return;
            const isAllowed=bc[item.key]!==undefined?Boolean(bc[item.key]):true;
            const container=checkbox.closest('.form-check');
            if(container)container.style.display=isAllowed?'block':'none';
            if(!isAllowed)checkbox.checked=false;
        });
        document.querySelectorAll('.ref-model-checkbox').forEach(cb=>{
            cb.addEventListener('change',e=>{
                const fileName=e.target.value;
                runtime.referenceModels.toggle(fileName,e.target.checked);
            });
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
    function createDesignSnapshot(name){
        const model=JSON.parse(JSON.stringify(runtime.model));
        let image=null;
        try{
            runtime.render();
            if(runtime.renderer?.domElement)image=runtime.renderer.domElement.toDataURL('image/jpeg',0.85);
        }catch(error){
            console.warn('Unable to create design preview:',error);
        }
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
    function closeOverlay(id){
        const overlay=document.getElementById(id);
        if(overlay)overlay.remove();
    }
    function loadDesign(design){
        if(!design?.model)return;
        runtime.update(design.model);
        updateInputsFromModel();
        runtime.autoFrame?.();
        closeOverlay('ubuild-gallery-overlay');
        closeOverlay('ubuild-compare-overlay');
    }
    function deleteDesign(id){
        setSavedDesigns(getSavedDesigns().filter(design=>design.id!==id));
        renderGallery();
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
                card.innerHTML=`${img}<div style="padding:15px;"><div style="font-size:18px;font-weight:700;">${design.name||'Unnamed Design'}</div><div style="margin-top:6px;">${toDisplay(d.width)} × ${toDisplay(d.length)} × ${toDisplay(d.height)} ${isImperial?'ft':'m'}</div><div style="color:#64748b;margin-top:5px;">${r.type||'gabled'} · ${(Number(r.pitchRatio||0)*12).toFixed(1)}:12</div><div style="color:#94a3b8;font-size:12px;margin-top:5px;">${design.createdAt?new Date(design.createdAt).toLocaleString():''}</div><div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="btn btn-primary btn-sm" data-load-design="${design.id}">Load</button><button type="button" class="btn btn-danger btn-sm" data-delete-design="${design.id}">Delete</button></div></div>`;
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
            const p=design.model?.panels||{};
            const colors=design.model?.colors||{};
            card.innerHTML=`${design.image?`<img src="${design.image}" style="width:100%;height:260px;object-fit:cover;border-radius:4px;">`:''}<h4 style="margin-top:15px;">${design.name||`Design ${index+1}`}</h4><table class="table table-sm"><tr><td>Width</td><td>${toDisplay(d.width)} ${isImperial?'ft':'m'}</td></tr><tr><td>Length</td><td>${toDisplay(d.length)} ${isImperial?'ft':'m'}</td></tr><tr><td>Height</td><td>${toDisplay(d.height)} ${isImperial?'ft':'m'}</td></tr><tr><td>Roof</td><td>${r.type||'gabled'}</td></tr><tr><td>Pitch</td><td>${(Number(r.pitchRatio||0)*12).toFixed(1)}:12</td></tr><tr><td>Roof Profile</td><td>${r.profile||'—'}</td></tr><tr><td>Wall Profile</td><td>${p.profile||'—'}</td></tr><tr><td>Wall Color</td><td>${colors.wall||'—'}</td></tr><tr><td>Roof Color</td><td>${colors.roof||'—'}</td></tr></table><button type="button" class="btn btn-primary btn-sm" data-load-design="${design.id}">Load Design</button>`;
            card.addEventListener('click',e=>{
                const load=e.target.closest('[data-load-design]');
                if(load)loadDesign(designs.find(x=>x.id===load.getAttribute('data-load-design')));
            });
            grid.appendChild(card);
        });
        content.appendChild(grid);
        overlay.style.display='block';
    }
function bindInsideView(){
    const toggle=document.getElementById('viewInsideToggle');
    if(!toggle)return;
    toggle.addEventListener('change',()=>{
        const camera=runtime.camera;
        const controls=runtime.controls;
        if(!camera||!controls)return;
        if(toggle.checked){
            savedOutsidePosition=camera.position.clone();
            savedOutsideTarget=controls.target.clone();
            const height=Number(runtime.model.dimensions?.height||4.88);
            const length=Number(runtime.model.dimensions?.length||24);
            const eyeHeight=Math.min(1.7,height*0.4);
            const depth=Math.max(0.5,Math.min(2,length*0.08));
            const position=new THREE.Vector3(0,eyeHeight,depth);
            const target=new THREE.Vector3(0,eyeHeight,depth+Math.max(4,length*0.35));
            controls.setView(position,target);
        }else{
            const position=savedOutsidePosition;
            const target=savedOutsideTarget;
            if(position&&target)controls.setView(position,target);
            savedOutsidePosition=null;
            savedOutsideTarget=null;
        }
        runtime.render();
    });
}
    function bindTools(){
        const save=document.getElementById('btnSaveDesign');
        if(save)save.addEventListener('click',e=>{
            e.preventDefault();
            saveDesign();
        });
        const gallery=document.getElementById('btnGallery');
        if(gallery)gallery.addEventListener('click',e=>{
            e.preventDefault();
            renderGallery();
        });
        const share=document.getElementById('btnShare');
        if(share)share.addEventListener('click',async e=>{
            e.preventDefault();
            const config=serializeModelToURL(runtime.model);
            const url=`${window.location.origin}${window.location.pathname}?config=${config}`;
            try{
                if(navigator.clipboard&&window.isSecureContext){
                    await navigator.clipboard.writeText(url);
                    showMessage('Link copied to clipboard.');
                }else{
                    const textarea=document.createElement('textarea');
                    textarea.value=url;
                    textarea.style.position='fixed';
                    textarea.style.opacity='0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    textarea.remove();
                    showMessage('Link copied to clipboard.');
                }
            }catch(error){
                window.prompt('Copy configuration link:',url);
            }
        });
        const help=document.getElementById('btnHelp');
        if(help)help.addEventListener('click',e=>{
            e.preventDefault();
            const popover=document.getElementById('custom-help-popover');
            if(!popover)return;
            popover.classList.toggle('custom-popover-hidden');
            popover.style.display=popover.classList.contains('custom-popover-hidden')?'none':'block';
        });
        const closeHelp=document.getElementById('btnCloseHelp');
        if(closeHelp)closeHelp.addEventListener('click',e=>{
            e.preventDefault();
            const popover=document.getElementById('custom-help-popover');
            if(!popover)return;
            popover.classList.add('custom-popover-hidden');
            popover.style.display='none';
        });
        const compare=document.getElementById('btnCompare');
        if(compare)compare.addEventListener('click',e=>{
            e.preventDefault();
            renderCompare();
        });
        const reset=document.getElementById('btnReset');
        if(reset)reset.addEventListener('click',e=>{
            e.preventDefault();
            // Legacy initResetFeature() reset the ENTIRE design (dimensions,
            // roof, colors, wainscot, overhangs, mezzanine/crane/driveway,
            // openings, reference models) after a confirm() prompt - not
            // just the camera. That got reduced to a camera-only reset
            // during the refactor; restored here using the model's own
            // defaults instead of re-scraping the DOM like legacy did.
            if(!window.confirm('Are you sure you want to reset the current design?'))return;

            const toggle=document.getElementById('viewInsideToggle');
            if(toggle)toggle.checked=false;
            savedOutsidePosition=null;
            savedOutsideTarget=null;

            document.querySelectorAll('.ref-model-checkbox').forEach(cb=>{cb.checked=false;});
            if(runtime.referenceModels)runtime.referenceModels.clearAll();

            runtime.update(getBuildingModelDefaults());
            updateInputsFromModel();
            runtime.autoFrame();
        });
    }
    function bindInformationNotice(){
        const information=document.getElementById('information');
        if(!information)return;
        const alert=information.querySelector('.alert');
        if(!alert)return;
        setTimeout(()=>{
            alert.style.transition='opacity .5s ease';
            alert.style.opacity='0';
            setTimeout(()=>information.remove(),500);
        },3000);
    }
    function bindActions(){
        bindTools();
        bindInsideView();
        bindInformationNotice();
        const quote=document.querySelector('#custom-gform-submit,#btn-quote-submit');
        if(quote)quote.addEventListener('click',e=>{
            e.preventDefault();
            const shareUrl=`${window.location.origin}${window.location.pathname}?config=${serializeModelToURL(runtime.model)}`;
            submitToGravityForms({
                formId:4,
                snapshotFieldId:15,
                specFieldId:16,
                model:runtime.model,
                geometry:runtime.geometry,
                renderer:runtime.renderer,
                fieldMap:{widthFieldId:13,lengthFieldId:14,heightFieldId:12,urlFieldId:10,shareUrl}
            });
        });
        const quoteModal=document.getElementById('quoteModal');
        if(quoteModal)quoteModal.addEventListener('show.bs.modal',()=>{
            // Legacy populated the thumbnail preview when the Bootstrap
            // modal opened (show.bs.modal), not only on final submit.
            const thumbImg=document.getElementById('summary-building-thumb');
            const fallbackIcon=document.getElementById('summary-building-fallback');
            if(thumbImg&&runtime.renderer&&runtime.scene&&runtime.camera){
                runtime.renderer.render(runtime.scene,runtime.camera);
                thumbImg.src=runtime.renderer.domElement.toDataURL('image/jpeg',0.85);
                thumbImg.style.display='block';
                if(fallbackIcon)fallbackIcon.style.display='none';
            }
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
        bindReferenceModels();
        bindActions();
        // Ensure slider ranges & max labels match the current unit system
        // and that pitch controls are correctly formatted before first paint.
        syncDistSlidersToUnit();
        updateInputsFromModel();
    }
    return Object.freeze({init,updateInputsFromModel,toDisplay,toMeters,saveDesign,renderGallery,renderCompare});
}