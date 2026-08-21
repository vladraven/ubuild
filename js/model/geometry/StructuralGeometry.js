const DEFAULTS=Object.freeze({frameSpacing:6.096,girtSpacing:1.524,purlinSpacing:1.524});
const FRAME_BEAM=0.18;
const GIRT_BEAM=0.08;
const PURLIN_BEAM=0.08;
const END_COLUMN_BEAM=0.14;
const CLEARANCE=0.002;
function point(x,y,z){return Object.freeze({x,y,z});}
function line(start,end){return Object.freeze({start,end,length:Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z)});}
function createPositions(start,end,spacing){
    if(!Number.isFinite(spacing)||spacing<=0)throw new RangeError('Structural spacing must be greater than zero');
    if(end<start)throw new RangeError('Structural interval end must not precede start');
    const positions=[start];
    let current=start;
    while(current+spacing<end){
        current+=spacing;
        positions.push(current);
    }
    if(Math.abs(positions[positions.length-1]-end)>1e-9)positions.push(end);
    return positions;
}
function createFrame(envelope,roof,z,index,wallThickness){
    const halfWidth=envelope.width/2;
    const baseHeight=envelope.height;
    const wallOffset=wallThickness/2+FRAME_BEAM/2+CLEARANCE;
    const leftX=-halfWidth+wallOffset;
    const rightX=halfWidth-wallOffset;
    const leftBase=point(leftX,0,z);
    const rightBase=point(rightX,0,z);
    const leftTop=point(leftX,baseHeight,z);
    const rightTop=point(rightX,baseHeight,z);
    if(roof.type==='gabled'){
        const ridge=point(0,baseHeight+roof.rise,z);
        return Object.freeze({index,position:z,leftColumn:line(leftBase,leftTop),leftRafter:line(leftTop,ridge),rightRafter:line(ridge,rightTop),rightColumn:line(rightTop,rightBase)});
    }
    if(roof.type==='left-sloped'){
        const leftHighTop=point(leftX,baseHeight+roof.rise,z);
        return Object.freeze({index,position:z,leftColumn:line(leftBase,leftHighTop),rafter:line(leftHighTop,rightTop),rightColumn:line(rightTop,rightBase)});
    }
    const rightHighTop=point(rightX,baseHeight+roof.rise,z);
    return Object.freeze({index,position:z,leftColumn:line(leftBase,leftTop),rafter:line(leftTop,rightHighTop),rightColumn:line(rightHighTop,rightBase)});
}
function resolveOpeningInterval(opening){
    const center=opening.x??0;
    const width=opening.dimensions?.width??opening.width??0;
    if(!Number.isFinite(center)||!Number.isFinite(width)||width<=0)return null;
    return Object.freeze({min:center-width/2,max:center+width/2});
}
function splitSpan(start,end,y,openings,side){
    if(end<=start)return [];
    const cuts=openings.filter(op=>op.side===side).filter(op=>Number.isFinite(op.bounds?.min?.y)&&Number.isFinite(op.bounds?.max?.y)&&y>=op.bounds.min.y&&y<=op.bounds.max.y).map(resolveOpeningInterval).filter(Boolean).map(cut=>({min:Math.max(start,cut.min),max:Math.min(end,cut.max)})).filter(cut=>cut.max>cut.min).sort((a,b)=>a.min-b.min);
    if(cuts.length===0)return [Object.freeze({start,end})];
    const merged=[];
    for(const cut of cuts){
        const previous=merged[merged.length-1];
        if(!previous||cut.min>previous.max){
            merged.push({min:cut.min,max:cut.max});
        }else{
            previous.max=Math.max(previous.max,cut.max);
        }
    }
    const result=[];
    let current=start;
    for(const cut of merged){
        if(cut.min>current)result.push(Object.freeze({start:current,end:cut.min}));
        current=Math.max(current,cut.max);
        if(current>=end)break;
    }
    if(current<end)result.push(Object.freeze({start:current,end}));
    return result;
}
function createSideSegments(side,y,envelope,roof,openings,wallThickness){
    const halfWidth=envelope.width/2;
    const length=envelope.length;
    const wallOffset=wallThickness/2+GIRT_BEAM/2+CLEARANCE;
    const halfSpan=halfWidth-wallOffset;
    const zFront=wallThickness/2+GIRT_BEAM/2+CLEARANCE;
    const zBack=length-wallThickness/2-GIRT_BEAM/2-CLEARANCE;
    const xLeft=-halfWidth+wallThickness/2+GIRT_BEAM/2+CLEARANCE;
    const xRight=halfWidth-wallThickness/2-GIRT_BEAM/2-CLEARANCE;
    const currentHalfW=getGableHalfWidthAtHeight(y,envelope,roof);
    if(side==='F'){
        const span=Math.min(currentHalfW,halfSpan);
        return splitSpan(-span,span,y,openings,'F').map(item=>line(point(item.start,y,zFront),point(item.end,y,zFront)));
    }
    if(side==='B'){
        const span=Math.min(currentHalfW,halfSpan);
        return splitSpan(-span,span,y,openings,'B').map(item=>line(point(item.start,y,zBack),point(item.end,y,zBack)));
    }
    if(side==='L'){
        return splitSpan(wallOffset,length-wallOffset,y,openings,'L').map(item=>line(point(xLeft,y,item.start),point(xLeft,y,item.end)));
    }
    return splitSpan(wallOffset,length-wallOffset,y,openings,'R').map(item=>line(point(xRight,y,item.start),point(xRight,y,item.end)));
}
function getGableHalfWidthAtHeight(y,envelope,roof){
    const halfWidth=envelope.width/2;
    const baseHeight=envelope.height;
    if(y<=baseHeight)return halfWidth;
    if(roof.type!=='gabled')return halfWidth;
    const fraction=Math.min(1,Math.max(0,(y-baseHeight)/roof.rise));
    return Math.max(0,halfWidth*(1-fraction));
}
function createGirts(spacing,openings,envelope,roof,wallThickness){
    const baseHeight=envelope.height;
    const maxHeight=roof.type==='gabled'?baseHeight+roof.rise:baseHeight;
    const elevations=createPositions(spacing,maxHeight-spacing/2,spacing);
    return Object.freeze(elevations.map((y,index)=>Object.freeze({
        index,
        elevation:y,
        frontSegments:Object.freeze(createSideSegments('F',y,envelope,roof,openings,wallThickness)),
        backSegments:Object.freeze(createSideSegments('B',y,envelope,roof,openings,wallThickness)),
        leftSegments:Object.freeze(y<=baseHeight?createSideSegments('L',y,envelope,roof,openings,wallThickness):[]),
        rightSegments:Object.freeze(y<=baseHeight?createSideSegments('R',y,envelope,roof,openings,wallThickness):[])
    })));
}
function createPurlins(envelope,roof,spacing){
    const halfWidth=envelope.width/2;
    const length=envelope.length;
    const baseHeight=envelope.height;
    const rise=roof.rise;
    const result=[];
    const underRoof=PURLIN_BEAM/2+CLEARANCE;
    if(roof.type==='gabled'){
        const count=Math.max(2,Math.round(Math.hypot(halfWidth,rise)/spacing)+1);
        for(let i=1;i<count;i++){
            const t=i/count;
            const xLeft=-halfWidth+t*halfWidth;
            const xRight=halfWidth-t*halfWidth;
            const roofY=baseHeight+t*rise;
            const y=roofY-underRoof;
            result.push(Object.freeze({index:result.length,planes:Object.freeze({
                left:line(point(xLeft,y,0),point(xLeft,y,length)),
                right:line(point(xRight,y,0),point(xRight,y,length))
            })}));
        }
    }else if(roof.type==='left-sloped'){
        const count=Math.max(2,Math.round(Math.hypot(envelope.width,rise)/spacing)+1);
        for(let i=1;i<count;i++){
            const t=i/count;
            const x=-halfWidth+t*envelope.width;
            const roofY=baseHeight+rise-t*rise;
            const y=roofY-underRoof;
            result.push(Object.freeze({index:result.length,plane:line(point(x,y,0),point(x,y,length))}));
        }
    }else{
        const count=Math.max(2,Math.round(Math.hypot(envelope.width,rise)/spacing)+1);
        for(let i=1;i<count;i++){
            const t=i/count;
            const x=-halfWidth+t*envelope.width;
            const roofY=baseHeight+t*rise;
            const y=roofY-underRoof;
            result.push(Object.freeze({index:result.length,plane:line(point(x,y,0),point(x,y,length))}));
        }
    }
    return Object.freeze(result);
}
function createEndWallColumns(envelope,roof,wallThickness){
    const halfWidth=envelope.width/2;
    const length=envelope.length;
    const quarterWidth=halfWidth/2;
    const baseHeight=envelope.height;
    const wallOffset=wallThickness/2+END_COLUMN_BEAM/2+CLEARANCE;
    const frontZ=wallOffset;
    const backZ=length-wallOffset;
    const topHeight=roof.type==='gabled'?baseHeight+roof.rise/2:baseHeight;
    return Object.freeze([
        Object.freeze({
            side:'F',
            left:line(point(-quarterWidth,0,frontZ),point(-quarterWidth,topHeight,frontZ)),
            right:line(point(quarterWidth,0,frontZ),point(quarterWidth,topHeight,frontZ))
        }),
        Object.freeze({
            side:'B',
            left:line(point(-quarterWidth,0,backZ),point(-quarterWidth,topHeight,backZ)),
            right:line(point(quarterWidth,0,backZ),point(quarterWidth,topHeight,backZ))
        })
    ]);
}
export function createStructuralGeometry(model,buildingGeometry,options={}){
    if(!model||!buildingGeometry?.walls||!buildingGeometry?.roof||!buildingGeometry?.envelope)throw new TypeError('BuildingModel, envelope, walls, and roof geometry are required');
    const roof=buildingGeometry.roof;
    const walls=buildingGeometry.walls;
    const openings=buildingGeometry.openings??[];
    const envelope=buildingGeometry.envelope;
    const wallThickness=model.walls?.thickness??walls.front?.thickness??0.1;
    const frameSpacing=options.frameSpacing??DEFAULTS.frameSpacing;
    const girtSpacing=options.girtSpacing??DEFAULTS.girtSpacing;
    const purlinSpacing=options.purlinSpacing??DEFAULTS.purlinSpacing;
    const framePositions=createPositions(0,envelope.length,frameSpacing);
    const frames=framePositions.map((z,index)=>createFrame(envelope,roof,z,index,wallThickness));
    const girts=createGirts(girtSpacing,openings,envelope,roof,wallThickness);
    const purlins=createPurlins(envelope,roof,purlinSpacing);
    const endWallColumns=createEndWallColumns(envelope,roof,wallThickness);
    return Object.freeze({
        frames:Object.freeze(frames),
        girts,
        purlins,
        endWallColumns
    });
}