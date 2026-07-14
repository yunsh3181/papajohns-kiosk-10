const ADMIN_PASSWORD='papa8080';
const ADMIN_AUTH_KEY='pj_admin_auth_v30';
function unlockAdmin(){
 const gate=document.getElementById('adminLoginGate');
 if(gate)gate.hidden=true;
 document.body.classList.add('admin-unlocked');
}
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('adminLoginForm');
 const input=document.getElementById('adminPassword');
 const error=document.getElementById('adminLoginError');
 if(sessionStorage.getItem(ADMIN_AUTH_KEY)==='ok'){unlockAdmin();return;}
 form?.addEventListener('submit',e=>{
   e.preventDefault();
   if(input.value===ADMIN_PASSWORD){sessionStorage.setItem(ADMIN_AUTH_KEY,'ok');unlockAdmin();}
   else{error.textContent='비밀번호가 올바르지 않습니다.';input.value='';input.focus();}
 });
});

const zones=[
 {id:'papa',name:'파파존'},
 {id:'outside',name:'야외석'},
 {id:'bottle',name:'별관'},
 {id:'room',name:'별관룸'}
];
const master=[
 {id:'papa-1',zone:'papa',name:'커플석',capacity:2},{id:'papa-2',zone:'papa',name:'바테이블석',capacity:4},
 {id:'outside-1',zone:'outside',name:'야외석 1번',capacity:4},{id:'outside-2',zone:'outside',name:'야외석 2번',capacity:4},{id:'outside-3',zone:'outside',name:'야외석 3번',capacity:4},{id:'outside-4',zone:'outside',name:'야외석 4번',capacity:4},
 {id:'bottle-1',zone:'bottle',name:'창가석 1',capacity:2},{id:'bottle-2',zone:'bottle',name:'별관 2번',capacity:5},{id:'bottle-3',zone:'bottle',name:'별관 3번',capacity:5},{id:'bottle-4',zone:'bottle',name:'커플석 4번',capacity:2},
 {id:'room-1',zone:'room',name:'룸테이블 1',capacity:4},{id:'room-2',zone:'room',name:'룸테이블 2',capacity:4},{id:'room-3',zone:'room',name:'룸테이블 3',capacity:4}
];
const statusNames={empty:'빈자리',held:'선택 중',occupied:'사용 중',cleaning:'정리 중',reserved:'예약'};
let docs={};

function seatData(s){return {...s,...(docs[s.id]||{}),status:docs[s.id]?.status||'empty'};}
function elapsed(ts){
 if(!ts)return '';
 const ms=typeof ts.toMillis==='function'?ts.toMillis():(ts.seconds?ts.seconds*1000:new Date(ts).getTime());
 if(!ms||Number.isNaN(ms))return '';
 const min=Math.max(0,Math.floor((Date.now()-ms)/60000));
 return min<60?`${min}분`:`${Math.floor(min/60)}시간 ${min%60}분`;
}
async function updateSeat(id,status){
 const s=master.find(x=>x.id===id);if(!s)return;
 const clear=status==='empty';
 await db.collection('seats').doc(id).set({
   status,zone:s.zone,name:s.name,capacity:s.capacity,
   updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
   ...(status==='cleaning'?{cleaningAt:firebase.firestore.FieldValue.serverTimestamp()}:{}),
   ...(clear?{partySize:null,groupSize:null,groupId:null,groupLabel:null,groupTableCount:null,orderId:null,orderNo:null,heldAt:null,occupiedAt:null}:{}),
 },{merge:true});
}
async function touchSeat(id){
 const s=seatData(master.find(x=>x.id===id));
 if(s.status==='occupied'){await updateSeat(id,'cleaning');return;}
 if(s.status==='cleaning'){await updateSeat(id,'empty');return;}
 if(s.status==='held'){
   if(confirm(`${s.name}의 선택 상태를 해제하시겠습니까?`))await updateSeat(id,'empty');
   return;
 }
 if(s.status==='reserved'){
   if(confirm(`${s.name}의 예약을 해제하고 빈자리로 변경하시겠습니까?`))await updateSeat(id,'empty');
 }
}
async function bulkAction(){
 const all=master.map(seatData);
 const occupied=all.filter(s=>s.status==='occupied');
 const cleaning=all.filter(s=>s.status==='cleaning');
 if(occupied.length){
   if(!confirm(`사용 중인 테이블 ${occupied.length}개를 모두 정리 중으로 변경하시겠습니까?`))return;
   await Promise.all(occupied.map(s=>updateSeat(s.id,'cleaning')));
   return;
 }
 if(cleaning.length){
   if(!confirm(`정리 중인 테이블 ${cleaning.length}개를 모두 빈자리로 변경하시겠습니까?`))return;
   await Promise.all(cleaning.map(s=>updateSeat(s.id,'empty')));
   return;
 }
 alert('정리할 테이블이 없습니다.');
}
function render(){
 const all=master.map(seatData);
 const count=st=>all.filter(s=>s.status===st).length;
 const occupied=count('occupied'),cleaning=count('cleaning');
 document.getElementById('seatSummary').innerHTML=`
   <span class="empty">빈자리 <b>${count('empty')}</b></span>
   <span class="occupied">사용 중 <b>${occupied}</b></span>
   <span class="cleaning">정리 중 <b>${cleaning}</b></span>
   <span class="held">선택 중 <b>${count('held')}</b></span>
   <button class="bulk-clean-button ${occupied?'start':cleaning?'finish':''}" onclick="bulkAction()">${occupied?'전체 정리 시작':cleaning?'전체 정리 완료':'전체 정리'}</button>`;
 document.getElementById('seatAdmin').innerHTML=zones.map(z=>{
   const seats=all.filter(s=>s.zone===z.id);
   return `<section class="simple-zone"><h2>${z.name}</h2><div class="simple-seat-grid">${seats.map(s=>{
     const time=s.status==='occupied'?elapsed(s.occupiedAt):s.status==='cleaning'?elapsed(s.cleaningAt):'';
     const hint=s.status==='occupied'?'터치하면 정리 시작':s.status==='cleaning'?'터치하면 정리 완료':s.status==='held'?'터치하면 선택 해제':s.status==='reserved'?'터치하면 예약 해제':'이용 가능';
     return `<button class="simple-seat ${s.status}" onclick="touchSeat('${s.id}')" ${s.status==='empty'?'aria-disabled="true"':''}>
       <strong>${s.name}</strong><span>최대 ${s.capacity}인</span><em>${statusNames[s.status]}${time?` · ${time}`:''}</em><small>${hint}</small>
     </button>`;
   }).join('')}</div></section>`;
 }).join('');
}
window.touchSeat=touchSeat;window.bulkAction=bulkAction;
db.collection('seats').onSnapshot(snap=>{
 docs={};snap.forEach(d=>docs[d.id]=d.data());
 const badge=document.getElementById('seatConnection');badge.textContent='실시간 연결';badge.className='connection live';render();
},e=>{document.getElementById('seatConnection').textContent='연결 오류';alert(e.message);});
