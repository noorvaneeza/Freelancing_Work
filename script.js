// DOM
const LS_PROJECTS="projectsData";
const form=document.getElementById("form");
const nameInput=document.getElementById("name");
const startDateInput=document.getElementById("startDate");
const endDateInput=document.getElementById("endDate");
const daysInput=document.getElementById("days");
const statusInput=document.getElementById("status");
const paymentInput=document.getElementById("payment");
const paymentDateInput=document.getElementById("paymentDate");
const saveBtn=document.getElementById("saveBtn");
const clearBtn=document.getElementById("clearBtn");
const projIdInput=document.getElementById("projId");
const listEl=document.getElementById("projectList");

const totalProjectsEl=document.getElementById("totalProjects");
const totalPaymentEl=document.getElementById("totalPayment");

const pwModal=document.getElementById("pwModal");
const pwConfirm=document.getElementById("pwConfirm");
const pwConfirmBtn=document.getElementById("pwConfirmBtn");
const pwCancelBtn=document.getElementById("pwCancelBtn");

const pwSetInput=document.getElementById("pwSet");
const pwSetBtn=document.getElementById("pwSetBtn");

// Utils
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function capitalize(s){return s? s.charAt(0).toUpperCase()+s.slice(1):"";}
async function sha256Hex(str){const buf=new TextEncoder().encode(str); const hash=await crypto.subtle.digest("SHA-256",buf); return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}

// State
let projects=JSON.parse(localStorage.getItem(LS_PROJECTS)||"[]");

function saveProjects(){localStorage.setItem(LS_PROJECTS,JSON.stringify(projects)); renderProjects(); updateSummary();}

// Render
function renderProjects(){
  listEl.innerHTML="";
  if(!projects.length){ listEl.innerHTML="<div class='muted'>No projects yet.</div>"; return; }

  projects.forEach(p=>{
    const div=document.createElement("div");
    div.className="project-card";
    div.innerHTML=`
      <div class="project-title">${escapeHtml(p.name)}</div>
      <div class="project-meta">
        ${p.startDate||'-'} → ${p.endDate||'-'} · ${p.days} day(s)
        ${p.paymentDate ? ` · Paid on: ${p.paymentDate}` : ''}
      </div>
      <div class="project-status ${p.status}">${capitalize(p.status)}</div>
    `;
    listEl.appendChild(div);
  });
}

// Summary
function updateSummary(){
  totalProjectsEl.textContent=`Projects: ${projects.length}`;
  const sum=projects.reduce((acc,p)=> acc+(Number(p.payment)||0),0);
  totalPaymentEl.textContent=`Total: $${sum.toFixed(2)}`;
}

// Auth Modal
async function requireAuth(action){
  const storedHash=localStorage.getItem("editPasswordHash");
  if(!storedHash){alert("Set password first."); return;}
  pwModal.classList.remove("hidden"); pwConfirm.value=""; pwConfirm.focus();
  function addOnce(el,event,fn){const wrapper=e=>{el.removeEventListener(event,wrapper); fn(e);}; el.addEventListener(event,wrapper);}
  addOnce(pwConfirmBtn,"click",async()=>{ const h=await sha256Hex(pwConfirm.value||""); if(h!==storedHash){alert("Wrong password");return;} await action(); pwModal.classList.add("hidden");});
  addOnce(pwCancelBtn,"click",()=>pwModal.classList.add("hidden"));
}

// Auto days
function computeDays(){const s=startDateInput.value; const e=endDateInput.value;if(s&&e){const d=Math.floor((new Date(e)-new Date(s))/(1000*60*60*24)); daysInput.value=d>=0? d+1:0;}}
startDateInput.addEventListener("change",computeDays); endDateInput.addEventListener("change",computeDays);

// Add / Edit
async function addProject(){
  const name=nameInput.value.trim(); if(!name)return alert("Name required");
  let days=Number(daysInput.value)||0;
  const s=startDateInput.value; const e=endDateInput.value;
  if(!days&&s&&e){days=Math.floor((new Date(e)-new Date(s))/(1000*60*60*24))+1; if(days<0)days=0;}
  const paymentDate = paymentDateInput.value || null;
  projects.unshift({id:Date.now(),name,startDate:s||null,endDate:e||null,days,status:statusInput.value,payment:Number(paymentInput.value)||0,paymentDate});
  saveProjects(); form.reset(); paymentDateInput.value="";
}

saveBtn.addEventListener("click",e=>{
  e.preventDefault(); const id=projIdInput.value;
  if(!id){requireAuth(addProject); return;}
  requireAuth(()=>{
    const idx=projects.findIndex(x=>x.id==Number(id)); if(idx==-1){alert("Not found"); return;}
    let days=Number(daysInput.value)||0;
    const s=startDateInput.value; const e=endDateInput.value;
    if(!days&&s&&e){days=Math.floor((new Date(e)-new Date(s))/(1000*60*60*24))+1; if(days<0)days=0;}
    const paymentDate = paymentDateInput.value || null;
    projects[idx]={id:Number(id),name:nameInput.value.trim(),startDate:s||null,endDate:e||null,days,status:statusInput.value,payment:Number(paymentInput.value)||0,paymentDate};
    saveProjects(); form.reset(); projIdInput.value=""; paymentDateInput.value="";
  });
});

clearBtn.addEventListener("click",()=>{form.reset(); projIdInput.value=""; paymentDateInput.value="";});

// Password set
pwSetBtn.addEventListener("click",async()=>{
  const val=pwSetInput.value.trim(); if(!val){alert("Enter password"); return;}
  const hash=await sha256Hex(val); localStorage.setItem("editPasswordHash",hash); pwSetInput.value=""; alert("Password saved!");
});

// Init
renderProjects(); updateSummary();
