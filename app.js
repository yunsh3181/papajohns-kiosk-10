const app=document.getElementById('app');
const money=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n))+'원';
const state={step:'home',orderType:null,promo:null,dough:null,size:null,crust:null,pizzaMode:'single',pizza:null,pizzaLeft:null,pizzaRight:null,halfStage:'left',toppings:{},sides:{},drinks:{},includedSides:{},includedDrinks:{},set:null,category:'ALL',orderNo:null,toppingExpanded:false,cart:[],seatZone:null,seatId:null,seatName:null,seatCapacity:null,seats:{},partySize:null,pickupMode:null,pickupHour:null,pickupMinute:null,pickupTime:null,phone:'010',phoneDisplay:'010-',phonePrefixCleared:false,waitingSeatId:null,waitingSeatName:null,waitingPartySize:1,waitingPhone:'010',waitingPhoneDisplay:'010-'};
const steps=['home','type','partySize','pickup','pickupTime','phone','seatZone','seatSelect','waiting','waitingDone','promo','setChoice','pizzaMode','dough','size','crust','pizza','topping','side','drink','review','cart','done'];
const labels={waiting:'줄서기',waitingDone:'줄서기 완료',type:'이용방법',partySize:'인원 선택',pickup:'포장 방식',pickupTime:'예약 시간',phone:'전화번호',seatZone:'구역 선택',seatSelect:'좌석 선택',promo:'혜택',setChoice:'세트 선택',pizzaMode:'피자 구성',dough:'도우',size:'사이즈',crust:'크러스트',pizza:'피자',topping:'토핑',side:'사이드',drink:'음료',review:'주문확인',cart:'장바구니'};

// 테스트 기간 임시 설정: true이면 먹고가기 구역 운영시간 제한을 무시합니다.
// 운영 전에는 false로 변경하세요.
const DINEIN_TEST_MODE=true;

const STORE_OPEN_MIN=11*60;
const STORE_CLOSE_MIN=21*60;
const HAPPY_START_MIN=16*60;
const HAPPY_END_MIN=20*60;
const IMMEDIATE_MIN=15;
const IMMEDIATE_MAX=20;
const HOLD_WARN_MS=10000;
const HOLD_RELEASE_MS=20000;
let holdWarnTimer=null,holdReleaseTimer=null;

const ZONE_RULES={
 papa:{open:11*60,close:20*60,weekend:true},
 outside:{open:11*60,close:20*60,weekend:true},
 bottle:{open:11*60,close:14*60,weekend:false},
 room:{open:11*60,close:14*60,weekend:false}
};

