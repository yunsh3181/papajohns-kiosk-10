
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
 if(sessionStorage.getItem(ADMIN_AUTH_KEY)==='ok'){unlockAdmin();return}
 if(form)form.addEventListener('submit',e=>{
   e.preventDefault();
   if(input.value===ADMIN_PASSWORD){
     sessionStorage.setItem(ADMIN_AUTH_KEY,'ok');
     unlockAdmin();
   }else{
     error.textContent='비밀번호가 올바르지 않습니다.';
     input.value='';input.focus();
   }
 });
});


const zones=[
 {id:'papa',name:'Papa Zone',img:'images/seats/papa_zone.png'},
 {id:'outside',name:'Outside Zone',img:'images/seats/outside_zone.png'},
 {id:'bottle',name:'Bottle Zone',img:'images/seats/bottle_zone.png'},
 {id:'room',name:'Room Zone',img:'images/seats/room_zone.png'}
];
const master=[
 {id:'papa-1',zone:'papa',name:'커플석',capacity:2},{id:'papa-2',zone:'papa',name:'바테이블석',capacity:4},
 {id:'outside-1',zone:'outside',name:'야외석1',capacity:4},{id:'outside-2',zone:'outside',name:'야외석2',capacity:4},{id:'outside-3',zone:'outside',name:'야외석3',capacity:4},{id:'outside-4',zone:'outside',name:'야외석4',capacity:4},
 {id:'bottle-1',zone:'bottle',name:'보틀1',capacity:2},{id:'bottle-2',zone:'bottle',name:'보틀2',capacity:4},{id:'bottle-3',zone:'bottle',name:'보틀3',capacity:4},{id:'bottle-4',zone:'bottle',name:'보틀4',capacity:2},
 {id:'room-1',zone:'room',name:'룸테이블1',capacity:4},{id:'room-2',zone:'room',name:'룸테이블2',capacity:4},{id:'room-3',zone:'room',name:'룸테이블3',capacity:4}
];
const names={empty:'빈자리',held:'선택중',occupied:'사용중',cleaning:'정리중',reserved:'예약'};
let docs={};
function elapsed(ts){
 if(!ts)return '';
 const ms=typeof ts.toMillis==='function'?ts.toMillis():(ts.seconds?ts.seconds*1000:new Date(ts).getTime());
 if(!ms||Number.isNaN(ms))return '';
 const min=Math.max(0,Math.floor((Date.now()-ms)/60000));
 return min<60?`${min}분`:`${Math.floor(min/60)}시간 ${min%60}분`;
}
function statusButton(id,label,status,current){
 return `<button class="${current===status?'active':''}" onclick="setSeat('${id}','${status}')">${label}</button>`;
}

function seatGroups(all){
 const map={};
 all.filter(s=>s.groupId).forEach(s=>{
   if(!map[s.groupId])map[s.groupId]={groupId:s.groupId,label:s.groupLabel||s.zone,size:Number(s.groupSize||s.partySize||0),status:s.status,seats:[]};
   map[s.groupId].seats.push(s);
 });
 return Object.values(map);
}
async function setGroupStatus(groupId,status){
 const snap=await db.collection('seats').where('groupId','==',groupId).get();
 const batch=db.batch();
 snap.docs.forEach(doc=>{
   batch.set(doc.ref,{
     status,
     updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
     ...(status==='empty'?{groupId:null,groupLabel:null,groupSize:null,partySize:null,orderId:null,orderNo:null,heldAt:null,occupiedAt:null}:{})
   },{merge:true});
 });
 await batch.commit();
}
function render(){
 const all=master.map(s=>({...s,...(docs[s.id]||{}),status:docs[s.id]?.status||'empty'}));
 const statuses=['empty','held','occupied','cleaning','reserved'];
 document.getElementById('seatSummary').innerHTML=statuses.map(st=>`<span class="${st}"><i></i>${names[st]} <b>${all.filter(s=>s.status===st).length}</b></span>`).join('');

 const groups=seatGroups(all);
 const groupHtml=groups.length?`<section class="group-summary-panel">
   <header><strong>그룹 이용 현황</strong><small>${groups.length}팀</small></header>
   <div class="group-summary-grid">${groups.map(g=>`<article class="group-summary-card ${g.status}">
     <div><strong>${g.label}</strong><span>${g.size}명 · ${g.seats.length}테이블</span></div>
     <div class="group-summary-actions">
       <button onclick="setGroupStatus('${g.groupId}','occupied')">입실</button>
       <button onclick="setGroupStatus('${g.groupId}','cleaning')">정리</button>
       <button onclick="setGroupStatus('${g.groupId}','empty')">퇴실</button>
     </div>
   </article>`).join('')}</div>
 </section>`:'';
 document.getElementById('seatAdmin').innerHTML=groupHtml+zones.map(z=>{
   const seats=all.filter(s=>s.zone===z.id);
   const time=z.id==='papa'||z.id==='outside'?'11:00~20:00':'11:00~14:00 · 주말 미운영';
   return `<section class="overview-zone ${z.id}">
     <header>
       <div><strong>${z.name}</strong><small>${time}</small></div>
       ${z.id==='outside'?'<span class="overview-entry">🚪 출입구</span>':''}
     </header>
     <div class="overview-seat-list">
       ${seats.map(s=>{
         const t=s.status==='occupied'?elapsed(s.occupiedAt):s.status==='held'?elapsed(s.heldAt):'';
         return `<article class="overview-seat ${s.status}">
           <div class="overview-seat-info">
             <strong>${s.name}</strong>
             <span>${s.capacity}인</span>
             <em>${names[s.status]}${t?` · ${t}`:''}</em>
           </div>
           <div class="overview-actions">
             ${statusButton(s.id,'빈','empty',s.status)}
             ${statusButton(s.id,'사용','occupied',s.status)}
             ${statusButton(s.id,'정리','cleaning',s.status)}
             ${statusButton(s.id,'예약','reserved',s.status)}
           </div>
         </article>`;
       }).join('')}
     </div>
   </section>`;
 }).join('');
}async function setSeat(id,status){
 const s=master.find(x=>x.id===id);
 await db.collection('seats').doc(id).set({status,zone:s.zone,name:s.name,capacity:s.capacity,orderId:status==='empty'?null:(docs[id]?.orderId||null),orderNo:status==='empty'?null:(docs[id]?.orderNo||null),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}
window.setSeat=setSeat;
db.collection('seats').onSnapshot(snap=>{docs={};snap.forEach(d=>docs[d.id]=d.data());document.getElementById('seatConnection').textContent='실시간 연결';document.getElementById('seatConnection').className='connection live';render()},e=>{document.getElementById('seatConnection').textContent='연결 오류';alert(e.message)});
