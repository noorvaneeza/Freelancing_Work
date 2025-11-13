/* -----------------------------
   Project Tracker - script.js
   Features:
   - Projects: name, start/end date, days, status, payment
   - Add/Edit/Delete require password
   - LocalStorage persistence
   - SHA-256 password hash
   - Export / Import JSON
-------------------------------*/

// --- Constants / DOM elements ---
const LS_PROJECTS = "projectsData";
const LS_PW = "editPasswordHash";

const form = document.getElementById("form");
const nameInput = document.getElementById("name");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const daysInput = document.getElementById("days");
const statusInput = document.getElementById("status");
const paymentInput = document.getElementById("payment");
const saveBtn = document.getElementById("saveBtn");
const projIdInput = document.getElementById("projId");
const listEl = document.getElementById("projectList");

// Password modal elements
const pwModal = document.getElementById("pwModal");
const pwConfirm = document.getElementById("pwConfirm");
const pwConfirmBtn = document.getElementById("pwConfirmBtn");
const pwCancelBtn = document.getElementById("pwCancelBtn");

// Security card elements
const pwSetInput = document.getElementById("pwSet");
const pwSetBtn = document.getElementById("pwSetBtn");

// Export / Import elements
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

// --- Utility: SHA-256 hash ---
async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,"0")).join("");
}

// --- Load & Save Projects ---
let projects = JSON.parse(localStorage.getItem(LS_PROJECTS)||"[]");

function saveProjects(){
  localStorage.setItem(LS_PROJECTS,JSON.stringify(projects));
  renderProjects();
}

// --- Render Projects ---
function renderProjects(){
  listEl.innerHTML="";
  projects.forEach(p=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${p.name}</strong> | ${p.days} days | ${p.status} | $${p.payment} | ${p.startDate||'-'} → ${p.endDate||'-'}
      <button data-action="view" data-id="${p.id}">View</button>
      <button data-action="edit" data-id="${p.id}">Edit</button>
      <button data-action="delete" data-id="${p.id}">Delete</button>
    `;
    listEl.appendChild(li);
  });
}
renderProjects();

// --- Password Authentication ---
async function requireAuth(action){
  const storedHash = localStorage.getItem(LS_PW);
  if(!storedHash){ alert("No edit-password set. Please set password first."); return; }

  pwModal.classList.remove("hidden");
  pwConfirm.value=""; pwConfirm.focus();

  const onConfirm = async () => {
    const entered = pwConfirm.value||"";
    const h = await sha256Hex(entered);
    if(h!==storedHash){ alert("Wrong password."); return; }
    try{ await action(); }catch(e){ alert("Action failed: "+e.message); }
    hidePwModal();
  };
  const onCancel = ()=>hidePwModal();

  functionOnce(pwConfirmBtn,"click",onConfirm);
  functionOnce(pwCancelBtn,"click",onCancel);

  function functionOnce(el,ev,fn){
    const wrapper = e => { el.removeEventListener(ev,wrapper); fn(e); };
    el.addEventListener(ev,wrapper);
  }
}

function hidePwModal(){ pwModal.classList.add("hidden"); }

// --- Add/Edit Project ---
async function addProjectWithAuth(){
  const name = nameInput.value.trim();
  const startDate = startDateInput.value||null;
  const endDate = endDateInput.value||null;
  let days = Number(daysInput.value)||0;
  if(!days && startDate && endDate){
    const sd=new Date(startDate), ed=new Date(endDate);
    days=Math.round((ed-sd)/(1000*60*60*24))+1;
    days = days>0?days:0;
  }
  const status = statusInput.value;
  const payment = Number(paymentInput.value)||0;
  if(!name) return alert("Please enter project name.");

  const action = async ()=>{
    const project = {id:Date.now(), name, startDate, endDate, days, status, payment};
    projects.unshift(project);
    saveProjects();
    form.reset();
  };
  await requireAuth(action);
}

// --- Save Button ---
saveBtn.addEventListener("click",async e=>{
  e.preventDefault();
  const id = projIdInput.value;
  if(!id){ addProjectWithAuth(); return; }

  const name = nameInput.value.trim();
  const startDate = startDateInput.value||null;
  const endDate = endDateInput.value||null;
  let days = Number(daysInput.value)||0;
  if(!days && startDate && endDate){
    const sd=new Date(startDate), ed=new Date(endDate);
    days=Math.round((ed-sd)/(1000*60*60*24))+1;
    days=days>0?days:0;
  }
  const status=statusInput.value;
  const payment=Number(paymentInput.value)||0;
  if(!name) return alert("Please enter project name.");

  const action=async ()=>{
    const idx = projects.findIndex(p=>p.id===Number(id));
    if(idx===-1) return alert("Project not found.");
    projects[idx]={id:Number(id), name, startDate, endDate, days, status, payment};
    saveProjects();
    form.reset();
    projIdInput.value="";
  };
  requireAuth(action);
});

// --- List Actions (View/Edit/Delete) ---
listEl.addEventListener("click", e=>{
  const btn = e.target.closest("button");
  if(!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  const p = projects.find(x=>x.id===id);
  if(!p) return;

  if(action==="view"){
    projIdInput.value="";
    nameInput.value=p.name;
    startDateInput.value=p.startDate||"";
    endDateInput.value=p.endDate||"";
    daysInput.value=p.days||"";
    statusInput.value=p.status||"ongoing";
    paymentInput.value=p.payment||"";
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }

  if(action==="edit"){
    requireAuth(async ()=>{
      projIdInput.value=p.id;
      nameInput.value=p.name;
      startDateInput.value=p.startDate||"";
      endDateInput.value=p.endDate||"";
      daysInput.value=p.days||"";
      statusInput.value=p.status||"ongoing";
      paymentInput.value=p.payment||"";
      window.scrollTo({top:0,behavior:"smooth"});
    });
    return;
  }

  if(action==="delete"){
    requireAuth(async ()=>{
      if(!confirm("Delete this project?")) return;
      projects = projects.filter(x=>x.id!==id);
      saveProjects();
    });
    return;
  }
});

// --- Security Card: Set Password ---
if(pwSetBtn){
  pwSetBtn.addEventListener("click", async ()=>{
    const val = pwSetInput.value.trim();
    if(!val) return alert("Enter password");
    const hash = await sha256Hex(val);
    localStorage.setItem(LS_PW, hash);
    alert("Password set successfully!");
    pwSetInput.value="";
  });
}

// --- Export / Import JSON ---
// Export
exportBtn.addEventListener("click", async ()=>{
  await requireAuth(()=>{
    if(!projects.length) return alert("No projects to export.");
    const blob = new Blob([JSON.stringify(projects,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="projects_backup.json"; a.click();
    URL.revokeObjectURL(url);
  });
});

// Import
importBtn.addEventListener("click", ()=>importInput.click());

importInput.addEventListener("change", async e=>{
  const file = e.target.files[0]; if(!file) return;
  const text = await file.text();
  let imported;
  try{ imported = JSON.parse(text); } catch(err){ return alert("Invalid JSON file."); }

  await requireAuth(()=>{
    if(!Array.isArray(imported)) return alert("JSON does not contain valid projects array.");
    projects = imported;
    saveProjects();
    alert("Projects imported successfully!");
  });

  importInput.value=""; // reset file input
});
