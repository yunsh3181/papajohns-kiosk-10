
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

const orderList=document.getElementById('orderList');
const soundButton=document.getElementById('soundButton');
const soundSettingsButton=document.getElementById('soundSettingsButton');
const connectionBadge=document.getElementById('connectionBadge');
const settingsModal=document.getElementById('soundSettingsModal');
const soundPreset=document.getElementById('soundPreset');
const soundVolume=document.getElementById('soundVolume');
const volumeValue=document.getElementById('volumeValue');
const voiceEnabled=document.getElementById('voiceEnabled');
const customSoundFile=document.getElementById('customSoundFile');
const customSoundName=document.getElementById('customSoundName');
let orders=[];
let activeFilter='active';
let initialLoad=true;
let soundEnabled=localStorage.getItem('pjAdminSoundEnabled')!=='false';
let audioContext=null;
let customAudioUrl=null;
let settings={preset:'papa',volume:1,voice:true};

try{settings={...settings,...JSON.parse(localStorage.getItem('pjAdminSoundSettings')||'{}')}}catch(e){}
soundPreset.value=settings.preset||'papa';
soundVolume.value=Math.round((settings.volume??1)*100);volumeValue.textContent=soundVolume.value+'%';voiceEnabled.checked=settings.voice!==false;

const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const statusNames={payment_pending:'결제대기',new:'신규',paid:'결제완료',accepted:'접수',cooking:'조리중',ready:'조리완료',completed:'수령완료',cancelled:'취소'};
const formatTime=value=>{const d=value?.toDate?value.toDate():value?new Date(value):null;if(!d||Number.isNaN(d.getTime()))return '-';return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)};
function selectedNames(map,master){return Object.entries(map||{}).filter(([,q])=>q>0).map(([id,q])=>`${master.find(x=>x.id===id)?.name||id} ×${q}`).join(', ')}
function itemHTML(item){
 const benefit=item.set?`${item.set}인 세트`:item.promo==='upup'?'UP & UP':item.promo==='takeout'?'포장 20%':'일반주문';
 const size=item.promo==='upup'?'L→F':item.size||'';
 const top=selectedNames(item.toppings,TOPPINGS),includedSides=selectedNames(item.includedSides,SIDES),includedDrinks=selectedNames(item.includedDrinks,DRINKS),extraSides=selectedNames(item.sides,SIDES),extraDrinks=selectedNames(item.drinks,DRINKS);
 return `<div class="order-item"><strong>${item.qty||1}× ${benefit} · ${item.pizzaName||'피자'}</strong><span>${item.dough==='thin'?'씬도우':'수타도우'} · ${size} · ${item.crust||''}${item.pizzaMode==='half'?' · 하프앤하프':''}</span>${top?`<small>토핑: ${top}</small>`:''}${includedSides?`<small>포함 사이드: ${includedSides}</small>`:''}${includedDrinks?`<small>포함 음료: ${includedDrinks}</small>`:''}${extraSides?`<small>추가 사이드: ${extraSides}</small>`:''}${extraDrinks?`<small>추가 음료: ${extraDrinks}</small>`:''}</div>`;
}
function filterOrders(order){if(activeFilter==='all')return true;if(activeFilter==='active')return ['payment_pending','paid','new','accepted','cooking','ready'].includes(order.status);return order.status===activeFilter}
function render(){
 const filtered=orders.filter(filterOrders);
 orderList.innerHTML=filtered.length?filtered.map(order=>`<article class="order-card ${order.status}"><div class="order-head"><div><div class="order-no">#${order.customerNumber||order.orderNo||order.phoneMasked||'-'}</div><small>${formatTime(order.createdAt||order.createdAtClient)}</small></div><span class="status-badge ${order.status}">${statusNames[order.status]||order.status}</span></div><div class="order-meta"><span>${order.orderType==='takeout'?'🥡 포장':'🍽️ 먹고가기'}</span>${order.partySize?`<span>👥 ${order.partySize}명</span>`:''}${order.seat?.name?`<span>🪑 ${order.seat.name}${order.seat.groupSize?` · ${order.seat.groupSize}명`:''}</span>`:''}${order.pickup?.time?`<span>🕒 오늘 ${order.pickup.time}${order.pickup.isHappyHour?' · 해피아워':''}</span>`:''}${order.phoneMasked?`<span>☎️ ${order.phoneMasked}</span>`:''}<span>상품 ${order.itemCount||0}개</span></div><div class="order-items">${(order.items||[]).map(itemHTML).join('')}</div><div class="order-foot"><div class="order-total"><span>결제금액</span><strong>${money(order.total)}</strong></div><div class="actions">${order.status==='payment_pending'?`<button class="accept" onclick="setStatus('${order.id}','paid')">결제완료</button>`:''}${order.status==='paid'?`<button class="cook" onclick="setStatus('${order.id}','cooking')">조리 시작</button>`:''}${order.status==='cooking'?`<button class="ready" onclick="setStatus('${order.id}','ready')">조리 완료</button>`:''}${order.status==='ready'?`<button class="call" onclick="callCustomer('${order.customerNumber||order.orderNo||''}')">📢 고객 호출</button><button class="accept" onclick="setStatus('${order.id}','completed')">수령 완료</button>`:''}${!['cancelled','completed'].includes(order.status)?`<button class="cancel" onclick="setStatus('${order.id}','cancelled')">취소</button>`:''}</div></div></article>`).join(''):'<div class="empty">해당 상태의 주문이 없습니다.</div>';
 const count=s=>orders.filter(o=>s.includes(o.status)).length;
 document.getElementById('newCount').textContent=count(['payment_pending']);document.getElementById('cookingCount').textContent=count(['paid','accepted','cooking']);document.getElementById('doneCount').textContent=count(['ready','completed']);
 const today=new Date();today.setHours(0,0,0,0);const sales=orders.filter(o=>{const d=o.createdAt?.toDate?o.createdAt.toDate():new Date(o.createdAtClient||0);return d>=today&&o.status!=='cancelled'}).reduce((s,o)=>s+Number(o.total||0),0);document.getElementById('todaySales').textContent=money(sales);
}
async function setStatus(id,status){
 try{const order=orders.find(o=>o.id===id);await db.collection('orders').doc(id).update({status,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});if(status!=='payment_pending')setTimeout(()=>{if(hasUnacceptedOrders())startNewOrderRepeat();else stopNewOrderRepeat()},300);if(status==='ready'&&order?.seat?.id){await db.collection('seats').doc(order.seat.id).set({status:'cleaning',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}if(status==='ready'&&order){playPreset('cafe');speak(`${order.customerNumber||order.orderNo} 고객님 주문 조리가 완료되었습니다.`)}}catch(error){alert('상태 변경 실패: '+error.message)}
}
function ensureAudio(){audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();return audioContext.resume()}

async function unlockAdminAudio(){
 try{
  if(!soundEnabled)return;
  await ensureAudio();
  localStorage.setItem('pjAdminSoundEnabled','true');
  soundButton.textContent='🔔 알림음 켜짐';
 }catch(e){console.warn('관리자 알림음 잠금 해제 실패',e)}
}
document.addEventListener('pointerdown',unlockAdminAudio,{once:true,passive:true});
document.addEventListener('keydown',unlockAdminAudio,{once:true});
function tone(freq,start,duration,gain=.36,type='sine'){const now=audioContext.currentTime+start,osc=audioContext.createOscillator(),g=audioContext.createGain();osc.frequency.value=freq;osc.type=type;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*settings.volume),now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(g);g.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.03)}
async function playPreset(forcePreset){
 if(!soundEnabled)return;
 await ensureAudio();const preset=forcePreset||settings.preset;
 if(preset==='voice')return;
 if(preset==='custom'&&customAudioUrl){const a=new Audio(customAudioUrl);a.volume=settings.volume;a.play().catch(console.warn);return}
 if(preset==='pos'){[[1100,0,.11],[1100,.16,.11],[1250,.32,.15]].forEach(x=>tone(...x,.28,'square'));return}
 if(preset==='cafe'){[[523,0,.22],[659,.15,.25],[784,.32,.32]].forEach(x=>tone(...x,.19,'sine'));return}
 [[660,0,.22],[880,.22,.30],[1040,.48,.30]].forEach(x=>tone(...x,.36,'sine'));
}
function speak(text){if(!soundEnabled||!settings.voice||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.96;u.pitch=1.02;u.volume=settings.volume;window.speechSynthesis.speak(u)}

let newOrderRepeatTimer=null;
function hasUnacceptedOrders(){return orders.some(o=>o.status==='payment_pending')}
function stopNewOrderRepeat(){
 if(newOrderRepeatTimer)clearInterval(newOrderRepeatTimer);
 newOrderRepeatTimer=null;
}
function startNewOrderRepeat(){
 stopNewOrderRepeat();
 if(!soundEnabled||!hasUnacceptedOrders())return;
 newOrderRepeatTimer=setInterval(async()=>{
   if(!soundEnabled||!hasUnacceptedOrders()){stopNewOrderRepeat();return}
   await playPreset();
   setTimeout(()=>speak('접수되지 않은 결제대기 주문이 있습니다.'),600);
 },5000);
}

async function notifyNewOrders(added){if(!added.length)return;added.forEach(showToast);document.title=`(${added.length}) 새 결제대기 주문 · 관리자`;try{if(soundEnabled){await ensureAudio();await playPreset();setTimeout(()=>speak(added.length===1?'새 주문이 확정되었습니다. 결제를 확인해 주세요.':`결제대기 주문이 ${added.length}건 있습니다.`),settings.preset==='voice'?0:550);startNewOrderRepeat()}}catch(e){console.warn('새 주문 알림음 재생 실패',e);soundButton.classList.add('attention');soundButton.textContent='🔔 화면을 눌러 알림음 활성화'}}
function showToast(order){document.getElementById('toastText').textContent=`#${order.orderNo} · ${money(order.total)}`;const toast=document.getElementById('toast');toast.hidden=false;toast.classList.add('show');setTimeout(()=>{toast.classList.remove('show');toast.hidden=true},5000)}
function callCustomer(orderNo){playPreset('cafe');setTimeout(()=>speak(`${orderNo}번 고객님, 주문이 준비되었습니다.`),420)}
window.callCustomer=callCustomer;window.setStatus=setStatus;

soundButton.textContent=soundEnabled?'🔔 알림음 켜짐':'🔕 알림음 꺼짐';
soundButton.addEventListener('click',async()=>{soundEnabled=!soundEnabled;localStorage.setItem('pjAdminSoundEnabled',String(soundEnabled));if(soundEnabled){await ensureAudio();soundButton.textContent='🔔 알림음 켜짐';await playPreset();setTimeout(()=>speak('알림음이 켜졌습니다.'),450);if(hasUnacceptedOrders())startNewOrderRepeat()}else{stopNewOrderRepeat();window.speechSynthesis?.cancel();soundButton.textContent='🔕 알림음 꺼짐'}});
soundSettingsButton.addEventListener('click',()=>{settingsModal.hidden=false});
document.getElementById('closeSoundSettings').addEventListener('click',()=>settingsModal.hidden=true);
settingsModal.addEventListener('click',e=>{if(e.target===settingsModal)settingsModal.hidden=true});
soundVolume.addEventListener('input',()=>volumeValue.textContent=soundVolume.value+'%');
customSoundFile.addEventListener('change',()=>{const f=customSoundFile.files?.[0];if(!f)return;if(customAudioUrl)URL.revokeObjectURL(customAudioUrl);customAudioUrl=URL.createObjectURL(f);customSoundName.textContent=f.name;soundPreset.value='custom'});
document.getElementById('previewSound').addEventListener('click',async()=>{settings={preset:soundPreset.value,volume:Number(soundVolume.value)/100,voice:voiceEnabled.checked};if(!soundEnabled){soundEnabled=true;soundButton.textContent='🔔 알림음 켜짐'}await playPreset();setTimeout(()=>speak('새 주문이 확정되었습니다. 결제를 확인해 주세요.'),settings.preset==='voice'?0:550)});
document.getElementById('saveSoundSettings').addEventListener('click',()=>{settings={preset:soundPreset.value,volume:Number(soundVolume.value)/100,voice:voiceEnabled.checked};localStorage.setItem('pjAdminSoundSettings',JSON.stringify(settings));settingsModal.hidden=true});
document.getElementById('filters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('active',x===b));render()});

db.collection('orders').limit(200).onSnapshot(snapshot=>{
 connectionBadge.textContent='실시간 연결';
 connectionBadge.className='connection live';
 const added=[];
 snapshot.docChanges().forEach(change=>{
   if(change.type==='added')added.push({id:change.doc.id,...change.doc.data()});
 });
 const toMillis=o=>{
   const v=o.createdAt||o.createdAtClient;
   if(v?.toMillis)return v.toMillis();
   if(v?.seconds)return v.seconds*1000;
   const ms=new Date(v||0).getTime();
   return Number.isNaN(ms)?0:ms;
 };
 orders=snapshot.docs
   .map(doc=>({id:doc.id,...doc.data()}))
   .sort((a,b)=>toMillis(b)-toMillis(a))
   .slice(0,100);
 render();
 if(!initialLoad)notifyNewOrders(added.filter(o=>o.status==='payment_pending'));
 if(soundEnabled&&hasUnacceptedOrders())startNewOrderRepeat();
 else if(!hasUnacceptedOrders())stopNewOrderRepeat();
 initialLoad=false;
},error=>{
 console.error(error);
 connectionBadge.textContent='연결 오류';
 connectionBadge.className='connection error';
 orderList.innerHTML=`<div class="empty">Firestore 연결 오류: ${error.message}</div>`;
});

const showOrdersTab=document.getElementById('showOrdersTab');
const showSeatsTab=document.getElementById('showSeatsTab');
const ordersPanel=document.getElementById('ordersPanel');
const seatsPanel=document.getElementById('seatsPanel');
function showAdminPanel(name){
 const orders=name==='orders';
 ordersPanel.hidden=!orders;
 seatsPanel.hidden=orders;
 showOrdersTab.classList.toggle('active',orders);
 showSeatsTab.classList.toggle('active',!orders);
}
showOrdersTab?.addEventListener('click',()=>showAdminPanel('orders'));
showSeatsTab?.addEventListener('click',()=>showAdminPanel('seats'));

let waitingEntries=[];
let waitingInitialLoad=true;
const waitingList=document.getElementById('waitingList');
const showWaitingTab=document.getElementById('showWaitingTab');
const waitingPanel=document.getElementById('waitingPanel');

function renderWaiting(){
 if(!waitingList)return;
 const active=waitingEntries.filter(w=>w.status==='waiting').sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
 if(!active.length){waitingList.innerHTML='<div class="empty">현재 대기 중인 고객이 없습니다.</div>';return}
 waitingList.innerHTML=active.map(w=>`<article class="waiting-admin-card">
   <div><strong>${w.seatName||'좌석'}</strong><span>대기 ${w.queueNo||'-'}번 · ${w.partySize||1}명 · ${w.phoneMasked||''}</span></div>
   <div class="waiting-admin-actions">
     <button onclick="callWaiting('${w.id}')">호출</button>
     <button onclick="completeWaiting('${w.id}')">입장</button>
     <button onclick="cancelWaiting('${w.id}')">취소</button>
   </div>
 </article>`).join('');
}
async function callWaiting(id){
 await db.collection('waitlist').doc(id).set({status:'called',calledAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
 await playPreset();setTimeout(()=>speak('대기 고객을 호출합니다.'),500);
}
async function completeWaiting(id){
 await db.collection('waitlist').doc(id).set({status:'seated',seatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}
async function cancelWaiting(id){
 await db.collection('waitlist').doc(id).set({status:'cancelled',cancelledAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}
db.collection('waitlist').onSnapshot(snapshot=>{
 const added=[];
 waitingEntries=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
 snapshot.docChanges().forEach(ch=>{if(ch.type==='added'&&ch.doc.data().status==='waiting')added.push({id:ch.doc.id,...ch.doc.data()})});
 renderWaiting();
 if(!waitingInitialLoad&&added.length){
   playPreset();setTimeout(()=>speak(`새로운 줄서기 ${added.length}건이 등록되었습니다.`),500);
 }
 waitingInitialLoad=false;
});
function showAdminPanel(name){
 const orders=name==='orders',seats=name==='seats',waiting=name==='waiting';
 ordersPanel.hidden=!orders;
 seatsPanel.hidden=!seats;
 waitingPanel.hidden=!waiting;
 showOrdersTab.classList.toggle('active',orders);
 showSeatsTab.classList.toggle('active',seats);
 showWaitingTab.classList.toggle('active',waiting);
}
showWaitingTab?.addEventListener('click',()=>showAdminPanel('waiting'));
document.getElementById('refreshWaiting')?.addEventListener('click',()=>renderWaiting());