function pad2(n){return String(n).padStart(2,'0')}
function nowMinutes(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function ceil5(v){return Math.ceil(v/5)*5}
function minPickupMinutes(){return Math.max(STORE_OPEN_MIN,ceil5(nowMinutes()+30))}
function immediatePickupRange(){const now=nowMinutes();return {from:ceil5(now+IMMEDIATE_MIN),to:ceil5(now+IMMEDIATE_MAX)}}
function openReservationTime(){
 const hours=availableHours();
 if(!hours.length)return alert('오늘 예약 가능한 시간이 없습니다.');
 state.pickupMode='reserve';
 if(state.pickupHour===null)state.pickupHour=hours[0];
 const mins=availableMinutesForHour(state.pickupHour);
 if(!mins.includes(state.pickupMinute))state.pickupMinute=mins[0]??null;
 state.pickupTime=state.pickupMinute===null?null:pad2(state.pickupHour)+':'+pad2(state.pickupMinute);
 state.step='pickupTime';render();
}
function chooseImmediatePickup(){const r=immediatePickupRange();state.pickupMode='now';state.pickupHour=Math.floor(r.to/60);state.pickupMinute=r.to%60;state.pickupTime=pad2(state.pickupHour)+':'+pad2(state.pickupMinute);state.step='phone';render()}
function pickupMinutes(){return state.pickupHour===null||state.pickupMinute===null?null:Number(state.pickupHour)*60+Number(state.pickupMinute)}
function pickupIsHappyHour(){const m=pickupMinutes();return state.orderType==='takeout'&&m!==null&&m>=HAPPY_START_MIN&&m<=HAPPY_END_MIN}
function availableHours(){const min=minPickupMinutes(),a=[];for(let h=11;h<=21;h++){if(h*60+55>=min&&h*60<=STORE_CLOSE_MIN)a.push(h)}return a}
function availableMinutesForHour(h){const min=minPickupMinutes(),a=[];for(let m=0;m<60;m+=5){const v=h*60+m;if(v>=min&&v<=STORE_CLOSE_MIN)a.push(m)}return a}
function choosePickupHour(h){
 const pageY=window.scrollY;
 const hs=document.querySelector('.hour-wheel')?.scrollTop||0;
 const ms=document.querySelector('.minute-wheel')?.scrollTop||0;
 state.pickupHour=Number(h);
 const a=availableMinutesForHour(state.pickupHour);
 state.pickupMinute=a.includes(state.pickupMinute)?state.pickupMinute:(a[0]??null);
 state.pickupTime=state.pickupMinute===null?null:pad2(state.pickupHour)+':'+pad2(state.pickupMinute);
 render();
 requestAnimationFrame(()=>{window.scrollTo(0,pageY);const h2=document.querySelector('.hour-wheel'),m2=document.querySelector('.minute-wheel');if(h2)h2.scrollTop=hs;if(m2)m2.scrollTop=ms});
}
function choosePickupMinute(m){
 const pageY=window.scrollY;
 const hs=document.querySelector('.hour-wheel')?.scrollTop||0;
 const ms=document.querySelector('.minute-wheel')?.scrollTop||0;
 state.pickupMinute=Number(m);
 state.pickupTime=pad2(state.pickupHour)+':'+pad2(state.pickupMinute);
 render();
 requestAnimationFrame(()=>{window.scrollTo(0,pageY);const h2=document.querySelector('.hour-wheel'),m2=document.querySelector('.minute-wheel');if(h2)h2.scrollTop=hs;if(m2)m2.scrollTop=ms});
}
function confirmPickup(){
 if(state.pickupMode!=='reserve')return;
 if(state.pickupHour===null||state.pickupMinute===null)return alert('픽업 시간을 선택해 주세요.');
 state.pickupTime=`${pad2(state.pickupHour)}:${pad2(state.pickupMinute)}`;
 state.step='phone';render();
}
function formatPhone(raw){
 const d=String(raw||'').replace(/\D/g,'').slice(0,11);
 if(!d)return '';
 if(d.length<=3)return d+(d.length===3?'-':'');
 if(d.length<=7)return d.slice(0,3)+'-'+d.slice(3);
 return d.slice(0,3)+'-'+d.slice(3,7)+'-'+d.slice(7);
}
function appendPhoneDigit(n){if(state.phone.length<11){state.phone+=String(n);state.phoneDisplay=formatPhone(state.phone);renderPhoneOnly()}}
function backspacePhone(){
 if(!state.phonePrefixCleared&&state.phone.length<=3)return;
 state.phone=state.phone.slice(0,-1);state.phoneDisplay=formatPhone(state.phone);renderPhoneOnly();
}
function clearPhoneAll(){state.phone='';state.phoneDisplay='';state.phonePrefixCleared=true;render()}
function renderPhoneOnly(){const el=document.querySelector('.phone-display');if(el)el.textContent=state.phoneDisplay||'전화번호를 입력하세요';const b=document.querySelector('.phone-confirm-btn');if(b)b.disabled=String(state.phone||'').replace(/\D/g,'').length<9}
function confirmPhone(){
 const digits=String(state.phone||'').replace(/\D/g,'');
 if(digits.length<9||digits.length>11)return alert('전화번호를 정확히 입력해 주세요.');
 state.orderNo=digits.slice(-4);
 state.phone=digits;
 state.phoneDisplay=formatPhone(digits);
 state.step='promo';
 render();
}
function zoneAvailability(zone){if(DINEIN_TEST_MODE)return {open:true,reason:'테스트 모드 · 시간 제한 없음'};const r=ZONE_RULES[zone],d=new Date(),weekend=[0,6].includes(d.getDay()),m=nowMinutes();if(!r.weekend&&weekend)return {open:false,reason:'주말 미운영'};if(m<r.open||m>r.close)return {open:false,reason:`${pad2(Math.floor(r.open/60))}:00~${pad2(Math.floor(r.close/60))}:00 운영`};return {open:true,reason:'운영 중'}}




function makeSeatGroupId(zoneId){
 return `${zoneId.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
}
function seatGroupIds(seat){
 return seat.groupId?String(seat.groupId):'';
}

function zoneSeatDocs(zoneId){
 return SEAT_MASTER.filter(s=>s.zone===zoneId).map(s=>seatInfo(s.id));
}
function usedTablesInZone(zoneId){
 return zoneSeatDocs(zoneId).filter(s=>['held','occupied','cleaning','reserved'].includes(s.status)).length;
}
function freeTablesInZone(zoneId){
 return zoneSeatDocs(zoneId).filter(s=>s.status==='empty').length;
}
function roomCurrentPeople(){
 return zoneSeatDocs('room')
   .filter(s=>['held','occupied','cleaning','reserved'].includes(s.status))
   .reduce((sum,s)=>sum+Number(s.partySize||0),0);
}
function roomCanAccept(people){
 const p=Number(people||0);
 const used=usedTablesInZone('room');
 const free=3-used;
 if(used===0)return p>=6&&p<=12;
 return p>=1&&p<=free*4;
}
function roomTablesNeeded(people){
 const p=Number(people||0);
 if(usedTablesInZone('room')===0)return Math.ceil(p/4);
 return Math.ceil(p/4);
}
function outsideCanAccept(people){
 const p=Number(people||0);
 const free=4-usedTablesInZone('outside');
 return p>=1&&p<=free*4;
}
function outsideTablesNeeded(people){
 return Math.ceil(Number(people||0)/4);
}
function zoneCapacityText(zoneId){
 if(zoneId==='room'){
   const used=usedTablesInZone('room');
   const free=3-used;
   return used===0
     ? '최초 이용은 6~12명'
     : `추가 가능 최대 ${free*4}명`;
 }
 if(zoneId==='outside'){
   const free=4-usedTablesInZone('outside');
   return `추가 가능 최대 ${free*4}명`;
 }
 return '';
}

function clearHoldTimers(){if(holdWarnTimer)clearTimeout(holdWarnTimer);if(holdReleaseTimer)clearTimeout(holdReleaseTimer);holdWarnTimer=holdReleaseTimer=null}
function armHoldTimers(){clearHoldTimers();if(!state.seatId)return;holdWarnTimer=setTimeout(()=>{if(!state.seatId||state.step==='done')return;const keep=confirm('좌석 선택 후 10초 동안 조작이 없습니다.\n10초 후 좌석이 자동으로 해제됩니다.\n계속 주문하시겠습니까?');if(keep)armHoldTimers()},HOLD_WARN_MS);holdReleaseTimer=setTimeout(async()=>{if(!state.seatId||state.step==='done')return;await releaseCurrentSeat();alert('20초 동안 조작이 없어 좌석이 자동으로 해제되었습니다.');state.step='seatZone';render()},HOLD_RELEASE_MS)}
document.addEventListener('click',()=>{if(state.seatId&&state.step!=='done')armHoldTimers()},{passive:true});
document.addEventListener('touchstart',()=>{if(state.seatId&&state.step!=='done')armHoldTimers()},{passive:true});

function resetAfter(key){const order=['dough','size','crust','pizza'];const i=order.indexOf(key);order.slice(i+1).forEach(k=>state[k]=null);state.toppings={};}
function crustOptionPrice(crust){
 if(crust==='오리지널'||!crust)return 0;
 const size=effectiveSize();
 return size==='L'?4000:5000;
}
function crustPrice(){return state.promo==='upup'?0:crustOptionPrice(state.crust)}
function effectiveSize(){return state.promo==='upup'?'F':state.size}
function isHalf(){return state.pizzaMode==='half'}
function halfFee(){return isHalf()?1000:0}
function toppingPrice(){return Object.entries(state.toppings).reduce((s,[id,q])=>{const t=TOPPINGS.find(x=>x.id===id);return s+(t?.price[effectiveSize()]||0)*q},0)}
function pizzaPriceById(id,size){const p=PIZZAS.find(x=>x.id===id);return p?(p.prices[size]||0):0}
function basePizzaPrice(){
 const size=state.promo==='upup'?'L':state.size;
 if(isHalf())return (pizzaPriceById(state.pizzaLeft,size)+pizzaPriceById(state.pizzaRight,size))/2;
 return state.pizza?pizzaPriceById(state.pizza,size):0;
}
function pizzaDisplayName(){
 if(isHalf()){
  const a=PIZZAS.find(x=>x.id===state.pizzaLeft)?.name||'';
  const b=PIZZAS.find(x=>x.id===state.pizzaRight)?.name||'';
  return `${a} / ${b}`;
 }
 return PIZZAS.find(x=>x.id===state.pizza)?.name||'';
}
function upupDiscount(){
 if(state.promo!=='upup')return 0;
 const ids=isHalf()?[state.pizzaLeft,state.pizzaRight]:[state.pizza];
 if(ids.some(x=>!x))return 0;
 const sizeUpgrade=ids.reduce((sum,id)=>sum+Math.max(0,pizzaPriceById(id,'F')-pizzaPriceById(id,'L'))/ids.length,0);
 return sizeUpgrade+5000;
}
function sideTotal(){return Object.entries(state.sides).reduce((s,[id,q])=>s+(SIDES.find(x=>x.id===id)?.price||0)*q,0)}
function drinkTotal(){return Object.entries(state.drinks).reduce((s,[id,q])=>s+(DRINKS.find(x=>x.id===id)?.price||0)*q,0)}
function visibleSides(){
 if(state.set===2)return SIDES.filter(s=>s.set2);
 if(state.set===3||state.set===4)return SIDES.filter(s=>!s.setExcluded&&!['corn','coleslaw'].includes(s.id));
 return SIDES;
}
function visibleDrinks(){
 if(state.set===2)return DRINKS.filter(d=>d.small);
 if(state.set===3||state.set===4)return DRINKS.filter(d=>d.large);
 return DRINKS;
}
function setSideLimit(){return state.set===4?2:state.set?1:9}
function setDrinkLimit(){return state.set?1:9}
function selectedCount(key){return Object.values(state[key]).reduce((a,b)=>a+b,0)}
function includedCount(key){return Object.values(state[key]).reduce((a,b)=>a+b,0)}
function calc(){
 const pizzaBase=basePizzaPrice(), crust=crustPrice(), topping=toppingPrice(), half=halfFee();
 let sides=sideTotal(),drinks=drinkTotal(),discount=0,total=0;
 if(state.promo==='happyhour'&&state.orderType==='takeout'){
   total=15000+crust+topping+sides+drinks;
 } else if(state.set){
   const setBase=state.set===2?24000:state.set===3?33000:42000;
   total=setBase+half+crust+topping+sides+drinks;
 } else if(state.promo==='takeout'&&state.orderType==='takeout'&&['L','F'].includes(state.size)){
   const discountBase=pizzaBase+half+crust+topping;
   discount=discountBase*.2;
   total=discountBase-discount+sides+drinks;
 } else {
   total=pizzaBase+half+crust+topping+sides+drinks;
 }
 return{pizza:pizzaBase,half,crust,topping,sides,drinks,discount,total,upupDiscount:upupDiscount()};
}



const SEAT_ZONES=[
 {id:'papa',name:'파파존',img:'images/seats/papa_zone.jpg',desc:'편안한 실내에서 피자를 즐겨보세요.',capacityLabel:'1인 ~ 4인'},
 {id:'outside',name:'야외석',img:'images/seats/outside_zone.jpg',desc:'야외에서 시원하게 즐겨보세요.',capacityLabel:'2인 ~ 16인'},
 {id:'bottle',name:'별관',img:'images/seats/bottle_zone.jpg',desc:'조용하고 쾌적한 별관 공간입니다.',capacityLabel:'2인 ~ 5인'},
 {id:'room',name:'별관룸',img:'images/seats/room_zone.jpg',desc:'프라이빗한 모임을 위한 공간입니다.',capacityLabel:'6인 ~ 12인'}
];
const SEAT_MASTER=[
 {id:'papa-1',zone:'papa',name:'커플석',label:'Papa 1',capacity:2},
 {id:'papa-2',zone:'papa',name:'바테이블석',label:'Papa 2',capacity:4},
 {id:'outside-1',zone:'outside',name:'야외석1',label:'Outside 1',capacity:4},
 {id:'outside-2',zone:'outside',name:'야외석2',label:'Outside 2',capacity:4},
 {id:'outside-3',zone:'outside',name:'야외석3',label:'Outside 3',capacity:4},
 {id:'outside-4',zone:'outside',name:'야외석4',label:'Outside 4',capacity:4},
 {id:'bottle-1',zone:'bottle',name:'보틀1',label:'Bottle 1',capacity:2},
 {id:'bottle-2',zone:'bottle',name:'보틀2',label:'Bottle 2',capacity:4},
 {id:'bottle-3',zone:'bottle',name:'보틀3',label:'Bottle 3',capacity:4},
 {id:'bottle-4',zone:'bottle',name:'보틀4',label:'Bottle 4',capacity:2},
 {id:'room-1',zone:'room',name:'룸테이블1',label:'Room 1',capacity:4},
 {id:'room-2',zone:'room',name:'룸테이블2',label:'Room 2',capacity:4},
 {id:'room-3',zone:'room',name:'룸테이블3',label:'Room 3',capacity:4}
];
const seatStatusName={empty:'빈자리',held:'선택중',occupied:'사용중',cleaning:'정리중',reserved:'예약'};
let seatUnsubscribe=null;
function subscribeSeats(){
 if(seatUnsubscribe)return;
 seatUnsubscribe=db.collection('seats').onSnapshot(snap=>{
   const next={};snap.forEach(doc=>next[doc.id]={id:doc.id,...doc.data()});
   state.seats=next;
   if(['seatZone','seatSelect'].includes(state.step))render();
 },err=>console.warn('좌석 실시간 연결 실패',err));
}
function seatInfo(id){
 const master=SEAT_MASTER.find(s=>s.id===id);
 const remote=state.seats[id]||{};
 return {...master,...remote,status:remote.status||'empty',updatedAt:remote.updatedAt||null};
}

function changePartySize(delta){
 const current=Number(state.partySize||1);
 state.partySize=Math.max(1,Math.min(16,current+delta));
 renderPartySizeOnly();
}
function renderPartySizeOnly(){
 const value=document.querySelector('.party-count-value');
 const room=document.querySelector('.party-room-note');
 const minus=document.querySelector('.party-minus');
 const plus=document.querySelector('.party-plus');
 if(value)value.textContent=`${state.partySize||1}명`;
 if(room){
   room.textContent=Number(state.partySize)>=6?'ROOM 선택 가능':'6명 이상부터 ROOM을 선택할 수 있습니다.';
   room.classList.toggle('active',Number(state.partySize)>=6);
 }
 if(minus)minus.disabled=Number(state.partySize)<=1;
 if(plus)plus.disabled=Number(state.partySize)>=16;
 const chip=[...document.querySelectorAll('.selection-chip')].find(x=>x.textContent.includes('인원'));
 if(chip){
   const valueNode=chip.querySelector('strong');
   if(valueNode)valueNode.textContent=`${state.partySize||1}명`;
 }
}
function confirmPartySize(){
 if(!state.partySize)state.partySize=1;
 state.step='seatZone';render();
}
function timestampMs(ts){
 if(!ts)return null;
 if(typeof ts.toMillis==='function')return ts.toMillis();
 if(ts.seconds)return ts.seconds*1000;
 const d=new Date(ts);return Number.isNaN(d.getTime())?null:d.getTime();
}
function seatElapsed(ts){
 const ms=timestampMs(ts);if(!ms)return '';
 const mins=Math.max(0,Math.floor((Date.now()-ms)/60000));
 return mins<60?`경과 ${mins}분`:`경과 ${Math.floor(mins/60)}시간 ${mins%60}분`;
}
function seatActionLabel(s,disabled){
 if(s.status==='empty'&&!disabled)return '테이블 선택하기';
 if(s.status==='occupied')return '사용 중';
 if(s.status==='cleaning')return '정리 중';
 if(s.status==='reserved')return '예약 좌석';
 if(s.status==='held')return '선택 중';
 return '선택 불가';
}

function chooseSeatZone(zone){state.seatZone=zone;state.seatId=null;state.seatName=null;state.seatCapacity=null;state.step='seatSelect';render();}
async function chooseSeat(id){
 const party=Number(state.partySize||1);

 async function holdGroup(zoneId,need,groupLabel){
   const candidates=SEAT_MASTER.filter(s=>s.zone===zoneId).map(s=>seatInfo(s.id)).filter(s=>s.status==='empty').slice(0,need);
   if(candidates.length<need)throw new Error('현재 남은 테이블이 부족합니다.');
   const groupId=makeSeatGroupId(zoneId);

   await db.runTransaction(async tx=>{
     // Firestore transaction rule: ALL reads first.
     const refs=candidates.map(s=>db.collection('seats').doc(s.id));
     const snaps=[];
     for(const ref of refs)snaps.push(await tx.get(ref));

     for(const snap of snaps){
       const current=snap.exists?(snap.data().status||'empty'):'empty';
       if(current!=='empty')throw new Error('방금 다른 고객이 좌석을 선택했습니다.');
     }

     // Writes only after all reads.
     refs.forEach((ref,idx)=>{
       const s=candidates[idx];
       tx.set(ref,{
         status:'held',
         zone:s.zone,
         name:s.name,
         capacity:s.capacity,
         partySize:party,
         groupSize:party,
         groupId,
         groupLabel,
         groupTableCount:need,
         heldAt:firebase.firestore.FieldValue.serverTimestamp()
       },{merge:true});
     });
   });

   state.seatId=candidates.map(s=>s.id).join(',');
   state.seatName=`${groupLabel} · ${need}테이블`;
   state.seatCapacity=need*4;
   state.seatGroupId=groupId;
   armHoldTimers();
   state.step='promo';
   render();
 }

 if(state.seatZone==='room'){
   if(!roomCanAccept(party)){
     const used=usedTablesInZone('room');
     const msg=used===0
       ? '룸 최초 이용은 6명 이상부터 가능합니다.'
       : `현재 룸은 최대 ${freeTablesInZone('room')*4}명까지 추가 입실 가능합니다.`;
     return alert(msg);
   }
   try{
     await holdGroup('room',roomTablesNeeded(party),'ROOM');
   }catch(e){alert(e.message||'룸 선택에 실패했습니다.')}
   return;
 }

 if(state.seatZone==='outside'&&party>4){
   if(!outsideCanAccept(party))return alert(`현재 야외존은 최대 ${freeTablesInZone('outside')*4}명까지 선택할 수 있습니다.`);
   try{
     await holdGroup('outside',outsideTablesNeeded(party),'OUTSIDE');
   }catch(e){alert(e.message||'야외석 선택에 실패했습니다.')}
   return;
 }

 const s=seatInfo(id);
 if(s.status!=='empty')return alert(`${s.name}은(는) 현재 선택할 수 없습니다.`);

 const maxCapacity=(s.zone==='bottle'&&Number(s.capacity)===4)?5:Number(s.capacity);
 if(party>maxCapacity)return alert(`이 좌석은 최대 ${maxCapacity}인까지 이용 가능합니다.`);

 try{
   const groupId=makeSeatGroupId(s.zone);
   await db.runTransaction(async tx=>{
     const ref=db.collection('seats').doc(id);
     const snap=await tx.get(ref); // read first
     const current=snap.exists?(snap.data().status||'empty'):'empty';
     if(current!=='empty')throw new Error('방금 다른 고객이 선택했습니다.');
     tx.set(ref,{
       status:'held',
       zone:s.zone,
       name:s.name,
       capacity:maxCapacity,
       partySize:party,
       groupSize:party,
       groupId,
       groupLabel:s.name,
       groupTableCount:1,
       heldAt:firebase.firestore.FieldValue.serverTimestamp()
     },{merge:true});
   });
   state.seatId=id;state.seatName=s.name;state.seatCapacity=maxCapacity;state.seatGroupId=groupId;
   armHoldTimers();state.step='phone';render();
 }catch(e){alert(e.message||'좌석 선택에 실패했습니다.')}
}
async function releaseCurrentSeat(){
 clearHoldTimers();
 if(!state.seatId)return;
 try{
   const ids=String(state.seatId).split(',').filter(Boolean);
   for(const id of ids){
     const ref=db.collection('seats').doc(id),snap=await ref.get();
     if(snap.exists&&snap.data().status==='held'){
       await ref.set({
         status:'empty',
         partySize:null,
         groupSize:null,
         groupId:null,
         groupLabel:null,
         groupTableCount:null,
         heldAt:null,
         releasedAt:firebase.firestore.FieldValue.serverTimestamp()
       },{merge:true});
     }
   }
 }catch(e){console.warn(e)}
 state.seatId=null;state.seatName=null;state.seatCapacity=null;state.seatZone=null;state.seatGroupId=null;
}


function setIncludedDrinks(){
 if(!state.set)return [];
 if(Number(state.set)===2){
  return ['coke-500','coke-zero-500','sprite-500','sprite-zero-500']
   .map(id=>DRINKS.find(d=>d.id===id)).filter(Boolean);
 }
 if([3,4].includes(Number(state.set))){
  // PC/모바일 모두 동일하게 대용량 음료 4종을 확실히 노출한다.
  return ['coke-125','coke-zero-15','sprite-15','sprite-zero-15']
   .map(id=>DRINKS.find(d=>d.id===id)).filter(Boolean);
 }
 return [];
}

function drinkMeta(x){
 const name=String(x.name||'');
 const zero=Boolean(x.zero)||/제로|zero/i.test(name);
 const volume=x.volume||(name.match(/1\.5L/i)?'1.5L':name.match(/500\s?mL/i)?'500mL':'');
 const brand=x.brand||(name.includes('스프라이트')?'sprite':name.includes('코카콜라')?'coke':'other');
 return {zero,volume,brand};
}
function drinkCard(x,key,included=false){
 const q=state[key][x.id]||0;
 const m=drinkMeta(x);
 const typeLabel=m.zero?'ZERO':'ORIGINAL';
 const typeClass=m.zero?'zero':'original';
 const brandClass=m.brand==='sprite'?'sprite':m.brand==='coke'?'coke':'other';
 return `<div class="drink-product-card ${typeClass} ${brandClass} ${included?'included-card':''}" onclick="qty('${key}','${x.id}',1)">
   <div class="drink-badges"><span class="drink-type-badge">${typeLabel}</span><span class="drink-volume-badge">${m.volume||''}</span></div>
   <img src="${x.img}" alt="${x.name}">
   <strong>${x.shortName||x.name}</strong>
   <small>${m.volume||''}</small>
   <em>${money(x.price)}</em>
   ${included?'<b class="included-zero-note">세트 포함 · 결제 0원</b>':''}
   <div class="qty"><button onclick="event.stopPropagation();qty('${key}','${x.id}',-1)">−</button><span>${q}</span><button onclick="event.stopPropagation();qty('${key}','${x.id}',1)">＋</button></div>
 </div>`;
}

function drinkFamilyCard(items,key,included=false){
 if(!items||!items.length)return '';
 const first=items[0];
 const m=drinkMeta(first);
 const typeLabel=m.zero?'제로':'일반';
 const typeClass=m.zero?'zero':'original';
 const brandClass=m.brand==='sprite'?'sprite':m.brand==='coke'?'coke':'other';
 const familyName=m.brand==='sprite'?(m.zero?'스프라이트 제로':'스프라이트'):(m.zero?'코카콜라 제로':'코카콜라');
 const imageItem=items.find(x=>drinkMeta(x).volume!=='500mL')||first;
 return `<article class="drink-family-card ${typeClass} ${brandClass}">
   <img class="drink-family-image" src="${imageItem.img}" alt="${familyName}">
   <div class="drink-family-content">
    <span class="drink-family-type">${typeLabel}</span>
    <h3>${familyName}</h3>
    <div class="drink-size-buttons">
     ${items.map(x=>{const q=state[key][x.id]||0;const vm=drinkMeta(x);return `<button type="button" class="drink-size-button ${q?'selected':''}" onclick="qty('${key}','${x.id}',${q?-1:1})"><span class="bottle-icon">♙</span><b>${vm.volume}</b>${included?'<small>세트 포함</small>':`<small>${money(x.price)}</small>`}${q?'<i>✓</i>':''}</button>`}).join('')}
    </div>
   </div>
  </article>`;
}
function drinkFamilies(list){
 const order=[['coke',false],['sprite',false],['coke',true],['sprite',true]];
 return order.map(([brand,zero])=>({brand,zero,items:list.filter(x=>{const m=drinkMeta(x);return m.brand===brand&&m.zero===zero}).sort((a,b)=>{const rank={'1.25L':0,'1.5L':0,'500mL':1};return (rank[drinkMeta(a).volume]??9)-(rank[drinkMeta(b).volume]??9)})})).filter(x=>x.items.length);
}
function waitingFormatPhone(raw){return formatPhone(raw)}
function openWaiting(seat){
 state.waitingSeatId=seat.id;state.waitingSeatName=seat.name;
 state.waitingPartySize=Math.min(Number(state.partySize||1),16);
 state.waitingPhone='010';state.waitingPhoneDisplay='010-';
 state.step='waiting';render();
}
function changeWaitingParty(delta){
 state.waitingPartySize=Math.max(1,Math.min(16,Number(state.waitingPartySize||1)+delta));render();
}
function waitingAppendDigit(n){
 if(state.waitingPhone.length<11){
   state.waitingPhone+=String(n);state.waitingPhoneDisplay=formatPhone(state.waitingPhone);renderWaitingPhoneOnly();
 }
}
function waitingBackspace(){
 if(state.waitingPhone.length<=3)return;
 state.waitingPhone=state.waitingPhone.slice(0,-1);state.waitingPhoneDisplay=formatPhone(state.waitingPhone);renderWaitingPhoneOnly();
}
function waitingClearPhone(){
 state.waitingPhone='';state.waitingPhoneDisplay='';render();
}
function renderWaitingPhoneOnly(){
 const el=document.querySelector('.waiting-phone-display');if(el)el.textContent=state.waitingPhoneDisplay||'전화번호 입력';
}
async function submitWaiting(){
 const digits=String(state.waitingPhone||'').replace(/\D/g,'');
 if(digits.length<9)return alert('전화번호를 정확히 입력해 주세요.');
 const seat=seatInfo(state.waitingSeatId);
 const queueSnap=await db.collection('waitlist').where('seatId','==',state.waitingSeatId).where('status','==','waiting').get();
 const queueNo=queueSnap.size+1;
 await db.collection('waitlist').add({
   seatId:state.waitingSeatId,
   seatName:state.waitingSeatName,
   zone:seat.zone,
   partySize:Number(state.waitingPartySize||1),
   phone:digits,
   phoneMasked:`***-${digits.slice(-4)}`,
   queueNo,
   status:'waiting',
   createdAt:firebase.firestore.FieldValue.serverTimestamp()
 });
 state.step='waitingDone';state.waitingQueueNo=queueNo;render();
}

function selectionIndicator(){
 const chips=[];
 const add=(label,value,icon='✓')=>{if(value)chips.push(`<div class="selection-chip"><span class="selection-icon">${icon}</span><span><small>${label}</small><strong>${value}</strong></span></div>`)};
 add('주문 방식',state.orderType==='takeout'?'포장 주문':state.orderType==='dinein'?'먹고가기':'',state.orderType==='takeout'?'🛍️':'🍽️');
 add('세트',state.set?`${state.set}인 세트`:state.promo==='upup'?'UP & UP':state.promo==='takeout'?'포장 20%':state.promo==='happyhour'?'해피아워':'일반 주문','👥');
 let pizza='';
 if(isHalf()){
  const left=PIZZAS.find(x=>x.id===state.pizzaLeft)?.name||''; const right=PIZZAS.find(x=>x.id===state.pizzaRight)?.name||'';
  pizza=left&&right?`${left} + ${right}`:left?`${left} + 선택 중`:'';
 }else pizza=PIZZAS.find(x=>x.id===state.pizza)?.name||'';
 if(pizza) pizza+=state.size?` (${state.size})`:'';
 add('피자',pizza,'🍕');
 add('크러스트',state.crust||'','🧀');
 const selectedSides=[...Object.entries(state.includedSides),...Object.entries(state.sides)].filter(([,q])=>q>0).map(([id,q])=>{const n=SIDES.find(x=>x.id===id)?.name||id;return q>1?`${n}×${q}`:n});
 add('사이드',selectedSides.join(', '),'🍗');
 const selectedDrinks=[...Object.entries(state.includedDrinks),...Object.entries(state.drinks)].filter(([,q])=>q>0).map(([id,q])=>{const d=DRINKS.find(x=>x.id===id);if(!d)return id;const n=d.zero?'제로콜라':d.shortName||d.name;return q>1?`${n}×${q}`:n});
 add('음료',selectedDrinks.join(', '),'🥤');
 if(!chips.length)return '';
 return `<div class="selection-indicator"><div class="selection-track">${chips.join('<span class="selection-arrow">›</span>')}</div></div>`;
}
function currentItem(){
 const c=calc();
 return {
  id:Date.now()+Math.random(),
  orderType:state.orderType,promo:state.promo,set:state.set,dough:state.dough,size:state.size,crust:state.crust,pizzaMode:state.pizzaMode,pizza:state.pizza,pizzaLeft:state.pizzaLeft,pizzaRight:state.pizzaRight,pizzaName:pizzaDisplayName(),
  toppings:{...state.toppings},sides:{...state.sides},drinks:{...state.drinks},includedSides:{...state.includedSides},includedDrinks:{...state.includedDrinks},
  total:c.total,qty:1
 };
}
function cartTotal(){return state.cart.reduce((sum,item)=>sum+item.total*item.qty,0)}
function itemSummary(item){
 const benefit=item.set?`${item.set}인 세트`:item.promo==='upup'?'UP & UP':item.promo==='takeout'?'포장 20%':'일반주문';
 const size=item.promo==='upup'?'라지 주문 → 패밀리 업그레이드':item.size;
 return `<div class="cart-item-main"><strong>${benefit} · ${item.pizzaName}${item.pizzaMode==='half'?' (하프앤하프)':''}</strong><span>${item.dough==='thin'?'씬도우':'수타도우'} · ${size} · ${item.crust||''}</span>${names(item.toppings,TOPPINGS)!=='없음'?`<small>토핑: ${names(item.toppings,TOPPINGS)}</small>`:''}${item.set?`<small>포함 사이드: ${names(item.includedSides,SIDES)}</small><small>포함 음료: ${names(item.includedDrinks,DRINKS)}</small>`:''}${names(item.sides,SIDES)!=='없음'?`<small>추가 사이드: ${names(item.sides,SIDES)}</small>`:''}${names(item.drinks,DRINKS)!=='없음'?`<small>추가 음료: ${names(item.drinks,DRINKS)}</small>`:''}</div>`;
}
function addCurrentToCart(){
 state.cart.push(currentItem());
 state.step='cart';
 render();
}
function removeCartItem(index){state.cart.splice(index,1);render()}
function cartQty(index,d){const item=state.cart[index];item.qty=Math.max(1,Math.min(9,item.qty+d));render()}
function clearCurrentSelection(){
 state.promo=null;state.set=null;state.dough=null;state.size=null;state.crust=null;state.pizzaMode='single';state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.halfStage='left';
 state.toppings={};state.sides={};state.drinks={};state.includedSides={};state.includedDrinks={};state.toppingExpanded=false;
}
function addMoreMenu(){clearCurrentSelection();state.step='promo';render()}
async function checkoutCart(){
 if(!state.cart.length)return alert('장바구니가 비어 있습니다.');
 const checkoutButton=document.querySelector('.cart-actions .btn.primary');
 if(checkoutButton){checkoutButton.disabled=true;checkoutButton.textContent='주문 전송 중...';}
 state.orderNo=String(state.phone||'').replace(/\D/g,'').slice(-4);
 const orderPayload={
  orderNo:state.orderNo,
  storeId:'pangyo2-techno-valley',
  storeName:'판교2테크노밸리점',
  status:'payment_pending',
  orderType:state.orderType||'unknown',
  customerNumber:String(state.phone||'').replace(/\D/g,'').slice(-4),
  partySize:state.partySize||null,
  phone:state.phone||null,
  phoneMasked:state.phone?`***-${String(state.phone).slice(-4)}`:null,
  pickup:state.orderType==='takeout'?{date:'today',time:state.pickupTime,mode:state.pickupMode,isHappyHour:pickupIsHappyHour(),prepMinutes:state.pickupMode==='now'?'15~20':null}:null,
  items:state.cart.map(item=>JSON.parse(JSON.stringify(item))),
  itemCount:state.cart.reduce((n,item)=>n+(item.qty||1),0),
  total:cartTotal(),
  createdAt:firebase.firestore.FieldValue.serverTimestamp(),
  createdAtClient:new Date().toISOString(),
  seat:state.orderType==='dinein'?{id:state.seatId,name:state.seatName,zone:state.seatZone,capacity:state.seatCapacity}:null,
  source:'web-kiosk-v33.1-1-cachefix'
 };
 try{
  const ref=await db.collection('orders').add(orderPayload);
  state.orderId=ref.id;
  if(state.orderType==='dinein'&&state.seatId){for(const id of String(state.seatId).split(',').filter(Boolean)){await db.collection('seats').doc(id).set({status:'occupied',orderId:ref.id,orderNo:state.orderNo,partySize:state.partySize,groupId:state.seatGroupId||null,occupiedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}}
  state.step='done';
  render();
 }catch(error){
  console.error('주문 저장 실패:',error);
  alert('주문 전송에 실패했습니다. 인터넷 연결과 Firestore 설정을 확인해 주세요.\n\n'+error.message);
  if(checkoutButton){checkoutButton.disabled=false;checkoutButton.textContent='주문확정';}
 }
}
function sizeLabel(v){return ({R:'레귤러',L:'라지',F:'패밀리'})[v]||v||''}
function orderStageIndex(){
 const groups=[['promo','setChoice'],['pizzaMode','dough','size','pizza'],['crust'],['topping','side'],['drink'],['review','cart']];
 const i=groups.findIndex(g=>g.includes(state.step));return i<0?0:i;
}
function orderSidebar(){
 const stages=[['세트 선택','promo'],['피자 선택','pizza'],['크러스트 선택','crust'],['사이드 선택','side'],['음료 선택','drink'],['주문 확인','review']];
 const active=orderStageIndex(); const c=calc(); const count=selectedCount('sides')+selectedCount('includedSides')+selectedCount('drinks')+selectedCount('includedDrinks');
 return `<aside class="order-sidebar"><div class="sidebar-brand"><img src="images/home_logo_v33.png" alt="PAPA JOHNS"><small>판교2테크노밸리점</small></div><div class="order-type-stack"><div class="order-type-pill ${state.orderType==='takeout'?'active':''}"><b>▣</b><span>포장 주문<small>TAKE OUT</small></span>${state.orderType==='takeout'?'<i>✓</i>':''}</div><div class="order-type-pill ${state.orderType==='dinein'?'active':''}"><b>♨</b><span>먹고가기<small>DINE IN</small></span>${state.orderType==='dinein'?'<i>✓</i>':''}</div></div><div class="sidebar-stage-title">주문 단계</div><nav class="sidebar-stages">${stages.map((x,i)=>`<div class="sidebar-stage ${i<active?'done':''} ${i===active?'active':''}"><span>${i+1}</span><b>${x[0]}</b><em>${i<active?'✓':i===active?'›':''}</em></div>`).join('')}</nav><div class="sidebar-actions"><button onclick="back()">← 이전</button><button onclick="reselectCurrent()">↻ 다시선택</button><button onclick="goHome()">⌂ 처음으로</button></div><div class="sidebar-cart">🛒 <strong>${count}개 · ${money(c.total)}</strong></div><small class="sidebar-version">v40.8</small></aside>`;
}
function preOrderSidebar(){
 const flow=[['주문방식','type'],['포장방식','pickup'],['픽업시간','pickupTime'],['전화번호','phone']];
 const active=Math.max(0,flow.findIndex(x=>x[1]===state.step));
 return `<aside class="order-sidebar pre-order-sidebar"><div class="sidebar-brand"><img src="images/home_logo_v33.png" alt="PAPA JOHNS"><small>판교2테크노밸리점</small></div><div class="sidebar-stage-title">포장 주문 설정</div><nav class="sidebar-stages">${flow.map((x,i)=>`<div class="sidebar-stage ${i<active?'done':''} ${i===active?'active':''}"><span>${i+1}</span><b>${x[0]}</b><em>${i<active?'✓':i===active?'›':''}</em></div>`).join('')}</nav><div class="sidebar-actions"><button onclick="back()">← 이전</button><button onclick="goHome()">⌂ 초기화면</button></div><small class="sidebar-version">v40.8</small></aside>`;
}

function dineSetupSidebar(){
 const flow=[['인원 선택','partySize'],['구역 선택','seatZone'],['좌석 선택','seatSelect'],['메뉴 선택','promo'],['주문 확인','review']];
 const active=Math.max(0,flow.findIndex(x=>x[1]===state.step));
 return `<aside class="order-sidebar dine-setup-sidebar"><div class="sidebar-brand"><img src="images/home_logo_v33.png" alt="PAPA JOHNS"><small>판교2테크노밸리점</small></div><div class="sidebar-stage-title">먹고가기 주문</div><nav class="sidebar-stages">${flow.map((x,i)=>`<div class="sidebar-stage ${i<active?'done':''} ${i===active?'active':''}"><span>${i+1}</span><b>${x[0]}</b><em>${i<active?'✓':i===active?'›':''}</em></div>`).join('')}</nav><div class="sidebar-actions"><button onclick="back()">← 이전</button><button onclick="goHome()">⌂ 초기화면</button></div><small class="sidebar-version">v40.8</small></aside>`;
}

function preOrderIndicator(){
 const items=[['주문방식','type'],['포장방식','pickup'],['픽업시간','pickupTime'],['전화번호','phone']];
 const active=Math.max(0,items.findIndex(x=>x[1]===state.step));
 return `<div class="pre-order-indicator">${items.map((x,i)=>`<div class="${i<active?'done':''} ${i===active?'active':''}"><span>${i+1}</span><b>${x[0]}</b></div>`).join('<i>›</i>')}<button onclick="goHome()">⌂ 초기화면</button></div>`;
}
function shell(content,opts={}){
 const c=calc();
 const showFooter=state.step!=='home'&&state.step!=='done';
 const action=opts.auto
  ? '<span class="auto-guide">메뉴를 터치하면 자동으로 이동합니다</span>'
  : `<button class="btn primary footer-next" ${opts.nextDisabled?'disabled':''} onclick="next()">${state.step==='review'?'장바구니 담기':'선택 완료 →'}</button>`;
 const footer=showFooter?`<footer class="footer v401-footer"><div class="total">현재 금액<strong>${money(c.total)}</strong></div>${action}</footer>`:'';
 const preFlow=['type','pickup','pickupTime','phone'].includes(state.step) && state.orderType==='takeout';
 const dineFlow=['partySize','seatZone','seatSelect'].includes(state.step) && state.orderType==='dinein';
 const indicator=(preFlow||dineFlow)?'':(!['home','type','done','cart'].includes(state.step)?selectionIndicator():'');
 const useSidebar=!['home','type','partySize','pickup','pickupTime','phone','seatZone','seatSelect','waiting','waitingDone','done'].includes(state.step);
 const anySidebar=useSidebar||preFlow||dineFlow;
 app.innerHTML=`<div class="shell ${anySidebar?'with-order-sidebar':''} ${dineFlow?'dine-setup-shell':''}">${useSidebar?orderSidebar():(preFlow?preOrderSidebar():(dineFlow?dineSetupSidebar():''))}<div class="shell-content"><header class="header"><div class="brand-lockup"><img src="images/home_logo_v33.png" alt="PAPA JOHNS"><div class="store-name">판교2테크노밸리점</div></div><div class="progress">${labels[state.step]||''}</div></header>${indicator}<main class="main">${content}</main>${footer}</div></div>`
}

let homeLanguage='ko';
localStorage.setItem('papaHomeLanguage','ko');
function homeLanguageLabel(){return {ko:'Language / 언어',en:'English',ja:'日本語',zh:'中文(简体)'}[homeLanguage]||'Language / 언어'}
function toggleHomeLanguage(){const el=document.getElementById('homeLangMenu');if(el)el.classList.add('open')}
function setHomeLanguage(lang){
 homeLanguage=lang;localStorage.setItem('papaHomeLanguage',lang);
 const messages={ko:'한국어로 설정되었습니다.',en:'Language set to English.',ja:'日本語に設定しました。',zh:'已设置为简体中文。'};
 const menu=document.getElementById('homeLangMenu');if(menu)menu.classList.add('open');
 const label=document.querySelector('#homeLangLabel span');if(label)label.textContent=homeLanguageLabel();
 document.querySelectorAll('.home-lang-option').forEach((b,i)=>b.classList.toggle('active',['ko','en','ja','zh'][i]===lang));
 showHomeToast(messages[lang]);
 render();
}
function showHomeToast(text){const el=document.getElementById('homeToast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(window.__homeToastTimer);window.__homeToastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
function showHomeInfo(type){
 const data={
  event:['이벤트 / 혜택','해피아워: 평일 16:00~20:00 픽업 시 레귤러 사이즈 모든 피자 15,000원\n포장 주문: 라지/패밀리 피자 20% 할인 선택 가능'],
  menu:['메뉴 보기','주문을 시작하면 피자, 사이드, 음료 전체 메뉴와 가격을 확인할 수 있습니다.'],
  coupon:['쿠폰 사용','쿠폰 적용 기능은 주문 단계에서 사용할 수 있도록 연결 예정입니다.'],
  store:['매장 안내','파파존스 판교2테크노밸리점\n영업시간 11:00~21:00'],
  review:['리뷰 이벤트','리뷰 작성 이벤트는 직원에게 문의해 주세요.']
 };
 const d=data[type];document.getElementById('homeInfoTitle').textContent=d[0];document.getElementById('homeInfoText').textContent=d[1];document.getElementById('homeInfoModal').classList.add('open');
}
function closeHomeInfo(){const el=document.getElementById('homeInfoModal');if(el)el.classList.remove('open')}

function mobileHomeUI(){
 const d={store:'파파존스 판교2테크노밸리점',headline:'오늘도 갓 구운 피자를\n가장 맛있게 즐겨보세요.',take:'포장 주문',takeDesc:'바로주문 · 예약주문 · 해피아워',takeBtn:'포장 주문 시작하기 →',dine:'먹고가기',dineDesc:'인원 선택 · 좌석 선택 · 세트 주문',dineBtn:'매장 주문 시작하기 →',event:'이벤트 / 혜택',menu:'메뉴 보기',coupon:'쿠폰 사용',storeInfo:'매장 안내',review:'리뷰 이벤트'};
 return `<div class="mobile-home-ui"><div class="mobile-home-top"><img src="images/home_logo_v33.png" alt="PAPA JOHNS"><div class="mobile-korean-only">한국어</div></div><div class="mobile-home-copy"><span>${d.store}</span><h1>${d.headline.replace('\n','<br>')}</h1><p>Better Ingredients. Better Pizza.</p></div><div class="mobile-order-cards"><button class="mobile-takeout" onclick="selectOrderType('takeout')"><small>TAKE OUT</small><strong>${d.take}</strong><span>${d.takeDesc}</span><em>${d.takeBtn}</em></button><button class="mobile-dinein" onclick="selectOrderType('dinein')"><small>DINE IN</small><strong>${d.dine}</strong><span>${d.dineDesc}</span><em>${d.dineBtn}</em></button></div><div class="mobile-home-links"><button onclick="showHomeInfo('event')">${d.event}</button><button onclick="showHomeInfo('menu')">${d.menu}</button><button onclick="showHomeInfo('coupon')">${d.coupon}</button><button onclick="showHomeInfo('store')">${d.storeInfo}</button><button onclick="showHomeInfo('review')">${d.review}</button></div></div>`;
}
function toggleMobileLanguage(){}

function renderBase(){
 if(state.step==='home'){
 app.innerHTML=`<main class="papa-home-image">
   <section class="home-image-stage home-v40-5" aria-label="파파존스 판교2테크노밸리점 주문 시작 화면">
     <button class="home-hotspot dinein" aria-label="먹고가기 주문 시작" onclick="selectOrderType('dinein')">먹고가기</button>
     <button class="home-hotspot takeout" aria-label="포장하기 주문 시작" onclick="selectOrderType('takeout')">포장하기</button>
     <button class="home-hotspot happyhour" aria-label="해피아워 안내" onclick="showHomeInfo('event')">해피아워</button>
     <button class="home-hotspot discount" aria-label="포장 할인 안내" onclick="showHomeInfo('event')">포장 할인</button>
     <button class="home-hotspot drinkpromo" aria-label="신규 음료 안내" onclick="showHomeInfo('menu')">신규 음료</button>
     <div class="home-info-modal" id="homeInfoModal" onclick="if(event.target===this)closeHomeInfo()">
       <div class="home-info-card"><h2 id="homeInfoTitle"></h2><p id="homeInfoText"></p><button onclick="closeHomeInfo()">확인</button></div>
     </div>
   </section>
 </main>`;
 return
}
 if(state.step==='type')return shell(`<section class="service-select"><h1 class="title">어떻게 이용하시나요?</h1><p class="sub">아래 주문 방식을 터치해 주세요.</p><div class="service-grid"><button type="button" class="service-card ${state.orderType==='takeout'?'selected':''}" onclick="selectOrderType('takeout')"><span class="service-icon" aria-hidden="true">🥡</span><strong>포장하기</strong><span class="service-desc">매장에서 포장해 가기</span><span class="service-benefit">라지/패밀리 피자 20% 할인 선택 가능</span></button><button type="button" class="service-card ${state.orderType==='dinein'?'selected':''}" onclick="selectOrderType('dinein')"><span class="service-icon" aria-hidden="true">🍽️</span><strong>먹고가기</strong><span class="service-desc">매장에서 바로 즐기기</span><span class="service-benefit">세트 · UP & UP 이용 가능</span></button></div></section>`,{auto:true});

 if(state.step==='partySize'){
  if(!state.partySize)state.partySize=1;
  return shell(`<section class="party-screen party-screen-v33.1"><h1 class="title">이용 인원을 선택해 주세요</h1><p class="sub">버튼을 눌러 인원을 조정한 뒤 다음으로 이동하세요.</p>
  <div class="party-counter-card">
    <span class="party-counter-icon">👥</span>
    <div class="party-counter-control">
      <button class="party-step party-minus" onclick="changePartySize(-1)" ${state.partySize<=1?'disabled':''}>−</button>
      <strong class="party-count-value">${state.partySize}명</strong>
      <button class="party-step party-plus" onclick="changePartySize(1)" ${state.partySize>=16?'disabled':''}>＋</button>
    </div>
    <small>최소 1명 · 최대 16명</small>
    <em class="party-room-note ${state.partySize>=6?'active':''}">${state.partySize>=6?'ROOM 선택 가능':'6명 이상부터 ROOM을 선택할 수 있습니다.'}</em>
    <div class="party-capacity-note">13~16명은 야외존에서만 선택할 수 있습니다.</div>
    <button class="btn primary party-confirm" onclick="confirmPartySize()">다음 →</button>
  </div></section>`,{auto:true});
 }
 if(state.step==='pickup'){
  const range=immediatePickupRange();
  const rangeText=`${pad2(Math.floor(range.from/60))}:${pad2(range.from%60)}~${pad2(Math.floor(range.to/60))}:${pad2(range.to%60)}`;
  return shell(`<section class="pickup-screen-v33.1"><h1 class="title">포장 주문 방식을 선택해 주세요</h1><p class="sub">바로 주문하거나 오늘 픽업 시간을 예약할 수 있습니다.</p><div class="takeout-choice-grid">
    <button class="takeout-choice-card" onclick="chooseImmediatePickup()"><span class="choice-icon">⚡</span><strong>바로 주문</strong><small>준비시간 약 15~20분</small><em>예상 픽업 ${rangeText}</em></button>
    <button class="takeout-choice-card reserve-card" onclick="openReservationTime()"><span class="choice-icon">🕒</span><strong>예약 주문</strong><small>오늘 11:00~21:00</small><em>시간과 분을 따로 선택</em></button>
  </div><div class="happy-hour-banner"><b>HAPPY HOUR</b><strong>16:00~20:00 픽업</strong><span>레귤러 사이즈 모든 피자 15,000원</span><small>해피아워는 픽업시간 기준입니다.</small></div></section>`);
 }
 if(state.step==='pickupTime'){
  const hours=availableHours(),mins=state.pickupHour===null?[]:availableMinutesForHour(state.pickupHour);
  return shell(`<section class="reservation-time-screen reservation-time-v33.1"><h1 class="title">예약 픽업 시간을 선택해 주세요</h1><p class="sub">당일 예약만 가능하며 5분 단위입니다.</p>
  <div class="wheel-wrap stable-wheel">
   <div class="wheel-col"><b>시간</b><div class="wheel-list hour-wheel">${hours.map(h=>`<button class="${state.pickupHour===h?'active':''}" onclick="choosePickupHour(${h})">${pad2(h)}시</button>`).join('')}</div></div>
   <div class="wheel-col"><b>분</b><div class="wheel-list minute-wheel">${mins.map(m=>`<button class="${state.pickupMinute===m?'active':''}" onclick="choosePickupMinute(${m})">${pad2(m)}분</button>`).join('')}</div></div>
  </div>
  <div class="pickup-result"><span>오늘 예약 픽업</span><strong>${state.pickupHour===null?'--':pad2(state.pickupHour)}:${state.pickupMinute===null?'--':pad2(state.pickupMinute)}</strong>${pickupIsHappyHour()?'<em>🌇 HAPPY HOUR 적용</em>':'<small>일반 예약</small>'}</div>
  <button class="btn primary pickup-confirm" onclick="confirmPickup()">이 시간으로 예약</button></section>`);
 }
 if(state.step==='phone')return shell(`<section class="phone-screen phone-screen-v33.1"><h1 class="title">휴대전화 번호를 입력해 주세요</h1><p class="sub">기본값은 010입니다. 다른 번호는 전체삭제 후 직접 입력할 수 있습니다.</p><div class="phone-display">${state.phoneDisplay||'전화번호를 입력하세요'}</div><div class="phone-actions"><button class="clear-phone" onclick="clearPhoneAll()">전체삭제</button></div><div class="number-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button onclick="appendPhoneDigit(${n})">${n}</button>`).join('')}<button onclick="backspacePhone()">⌫</button><button onclick="appendPhoneDigit(0)">0</button><button class="confirm phone-confirm-btn" ${String(state.phone||'').replace(/\D/g,'').length<9?'disabled':''} onclick="confirmPhone()">선택하기</button></div><small class="phone-note">입력한 번호 뒤 4자리가 고객 호출번호로 사용됩니다.</small></section>`);

 if(state.step==='seatZone'){
  subscribeSeats();
  const zones=SEAT_ZONES.map(z=>{
    const a=zoneAvailability(z.id);
    let allowed=a.open;
    if(z.id==='room')allowed=a.open&&roomCanAccept(state.partySize);
    if(z.id==='outside')allowed=a.open&&outsideCanAccept(state.partySize);

    let reason='선택 가능';
    if(!a.open)reason=a.reason;
    else if(z.id==='room'&&!roomCanAccept(state.partySize)){
      reason=usedTablesInZone('room')===0
        ? '최초 이용은 6~12명'
        : `현재 추가 가능 최대 ${freeTablesInZone('room')*4}명`;
    }else if(z.id==='outside'&&!outsideCanAccept(state.partySize)){
      reason=`현재 추가 가능 최대 ${freeTablesInZone('outside')*4}명`;
    }

    const count=SEAT_MASTER.filter(s=>s.zone===z.id).map(s=>seatInfo(s.id)).filter(s=>s.status==='empty').length;
    const icon=z.id==='papa'?'🍕':z.id==='outside'?'⛱️':z.id==='bottle'?'🪑':'🛋️';
    const capacity=`<span class="zone-capacity">${z.capacityLabel}</span>`;

    return `<button class="seat-zone-card zone-photo-card ${allowed?'':'zone-disabled'}" ${allowed?'':'disabled'} onclick="chooseSeatZone('${z.id}')" style="background-image:linear-gradient(180deg,rgba(0,12,7,.05),rgba(0,14,8,.88)),url('${z.img}')">
      <span class="zone-card-copy"><strong>${z.name}</strong>${capacity}<small>${z.desc}</small><em>${allowed?`이용 가능 좌석 ${count}`:`🔒 ${reason}`}</em></span>
      <span class="zone-card-arrow">→</span>
    </button>`;
  }).join('');
  return shell(`<section class="seat-screen zone-screen-v32"><h1 class="title">어디에 <span class="zone-title-accent">앉으시겠어요?</span></h1><p class="sub">원하시는 구역을 선택해 주세요. · 현재 ${state.partySize}명</p><div class="seat-zone-grid zone-grid-v32">${zones}</div></section>`,{auto:true});
 }
 if(state.step==='seatSelect'){
  subscribeSeats();
  const z=SEAT_ZONES.find(x=>x.id===state.seatZone);
  const list=SEAT_MASTER.filter(s=>s.zone===state.seatZone).map(s=>seatInfo(s.id));

  const seatButton=(s,label='선택하기')=>{
    const maxCapacity=(s.zone==='bottle'&&Number(s.capacity)===4)?5:Number(s.capacity);
    const isGroupZone=['room','outside'].includes(state.seatZone);
    const capacityBlocked=!isGroupZone&&Number(state.partySize)>maxCapacity;
    const selectable=s.status==='empty'&&!capacityBlocked;
    const waitingPossible=s.status==='occupied';
    if(selectable)return `<button class="seat-select-action" onclick="chooseSeat('${s.id}')">${isGroupZone&&Number(state.partySize)>4?'자동 배정 시작':label}</button>`;
    if(waitingPossible)return `<button class="seat-wait-action" onclick='openWaiting(${JSON.stringify(s)})'>줄서기</button>`;
    return `<button class="seat-select-action" disabled>${seatActionLabel(s,capacityBlocked)}</button>`;
  };

  if(state.seatZone==='outside'){
    const cards=list.map((s,i)=>{
      const capacityBlocked=false;
      const statusText=seatStatusName[s.status]||s.status;
      return `<article class="location-seat-card outside-seat-card ${s.status}" style="--seat-crop:${18+i*22}%">
        <div class="location-seat-photo"><span class="seat-number">${i+1}</span></div>
        <div class="location-seat-copy"><strong>${i+1}번 테이블</strong><small>최대 4인</small><em>${statusText}</em>${seatButton(s,'선택하기')}</div>
      </article>`;
    }).join('');
    return shell(`<section class="seat-screen location-seat-screen">
      <h1 class="title">야외 테이블을 선택해 주세요</h1>
      <p class="sub">파파존스 입구에서 보틀 입구 방향으로 1번부터 4번까지 배치되어 있습니다. · 현재 ${state.partySize}명</p>
      <div class="location-direction"><span class="pj-marker">◀ 파파존스 입구</span><span class="direction-line"></span><span class="bottle-marker">보틀 입구 ▶</span></div>
      <div class="location-seat-grid outside-seat-grid">${cards}</div>
      <div class="seat-map-panel outside-map-panel">
        <div class="map-label pj">PAPA JOHN'S<small>파파존스 입구</small></div>
        <div class="map-table-row"><span>1</span><span>2</span><span>3</span><span>4</span></div>
        <div class="map-label bottle">PapaBottle<small>보틀 입구</small></div>
      </div>
      <div class="seat-info-note">입구 표시는 위치 안내용이며 선택 가능한 테이블이 아닙니다.</div>
    </section>`,{auto:true});
  }

  if(state.seatZone==='papa'){
    const bar=list.find(s=>s.id==='papa-2');
    const couple=list.find(s=>s.id==='papa-1');
    const card=(s,type,img,capacity,desc)=>`<article class="papa-seat-card ${s.status}">
      <img src="${img}" alt="${type}">
      <div class="papa-seat-copy"><strong>${type}</strong><small>${capacity}</small><p>${desc}</p><em>${seatStatusName[s.status]||s.status}</em>${seatButton(s,'선택하기')}</div>
    </article>`;
    return shell(`<section class="seat-screen location-seat-screen papa-seat-screen">
      <h1 class="title">파파존 좌석을 선택해 주세요</h1>
      <p class="sub">출입구를 기준으로 왼쪽은 바테이블석, 오른쪽은 커플석입니다. · 현재 ${state.partySize}명</p>
      <div class="papa-seat-grid">
        ${card(bar,'바테이블석','images/seats/papa_bar.jpg','1~4인 · 최대 4인','바 형태의 테이블로 편하게 이용하세요.')}
        <div class="papa-door-marker"><span>출입구</span><b>🚪</b><small>위치 안내</small></div>
        ${card(couple,'커플석','images/seats/papa_couple.jpg','1~2인 추천','아늑하고 조용한 2인 전용 테이블입니다.')}
      </div>
      <div class="seat-map-panel papa-map-panel">
        <div class="papa-map-seat bar"><strong>바테이블석</strong><span>▰ ▰ ▰ ▰</span></div>
        <div class="papa-map-door"><strong>출입구</strong><span>🚪</span></div>
        <div class="papa-map-seat couple"><strong>커플석</strong><span>◯ ─ ◯</span></div>
      </div>
      <div class="seat-info-note">좌석 안내도: 바테이블석 │ 출입구 │ 커플석</div>
    </section>`,{auto:true});
  }

  const groupNote=state.seatZone==='room'
    ? `<div class="group-zone-note">${usedTablesInZone('room')===0?'최초 이용은 6~12명':'남은 테이블 기준 최대 '+freeTablesInZone('room')*4+'명 추가 가능'}</div>`
    : '';
  return shell(`<section class="seat-screen seat-screen-v38"><h1 class="title">테이블을 선택해 주세요</h1><p class="sub">${z?.name||''} · ${state.partySize}명</p>${groupNote}
  <div class="seat-grid seat-grid-v38">${list.map(s=>{
    const maxCapacity=(s.zone==='bottle'&&Number(s.capacity)===4)?5:Number(s.capacity);
    const isGroupZone=state.seatZone==='room';
    const capacityBlocked=!isGroupZone&&Number(state.partySize)>maxCapacity;
    const waitingPossible=s.status==='occupied';
    const elapsed=s.status==='occupied'?seatElapsed(s.occupiedAt):'';
    return `<article class="seat-card-v38 ${s.status} ${capacityBlocked?'capacity-blocked':''}">
      <strong>${s.name}</strong><small>최대 ${maxCapacity}인</small><em>${capacityBlocked?'인원 초과':seatStatusName[s.status]||s.status}</em>
      ${elapsed?`<b class="seat-elapsed">${elapsed}</b>`:''}${seatButton(s,'테이블 선택하기')}
    </article>`;
  }).join('')}</div></section>`,{auto:true});
 }
 if(state.step==='waiting'){
   return shell(`<section class="waiting-screen"><h1 class="title">줄서기 등록</h1><p class="sub">${state.waitingSeatName} 이용 대기</p>
   <div class="waiting-card">
     <div class="waiting-party"><button onclick="changeWaitingParty(-1)">−</button><strong>${state.waitingPartySize}명</strong><button onclick="changeWaitingParty(1)">＋</button></div>
     <div class="waiting-phone-display">${state.waitingPhoneDisplay||'전화번호 입력'}</div>
     <button class="waiting-clear" onclick="waitingClearPhone()">전체삭제</button>
     <div class="number-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button onclick="waitingAppendDigit(${n})">${n}</button>`).join('')}<button onclick="waitingBackspace()">⌫</button><button onclick="waitingAppendDigit(0)">0</button><button class="confirm" onclick="submitWaiting()">대기등록</button></div>
   </div></section>`);
 }
 if(state.step==='waitingDone'){
   return shell(`<section class="waiting-done"><div class="check">✓</div><h1>줄서기 등록 완료</h1><p>${state.waitingSeatName}</p><strong>대기 ${state.waitingQueueNo}번</strong><span>전화번호 뒤 4자리로 확인합니다.</span><button class="btn primary" onclick="goHome()">처음으로</button></section>`);
 }
 if(state.step==='promo'){
  const dinein=state.orderType==='dinein';
  const cards=dinein
   ? `<button type="button" class="promo-card promo-set" onclick="openSetMenu()"><span class="promo-ribbon">BEST CHOICE</span><span class="promo-icon">👨‍👩‍👧‍👦</span><strong>세트메뉴</strong><span class="promo-copy">2인 · 3인 · 4인</span><span class="promo-point">인원에 맞춘 알찬 구성</span></button><button type="button" class="promo-card promo-upup ${state.promo==='upup'?'selected':''}" onclick="choosePromo('upup')"><span class="promo-icon">⬆️</span><strong>UP & UP</strong><span class="promo-copy">라지 주문 시 패밀리 업그레이드</span><span class="promo-point">크러스트까지 무료</span></button><button type="button" class="promo-card promo-normal ${state.promo==='normal'?'selected':''}" onclick="choosePromo('normal')"><span class="promo-icon">🍕</span><strong>일반주문</strong><span class="promo-copy">원하는 메뉴와 옵션 선택</span><span class="promo-point">자유롭게 주문</span></button>`
   : `${pickupIsHappyHour()?`<button type="button" class="promo-card promo-happy" onclick="choosePromo('happyhour')"><span class="promo-ribbon">16~20시 픽업</span><span class="promo-icon">🌇</span><strong>해피아워</strong><span class="promo-copy">레귤러 사이즈 모든 피자</span><span class="promo-point">15,000원</span></button>`:''}<button type="button" class="promo-card promo-set" onclick="openSetMenu()"><span class="promo-ribbon">BEST CHOICE</span><span class="promo-icon">👨‍👩‍👧‍👦</span><strong>세트메뉴</strong><span class="promo-copy">2인 · 3인 · 4인</span><span class="promo-point">인원에 맞춘 알찬 구성</span></button><button type="button" class="promo-card promo-upup ${state.promo==='upup'?'selected':''}" onclick="choosePromo('upup')"><span class="promo-icon">⬆️</span><strong>UP & UP</strong><span class="promo-copy">라지 주문 시 패밀리 업그레이드</span><span class="promo-point">크러스트까지 무료</span></button><button type="button" class="promo-card promo-takeout ${state.promo==='takeout'?'selected':''}" onclick="choosePromo('takeout')"><span class="promo-icon">🏷️</span><strong>포장 20%</strong><span class="promo-copy">라지/패밀리 피자 할인</span><span class="promo-point">포장 전용 혜택</span></button><button type="button" class="promo-card promo-normal ${state.promo==='normal'?'selected':''}" onclick="choosePromo('normal')"><span class="promo-icon">🍕</span><strong>일반주문</strong><span class="promo-copy">원하는 메뉴와 옵션 선택</span><span class="promo-point">자유롭게 주문</span></button>`;
  return shell(`<section class="promo-select"><h1 class="title">주문 유형을 선택해 주세요</h1><p class="sub">${dinein?'세트메뉴, UP & UP, 일반주문 중 선택해 주세요.':'적용할 주문 혜택을 선택해 주세요.'}</p><div class="promo-grid ${dinein?'three':'four'}">${cards}</div><div class="notice promo-notice">UP & UP은 L 사이즈 판매 피자 전용입니다. 결제는 L 피자 가격으로 하고, F 사이즈와 선택 크러스트로 무료 업그레이드됩니다.</div></section>`,{auto:true});
 }
 if(state.step==='setChoice')return shell(`<section class="set-select set-select-v402"><h1 class="title">세트메뉴를 선택해 주세요</h1><p class="sub">구성 사진과 사이즈를 확인한 뒤 세트를 선택해 주세요.</p><div class="set-grid">${[2,3,4].map(n=>{const meta=n===2?{badge:'2인 추천',size:'레귤러',price:24000,copy:'레귤러 피자 1판 + 파스타 1개 + 500mL 음료 1개',cls:'set-two',pizza:'images/super_papas.jpg',side:'images/meat_sauce_pasta.png',drink:'images/coke_500.png'}:n===3?{badge:'가장 인기',size:'라지',price:33000,copy:'라지 피자 1판 + 사이드 1개 + 대용량 음료 1개',cls:'set-three',pizza:'images/super_papas.jpg',side:'images/chicken_strips.jpg',drink:'images/coke_1250.png'}:{badge:'가성비 최고',size:'패밀리',price:42000,copy:'패밀리 피자 1판 + 사이드 2개 + 대용량 음료 1개',cls:'set-four',pizza:'images/super_papas.jpg',side:'images/wings.jpg',drink:'images/coke_1250.png'};return `<button type="button" class="set-card ${meta.cls}" onclick="selectSet(${n})"><span class="set-card-badge">${meta.badge}</span><div class="set-photo-combo"><img src="${meta.pizza}" alt="피자"><img src="${meta.side}" alt="사이드"><img src="${meta.drink}" alt="음료"></div><strong>${n}인 세트</strong><span class="set-size">${meta.size} 전용</span><span class="set-copy">${meta.copy}</span><span class="set-price">${money(meta.price)}</span><span class="set-action">선택하기 →</span></button>`}).join('')}</div><div class="notice set-notice">세트메뉴는 수타도우 전용이며 선택한 세트에 따라 사이즈가 자동 적용됩니다.</div></section>`,{auto:true});
 if(state.step==='pizzaMode')return shell(`<section class="topping-choice"><h1 class="title">피자 구성을 선택해 주세요</h1><p class="sub">하프앤하프는 L/F 사이즈에서만 가능하며 추가금 1,000원이 발생합니다.</p><div class="topping-choice-grid"><button type="button" class="topping-choice-card add" onclick="selectPizzaMode('single')"><span class="choice-icon">🍕</span><strong>한 판</strong><span>한 가지 피자로 주문합니다</span></button><button type="button" class="topping-choice-card skip" onclick="selectPizzaMode('half')"><span class="choice-icon">◐</span><strong>하프앤하프</strong><span>두 가지 피자 반반 +1,000원</span></button></div></section>`,{auto:true});
 if(state.step==='dough')return shell(`<section class="crust-select"><h1 class="title">도우 타입을 선택해 주세요</h1><p class="sub">사진이 있는 큰 카드를 터치하면 바로 다음 단계로 이동합니다.</p><div class="dough-card-grid"><button type="button" class="crust-image-card ${state.dough==='hand'?'selected':''}" onclick="selectDough('hand')"><img src="images/crust/original.jpg" alt="수타도우 오리지널"><span class="crust-card-body"><strong>수타도우</strong><span>쫄깃하고 고소한 기본 도우</span><em>R · L · F 선택 가능</em></span></button><button type="button" class="crust-image-card ${state.dough==='thin'?'selected':''} ${state.promo==='upup'?'disabled':''}" onclick="selectDough('thin')"><img src="images/crust/thin.jpg" alt="씬도우"><span class="crust-card-body"><strong>씬도우</strong><span>바삭한 식감, 더욱 풍부한 토핑</span><em>${state.promo==='upup'?'UP & UP 적용 불가':'F 사이즈 전용 · 모든 피자 가능'}</em></span></button></div></section>`,{auto:true});
 if(state.step==='size'){
  const fixed=state.dough==='thin'||state.promo==='upup'||state.set;
  return shell(`<h1 class="title">사이즈를 선택해 주세요</h1><div class="grid"><div class="card choice ${state.size==='R'?'selected':''} ${fixed||state.dough==='thin'||isHalf()?'disabled':''}" onclick="selectSize('R')"><strong>레귤러</strong><span>23cm · 1~2인</span></div><div class="card choice ${state.size==='L'?'selected':''} ${(fixed&&state.promo!=='upup')?'disabled':''}" onclick="selectSize('L')"><strong>라지</strong><span>${state.promo==='upup'?'선택 필수 · F로 무료 업그레이드':'31cm · 2~3인'}</span></div><div class="card choice ${state.size==='F'?'selected':''} ${state.promo==='upup'||state.set?'disabled':''}" onclick="selectSize('F')"><strong>패밀리</strong><span>36cm · 3~4인</span></div></div>${fixed?'<div class="notice">선택한 도우 또는 프로모션에 따라 사이즈가 자동 지정되었습니다.</div>':''}`,{auto:true});
 }
 if(state.step==='crust'){
  const all=[
   {name:'오리지널',img:'images/crust/original.jpg',desc:'파파존스의 기본 수타 도우',price:'추가금 없음',disabled:false},
   {name:'골드링',img:'images/crust/gold_ring.jpg',desc:'고구마 무스와 스트링 치즈, 체다 치즈',price:state.promo==='upup'?'무료 업그레이드':`+${money(crustOptionPrice('골드링'))}`,disabled:state.size==='R'},
   {name:'치즈롤',img:'images/crust/cheese_roll.jpg',desc:'모짜렐라 치즈가 가득한 부드러운 크러스트',price:state.promo==='upup'?'무료 업그레이드':`+${money(crustOptionPrice('치즈롤'))}`,disabled:state.size==='R'},
   {name:'씬',img:'images/crust/thin.jpg',desc:'얇고 바삭한 파파존스 스타일 씬 도우',price:'추가금 없음',disabled:state.promo==='upup'||state.set||isHalf()}
  ];
  return shell(`<section class="crust-select crust-v40"><h1 class="title">크러스트를 선택해 주세요</h1><p class="sub">판교2테크노밸리점에서 제공하는 네 가지 크러스트입니다.</p><div class="crust-card-grid four-v40">${all.map(m=>`<button type="button" class="crust-image-card ${state.crust===m.name?'selected':''} ${m.disabled?'disabled':''}" onclick="selectCrustV40('${m.name}')"><img src="${m.img}" alt="${m.name}"><span class="crust-card-body"><strong>${m.name}</strong><span>${m.desc}</span><em>${m.disabled?'현재 구성에서 선택 불가':m.price}</em></span></button>`).join('')}</div></section>`,{auto:true});
 }
 if(state.step==='pizza'){
  const cats=['ALL','BEST','SPECIALTY','CLASSIC','THIN'];
  const priceSize=state.promo==='upup'?'L':state.size;
  const halfBlocked=['bulgogi','ranch','ham','shrimp'];
  let list=PIZZAS.filter(p=>{if(state.dough==='hand'&&p.thinOnly)return false;if(!p.sizes.includes(priceSize))return false;if(isHalf()&&halfBlocked.includes(p.id))return false;if(isHalf()&&state.halfStage==='right'&&p.id===state.pizzaLeft)return false;if(isHalf()&&state.halfStage==='right'&&state.pizzaLeft==='favorite'&&p.id!=='six')return false;if(isHalf()&&state.halfStage==='right'&&state.pizzaLeft==='six'&&p.id!=='favorite')return false;if(isHalf()&&state.halfStage==='right'&&p.id==='favorite'&&state.pizzaLeft!=='six')return false;if(isHalf()&&state.halfStage==='right'&&p.id==='six'&&state.pizzaLeft!=='favorite')return false;return state.category==='ALL'||p.cat===state.category});
  const leftPizza=isHalf()&&state.pizzaLeft?PIZZAS.find(p=>p.id===state.pizzaLeft):null;
  const rightPizza=isHalf()&&state.pizzaRight?PIZZAS.find(p=>p.id===state.pizzaRight):null;
  const halfPreview=isHalf()?`<section class="half-preview ${state.halfStage==='confirm'?'complete':''}"><div class="half-pizza-visual ${state.halfStage==='confirm'?'large':''}"><div class="half-slice left" style="background-image:url('${leftPizza?leftPizza.img:''}')">${leftPizza?'':'<span>왼쪽</span>'}</div><div class="half-slice right" style="background-image:url('${rightPizza?rightPizza.img:''}')">${rightPizza?'':'<span>오른쪽</span>'}</div></div><div class="half-preview-copy"><strong>${leftPizza?leftPizza.name:'왼쪽 피자 선택'} + ${rightPizza?rightPizza.name:'오른쪽 피자 선택'}</strong><span>${state.halfStage==='left'?'먼저 왼쪽 피자를 선택해 주세요.':state.halfStage==='right'?'왼쪽에 선택한 '+leftPizza.name+'는 목록에서 숨겨졌습니다. 다른 피자를 선택해 주세요.':'하프앤하프 조합이 완성되었습니다. 아래 내용을 확인해 주세요.'}</span><em>하프앤하프 추가금 +1,000원</em></div></section>`:'';
  if(isHalf()&&state.halfStage==='confirm')return shell(`<section class="half-confirm-screen"><h1 class="title">하프앤하프 조합을 확인해 주세요</h1>${halfPreview}<div class="half-confirm-actions"><button class="btn secondary big-action" onclick="changeHalfSelection()">다시 선택</button><button class="btn primary big-action" onclick="confirmHalfSelection()">이 조합으로 확인</button></div></section>`,{auto:true});
  const guide=isHalf()?`<p class="sub">${state.halfStage==='left'?'왼쪽':'오른쪽'} 피자를 선택해 주세요.</p>`:state.set===2?'<p class="sub">2인 세트는 레귤러 사이즈 판매 메뉴만 표시됩니다.</p>':'';
  const selectedId=isHalf()?(state.halfStage==='left'?state.pizzaLeft:state.pizzaRight):state.pizza;
  return shell(`<h1 class="title">${isHalf()?'하프앤하프 피자를 선택해 주세요':'피자를 선택해 주세요'}</h1>${halfPreview}${guide}<div class="tabs">${cats.map(c=>`<button class="tab ${state.category===c?'active':''}" onclick="state.category='${c}';render()">${c}</button>`).join('')}</div><div class="grid">${list.map(p=>`<div class="card ${selectedId===p.id?'selected':''}" onclick="selectPizza('${p.id}')"><span class="badge">${p.cat}</span><img src="${p.img}" alt="${p.name}"><h3>${p.name}</h3><p class="price">${money(p.prices[priceSize]||0)}</p></div>`).join('')}</div>`,{auto:true});
 }
 if(state.step==='topping'){
  if(!state.toppingExpanded)return shell(`<section class="topping-choice"><h1 class="title">토핑을 추가하시겠어요?</h1><p class="sub">원하시는 방법을 터치해 주세요.</p><div class="topping-choice-grid"><button type="button" class="topping-choice-card add" onclick="openToppings()"><span class="choice-icon">➕</span><strong>토핑 추가하기</strong><span>치즈, 고기, 야채 토핑을 선택합니다</span></button><button type="button" class="topping-choice-card skip" onclick="skipToppings()"><span class="choice-icon">➡️</span><strong>건너뛰기</strong><span>추가 토핑 없이 다음 단계로 이동합니다</span></button></div></section>`,{auto:true});
  return shell(`<h1 class="title">추가할 토핑을 선택해 주세요</h1><p class="sub">전체 합계 최대 5개, 동일 토핑 최대 2개 · 선택한 토핑 금액은 주문금액에 추가됩니다.</p><div class="grid four">${TOPPINGS.map(t=>{const q=state.toppings[t.id]||0;return `<div class="card"><h3>${t.name}</h3><p>${money(t.price[effectiveSize()])}</p><div class="qty"><button onclick="qty('toppings','${t.id}',-1)">−</button><strong>${q}</strong><button onclick="qty('toppings','${t.id}',1)">＋</button></div></div>`}).join('')}</div>`);
 }
 if(state.step==='side'){
  if(state.set){
   const includedList=visibleSides();
   const guide=state.set===2?'파스타 3종 중 1개가 세트에 포함됩니다.':state.set===3?'브라우니를 제외한 사이드 중 1개가 세트에 포함됩니다.':'브라우니를 제외한 사이드 중 2개가 세트에 포함됩니다.';
   return shell(`<h1 class="title">사이드 메뉴를 선택해 주세요</h1><p class="sub">${guide}</p><section class="menu-section included-section"><div class="section-heading"><div><span class="section-badge">세트 포함</span><h2>포함 사이드 선택</h2></div><strong>${includedCount('includedSides')} / ${setSideLimit()}</strong></div><div class="grid side-grid compact-product-grid">${includedList.map(s=>itemCard(s,'includedSides',true)).join('')}</div></section><section class="menu-section extra-section"><div class="section-heading"><div><span class="section-badge extra">추가 결제</span><h2>사이드 추가 주문</h2></div><span>선택 시 판매가가 추가됩니다</span></div><div class="extra-alert">⚠ 세트 구성 외 추가 상품입니다. ＋ 버튼을 누르면 추가금 안내 팝업이 표시됩니다.</div><div class="grid side-grid compact-product-grid">${SIDES.map(s=>itemCard(s,'sides',false)).join('')}</div></section>`,{nextDisabled:includedCount('includedSides')!==setSideLimit()});
  }
  return shell(`<h1 class="title">사이드 메뉴를 선택해 주세요</h1><p class="sub">원하는 사이드를 추가해 보세요.</p><div class="grid side-grid compact-product-grid">${SIDES.map(s=>itemCard(s,'sides')).join('')}</div>`,{skip:true});
 }
 if(state.step==='drink'){
  const includedList=setIncludedDrinks();
  const allFamilies=drinkFamilies(DRINKS);
  const includedFamilies=drinkFamilies(includedList);
  const setRule=state.set===2
   ? '2인 세트는 각 음료의 500mL만 선택할 수 있습니다.'
   : '3·4인 세트는 코카콜라·코카콜라 제로 1.25L, 스프라이트·스프라이트 제로 1.5L 중 선택할 수 있습니다.';
  return shell(`<section class="drink-screen-v39"><div class="drink-screen-head"><div><h1 class="title">음료를 선택해 주세요</h1><p class="sub">세트에 포함된 음료 1개를 선택하세요.</p></div>${state.set?'<div class="drink-info">ⓘ 세트 음료 변경 시 추가금이 발생할 수 있습니다.</div>':''}</div>
  ${state.set?`<section class="menu-section included-section drink-layout-section"><div class="section-heading"><div><span class="section-badge">세트 포함</span><h2>포함 음료 선택</h2></div><strong>${includedCount('includedDrinks')} / 1</strong></div><p class="set-drink-rule">${setRule}</p><div class="drink-family-grid">${includedFamilies.map(f=>drinkFamilyCard(f.items,'includedDrinks',true)).join('')}</div></section>`:''}
  <section class="menu-section extra-section drink-layout-section"><div class="section-heading"><div><span class="section-badge extra">추가 결제</span><h2>음료 추가 주문</h2></div><span>원하는 음료와 용량을 선택하세요</span></div><div class="drink-family-grid">${allFamilies.map(f=>drinkFamilyCard(f.items,'drinks',false)).join('')}</div></section></section>`,{nextDisabled:state.set&&includedCount('includedDrinks')!==1});
 }
 if(state.step==='review'){
  const c=calc();
  return shell(`<h1 class="title">주문 내용을 확인해 주세요</h1><div class="summary"><div class="summary-row"><b>이용방법</b><span>${state.orderType==='takeout'?'포장':'먹고가기'}</span></div>${state.orderType==='dinein'?`<div class="summary-row"><b>연락처</b><span>${formatPhone(state.phone)}</span></div>`:''}${state.orderType==='takeout'?`<div class="summary-row"><b>픽업 방식</b><span>${state.pickupMode==='now'?'바로 주문 (15~20분)':'예약 주문'}</span></div><div class="summary-row"><b>픽업 예정</b><span>오늘 ${state.pickupTime||'-'}</span></div><div class="summary-row"><b>연락처</b><span>${formatPhone(state.phone)}</span></div>`:`<div class="summary-row"><b>이용 인원</b><span>${state.partySize||'-'}명</span></div>`}${state.orderType==='dinein'?`<div class="summary-row"><b>선택 좌석</b><span>${state.seatName||'-'} · 최대 ${state.seatCapacity||'-'}인</span></div>`:''}<div class="summary-row"><b>혜택</b><span>${state.set?state.set+'인 세트':state.promo==='takeout'?'포장 20%':state.promo==='happyhour'?'해피아워 레귤러 15,000원':state.promo==='upup'?'UP & UP':'일반 주문'}</span></div><div class="summary-row"><b>피자</b><span>${pizzaDisplayName()}${isHalf()?' (하프앤하프)':''} · ${state.dough==='thin'?'씬도우':'수타도우'} · ${state.promo==='upup'?'라지 주문 → 패밀리 업그레이드':sizeLabel(state.size)} · ${state.crust}</span></div>${isHalf()?`<div class="summary-row"><b>하프앤하프 추가금</b><span>${money(1000)}</span></div>`:''}<div class="summary-row"><b>추가 토핑</b><span>${Object.entries(state.toppings).filter(x=>x[1]).map(([id,q])=>TOPPINGS.find(t=>t.id===id).name+' ×'+q).join(', ')||'없음'}</span></div>${state.set?`<div class="summary-row"><b>세트 포함 사이드</b><span>${names(state.includedSides,SIDES)}</span></div><div class="summary-row"><b>세트 포함 음료</b><span>${names(state.includedDrinks,DRINKS)}</span></div>`:''}<div class="summary-row"><b>${state.set?'추가 사이드':'사이드'}</b><span>${names(state.sides,SIDES)}</span></div><div class="summary-row"><b>${state.set?'추가 음료':'음료'}</b><span>${names(state.drinks,DRINKS)}</span></div>${state.set?`<div class="summary-row"><b>세트 기본금액</b><span>${money(state.set===2?24000:state.set===3?33000:42000)}</span></div><div class="summary-row"><b>크러스트 추가금</b><span>${money(crustPrice())}</span></div><div class="summary-row"><b>토핑 추가금</b><span>${money(toppingPrice())}</span></div><div class="summary-row"><b>추가 사이드</b><span>${money(c.sides)}</span></div><div class="summary-row"><b>추가 음료</b><span>${money(c.drinks)}</span></div>`:''}${!state.set?`<div class="summary-row"><b>피자 금액</b><span>${money(c.pizza)}</span></div><div class="summary-row"><b>크러스트 추가금</b><span>${money(c.crust)}</span></div><div class="summary-row"><b>토핑 추가금</b><span>${money(c.topping)}</span></div>`:''}${c.discount?`<div class="summary-row discount"><b>포장 할인</b><span>-${money(c.discount)}</span></div>`:''}${state.promo==='upup'?`<div class="summary-row"><b>라지 피자 정상가</b><span>${money(basePizzaPrice())}</span></div><div class="summary-row discount"><b>UP & UP 할인</b><span>-${money(c.upupDiscount)}</span></div><div class="summary-row"><b>무료 혜택</b><span>패밀리 사이즈 업그레이드 + ${state.crust==='오리지널'?'오리지널 크러스트':'크러스트 업그레이드'}</span></div>`:''}<div class="summary-row"><b style="font-size:24px">총 결제금액</b><strong class="price" style="font-size:28px">${money(c.total)}</strong></div></div><div class="notice" style="margin-top:15px">현재 버전은 주문 흐름·가격 계산 확인용입니다. 실제 카드 승인, POS, 영수증 출력은 연결되어 있지 않습니다.</div>`);
 }
 if(state.step==='cart'){
  return shell(`<section class="cart-screen"><h1 class="title">장바구니</h1><p class="sub">여러 세트와 일반 메뉴를 함께 주문할 수 있습니다.</p>${state.cart.length?`<div class="cart-list">${state.cart.map((item,i)=>`<article class="cart-item">${itemSummary(item)}<div class="cart-item-side"><strong>${money(item.total*item.qty)}</strong><div class="qty cart-qty"><button onclick="cartQty(${i},-1)">−</button><span>${item.qty}</span><button onclick="cartQty(${i},1)">＋</button></div><button class="cart-remove" onclick="removeCartItem(${i})">삭제</button></div></article>`).join('')}</div><div class="cart-total-box"><span>총 결제금액</span><strong>${money(cartTotal())}</strong></div><div class="cart-actions"><button class="btn secondary big-action" onclick="addMoreMenu()">＋ 다른 메뉴 추가</button><button class="btn primary big-action" onclick="checkoutCart()">주문확정</button></div>`:`<div class="empty-cart">장바구니가 비어 있습니다.<button class="btn primary" onclick="addMoreMenu()">메뉴 담기</button></div>`}</section>`);
 }
 if(state.step==='done')return shell(`<section class="order-confirmed-screen">
   <div class="confirmed-check">✓</div>
   <h1>주문이 확정되었습니다</h1>
   <p>고객번호</p>
   <strong class="customer-number">${state.orderNo||state.phone.slice(-4)}</strong>
   <div class="payment-request-box">
     <b>직원에게 결제를 요청해 주세요</b>
     <span>결제 확인 후 조리가 시작됩니다.</span>
   </div>
   <small>결제 전에는 조리가 시작되지 않습니다.</small>
   <button class="btn primary" onclick="goHome()">처음으로</button>
 </section>`);

}
function itemCard(x,key,included=false){const q=state[key][x.id]||0;return `<div class="card ${included?'included-card':''} ${q>0?'selected':''} clickable-card" onclick="qty('${key}','${x.id}',1)">${q>0?'<span class="card-selected-check">✓</span>':''}<img src="${x.img}" alt="${x.name}"><h3>${x.name}</h3><p class="price">${money(x.price)}</p>${included?'<small class="included-price-note">세트 포함 · 결제 0원</small>':''}<div class="qty ${q>0?'has-value':''}"><button onclick="event.stopPropagation();qty('${key}','${x.id}',-1)">−</button><strong>${q}</strong><button onclick="event.stopPropagation();qty('${key}','${x.id}',1)">＋</button></div><small class="tap-hint">카드를 터치해 수량 추가</small></div>`}
function names(obj,list){const a=Object.entries(obj).filter(x=>x[1]).map(([id,q])=>list.find(x=>x.id===id).name+' ×'+q);return a.join(', ')||'없음'}
function qty(key,id,d){
 let obj=state[key];let cur=obj[id]||0;
 if(d>0&&key==='toppings'){
   const total=Object.values(obj).reduce((a,b)=>a+b,0);
   if(total>=5)return alert('추가토핑은 전체 합계 최대 5개까지 선택할 수 있습니다.');
   if(cur>=2)return alert('동일 토핑은 최대 2개까지 선택할 수 있습니다.');
 }
 if(d>0&&state.set&&key==='includedSides'){
   if(includedCount('includedSides')>=setSideLimit()){alert(`세트 기본 제공 수량을 초과했습니다.\n추가 주문은 아래 ‘사이드 추가 주문’ 섹션에서 선택해 주세요.`);requestAnimationFrame(()=>document.querySelector('.extra-section')?.scrollIntoView({behavior:'smooth',block:'start'}));return;}
 }
 if(d>0&&state.set&&key==='includedDrinks'){
   if(includedCount('includedDrinks')>=1){alert('세트 기본 제공 수량을 초과했습니다.\n추가 주문은 아래 ‘음료 추가 주문’ 섹션에서 선택해 주세요.');requestAnimationFrame(()=>document.querySelector('.extra-section')?.scrollIntoView({behavior:'smooth',block:'start'}));return;}
 }
 if(d>0&&state.set&&(key==='sides'||key==='drinks')){
   const list=key==='sides'?SIDES:DRINKS;
   const item=list.find(x=>x.id===id);
   const ok=confirm(`${item.name}은(는) 세트 포함 상품 외 추가 주문입니다.\n\n추가금 ${money(item.price)}이 결제금액에 더해집니다.\n추가하시겠습니까?`);
   if(!ok)return;
 }
 cur=Math.max(0,Math.min(9,cur+d));obj[id]=cur;
 const preserve=['side','drink'].includes(state.step);
 const y=window.scrollY;
 const main=document.querySelector('.main');
 const mainY=main?.scrollTop||0;
 render();
 if(preserve)requestAnimationFrame(()=>{window.scrollTo(0,y);const m=document.querySelector('.main');if(m)m.scrollTop=mainY});
}
function selectOrderType(type){
 state.orderType=type;state.promo=null;state.set=null;
 if(type==='dinein'){subscribeSeats();state.step='partySize';}else{state.pickupMode=null;state.pickupHour=null;state.pickupMinute=null;state.pickupTime=null;state.phone='010';state.phoneDisplay='010-';state.phonePrefixCleared=false;state.step='pickup';}
 render();
}
function selectPizzaMode(mode){
 state.pizzaMode=mode;state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.halfStage='left';
 if(mode==='half'){
  if(state.set===2)return alert('2인 세트는 레귤러 사이즈 전용으로 하프앤하프를 선택할 수 없습니다.');
  if(!state.set&&state.promo!=='upup'&&state.size==='R')state.size=null;
 }
 if(state.set){state.step=state.set===2?'pizza':'crust';}
 else if(state.promo==='upup'){state.step='crust';}
 else state.step='dough';
 render();
}
function selectDough(dough){
 if(state.promo==='upup')return;
 state.dough=dough;resetAfter('dough');
 if(dough==='thin'){state.size='F';state.step='crust';}
 else state.step='size';
 render();
}
function selectSize(size){
 if(state.set||state.promo==='upup'||state.dough==='thin'||(isHalf()&&size==='R'))return;
 state.size=size;resetAfter('size');state.step='crust';render();
}
function selectCrustV40(crust){
 if(crust==='씬'){
  if(state.promo==='upup'||state.set||isHalf())return;
  state.dough='thin';state.size='F';state.crust='씬';state.pizza=null;state.step='pizza';render();return;
 }
 if(state.dough==='thin')state.dough='hand';
 selectCrust(crust);
}
function selectCrust(crust){
 state.crust=crust;state.pizza=null;state.step='pizza';render();
}
function selectPizza(id){
 if(isHalf()){
  if(state.halfStage==='left'){state.pizzaLeft=id;state.pizzaRight=null;state.halfStage='right';state.category='ALL';render();return;}
  state.pizzaRight=id;state.halfStage='confirm';render();return;
 }else state.pizza=id;
 state.toppingExpanded=false;state.step='topping';render();
}
function confirmHalfSelection(){state.toppingExpanded=false;state.step='topping';render();}
function changeHalfSelection(){state.halfStage='right';state.pizzaRight=null;state.category='ALL';render();}
function openToppings(){state.toppingExpanded=true;render();}
function skipToppings(){state.toppings={};state.toppingExpanded=false;state.step='side';render();}
function choosePromo(promo){
 if(promo==='happyhour'&&!pickupIsHappyHour())return alert('해피아워는 픽업 시간이 16:00~20:00일 때만 적용됩니다.');
 state.promo=promo;
 state.set=null;
 state.toppings={};state.sides={};state.drinks={};state.includedSides={};state.includedDrinks={};state.toppingExpanded=false;
 if(promo==='happyhour'){state.dough='hand';state.size='R';state.crust='오리지널';state.pizzaMode='single';state.step='pizza';render();return;}
 if(promo==='upup'){
  state.dough='hand';state.size='L';state.crust=null;state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.step='pizzaMode';
 }else{
  state.dough=null;state.size=null;state.crust=null;state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.step='pizzaMode';
 }
 render();
}
function openSetMenu(){
 state.promo=null;state.set=null;state.dough=null;state.size=null;state.crust=null;state.pizzaMode='single';state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.halfStage='left';
 state.toppings={};state.sides={};state.drinks={};state.includedSides={};state.includedDrinks={};state.toppingExpanded=false;state.step='setChoice';render();
}
function selectSet(n){
 state.set=n;
 state.promo='set';
 state.dough='hand';
 state.size=n===2?'R':n===3?'L':'F';
 state.crust=n===2?'오리지널':null;
 state.pizzaMode='single';state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.halfStage='left';
 state.toppings={};
 state.toppingExpanded=false;
 state.sides={};
 state.drinks={};
 state.includedSides={};
 state.includedDrinks={};
 if(n===2){state.pizzaMode='single';state.step='pizza';}else{state.step='pizzaMode';}
 render();
}

function reselectCurrent(){
 if(state.step==='cart')return addMoreMenu();
 const ok=confirm('현재 선택 중인 피자와 옵션을 다시 선택하시겠습니까?\n\n장바구니에 담긴 메뉴는 유지됩니다.');
 if(!ok)return;
 state.pizza=null;state.pizzaLeft=null;state.pizzaRight=null;state.halfStage='left';
 state.toppings={};state.sides={};state.drinks={};state.includedSides={};state.includedDrinks={};state.toppingExpanded=false;
 if(state.set===2){state.dough='hand';state.size='R';state.crust='오리지널';state.pizzaMode='single';state.step='pizza';}
 else if(state.set===3||state.set===4){state.dough='hand';state.size=state.set===3?'L':'F';state.crust=null;state.pizzaMode='single';state.step='pizzaMode';}
 else if(state.promo==='upup'){state.dough='hand';state.size='L';state.crust=null;state.pizzaMode='single';state.step='pizzaMode';}
 else {state.dough=null;state.size=null;state.crust=null;state.pizzaMode='single';state.step='pizzaMode';}
 render();
}
async function goHome(){
 const ok=confirm('현재 선택 내용과 장바구니를 모두 초기화하고 처음 화면으로 이동하시겠습니까?');
 if(!ok)return;
 await releaseCurrentSeat();
 state.orderType=null;state.cart=[];state.orderNo=null;state.partySize=null;state.pickupMode=null;state.pickupHour=null;state.pickupMinute=null;state.pickupTime=null;state.phone='010';state.phoneDisplay='010-';state.phonePrefixCleared=false;
 clearCurrentSelection();
 state.step='home';
 render();
}

function next(){
 if(state.step==='promo'&&state.promo==='upup'){
   state.dough='hand';
   state.size='L';
   state.crust=null;
   state.pizza=null;
   state.step='crust';
   render();
   return;
 }
 if(state.step==='promo'&&state.set){
   // 세트는 씬도우를 사용할 수 없고 사이즈가 자동 고정됩니다.
   state.dough='hand';
   state.size=state.set===2?'R':state.set===3?'L':'F';
   if(state.set===2){
     state.crust='오리지널';
     state.step='pizza'; // 2인 세트는 R 전용이므로 바로 피자 선택
   }else{
     state.crust=null;
     state.step='crust'; // 3·4인 세트는 크러스트 선택부터
   }
   render();
   return;
 }
 const map={type:'promo',promo:'dough',dough:'size',size:'crust',crust:'pizza',pizza:'topping',topping:'side',side:'drink',drink:'review',review:'done'};
 if(state.step==='review'){addCurrentToCart();return;}
 state.step=map[state.step]||state.step;render();
}
async function back(){
 if(state.orderType==='dinein'&&state.seatId&&['promo','setChoice','pizzaMode','dough','size','crust','pizza','topping','side','drink','review','cart'].includes(state.step)){await releaseCurrentSeat();state.step='seatZone';render();return;}
 if(state.step==='pizza'&&state.set===2){state.step='setChoice';render();return;}
 if(state.step==='pizza'&&isHalf()&&state.halfStage==='confirm'){state.halfStage='right';state.pizzaRight=null;render();return;}
 if(state.step==='pizza'&&isHalf()&&state.halfStage==='right'){state.halfStage='left';state.pizzaRight=null;render();return;}
 if(state.step==='crust'&&state.set){state.step='pizzaMode';render();return;}
 if(state.step==='crust'&&state.promo==='upup'){state.step='pizzaMode';render();return;}
 const map={type:'home',partySize:'type',pickup:'type',pickupTime:'pickup',phone:state.orderType==='dinein'?'seatSelect':(state.pickupMode==='reserve'?'pickupTime':'pickup'),seatZone:'partySize',seatSelect:'seatZone',waiting:'seatSelect',waitingDone:'home',promo:state.orderType==='dinein'?'seatSelect':'phone',setChoice:'promo',pizzaMode:state.set?'setChoice':'promo',dough:'pizzaMode',size:'dough',crust:'size',pizza:'crust',topping:'pizza',side:'topping',drink:'side',review:'drink',cart:'promo'};
 state.step=map[state.step]||'home';render();
}

const UI_I18N={
 en:{
  '판교2테크노밸리점':'Pangyo 2 Techno Valley','어떻게 이용하시나요?':'How would you like to order?','아래 주문 방식을 터치해 주세요.':'Please select an order type below.','포장하기':'Take Out','매장에서 포장해 가기':'Pick up your order at the store','라지/패밀리 피자 20% 할인 선택 가능':'20% off L/F pizzas available','먹고가기':'Dine In','매장에서 바로 즐기기':'Enjoy your meal in the store','세트 · UP & UP 이용 가능':'Sets and UP & UP available','이용 인원을 선택해 주세요':'Select the number of guests','버튼을 눌러 인원을 조정한 뒤 다음으로 이동하세요.':'Adjust the number, then continue.','최소 1명 · 최대 16명':'Minimum 1 · Maximum 16','다음 →':'Next →','포장 주문 방식을 선택해 주세요':'Choose a takeout option','바로 주문하거나 오늘 픽업 시간을 예약할 수 있습니다.':'Order now or reserve a pickup time today.','바로 주문':'Order Now','준비시간 약 15~20분':'Ready in about 15–20 minutes','예약 주문':'Reserve Pickup','시간과 분을 따로 선택':'Select hour and minute','레귤러 사이즈 모든 피자 15,000원':'All R-size pizzas ₩15,000','해피아워는 픽업시간 기준입니다.':'Happy Hour is based on pickup time.','예약 픽업 시간을 선택해 주세요':'Select a pickup time','당일 예약만 가능하며 5분 단위입니다.':'Same-day reservations only, in 5-minute intervals.','시간':'Hour','분':'Minute','오늘 예약 픽업':'Today’s pickup','일반 예약':'Standard reservation','이 시간으로 예약':'Reserve this time','휴대전화 번호를 입력해 주세요':'Enter your mobile number','기본값은 010입니다. 다른 번호는 전체삭제 후 직접 입력할 수 있습니다.':'010 is prefilled. To use another prefix, clear all first.','전화번호를 입력하세요':'Enter phone number','전체삭제':'Clear all','확인':'Confirm','입력한 번호 뒤 4자리가 고객 호출번호로 사용됩니다.':'The last 4 digits will be used as your pickup number.','구역을 선택해 주세요':'Select a seating zone','테이블을 선택해 주세요':'Select a table','이전':'Back','다시선택':'Reselect','처음으로':'Home','선택 안 함':'Skip','현재 금액':'Current total','선택 완료 →':'Complete selection →','장바구니 담기':'Add to cart','메뉴를 터치하면 자동으로 이동합니다':'Tap a menu item to continue automatically','주문확정':'Confirm Order','이벤트 / 혜택':'Events / Benefits','메뉴 보기':'View Menu','쿠폰 사용':'Use Coupon','매장 안내':'Store Information','리뷰 이벤트':'Review Event'
 },
 ja:{
  '판교2테크노밸리점':'パンギョ第2テクノバレー店','어떻게 이용하시나요?':'ご利用方法を選択してください','아래 주문 방식을 터치해 주세요.':'下の注文方法をタッチしてください。','포장하기':'テイクアウト','매장에서 포장해 가기':'店舗で受け取ってお持ち帰り','라지/패밀리 피자 20% 할인 선택 가능':'L/Fサイズピザ20%割引を選択可能','먹고가기':'店内飲食','매장에서 바로 즐기기':'店内ですぐにお召し上がり','세트 · UP & UP 이용 가능':'セット・UP & UP 利用可能','이용 인원을 선택해 주세요':'ご利用人数を選択してください','버튼을 눌러 인원을 조정한 뒤 다음으로 이동하세요.':'ボタンで人数を調整して次へ進んでください。','최소 1명 · 최대 16명':'最少1名・最大16名','다음 →':'次へ →','포장 주문 방식을 선택해 주세요':'テイクアウト方法を選択してください','바로 주문하거나 오늘 픽업 시간을 예약할 수 있습니다.':'すぐに注文するか、本日の受取時間を予約できます。','바로 주문':'今すぐ注文','준비시간 약 15~20분':'準備時間 約15～20分','예약 주문':'受取予約','시간과 분을 따로 선택':'時と分を選択','레귤러 사이즈 모든 피자 15,000원':'Rサイズの全ピザ 15,000ウォン','해피아워는 픽업시간 기준입니다.':'ハッピーアワーは受取時間基準です。','예약 픽업 시간을 선택해 주세요':'受取予約時間を選択してください','당일 예약만 가능하며 5분 단위입니다.':'当日予約のみ、5分単位で選択できます。','시간':'時','분':'分','오늘 예약 픽업':'本日の予約受取','일반 예약':'通常予約','이 시간으로 예약':'この時間で予約','휴대전화 번호를 입력해 주세요':'携帯電話番号を入力してください','기본값은 010입니다. 다른 번호는 전체삭제 후 직접 입력할 수 있습니다.':'初期値は010です。別の番号は全削除後に入力してください。','전화번호를 입력하세요':'電話番号を入力してください','전체삭제':'全削除','확인':'確認','입력한 번호 뒤 4자리가 고객 호출번호로 사용됩니다.':'入力した番号の下4桁が呼出番号になります。','구역을 선택해 주세요':'エリアを選択してください','테이블을 선택해 주세요':'テーブルを選択してください','이전':'戻る','다시선택':'再選択','처음으로':'最初へ','선택 안 함':'選択しない','현재 금액':'現在の金額','선택 완료 →':'選択完了 →','장바구니 담기':'カートに追加','메뉴를 터치하면 자동으로 이동합니다':'メニューをタッチすると自動で次へ進みます','주문확정':'注文確定','이벤트 / 혜택':'イベント・特典','메뉴 보기':'メニューを見る','쿠폰 사용':'クーポン使用','매장 안내':'店舗案内','리뷰 이벤트':'レビューイベント','선택 가능':'選択可能','운영 중':'営業中','빈자리':'空席','선택중':'選択中','사용중':'使用中','정리중':'清掃中','예약':'予約'
 },
 zh:{
  '판교2테크노밸리점':'板桥第二科技谷店','어떻게 이용하시나요?':'请选择用餐方式','아래 주문 방식을 터치해 주세요.':'请点击下方的点餐方式。','포장하기':'外带','매장에서 포장해 가기':'到店取餐','라지/패밀리 피자 20% 할인 선택 가능':'L/F尺寸披萨可选八折优惠','먹고가기':'堂食','매장에서 바로 즐기기':'在店内享用','세트 · UP & UP 이용 가능':'可选套餐及UP & UP','이용 인원을 선택해 주세요':'请选择用餐人数','버튼을 눌러 인원을 조정한 뒤 다음으로 이동하세요.':'调整人数后进入下一步。','최소 1명 · 최대 16명':'最少1人 · 最多16人','다음 →':'下一步 →','포장 주문 방식을 선택해 주세요':'请选择外带方式','바로 주문하거나 오늘 픽업 시간을 예약할 수 있습니다.':'可立即下单或预约今天的取餐时间。','바로 주문':'立即下单','준비시간 약 15~20분':'预计准备15～20分钟','예약 주문':'预约取餐','시간과 분을 따로 선택':'分别选择小时和分钟','레귤러 사이즈 모든 피자 15,000원':'所有R尺寸披萨15,000韩元','해피아워는 픽업시간 기준입니다.':'欢乐时光以取餐时间为准。','예약 픽업 시간을 선택해 주세요':'请选择预约取餐时间','당일 예약만 가능하며 5분 단위입니다.':'仅限当天预约，以5分钟为单位。','시간':'小时','분':'分钟','오늘 예약 픽업':'今日预约取餐','일반 예약':'普通预约','이 시간으로 예약':'预约此时间','휴대전화 번호를 입력해 주세요':'请输入手机号码','기본값은 010입니다. 다른 번호는 전체삭제 후 직접 입력할 수 있습니다.':'默认010。使用其他号码请先全部删除。','전화번호를 입력하세요':'请输入电话号码','전체삭제':'全部删除','확인':'确认','입력한 번호 뒤 4자리가 고객 호출번호로 사용됩니다.':'号码后4位将作为取餐呼叫号。','구역을 선택해 주세요':'请选择区域','테이블을 선택해 주세요':'请选择桌位','이전':'返回','다시선택':'重新选择','처음으로':'回到首页','선택 안 함':'不选择','현재 금액':'当前金额','선택 완료 →':'完成选择 →','장바구니 담기':'加入购物车','메뉴를 터치하면 자동으로 이동합니다':'点击菜单后将自动进入下一步','주문확정':'确认订单','이벤트 / 혜택':'活动 / 优惠','메뉴 보기':'查看菜单','쿠폰 사용':'使用优惠券','매장 안내':'门店信息','리뷰 이벤트':'评价活动'
 }
};
function localizedHomeOverlay(){
 const d={
  en:{store:'Papa Johns Pangyo 2 Techno Valley',headline:'Enjoy freshly baked pizza at its best.',sub:'Better Ingredients. Better Pizza.',take:'TAKE OUT',takeDesc:'Order now · Reserve · Happy Hour',takeBtn:'Start Takeout Order →',dine:'DINE IN',dineDesc:'Guests · Seats · Set Menu',dineBtn:'Start Dine-in Order →',event:'Events / Benefits',menu:'View Menu',coupon:'Use Coupon',storeInfo:'Store Info',review:'Review Event'},
  ja:{store:'パパジョンズ パンギョ第2テクノバレー店',headline:'今日も焼きたてのピザを、最高においしく。',sub:'Better Ingredients. Better Pizza.',take:'テイクアウト',takeDesc:'今すぐ注文・予約注文・ハッピーアワー',takeBtn:'テイクアウト注文を開始 →',dine:'店内飲食',dineDesc:'人数選択・座席選択・セット注文',dineBtn:'店内注文を開始 →',event:'イベント・特典',menu:'メニュー',coupon:'クーポン',storeInfo:'店舗案内',review:'レビューイベント'},
  zh:{store:'棒约翰 板桥第二科技谷店',headline:'尽享每日新鲜出炉的美味披萨。',sub:'Better Ingredients. Better Pizza.',take:'外带点餐',takeDesc:'立即下单 · 预约 · 欢乐时光',takeBtn:'开始外带点餐 →',dine:'堂食',dineDesc:'人数 · 座位 · 套餐',dineBtn:'开始堂食点餐 →',event:'活动 / 优惠',menu:'查看菜单',coupon:'使用优惠券',storeInfo:'门店信息',review:'评价活动'}
 }[homeLanguage];
 return `<div class="localized-home-overlay"><div class="lh-store">${d.store}</div><h1>${d.headline}</h1><p>${d.sub}</p><div class="lh-cards"><button onclick="selectOrderType('takeout')"><small>TAKE OUT</small><strong>${d.take}</strong><span>${d.takeDesc}</span><em>${d.takeBtn}</em></button><button onclick="selectOrderType('dinein')"><small>DINE IN</small><strong>${d.dine}</strong><span>${d.dineDesc}</span><em>${d.dineBtn}</em></button></div><div class="lh-bottom"><span>${d.event}</span><span>${d.menu}</span><span>${d.coupon}</span><span>${d.storeInfo}</span><span>${d.review}</span></div></div>`;
}
function translateDynamicText(text,lang){
 if(lang==='ko')return text;
 const dict=UI_I18N[lang]||{};
 let t=text;
 if(dict[t])return dict[t];
 if(lang==='ja'){
  t=t.replace(/(\d+)명/g,'$1名').replace(/(\d+)개/g,'$1個').replace(/(\d+)원/g,'$1ウォン').replace(/오늘/g,'本日').replace(/이용 가능/g,'利用可能').replace(/명 기준으로 이용 가능한 구역입니다\./,'名基準で利用可能なエリアです。').replace(/예상 픽업/g,'受取予定');
 }else if(lang==='en'){
  t=t.replace(/(\d+)명/g,'$1 guests').replace(/(\d+)개/g,'$1 items').replace(/(\d+)원/g,'₩$1').replace(/이용 가능/g,'Available').replace(/예상 픽업/g,'Estimated pickup');
 }else if(lang==='zh'){
  t=t.replace(/(\d+)명/g,'$1人').replace(/(\d+)개/g,'$1件').replace(/(\d+)원/g,'$1韩元').replace(/이용 가능/g,'可用').replace(/예상 픽업/g,'预计取餐');
 }
 return dict[t]||t;
}
function applyUILanguage(){
 document.documentElement.lang=homeLanguage==='zh'?'zh-CN':homeLanguage;
 if(homeLanguage==='ko')return;
 const walker=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{const raw=n.nodeValue;const trimmed=raw.trim();if(!trimmed)return;const translated=translateDynamicText(trimmed,homeLanguage);if(translated!==trimmed)n.nodeValue=raw.replace(trimmed,translated)});
}
function render(){homeLanguage='ko';localStorage.setItem('papaHomeLanguage','ko');document.documentElement.lang='ko';renderBase();}

render();
