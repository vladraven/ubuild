import { serializeModelToURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';
const M_TO_FT=3.28084;
const FT_TO_M=0.3048;
export function createUIAdapter(runtime){
    if(!runtime)throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    let isImperial=true;
    let savedCameraPosition=null;
    let savedCameraTarget=null;
    const initialModel=clone(runtime.model);
    function clone(value){
        if(typeof structuredClone==='function')return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }
    function toDisplay(meters){
        if(meters===undefined||meters===null)return 0;
        return isImperial?(meters*M_TO_FT).toFixed(1):Number(meters).toFixed(2);
    }
    function toMeters(value){
        const num=parseFloat(value);
        if(!Number.isFinite(num))return 0;
        return isImperial?num*FT_TO_M:num;
    }
    function setElementVal(selectors,value){
        for(const selector of selectors){
            const element=document.querySelector(selector);
            if(!element)continue;
            element.value=value;
            if(element.tagName==='SPAN'||element.tagName==='B')element.textContent=value;
        }
    }
    function setElementChecked(selectors,value){
        for(const selector of selectors){
            const element=document.querySelector(selector);
            if(element&&element.type==='checkbox')element.checked=value;
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
            const element=document.querySelector(selector);
            if(!element||element.type!=='range')continue;
            element.min=limits.min;
            element.max=limits.max;
            element.step=limits.step;
            element.value=value;
        }
        const minLabel=document.querySelector('#lblMinPitch');
        const maxLabel=document.querySelector('#lblMaxPitch');
        if(minLabel)minLabel.textContent=`${Number((limits.min*12).toFixed(2)).toString()}:12`;
        if(maxLabel)maxLabel.textContent=`${Number((limits.max*12).toFixed(2)).toString()}:12`;
    }
    function updateInputsFromModel(){
        const model=runtime.model;
        const dimensions=model.dimensions||{};
        setElementVal(['#inputW','#valW','#input-width','#slider-width','#val-width','#building-width','#width-ft'],toDisplay(dimensions.width));
        setElementVal(['#inputL','#valL','#input-length','#slider-length','#val-length','#building-length','#length-ft'],toDisplay(dimensions.length));
        setElementVal(['#inputH','#valH','#input-height','#slider-height','#val-height','#building-height','#height-ft'],toDisplay(dimensions.height));
        document.querySelectorAll('.value-unit,.unit-label').forEach(element=>element.textContent=isImperial?'ft':'m');
        updatePitchControls();
        const roof=model.roof||{};
        const panels=model.panels||{};
        setElementVal(['#roofType','select[name="roof-type"]'],roof.type||'gabled');
        setElementVal(['#roofProfile','select[name="roof-profile"]'],roof.profile||'awr');
        setElementVal(['#wallProfile','select[name="wall-profile"]'],panels.profile||'awr');
        document.querySelectorAll('[data-roof-type],.roof-type-btn').forEach(element=>{
            const type=element.getAttribute('data-roof-type')||element.value;
            element.classList.toggle('active',type===roof.type);
        });
        const overhangs=roof.overhangs||{};
        setElementVal(['#inputOHF','#valOHF','#overhang-front','#val-overhang-front','#overF','#overF_val'],toDisplay(overhangs.front||0));
        setElementVal(['#inputOHB','#valOHB','#overhang-back','#val-overhang-back','#overB','#overB_val'],toDisplay(overhangs.back||0));
        setElementVal(['#inputOHL','#valOHL','#overhang-left','#val-overhang-left','#overL','#overL_val'],toDisplay(overhangs.left||0));
        setElementVal(['#inputOHR','#valOHR','#overhang-right','#val-overhang-right','#overR','#overR_val'],toDisplay(overhangs.right||0));
        const wainscotHeight=panels.wainscotHeight||0;
        setElementVal(['#inputWS','#valWS','#inputWSHeight','#wainscot-height','#slider-wainscot-height','#val-wainscot-height'],toDisplay(wainscotHeight));
        setElementChecked(['#wainscotToggle','#toggle-wainscot','#wainscot-toggle','#wainscotEn'],wainscotHeight>0);
        if(model.colors){
            for(const[key,value]of Object.entries(model.colors)){
                const suffix=key.charAt(0).toUpperCase()+key.slice(1);
                setElementVal([`#color${suffix}`,`#color-${key}`,`[data-color-input="${key}"]`],value);
            }
        }
        if(model.visibility){
            for(const[key,value]of Object.entries(model.visibility)){
                const suffix=key.charAt(0).toUpperCase()+key.slice(1);
                setElementChecked([`#check${suffix}`,`#vis-${key}`,`[data-vis="${key}"]`],value!==false);
            }
        }
        updateSidebarSummary();
    }
    function update(patch){
        runtime.update({...runtime.model,...patch});
        updateInputsFromModel();
    }
    function updateDimensions(prop,value){
        const meters=toMeters(value);
        if(meters<=0)return;
        update({dimensions:{...runtime.model.dimensions,[prop]:meters}});
    }
    function updatePitch(value){
        const pitch12=Number(value);
        if(!Number.isFinite(pitch12))return;
        const limits=getPitchLimits();
        const clamped=Math.max(limits.min*12,Math.min(limits.max*12,pitch12));
        update({roof:{...runtime.model.roof,pitchRatio:clamped/12}});
    }
    function bindDimension(selectors,prop){
        document.querySelectorAll(selectors).forEach(element=>{
            element.addEventListener('input',event=>updateDimensions(prop,event.target.value));
            element.addEventListener('change',event=>updateDimensions(prop,event.target.value));
        });
    }
    function bindPitch(){
        document.querySelectorAll('#inputPitch,#valPitch,#roof-pitch,#slider-pitch,#val-pitch,select[name="roof-pitch"]').forEach(element=>{
            element.addEventListener('input',event=>updatePitch(event.target.value));
            element.addEventListener('change',event=>updatePitch(event.target.value));
        });
    }
    function bindRoof(){
        const roofType=document.querySelector('#roofType');
        if(roofType)roofType.addEventListener('change',event=>update({roof:{...runtime.model.roof,type:event.target.value}}));
        const roofProfile=document.querySelector('#roofProfile');
        if(roofProfile)roofProfile.addEventListener('change',event=>update({roof:{...runtime.model.roof,profile:event.target.value}}));
        const wallProfile=document.querySelector('#wallProfile');
        if(wallProfile)wallProfile.addEventListener('change',event=>update({panels:{...runtime.model.panels,profile:event.target.value}}));
    }
    function bindOverhangs(){
        const map={front:'F',back:'B',left:'L',right:'R'};
        for(const side of Object.keys(map)){
            const suffix=map[side];
            document.querySelectorAll(`#inputOH${suffix},#valOH${suffix},#overhang-${side},#slider-overhang-${side},#val-overhang-${side},#over${suffix},#over${suffix}_val`).forEach(element=>{
                element.addEventListener('input',event=>update({roof:{...runtime.model.roof,overhangs:{...runtime.model.roof.overhangs,[side]:toMeters(event.target.value)}}}));
                element.addEventListener('change',event=>update({roof:{...runtime.model.roof,overhangs:{...runtime.model.roof.overhangs,[side]:toMeters(event.target.value)}}}));
            });
        }
    }
    function bindWainscot(){
        const toggle=document.querySelector('#wainscotToggle,#toggle-wainscot,#wainscot-toggle,#wainscotEn');
        if(toggle)toggle.addEventListener('change',event=>update({panels:{...runtime.model.panels,wainscotHeight:event.target.checked?runtime.model.panels.wainscotHeight||0.9144:0},visibility:{...runtime.model.visibility,wainscot:event.target.checked}}));
        document.querySelectorAll('#inputWS,#valWS,#inputWSHeight,#wainscot-height,#slider-wainscot-height,#val-wainscot-height').forEach(element=>{
            element.addEventListener('input',event=>update({panels:{...runtime.model.panels,wainscotHeight:toMeters(event.target.value)}}));
            element.addEventListener('change',event=>update({panels:{...runtime.model.panels,wainscotHeight:toMeters(event.target.value)}}));
        });
    }
    function resolveColorTarget(element){
        const explicit=element.getAttribute('data-color-target');
        if(explicit)return explicit;
        const id=element.id||'';
        if(id.startsWith('color'))return id.replace(/^color/,'').replace(/^-/,'').toLowerCase();
        return null;
    }
    function bindColors(){
        document.querySelectorAll('input[type="color"],select[data-color-target],select[id^="color"]').forEach(element=>{
            const target=resolveColorTarget(element);
            if(!target)return;
            const apply=event=>update({colors:{...runtime.model.colors,[target]:event.target.value}});
            element.addEventListener('input',apply);
            element.addEventListener('change',apply);
        });
        document.querySelectorAll('.color-swatch,.color-btn').forEach(element=>element.addEventListener('click',()=>{
            const color=element.getAttribute('data-color')||element.getAttribute('data-hex');
            const target=element.getAttribute('data-target')||'wall';
            if(color)update({colors:{...runtime.model.colors,[target]:color}});
        }));
    }
    function bindVisibility(){
        document.querySelectorAll('[id^="check"],[id^="vis-"],[data-vis]').forEach(element=>{
            if(element.type!=='checkbox')return;
            const key=element.getAttribute('data-vis')||element.id.replace(/^check/,'').replace(/^vis-/,'').toLowerCase();
            element.addEventListener('change',event=>update({visibility:{...runtime.model.visibility,[key]:event.target.checked}}));
        });
    }
    function bindUnits(){
        const toggle=document.querySelector('#unitToggle,#unit-toggle,#unit-switch,[data-unit],.btn-unit-toggle');
        if(!toggle)return;
        toggle.addEventListener('change',event=>{
            const requested=toggle.getAttribute('data-unit');
            isImperial=requested?requested==='imperial':!event.target.checked;
            updateInputsFromModel();
        });
    }
    function stopCameraAutoRotation(){
        if(runtime.controls?.autoRotate)runtime.controls.autoRotate=false;
    }
    function getCameraTarget(){
        return runtime.controls?.target||null;
    }
    function saveCameraState(){
        if(!runtime.camera)return;
        savedCameraPosition=runtime.camera.position.clone();
        const target=getCameraTarget();
        savedCameraTarget=target?target.clone():null;
    }
    function restoreCameraState(){
        if(!runtime.camera)return;
        if(savedCameraPosition)runtime.camera.position.copy(savedCameraPosition);
        const target=getCameraTarget();
        if(target&&savedCameraTarget)target.copy(savedCameraTarget);
        runtime.controls?.update();
        runtime.renderer?.render(runtime.scene,runtime.camera);
    }
    function bindInsideView(){
        const toggle=document.getElementById('viewInsideToggle');
        if(!toggle)return;
        toggle.addEventListener('change',event=>{
            stopCameraAutoRotation();
            if(!runtime.camera||!runtime.controls)return;
            if(event.target.checked){
                saveCameraState();
                const height=Number(runtime.model.dimensions?.height||4.8768);
                runtime.controls.target.set(0,height*0.4,0);
                runtime.camera.position.set(0,Math.min(1.7,height*0.35),0.1);
            }else{
                restoreCameraState();
                if(!savedCameraPosition){
                    runtime.controls.target.set(0,0,0);
                    runtime.camera.position.set(30,20,30);
                }
            }
            runtime.controls.update();
            runtime.renderer?.render(runtime.scene,runtime.camera);
        });
    }
    function createShareUrl(){
        const config=serializeModelToURL(runtime.model);
        return `${window.location.origin}${window.location.pathname}?config=${config}`;
    }
    function fallbackCopy(text){
        const textarea=document.createElement('textarea');
        textarea.value=text;
        textarea.style.position='fixed';
        textarea.style.opacity='0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        let success=false;
        try{success=document.execCommand('copy');}catch(error){}
        textarea.remove();
        if(!success)window.prompt('Copy your configuration link:',text);
        return success;
    }
    async function copyShareLink(){
        const url=createShareUrl();
        try{
            if(navigator.clipboard&&window.isSecureContext){
                await navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
                return;
            }
        }catch(error){}
        fallbackCopy(url);
    }
    function buildThumbnail(){
        if(!runtime.renderer||!runtime.scene||!runtime.camera)return '';
        runtime.renderer.render(runtime.scene,runtime.camera);
        try{return runtime.renderer.domElement.toDataURL('image/jpeg',0.85);}catch(error){return '';}
    }
    function collectSavedDesign(){
        return {
            id:Date.now(),
            name:'',
            thumbnail:buildThumbnail(),
            created:new Date().toISOString(),
            model:clone(runtime.model),
            url:createShareUrl()
        };
    }
    function saveDesign(){
        const name=window.prompt('Enter design name:','My Design');
        if(!name)return;
        const design=collectSavedDesign();
        design.name=name;
        const designs=JSON.parse(localStorage.getItem('configurator_designs')||'[]');
        designs.push(design);
        localStorage.setItem('configurator_designs',JSON.stringify(designs));
        alert('Design saved successfully!');
    }
    function deleteSavedDesign(id){
        const designs=JSON.parse(localStorage.getItem('configurator_designs')||'[]').filter(design=>String(design.id)!==String(id));
        localStorage.setItem('configurator_designs',JSON.stringify(designs));
        loadGallery();
    }
    function loadSavedDesign(id){
        const designs=JSON.parse(localStorage.getItem('configurator_designs')||'[]');
        const design=designs.find(item=>String(item.id)===String(id));
        if(!design?.model)return;
        update(clone(design.model));
        const gallery=document.getElementById('gallery-overlay');
        if(gallery)gallery.remove();
    }
    function loadGallery(){
        let overlay=document.getElementById('gallery-overlay');
        if(!overlay){
            overlay=document.createElement('div');
            overlay.id='gallery-overlay';
            overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.96);z-index:999998;overflow-y:auto;padding:30px;box-sizing:border-box;';
            document.body.appendChild(overlay);
        }
        const designs=JSON.parse(localStorage.getItem('configurator_designs')||'[]');
        overlay.innerHTML=`
            <div class="d-flex justify-content-between align-items-center pb-3 mb-4 border-bottom border-secondary text-white">
                <h3 class="m-0"><i class="bi bi-images me-2"></i>Saved Designs Gallery</h3>
                <button id="btnCloseGallery" class="btn btn-outline-light btn-sm"><i class="bi bi-x-lg"></i> Close</button>
            </div>
            <div id="galleryGrid" class="row g-4"></div>`;
        const grid=overlay.querySelector('#galleryGrid');
        if(!designs.length){
            grid.innerHTML='<div class="col-12"><div class="alert alert-secondary">No saved designs.</div></div>';
        }else{
            designs.forEach(design=>{
                const col=document.createElement('div');
                col.className='col-12 col-md-6 col-lg-4';
                const card=document.createElement('div');
                card.className='card bg-dark text-white border-secondary h-100';
                card.innerHTML=`
                    <img src="${design.thumbnail||''}" class="card-img-top" style="height:200px;object-fit:cover;" alt="">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(design.name||'Unnamed Design')}</h5>
                        <div class="small text-white-50 mb-3">${new Date(design.created||Date.now()).toLocaleString()}</div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-sm flex-fill" data-load="${design.id}">Load</button>
                            <button class="btn btn-outline-danger btn-sm" data-delete="${design.id}">Delete</button>
                        </div>
                    </div>`;
                card.querySelector('[data-load]').addEventListener('click',()=>loadSavedDesign(design.id));
                card.querySelector('[data-delete]').addEventListener('click',()=>{
                    if(window.confirm('Delete this saved design?'))deleteSavedDesign(design.id);
                });
                col.appendChild(card);
                grid.appendChild(col);
            });
        }
        overlay.querySelector('#btnCloseGallery').addEventListener('click',()=>overlay.remove());
    }
    function escapeHtml(value){
        return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
    }
    function loadCompare(){
        let overlay=document.getElementById('compare-overlay');
        if(!overlay){
            overlay=document.createElement('div');
            overlay.id='compare-overlay';
            overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.96);z-index:999999;overflow-y:auto;padding:30px;box-sizing:border-box;';
            document.body.appendChild(overlay);
        }
        const designs=JSON.parse(localStorage.getItem('configurator_designs')||'[]');
        overlay.innerHTML=`
            <div class="d-flex justify-content-between align-items-center pb-3 mb-4 border-bottom border-secondary text-white">
                <h3 class="m-0"><i class="bi bi-columns-gap me-2"></i>Compare Saved Designs</h3>
                <button id="btnCloseCompare" class="btn btn-outline-light btn-sm"><i class="bi bi-x-lg"></i> Close</button>
            </div>
            <div id="compareGrid" class="row g-4"></div>`;
        const grid=overlay.querySelector('#compareGrid');
        if(!designs.length){
            grid.innerHTML='<div class="col-12"><div class="alert alert-secondary">No saved designs to compare. Please save some designs first.</div></div>';
        }else{
            designs.forEach(design=>{
                const dimensions=design.model?.dimensions||{};
                const roof=design.model?.roof||{};
                const col=document.createElement('div');
                col.className='col-12 col-md-6 col-lg-4';
                col.innerHTML=`
                    <div class="card bg-dark text-white border-secondary p-3 h-100">
                        <h5 class="text-center border-bottom border-secondary pb-2">${escapeHtml(design.name||'Unnamed Design')}</h5>
                        <img src="${design.thumbnail||''}" class="rounded my-2" style="width:100%;height:200px;object-fit:cover;" alt="">
                        <ul class="list-unstyled small text-white-50" style="line-height:1.6;">
                            <li><b>Width:</b> ${Number(dimensions.width||0).toFixed(2)} m</li>
                            <li><b>Length:</b> ${Number(dimensions.length||0).toFixed(2)} m</li>
                            <li><b>Height:</b> ${Number(dimensions.height||0).toFixed(2)} m</li>
                            <li><b>Roof:</b> ${escapeHtml(roof.type||'gabled')}</li>
                            <li><b>Pitch:</b> ${(Number(roof.pitchRatio||0)*12).toFixed(2)}:12</li>
                            <li><b>Roof Profile:</b> ${escapeHtml(roof.profile||'awr')}</li>
                            <li><b>Wall Profile:</b> ${escapeHtml(design.model?.panels?.profile||'awr')}</li>
                        </ul>
                    </div>`;
                grid.appendChild(col);
            });
        }
        overlay.querySelector('#btnCloseCompare').addEventListener('click',()=>overlay.remove());
    }
    function resetDesign(){
        if(!window.confirm('Are you sure you want to reset the current design?'))return;
        stopCameraAutoRotation();
        update(clone(initialModel));
        if(runtime.camera&&runtime.controls){
            runtime.camera.position.set(30,20,30);
            runtime.controls.target.set(0,0,0);
            runtime.controls.update();
        }
        const inside=document.getElementById('viewInsideToggle');
        if(inside)inside.checked=false;
        updateInputsFromModel();
        runtime.autoFrame?.();
    }
    function bindHelp(){
        const button=document.getElementById('btnHelp');
        const popover=document.getElementById('custom-help-popover');
        const close=document.getElementById('btnCloseHelp');
        if(!button||!popover)return;
        button.addEventListener('click',event=>{
            event.preventDefault();
            popover.classList.toggle('custom-popover-hidden');
            popover.classList.toggle('custom-popover-visible');
        });
        close?.addEventListener('click',event=>{
            event.preventDefault();
            popover.classList.add('custom-popover-hidden');
            popover.classList.remove('custom-popover-visible');
        });
    }
    function bindInformationNotice(){
        const information=document.getElementById('information');
        if(!information)return;
        const alert=information.querySelector('.alert');
        if(!alert)return;
        window.setTimeout(()=>{
            alert.style.transition='opacity 1s ease';
            alert.style.opacity='0';
            window.setTimeout(()=>information.remove(),1000);
        },3000);
    }
    function bindTopTools(){
        document.getElementById('btnSaveDesign')?.addEventListener('click',event=>{
            event.preventDefault();
            saveDesign();
        });
        document.getElementById('btnGallery')?.addEventListener('click',event=>{
            event.preventDefault();
            loadGallery();
        });
        document.getElementById('btnShare')?.addEventListener('click',event=>{
            event.preventDefault();
            copyShareLink();
        });
        document.getElementById('btnHelp')?.addEventListener('click',event=>{
            event.preventDefault();
        });
    }
    function bindViewerControls(){
        document.getElementById('btnCompare')?.addEventListener('click',event=>{
            event.preventDefault();
            loadCompare();
        });
        document.getElementById('btnReset')?.addEventListener('click',event=>{
            event.preventDefault();
            resetDesign();
        });
        bindInsideView();
    }
    function bindActions(){
        bindTopTools();
        bindViewerControls();
        bindHelp();
        const quote=document.querySelector('#custom-gform-submit,#btn-quote-submit');
        if(quote)quote.addEventListener('click',event=>{
            event.preventDefault();
            submitToGravityForms({formId:4,snapshotFieldId:15,specFieldId:16,model:runtime.model,geometry:runtime.geometry,renderer:runtime.renderer});
        });
    }
    function updateSidebarSummary(){
        const dimensions=runtime.model.dimensions||{};
        const roof=runtime.model.roof||{};
        const dimensionElement=document.getElementById('sidebar-summary-dimensions');
        const roofElement=document.getElementById('sidebar-summary-roof');
        if(dimensionElement)dimensionElement.textContent=`${toDisplay(dimensions.width)} ${isImperial?'ft':'m'} x ${toDisplay(dimensions.length)} ${isImperial?'ft':'m'} x ${toDisplay(dimensions.height)} ${isImperial?'ft':'m'}`;
        if(roofElement)roofElement.textContent=`${roof.type||'Gabled'} Roof`;
    }
    function bindAccordion(){
        document.querySelectorAll('.custom-accordion-header').forEach(header=>{
            header.addEventListener('click',event=>{
                event.preventDefault();
                header.parentElement.classList.toggle('active');
            });
        });
    }
    function bindFormControls(){
        const inputFile=document.getElementById('input_4_15');
        const dropzone=document.getElementById('custom-dropzone');
        const browse=document.getElementById('btn-custom-browse');
        const selected=document.getElementById('selected-file-name');
        const text=document.getElementById('dropzone-text');
        if(inputFile){
            inputFile.addEventListener('change',()=>{
                const file=inputFile.files?.[0];
                if(!file)return;
                if(selected){
                    selected.textContent=`Selected: ${file.name}`;
                    selected.style.display='block';
                }
                if(text)text.textContent='File Attached Successfully';
            });
        }
        browse?.addEventListener('click',event=>{
            event.stopPropagation();
            inputFile?.click();
        });
        dropzone?.addEventListener('click',()=>inputFile?.click());
        dropzone?.addEventListener('dragover',event=>{
            event.preventDefault();
            dropzone.style.backgroundColor='#f1f5f9';
        });
        dropzone?.addEventListener('dragleave',()=>dropzone.style.backgroundColor='#ffffff');
        dropzone?.addEventListener('drop',event=>{
            event.preventDefault();
            dropzone.style.backgroundColor='#ffffff';
            if(!inputFile||!event.dataTransfer.files?.length)return;
            inputFile.files=event.dataTransfer.files;
            const file=inputFile.files[0];
            if(selected){
                selected.textContent=`Selected: ${file.name}`;
                selected.style.display='block';
            }
            if(text)text.textContent='File Attached Successfully';
            if(typeof gformValidateFileSize==='function')gformValidateFileSize(inputFile,268435456);
        });
    }
    function init(){
        bindDimension('#inputW,#sliderW,#valW,#input-width,#slider-width,#val-width,#building-width,#width-ft','width');
        bindDimension('#inputL,#sliderL,#valL,#input-length,#slider-length,#val-length,#building-length,#length-ft','length');
        bindDimension('#inputH,#sliderH,#valH,#input-height,#slider-height,#val-height,#building-height,#height-ft','height');
        bindPitch();
        bindRoof();
        bindOverhangs();
        bindWainscot();
        bindColors();
        bindVisibility();
        bindUnits();
        bindActions();
        bindAccordion();
        bindFormControls();
        bindInformationNotice();
        updateInputsFromModel();
    }
    return Object.freeze({
        init,
        updateInputsFromModel,
        toDisplay,
        toMeters,
        saveDesign,
        loadGallery,
        loadCompare,
        resetDesign,
        copyShareLink
    });
}