import { serializeModelToURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';
const M_TO_FT=3.28084;
const FT_TO_M=0.3048;
export function createUIAdapter(runtime){
    if(!runtime)throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    let isImperial=true;
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
    function bindActions(){
        const reset=document.querySelector('#btnReset,#btn-reset-camera,#reset-view');
        if(reset)reset.addEventListener('click',()=>runtime.autoFrame());
        const share=document.querySelector('#btnShare,#btn-share,#share-config');
        if(share)share.addEventListener('click',async()=>{
            const config=serializeModelToURL(runtime.model);
            const url=`${window.location.origin}${window.location.pathname}?config=${config}`;
            if(navigator.clipboard)await navigator.clipboard.writeText(url);
            else window.prompt('Copy configuration link:',url);
        });
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
    return Object.freeze({init,updateInputsFromModel,toDisplay,toMeters});
}