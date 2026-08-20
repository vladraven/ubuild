document.addEventListener('DOMContentLoaded',()=>{
    const formWrapper=document.querySelector('.gform_wrapper');
    if(!formWrapper)return;
    applyFormClasses(formWrapper);
    bindDropzone();
    bindSubmit();
    bindAccordion();
    runFormFixes();
    startObserver();
});
function applyClasses(element,className){
    if(!element.classList.contains(className))element.classList.add(className,'rounded-0');
}
function applyFormClasses(root){
    root.querySelectorAll('select').forEach(element=>applyClasses(element,'form-select'));
    root.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"],input[type="number"],input[type="url"],textarea').forEach(element=>applyClasses(element,'form-control'));
}
function bindDropzone(){
    const input=document.getElementById('input_4_15');
    const zone=document.getElementById('custom-dropzone');
    const browse=document.getElementById('btn-custom-browse');
    const name=document.getElementById('selected-file-name');
    const text=document.getElementById('dropzone-text');
    if(!input)return;
    const update=file=>{
        if(!file)return;
        if(name){
            name.textContent=`Selected: ${file.name}`;
            name.style.display='block';
        }
        if(text)text.textContent='File Attached Successfully';
    };
    if(browse)browse.addEventListener('click',event=>{
        event.stopPropagation();
        input.click();
    });
    if(zone)zone.addEventListener('click',()=>input.click());
    input.addEventListener('change',()=>update(input.files?.[0]));
    if(zone){
        zone.addEventListener('dragover',event=>{
            event.preventDefault();
            zone.style.backgroundColor='#f1f5f9';
        });
        zone.addEventListener('dragleave',()=>zone.style.backgroundColor='#ffffff');
        zone.addEventListener('drop',event=>{
            event.preventDefault();
            zone.style.backgroundColor='#ffffff';
            if(!event.dataTransfer.files?.length)return;
            input.files=event.dataTransfer.files;
            update(input.files[0]);
            if(typeof gformValidateFileSize==='function')gformValidateFileSize(input,268435456);
        });
    }
}
function bindSubmit(){
    const button=document.getElementById('custom-gform-submit');
    if(!button)return;
    button.addEventListener('click',event=>{
        event.preventDefault();
        const form=document.getElementById('gform_4');
        if(!form)return;
        if(typeof jQuery!=='undefined')jQuery(form).trigger('submit');
        else form.submit();
    });
}
function bindAccordion(){
    document.querySelectorAll('.custom-accordion-header').forEach(header=>header.addEventListener('click',()=>header.parentElement.classList.toggle('active')));
}
function runFormFixes(){
    restrictDateDropdown();
    addRequiredAsterisk();
    removeAsterisksFromLegends();
    wrapLabelText();
    populateUTMFields();
}
function startObserver(){
    const wrapper=document.querySelector('.gform_wrapper');
    if(!wrapper||wrapper.__ubuildObserver)return;
    const observer=new MutationObserver(mutations=>{
        let changed=false;
        mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{
            if(node.nodeType!==1||node.classList?.contains('required-asterisk')||node.classList?.contains('label-text-wrapper'))return;
            changed=true;
            if(node.matches?.('select'))applyClasses(node,'form-select');
            if(node.matches?.('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),textarea'))applyClasses(node,'form-control');
            node.querySelectorAll?.('select').forEach(element=>applyClasses(element,'form-select'));
            node.querySelectorAll?.('input[type="text"],input[type="number"],input[type="email"],input[type="tel"],textarea').forEach(element=>applyClasses(element,'form-control'));
        }));
        if(changed)runFormFixes();
    });
    observer.observe(wrapper,{childList:true,subtree:true});
    wrapper.__ubuildObserver=observer;
}
function restrictDateDropdown(){
    const select=document.getElementById('input_4_16_3');
    if(!select)return;
    const currentYear=new Date().getFullYear();
    const maxYear=currentYear+5;
    Array.from(select.options).forEach(option=>{
        if(option.value==='')return;
        const year=parseInt(option.value,10);
        if(year<currentYear||year>maxYear)option.remove();
    });
    if(!select.value)select.value=String(currentYear);
}
function addRequiredAsterisk(){
    const ids=['input_4_1_3','input_4_5_1','input_4_1_6','input_4_5_3','input_4_5_4','input_4_5_5','input_4_5_6'];
    ids.forEach(id=>{
        const label=document.querySelector(`label[for="${id}"]`);
        if(label&&!label.querySelector('.required-asterisk')){
            const marker=document.createElement('span');
            marker.className='required-asterisk';
            marker.textContent='*';
            marker.style.cssText='color:red;margin-left:2px;';
            label.appendChild(marker);
        }
    });
}
function removeAsterisksFromLegends(){
    document.querySelectorAll('.gform_wrapper legend').forEach(legend=>{
        const text=legend.textContent||'';
        if(/\s*\*\s*/.test(text))legend.textContent=text.replace(/\s*\*\s*/g,'');
    });
}
function wrapLabelText(){
    const target='Desired Project Start Date';
    document.querySelectorAll('.gform_wrapper legend').forEach(label=>{
        if(label.querySelector('.label-text-wrapper')||!label.textContent.includes(target))return;
        const nodes=Array.from(label.childNodes);
        nodes.forEach(node=>{
            if(node.nodeType!==Node.TEXT_NODE||!node.textContent.includes(target))return;
            const parts=node.textContent.split(target);
            const fragment=document.createDocumentFragment();
            if(parts[0])fragment.appendChild(document.createTextNode(parts[0]));
            const span=document.createElement('span');
            span.className='label-text-wrapper d-block small specs';
            span.textContent=target;
            fragment.appendChild(span);
            if(parts[1])fragment.appendChild(document.createTextNode(parts[1]));
            node.replaceWith(fragment);
        });
    });
}
function populateUTMFields(){
    const params=new URLSearchParams(window.location.search);
    const map={utm_campaign:'input_4_17',utm_source:'input_4_18',utm_medium:'input_4_19',utm_content:'input_4_20'};
    Object.entries(map).forEach(([parameter,id])=>{
        if(!params.has(parameter))return;
        const input=document.getElementById(id);
        if(input)input.value=params.get(parameter);
    });
}
if(typeof jQuery!=='undefined'){
    jQuery(document).on('gform_confirmation_loaded',(event,formId)=>{
        if(Number(formId)!==4)return;
        const sidebar=document.getElementById('summary-sidebar');
        if(sidebar)sidebar.style.display='none';
    });
}