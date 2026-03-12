import { useState, useEffect, useRef } from "react";

const injectStyles = () => {
  if (document.getElementById('mi2')) return;
  const s = document.createElement('style');
  s.id = 'mi2';
  s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#080c12;--surf:#0e1520;--s2:#141f30;--bd:#1a2a3d;--ac:#4f8ef7;--ad:rgba(79,142,247,0.12);--am:#f59e0b;--am2:rgba(245,158,11,0.12);--gr:#10b981;--re:#ef4444;--pu:#a78bfa;--te:#06b6d4;--tx:#dde8f5;--mu:#4d6a8a;--m2:#2a3e56;--ff:'Outfit',sans-serif;--mo:'JetBrains Mono',monospace;}
body{background:var(--bg);color:var(--tx);font-family:var(--ff);font-size:14px}
input,select,textarea{background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:8px 12px;color:var(--tx);font-family:var(--ff);font-size:13px;outline:none;width:100%;transition:border-color .15s}
input:focus,select:focus,textarea:focus{border-color:var(--ac);box-shadow:0 0 0 3px rgba(79,142,247,.1)}
textarea{resize:vertical;min-height:70px} select option{background:var(--s2)}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.fade{animation:fi .2s ease}
.spinner{width:16px;height:16px;border:2px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;flex-shrink:0}
.ah h2{font-size:12px;font-weight:600;color:var(--ac);margin:14px 0 5px;padding-bottom:4px;border-bottom:1px solid var(--bd);text-transform:uppercase;letter-spacing:.5px}
.ah h2:first-child{margin-top:0}.ah p{margin-bottom:7px;line-height:1.65;font-size:13px}
.ah ul{margin:4px 0 8px 14px}.ah li{margin-bottom:3px;line-height:1.5;font-size:13px}
.ah strong{color:var(--tx);font-weight:600}
.cu{align-self:flex-end;background:var(--ad);border:1px solid rgba(79,142,247,.2);border-radius:12px 12px 4px 12px;padding:10px 14px;max-width:80%;font-size:13px;line-height:1.55;animation:fi .2s ease}
.ca{align-self:flex-start;background:var(--s2);border:1px solid var(--bd);border-radius:12px 12px 12px 4px;padding:10px 14px;max-width:90%;font-size:13px;line-height:1.65;animation:fi .2s ease}
input[type=range]{padding:0;height:4px;accent-color:var(--ac);cursor:pointer;border:none;background:none}`;
  document.head.appendChild(s);
};

// ── Storage layer (localStorage) ──────────────────────────────────────────────
const ld = async k => {
  try { const v = localStorage.getItem(k); return v ? { value: v } : null; } catch { return null; }
};
const sv = async (k, d) => {
  try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) { console.error(e); }
};

// ── AI system prompts ─────────────────────────────────────────────────────────
const SP = `You are MedIntel. Provide structured clinical decision support using EXACTLY these ## headers:
## Key Findings Summary
## Cross-System Observations
## Trend Analysis
## Medication Considerations
## Differential Considerations
## Risk Tier Assessment
## Coordination Alerts
## Questions for Doctors
## Monitoring & Follow-Up

DIFFERENTIAL: Each item needs Evidence Level (A=Strong patient data,B=Moderate,C=Limited,D=Speculative) + Confidence (High/Moderate/Low/Very Uncertain). Format: Most Likely | Possible | Less Likely | Red-Flag Causes.
RISK TIER: 🟢Low 🔵Moderate 🟡Elevated 🔴High — explain reasoning.
DOCTOR QUESTIONS: Tag [Interpretation][Cause][Treatment][Monitoring][Coordination].
Cross-reference ALL data. Check all drug interactions. Elevate infection/wound risk for immunocompromised. Never diagnose definitively. Never instruct medication changes. Escalate urgently for fever in immunocompromised, chest pain, graft rejection signs.`;

const CP = `You are MedIntel, a personal medical intelligence assistant. The patient's complete medical context is provided. Answer conversationally — use the full structured format only when the question warrants it. Be direct, warm, practical. Always safety-aware. Never diagnose definitively or instruct medication changes without physician.`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const K = { p:'mi_p', r:'mi_r', m:'mi_m', l:'mi_l', s:'mi_s', c:'mi_c', v:'mi_v', vc:'mi_vc', d:'mi_d', n:'mi_n', dis:'mi_dis', ak:'mi_ak' };
const td = () => new Date().toISOString().split('T')[0];
const dfn = d => Math.round((new Date(d) - new Date(td())) / 86400000);
const da = d => -dfn(d);

// ── Shared UI components ──────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant='primary', disabled, small, full }) => {
  const b = { display:'inline-flex', alignItems:'center', gap:6, padding:small?'5px 11px':'9px 18px', borderRadius:6, fontFamily:'var(--ff)', fontSize:small?11:13, fontWeight:500, cursor:disabled?'not-allowed':'pointer', border:'none', transition:'all .15s', userSelect:'none', opacity:disabled?0.5:1, width:full?'100%':undefined, justifyContent:full?'center':undefined };
  const v = { primary:{background:'var(--ac)',color:'white'}, ghost:{background:'transparent',color:'var(--mu)',border:'1px solid var(--bd)'}, danger:{background:'rgba(239,68,68,.12)',color:'var(--re)',border:'1px solid rgba(239,68,68,.25)'}, green:{background:'rgba(16,185,129,.12)',color:'var(--gr)',border:'1px solid rgba(16,185,129,.25)'}, amber:{background:'var(--am2)',color:'var(--am)',border:'1px solid rgba(245,158,11,.25)'}, purple:{background:'rgba(167,139,250,.12)',color:'var(--pu)',border:'1px solid rgba(167,139,250,.25)'} };
  return <button style={{...b,...(v[variant]||v.ghost)}} onClick={onClick} disabled={disabled}>{children}</button>;
};
const Bdg = ({ label, color='blue' }) => {
  const c = { blue:{bg:'rgba(79,142,247,.12)',c:'#4f8ef7'}, green:{bg:'rgba(16,185,129,.12)',c:'#10b981'}, amber:{bg:'rgba(245,158,11,.12)',c:'#f59e0b'}, red:{bg:'rgba(239,68,68,.12)',c:'#ef4444'}, muted:{bg:'rgba(77,106,138,.12)',c:'#4d6a8a'}, purple:{bg:'rgba(167,139,250,.12)',c:'#a78bfa'}, teal:{bg:'rgba(6,182,212,.12)',c:'#06b6d4'} };
  const x = c[color] || c.blue;
  return <span style={{display:'inline-block',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:600,letterSpacing:.5,textTransform:'uppercase',background:x.bg,color:x.c}}>{label}</span>;
};
const Card = ({ children, style:s, mb=16 }) => <div style={{background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:10,padding:20,marginBottom:mb,...s}}>{children}</div>;
const CT = ({ children }) => <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'var(--mu)',marginBottom:14}}>{children}</div>;
const Fld = ({ label, children, full }) => <div style={{display:'flex',flexDirection:'column',gap:5,gridColumn:full?'1/-1':undefined}}><label style={{fontSize:11,fontWeight:500,color:'var(--mu)',letterSpacing:.5,textTransform:'uppercase'}}>{label}</label>{children}</div>;
const Emp = ({ icon, text }) => <div style={{textAlign:'center',padding:'32px 20px',color:'var(--mu)'}}><div style={{fontSize:26,marginBottom:8,opacity:.4}}>{icon}</div><div style={{fontSize:13}}>{text}</div></div>;
const HR = () => <div style={{height:1,background:'var(--bd)',margin:'14px 0'}}/>;

const rHTML = t => {
  const h = t.replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^[-•] (.+)$/gm,'<li>$1</li>').replace(/(<li>[^<]*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`).replace(/\n\n+/g,'</p><p>');
  return `<div class="ah"><p>${h}</p></div>`;
};

const bCtx = (p, rec, meds, labs, syms, care, vitals) => {
  const am = (meds||[]).filter(m => m.active);
  const rl = [...(labs||[])].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,30);
  const rs = [...(syms||[])].sort((a,b) => new Date(b.datetime)-new Date(a.datetime)).slice(0,15);
  const rv = [...(vitals||[])].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,20);
  const uc = (care||[]).filter(e => e.status!=='completed').sort((a,b) => new Date(a.pd)-new Date(b.pd));
  const rr = [...(rec||[])].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,10);
  return `=== PATIENT CONTEXT ===
PROFILE: ${p?.name||'Not set'} DOB:${p?.dob||'?'} Blood:${p?.bloodType||'?'}
Transplant:${p?.transplantHistory||'None'} Immunosuppression:${p?.immunosuppressionStatus||'Not documented'}
Conditions:${p?.chronicConditions||'Not documented'} Allergies:${p?.allergies||'None'}
Surgeries:${p?.majorSurgeries||'None'} Risks:${p?.importantRisks||'None'}
Specialists:${p?.specialists||'Not documented'}
ACTIVE MEDS(${am.length}):${am.length ? am.map(m=>`\n• ${m.name} ${m.dose} ${m.frequency}—${m.indication||'N/A'}${m.sideEffects?' SE:'+m.sideEffects:''}`).join('') : ' None'}
RECENT VITALS(${rv.length}):${rv.length ? rv.map(v=>`\n• ${v.date} BP:${v.sys||'?'}/${v.dia||'?'} HR:${v.hr||'?'} Wt:${v.wt||'?'}${v.wtu||''} O2:${v.o2||'?'}% Temp:${v.tmp||'?'}${v.tmpu||''}`).join('') : ' None'}
RECENT LABS(${rl.length}):${rl.length ? rl.map(l=>`\n• ${l.date} ${l.metric}=${l.value}${l.unit}(ref:${l.ref||'N/A'})${l.flag?' ⚠FLAGGED':''}`).join('') : ' None'}
SYMPTOMS(${rs.length}):${rs.length ? rs.map(s=>`\n• ${s.datetime?.split('T')[0]} ${s.symptom} Sev:${s.severity}/10${s.loc?' @'+s.loc:''}${s.rf?' 🚨':''}`).join('') : ' None'}
UPCOMING CARE(${uc.length}):${uc.length ? uc.map(e=>`\n• ${e.pd} ${e.name}(${e.type}) Urgency:${e.urgency} ${e.notes||''}`).join('') : ' None'}
RECORDS(${rr.length}):${rr.length ? rr.map(r=>`\n• ${r.date}[${r.spc}] ${r.sum||''}${r.mf?' Findings:'+r.mf:''}`).join('') : ' None'}
=== END ===`;
};

const NAV = [
  {id:'dashboard',icon:'⬛',l:'Dashboard'},
  {id:'profile',icon:'👤',l:'Profile'},
  {id:'records',icon:'📋',l:'Records'},
  {id:'meds',icon:'💊',l:'Medications'},
  {id:'labs',icon:'🧪',l:'Labs & Trends'},
  {id:'vitals',icon:'❤️',l:'Vitals'},
  {id:'symptoms',icon:'📡',l:'Symptoms'},
  {id:'care',icon:'📅',l:'Care Plan'},
  {id:'docs',icon:'📎',l:'Documents'},
  {id:'notes',icon:'📝',l:'Notes'},
  {id:'analysis',icon:'🧠',l:'AI Analysis'},
  {id:'import',icon:'📥',l:'Import Records'},
  {id:'connections',icon:'🔗',l:'Epic Connections'},
  {id:'export',icon:'💾',l:'Data & Backup'},
];

const calcAlerts = (care, vitals, vcfg, dis) => {
  const alerts = []; const d = dis || [];
  (care||[]).forEach(e => {
    if (!e.pd || e.status==='completed' || e.status==='cancelled') return;
    const days = dfn(e.pd); const ago = da(e.pd);
    if (days > 0 && days <= 7 && !d.includes(e.id+'_pre'))
      alerts.push({id:e.id+'_pre',type:'pre',urgency:days<=1?'high':'medium',icon:'📅',title:days===1?`Tomorrow: ${e.name}`:`In ${days} days: ${e.name}`,sub:`${e.type||'Event'}${e.provider?' • '+e.provider:''}`,tab:'care'});
    if (ago >= 2 && !d.includes(e.id+'_post')) {
      const al = e.type==='Lab Work'?'Enter Lab Results':e.type==='Imaging'?'Enter Imaging':e.type==='Surgery'||e.type==='Procedure'?'Enter Procedure Notes':'Enter Clinical Notes';
      const at = e.type==='Lab Work'?'labs':'records';
      alerts.push({id:e.id+'_post',type:'post',urgency:'medium',icon:'🔔',title:`Follow-up: ${e.name}`,sub:`${ago} days ago — ${al}`,actionLabel:al,tab:at,event:e});
    }
  });
  const vnames = ['BP','Heart Rate','Weight','O2 Sat','Temperature'];
  vnames.forEach(nm => {
    const freq = vcfg?.[nm]; if (!freq || d.includes('v_'+nm)) return;
    const last = [...(vitals||[])].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
    const lastDate = last?.date;
    if (!lastDate) { alerts.push({id:'v_'+nm,type:'vitals',urgency:'low',icon:'❤️',title:`${nm} not yet recorded`,sub:`Doctor recommends every ${freq} days`,tab:'vitals'}); return; }
    const ago = da(lastDate);
    if (ago > parseInt(freq))
      alerts.push({id:'v_'+nm,type:'vitals',urgency:ago>parseInt(freq)*2?'high':'low',icon:'❤️',title:`${nm} overdue`,sub:`Last ${ago} days ago — every ${freq} days recommended`,tab:'vitals'});
  });
  return alerts;
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashBoard({ p, rec, meds, labs, syms, care, vitals, vcfg, dis, setDis, setTab }) {
  const alerts = calcAlerts(care, vitals, vcfg, dis);
  const am = (meds||[]).filter(m => m.active).length;
  const fl = (labs||[]).filter(l => l.flag).length;
  const rf = (syms||[]).filter(s => s.rf).length;
  const uc = (care||[]).filter(e => e.status!=='completed' && e.pd).sort((a,b) => new Date(a.pd)-new Date(b.pd)).slice(0,3);
  const rs = [...(syms||[])].sort((a,b) => new Date(b.datetime)-new Date(a.datetime)).slice(0,3);
  const lv = [...(vitals||[])].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
  const dismiss = async id => { const u = [...(dis||[]), id]; await sv(K.dis, u); setDis(u); };
  const ac = u => u==='high' ? {bg:'rgba(239,68,68,.08)',br:'rgba(239,68,68,.25)',d:'var(--re)'} : u==='medium' ? {bg:'rgba(245,158,11,.08)',br:'rgba(245,158,11,.25)',d:'var(--am)'} : {bg:'rgba(79,142,247,.06)',br:'rgba(79,142,247,.2)',d:'var(--ac)'};
  return (
    <div className="fade">
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>{p?.name ? `Welcome, ${p.name.split(' ')[0]}` : 'MedIntel Dashboard'}</div>
        <div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      {alerts.length > 0 && <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'var(--mu)',marginBottom:8}}>Active Reminders ({alerts.length})</div>
        {alerts.map(a => { const c = ac(a.urgency); return (
          <div key={a.id} style={{background:c.bg,border:`1px solid ${c.br}`,borderRadius:9,padding:'10px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:c.d,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{a.icon} {a.title}</div><div style={{fontSize:11,color:'var(--mu)',marginTop:2}}>{a.sub}</div></div>
            <div style={{display:'flex',gap:6}}>
              {a.tab && <Btn small variant="ghost" onClick={() => setTab(a.tab)}>{a.actionLabel||'View →'}</Btn>}
              <Btn small variant="ghost" onClick={() => dismiss(a.id)}>✕</Btn>
            </div>
          </div>
        ); })}
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:9,marginBottom:14}}>
        {[{v:(rec||[]).length,l:'Records',c:'var(--ac)',t:'records'},{v:am,l:'Active Meds',c:'var(--pu)',t:'meds'},{v:(labs||[]).length,l:'Lab Entries',c:'var(--gr)',t:'labs'},{v:fl,l:'Flagged Labs',c:'var(--am)',t:'labs'},{v:(syms||[]).length,l:'Symptoms',c:'var(--tx)',t:'symptoms'},{v:rf,l:'Red Flags',c:'var(--re)',t:'symptoms'},{v:(vitals||[]).length,l:'Vital Records',c:'var(--te)',t:'vitals'},{v:(care||[]).filter(e=>e.status!=='completed').length,l:'Care Events',c:'var(--mu)',t:'care'}].map(({v,l,c,t}) => (
          <div key={l} onClick={() => setTab(t)} style={{background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:10,padding:'11px 13px',cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--ac)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bd)'}>
            <div style={{fontSize:24,fontWeight:700,color:c,lineHeight:1}}>{v}</div>
            <div style={{fontSize:10,color:'var(--mu)',marginTop:3,textTransform:'uppercase',letterSpacing:.7}}>{l}</div>
          </div>
        ))}
      </div>
      {lv && <Card mb={14}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><CT>Last Vitals — {lv.date}</CT><Btn small variant="ghost" onClick={() => setTab('vitals')}>Record Now</Btn></div>
        <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
          {lv.sys && lv.dia && <div><div style={{fontSize:17,fontWeight:700,fontFamily:'var(--mo)',color:'var(--te)'}}>{lv.sys}/{lv.dia}</div><div style={{fontSize:10,color:'var(--mu)',textTransform:'uppercase'}}>Blood Pressure</div></div>}
          {lv.hr && <div><div style={{fontSize:17,fontWeight:700,fontFamily:'var(--mo)',color:'var(--gr)'}}>{lv.hr} bpm</div><div style={{fontSize:10,color:'var(--mu)',textTransform:'uppercase'}}>Heart Rate</div></div>}
          {lv.wt && <div><div style={{fontSize:17,fontWeight:700,fontFamily:'var(--mo)',color:'var(--ac)'}}>{lv.wt} {lv.wtu}</div><div style={{fontSize:10,color:'var(--mu)',textTransform:'uppercase'}}>Weight</div></div>}
          {lv.o2 && <div><div style={{fontSize:17,fontWeight:700,fontFamily:'var(--mo)',color:parseFloat(lv.o2)<94?'var(--re)':'var(--pu)'}}>{lv.o2}%</div><div style={{fontSize:10,color:'var(--mu)',textTransform:'uppercase'}}>O2 Sat</div></div>}
          {lv.tmp && <div><div style={{fontSize:17,fontWeight:700,fontFamily:'var(--mo)',color:'var(--am)'}}>{lv.tmp}°{lv.tmpu}</div><div style={{fontSize:10,color:'var(--mu)',textTransform:'uppercase'}}>Temp</div></div>}
        </div>
      </Card>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Card mb={0}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><CT>Upcoming Care</CT><Btn small variant="ghost" onClick={() => setTab('care')}>All</Btn></div>
          {uc.length ? uc.map(e => <div key={e.id} style={{padding:'7px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:13,fontWeight:500}}>{e.name}</div><div style={{fontSize:11,color:'var(--mu)'}}>{e.pd}</div></div><Bdg label={e.urgency||'routine'} color={e.urgency==='urgent'?'red':e.urgency==='high'?'amber':'blue'}/></div>) : <Emp icon="📅" text="None"/>}
        </Card>
        <Card mb={0}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><CT>Recent Symptoms</CT><Btn small variant="ghost" onClick={() => setTab('symptoms')}>Log</Btn></div>
          {rs.length ? rs.map(s => <div key={s.id} style={{padding:'7px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:13,fontWeight:500}}>{s.symptom}{s.rf?' 🚨':''}</div><div style={{fontSize:11,color:'var(--mu)'}}>{s.datetime?.split('T')[0]}</div></div><span style={{fontSize:14,fontWeight:700,color:s.severity>=8?'var(--re)':s.severity>=5?'var(--am)':'var(--gr)'}}>{s.severity}</span></div>) : <Emp icon="📡" text="None"/>}
        </Card>
      </div>
      <div style={{background:'linear-gradient(135deg,rgba(79,142,247,.08),rgba(167,139,250,.08))',border:'1px solid rgba(79,142,247,.2)',borderRadius:10,padding:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontWeight:600,fontSize:14}}>🧠 AI Analysis Engine</div><div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>Structured analysis + conversational chat</div></div>
        <Btn onClick={() => setTab('analysis')}>Open</Btn>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile }) {
  const [f, setF] = useState(profile || {name:'',dob:'',bloodType:'',transplantHistory:'',chronicConditions:'',immunosuppressionStatus:'',allergies:'',majorSurgeries:'',specialists:'',importantRisks:''});
  const [ok, setOk] = useState(false);
  const go = async () => { await sv(K.p, f); setProfile(f); setOk(true); setTimeout(() => setOk(false), 2000); };
  const F = ({ lb, fd, full, type='text', opts }) => (
    <Fld label={lb} full={full}>
      {opts ? <select value={f[fd]||''} onChange={e=>setF(p=>({...p,[fd]:e.target.value}))}><option value="">Select...</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
      : type==='ta' ? <textarea value={f[fd]||''} onChange={e=>setF(p=>({...p,[fd]:e.target.value}))}/>
      : <input type={type} value={f[fd]||''} onChange={e=>setF(p=>({...p,[fd]:e.target.value}))}/>}
    </Fld>
  );
  return (
    <div className="fade">
      <div style={{marginBottom:18}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Patient Profile</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>Injected into every AI analysis</div></div>
      <Card><CT>Basic Information</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}><F lb="Full Name" fd="name"/><F lb="Date of Birth" fd="dob" type="date"/><F lb="Blood Type" fd="bloodType" opts={['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']}/></div></Card>
      <Card><CT>Medical History</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><F lb="Transplant History" fd="transplantHistory" type="ta"/><F lb="Immunosuppression Status" fd="immunosuppressionStatus" type="ta"/><F lb="Chronic Conditions" fd="chronicConditions" type="ta"/><F lb="Known Allergies" fd="allergies" type="ta"/><F lb="Major Surgeries" fd="majorSurgeries" type="ta"/><F lb="Important Recurring Risks" fd="importantRisks" type="ta"/></div></Card>
      <Card><CT>Care Team</CT><Fld label="Specialists (name, specialty, health system)" full><textarea value={f.specialists||''} onChange={e=>setF(p=>({...p,specialists:e.target.value}))}/></Fld></Card>
      <div style={{display:'flex',gap:10,alignItems:'center'}}><Btn onClick={go}>Save Profile</Btn>{ok && <span style={{fontSize:13,color:'var(--gr)'}}>✓ Saved</span>}</div>
    </div>
  );
}

// ── Records ───────────────────────────────────────────────────────────────────
function RecordsTab({ records, setRecords }) {
  const [sh, setSh] = useState(false); const [flt, setFlt] = useState('all');
  const bl = {date:'',spc:'',prov:'',dtype:'',sum:'',mf:'',dx:'',mc:'',fu:''}; const [form, setForm] = useState(bl);
  const sps = ['Cardiology','Dermatology','Endocrinology','Gastroenterology','Hematology','Immunology','Infectious Disease','Nephrology','Neurology','Oncology','Orthopedics','Pulmonology','Rheumatology','Transplant','Urology','Primary Care','Emergency','Radiology','Surgery','Other'];
  const dts = ['Clinical Note','Lab Report','Imaging Report','Procedure Note','Discharge Summary','Consultation','Pathology','Referral','Other'];
  const add = async () => { if (!form.date || !form.spc) return; const u = [{...form,id:Date.now()}, ...(records||[])]; await sv(K.r, u); setRecords(u); setForm(bl); setSh(false); };
  const del = async id => { const u = (records||[]).filter(r => r.id!==id); await sv(K.r, u); setRecords(u); };
  const filt = flt==='all' ? (records||[]) : (records||[]).filter(r => r.spc===flt);
  const uS = [...new Set((records||[]).map(r => r.spc).filter(Boolean))];
  const F = ({ lb, fd, full, type='text', opts }) => (
    <Fld label={lb} full={full}>
      {opts ? <select value={form[fd]||''} onChange={e=>setForm(p=>({...p,[fd]:e.target.value}))}><option value="">Select...</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
      : type==='ta' ? <textarea value={form[fd]||''} onChange={e=>setForm(p=>({...p,[fd]:e.target.value}))}/>
      : <input type={type} value={form[fd]||''} onChange={e=>setForm(p=>({...p,[fd]:e.target.value}))}/>}
    </Fld>
  );
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Clinical Records</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(records||[]).length} indexed</div></div><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Add Record'}</Btn></div>
      {sh && <Card><CT>New Record</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}><F lb="Date" fd="date" type="date"/><F lb="Specialty" fd="spc" opts={sps}/><F lb="Document Type" fd="dtype" opts={dts}/><F lb="Provider" fd="prov"/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}><F lb="Summary" fd="sum" type="ta"/><F lb="Major Findings" fd="mf" type="ta"/><F lb="Diagnoses Noted" fd="dx" type="ta"/><F lb="Medication Changes" fd="mc" type="ta"/><F lb="Follow-Up Actions" fd="fu" type="ta" full/></div><div style={{display:'flex',gap:10}}><Btn onClick={add}>Add Record</Btn><Btn variant="ghost" onClick={() => { setForm(bl); setSh(false); }}>Cancel</Btn></div></Card>}
      {uS.length > 0 && <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{['all',...uS].map(s => <div key={s} onClick={() => setFlt(s)} style={{padding:'4px 11px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:500,border:'1px solid var(--bd)',background:flt===s?'var(--ac)':'transparent',color:flt===s?'white':'var(--mu)',transition:'all .15s'}}>{s==='all'?'All':s}</div>)}</div>}
      <Card mb={0}>{[...filt].sort((a,b) => new Date(b.date)-new Date(a.date)).length ? [...filt].sort((a,b) => new Date(b.date)-new Date(a.date)).map(r => (
        <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',gap:10}}>
          <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><Bdg label={r.spc||'—'} color="blue"/><span style={{fontSize:11,color:'var(--mu)'}}>{r.date}</span>{r.dtype && <Bdg label={r.dtype} color="muted"/>}</div><div style={{fontSize:13}}>{r.sum||'—'}</div>{r.mf && <div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{r.mf}</div>}</div>
          <Btn small variant="danger" onClick={() => del(r.id)}>✕</Btn>
        </div>
      )) : <Emp icon="📋" text="No records yet."/>}</Card>
    </div>
  );
}

// ── Medications ───────────────────────────────────────────────────────────────
function MedsTab({ meds, setMeds }) {
  const [sh, setSh] = useState(false); const [vw, setVw] = useState('active');
  const bl = {name:'',dose:'',freq:'',sd:'',ed:'',prov:'',ind:'',se:'',ixn:''}; const [f, setF] = useState(bl);
  const fqs = ['Once daily','Twice daily','Three times daily','Every other day','Weekly','As needed','Every 8 hours','Every 12 hours','Other'];
  const add = async () => { if (!f.name) return; const u = [{...f,id:Date.now(),active:!f.ed}, ...(meds||[])]; await sv(K.m, u); setMeds(u); setF(bl); setSh(false); };
  const tog = async id => { const u = (meds||[]).map(m => m.id===id ? {...m,active:!m.active} : m); await sv(K.m, u); setMeds(u); };
  const del = async id => { const u = (meds||[]).filter(m => m.id!==id); await sv(K.m, u); setMeds(u); };
  const filt = (meds||[]).filter(m => vw==='all' ? true : vw==='active' ? m.active : !m.active);
  const F = ({ lb, fd, full, type='text', opts }) => (
    <Fld label={lb} full={full}>
      {opts ? <select value={f[fd]||''} onChange={e=>setF(p=>({...p,[fd]:e.target.value}))}><option value="">Select...</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
      : type==='ta' ? <textarea value={f[fd]||''} onChange={e=>setF(p=>({...p,[fd]:e.target.value}))}/>
      : <input type={type} value={f[fd]||''} onChange={e=>setF(p=>({...p,[fd]:e.target.value}))}/>}
    </Fld>
  );
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Medication Log</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(meds||[]).filter(m=>m.active).length} active • {(meds||[]).filter(m=>!m.active).length} inactive</div></div><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Add Medication'}</Btn></div>
      {sh && <Card><CT>Add Medication</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}><F lb="Medication Name" fd="name"/><F lb="Dose" fd="dose"/><F lb="Frequency" fd="freq" opts={fqs}/><F lb="Start Date" fd="sd" type="date"/><F lb="Stop Date" fd="ed" type="date"/><F lb="Prescriber" fd="prov"/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}><F lb="Indication" fd="ind" type="ta"/><F lb="Side Effects" fd="se" type="ta"/><F lb="Interaction Notes" fd="ixn" type="ta" full/></div><div style={{display:'flex',gap:10}}><Btn onClick={add}>Add</Btn><Btn variant="ghost" onClick={() => { setF(bl); setSh(false); }}>Cancel</Btn></div></Card>}
      <div style={{display:'flex',gap:6,marginBottom:12}}>{['active','inactive','all'].map(v => <div key={v} onClick={() => setVw(v)} style={{padding:'4px 12px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:500,border:'1px solid var(--bd)',background:vw===v?'var(--ac)':'transparent',color:vw===v?'white':'var(--mu)',transition:'all .15s',textTransform:'capitalize'}}>{v}</div>)}</div>
      <Card mb={0}>{filt.length ? filt.map(m => (
        <div key={m.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',gap:10}}>
          <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontWeight:600,fontSize:14}}>{m.name}</span><Bdg label={m.active?'Active':'Inactive'} color={m.active?'green':'muted'}/></div><div style={{fontSize:12,color:'var(--mu)',display:'flex',flexWrap:'wrap',gap:10}}>{m.dose&&<span>💊 {m.dose}</span>}{m.freq&&<span>🕐 {m.freq}</span>}{m.sd&&<span>📅 {m.sd}</span>}{m.prov&&<span>👨‍⚕️ {m.prov}</span>}</div>{m.ind&&<div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{m.ind}</div>}{m.se&&<div style={{fontSize:12,color:'var(--am)',marginTop:2}}>⚠ {m.se}</div>}</div>
          <div style={{display:'flex',gap:6}}><Btn small variant={m.active?'ghost':'green'} onClick={() => tog(m.id)}>{m.active?'Deactivate':'Activate'}</Btn><Btn small variant="danger" onClick={() => del(m.id)}>✕</Btn></div>
        </div>
      )) : <Emp icon="💊" text="No medications in this view."/>}</Card>
    </div>
  );
}

// ── Labs ──────────────────────────────────────────────────────────────────────
function LabsTab({ labs, setLabs }) {
  const [sh, setSh] = useState(false); const [fm, setFm] = useState('all');
  const bl = {date:'',metric:'',value:'',unit:'',ref:'',flag:false}; const [f, setF] = useState(bl);
  const mets = ['Creatinine','BUN','eGFR','ALT','AST','Alkaline Phosphatase','Bilirubin','WBC','Hemoglobin','Hematocrit','Platelets','Sodium','Potassium','Glucose','HbA1c','TSH','Tacrolimus Level','Cyclosporine Level','CRP','ESR','PSA','LDL','HDL','Triglycerides','INR'];
  const add = async () => { if (!f.date || !f.value || !f.metric) return; const u = [{...f,id:Date.now()}, ...(labs||[])]; await sv(K.l, u); setLabs(u); setF(bl); setSh(false); };
  const del = async id => { const u = (labs||[]).filter(l => l.id!==id); await sv(K.l, u); setLabs(u); };
  const uM = [...new Set((labs||[]).map(l => l.metric).filter(Boolean))];
  const filt = fm==='all' ? (labs||[]) : (labs||[]).filter(l => l.metric===fm);
  const srt = [...filt].sort((a,b) => new Date(b.date)-new Date(a.date));
  const trnd = (m, dt, v) => { const s = (labs||[]).filter(l => l.metric===m && l.date!==dt).sort((a,b) => new Date(a.date)-new Date(b.date)); if (!s.length) return null; const d = parseFloat(v) - parseFloat(s[s.length-1].value); if (isNaN(d) || Math.abs(d)<0.001) return '→'; return d>0 ? '↑' : '↓'; };
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Labs & Trends</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(labs||[]).length} entries • {(labs||[]).filter(l=>l.flag).length} flagged</div></div><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Add Lab Value'}</Btn></div>
      {sh && <Card><CT>Add Lab Value</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
        <Fld label="Date"><input type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></Fld>
        <Fld label="Metric"><input value={f.metric} onChange={e=>setF(p=>({...p,metric:e.target.value}))} placeholder="Type or select..." list="mlist"/><datalist id="mlist">{mets.map(m=><option key={m} value={m}/>)}</datalist></Fld>
        <Fld label="Value"><input value={f.value} onChange={e=>setF(p=>({...p,value:e.target.value}))} placeholder="e.g. 1.2"/></Fld>
        <Fld label="Units"><input value={f.unit} onChange={e=>setF(p=>({...p,unit:e.target.value}))} placeholder="e.g. mg/dL"/></Fld>
        <Fld label="Reference Range"><input value={f.ref} onChange={e=>setF(p=>({...p,ref:e.target.value}))} placeholder="e.g. 0.6-1.2"/></Fld>
        <Fld label="Flag Abnormal"><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginTop:8}}><input type="checkbox" checked={f.flag} onChange={e=>setF(p=>({...p,flag:e.target.checked}))} style={{width:15,height:15}}/><span style={{fontSize:13,color:'var(--re)'}}>Mark as flagged</span></label></Fld>
      </div><div style={{display:'flex',gap:10}}><Btn onClick={add}>Add</Btn><Btn variant="ghost" onClick={() => { setF(bl); setSh(false); }}>Cancel</Btn></div></Card>}
      {uM.length > 0 && <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{['all',...uM].map(m => <div key={m} onClick={() => setFm(m)} style={{padding:'4px 11px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:500,border:'1px solid var(--bd)',background:fm===m?'var(--ac)':'transparent',color:fm===m?'white':'var(--mu)',transition:'all .15s'}}>{m==='all'?'All':m}</div>)}</div>}
      <Card mb={0}>{srt.length ? <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['Date','Metric','Value','Units','Ref','Trend',''].map(h => <th key={h} style={{textAlign:'left',padding:'7px 10px',fontSize:11,fontWeight:600,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.8,borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
        <tbody>{srt.map(l => { const t = trnd(l.metric,l.date,l.value); return (
          <tr key={l.id} style={{borderBottom:'1px solid rgba(26,42,61,.5)'}}>
            <td style={{padding:'8px 10px',fontSize:12,color:'var(--mu)'}}>{l.date}</td>
            <td style={{padding:'8px 10px',fontWeight:500}}>{l.metric}{l.flag && <span style={{marginLeft:6}}><Bdg label="Flag" color="red"/></span>}</td>
            <td style={{padding:'8px 10px',fontFamily:'var(--mo)',fontSize:14,fontWeight:700,color:l.flag?'var(--re)':'var(--tx)'}}>{l.value}</td>
            <td style={{padding:'8px 10px',fontSize:12,color:'var(--mu)'}}>{l.unit}</td>
            <td style={{padding:'8px 10px',fontSize:12,color:'var(--mu)'}}>{l.ref||'—'}</td>
            <td style={{padding:'8px 10px',fontSize:18,fontWeight:700,color:t==='↑'?'var(--re)':t==='↓'?'var(--gr)':'var(--mu)'}}>{t||'—'}</td>
            <td style={{padding:'8px 10px'}}><Btn small variant="danger" onClick={() => del(l.id)}>✕</Btn></td>
          </tr>
        ); })}</tbody>
      </table> : <Emp icon="🧪" text="No lab values yet."/>}</Card>
    </div>
  );
}

// ── Vitals ────────────────────────────────────────────────────────────────────
function VitalsTab({ vitals, setVitals, vcfg, setVcfg }) {
  const [sh, setSh] = useState(false); const [shC, setShC] = useState(false);
  const bl = {date:td(),sys:'',dia:'',hr:'',wt:'',wtu:'lbs',o2:'',tmp:'',tmpu:'F',notes:''};
  const [f, setF] = useState(bl);
  const [cfg, setCfg] = useState(vcfg || {'BP':'','Heart Rate':'','Weight':'','O2 Sat':'','Temperature':''});
  const add = async () => { if (!f.date) return; const u = [{...f,id:Date.now()}, ...(vitals||[])]; await sv(K.v, u); setVitals(u); setF({...bl,date:td()}); setSh(false); };
  const del = async id => { const u = (vitals||[]).filter(v => v.id!==id); await sv(K.v, u); setVitals(u); };
  const saveCfg = async () => { await sv(K.vc, cfg); setVcfg(cfg); setShC(false); };
  const srt = [...(vitals||[])].sort((a,b) => new Date(b.date)-new Date(a.date));
  const bpF = (s,d) => s && d && (parseInt(s)>=140 || parseInt(d)>=90 || parseInt(s)<90 || parseInt(d)<60);
  const o2F = o => o && parseFloat(o)<94;
  const hrF = h => h && (parseInt(h)>100 || parseInt(h)<50);
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Vitals</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(vitals||[]).length} recordings</div></div>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={() => setShC(!shC)}>⚙ Schedule</Btn><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Record Vitals'}</Btn></div>
      </div>
      {shC && <Card><CT>Doctor-Recommended Check Frequency</CT>
        <div style={{fontSize:12,color:'var(--mu)',marginBottom:14}}>Enter how often (in days) your doctor recommends checking each vital.</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
          {Object.keys(cfg).map(k => <Fld key={k} label={k+' — every N days'}><input type="number" min="1" max="365" value={cfg[k]||''} onChange={e=>setCfg(p=>({...p,[k]:e.target.value}))} placeholder="e.g. 7"/></Fld>)}
        </div>
        <div style={{display:'flex',gap:10}}><Btn onClick={saveCfg}>Save Schedule</Btn><Btn variant="ghost" onClick={() => setShC(false)}>Cancel</Btn></div>
      </Card>}
      {sh && <Card><CT>Record Vitals</CT>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
          <Fld label="Date"><input type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></Fld>
          <Fld label="Blood Pressure"><div style={{display:'flex',gap:6,alignItems:'center'}}><input value={f.sys} onChange={e=>setF(p=>({...p,sys:e.target.value}))} placeholder="Systolic"/><span style={{color:'var(--mu)',flexShrink:0}}>/</span><input value={f.dia} onChange={e=>setF(p=>({...p,dia:e.target.value}))} placeholder="Diastolic"/></div></Fld>
          <Fld label="Heart Rate (bpm)"><input value={f.hr} onChange={e=>setF(p=>({...p,hr:e.target.value}))} placeholder="e.g. 72"/></Fld>
          <Fld label="Weight"><div style={{display:'flex',gap:6}}><input value={f.wt} onChange={e=>setF(p=>({...p,wt:e.target.value}))} placeholder="e.g. 185"/><select value={f.wtu} onChange={e=>setF(p=>({...p,wtu:e.target.value}))} style={{width:70}}><option>lbs</option><option>kg</option></select></div></Fld>
          <Fld label="O2 Sat (%)"><input value={f.o2} onChange={e=>setF(p=>({...p,o2:e.target.value}))} placeholder="e.g. 98"/></Fld>
          <Fld label="Temperature"><div style={{display:'flex',gap:6}}><input value={f.tmp} onChange={e=>setF(p=>({...p,tmp:e.target.value}))} placeholder="e.g. 98.6"/><select value={f.tmpu} onChange={e=>setF(p=>({...p,tmpu:e.target.value}))} style={{width:60}}><option>F</option><option>C</option></select></div></Fld>
          <Fld label="Notes" full><input value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Time of day, conditions..."/></Fld>
        </div>
        <div style={{display:'flex',gap:10}}><Btn onClick={add}>Save</Btn><Btn variant="ghost" onClick={() => setSh(false)}>Cancel</Btn></div>
      </Card>}
      <Card mb={0}>{srt.length ? <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['Date','BP','HR','Weight','O2%','Temp','Notes',''].map(h => <th key={h} style={{textAlign:'left',padding:'7px 10px',fontSize:11,fontWeight:600,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.8,borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
        <tbody>{srt.map(v => { const bF = bpF(v.sys,v.dia); const oF = o2F(v.o2); const hF = hrF(v.hr); return (
          <tr key={v.id} style={{borderBottom:'1px solid rgba(26,42,61,.5)'}}>
            <td style={{padding:'8px 10px',fontSize:12,color:'var(--mu)'}}>{v.date}</td>
            <td style={{padding:'8px 10px',fontFamily:'var(--mo)',fontWeight:700,color:bF?'var(--re)':'var(--tx)'}}>{v.sys&&v.dia?v.sys+'/'+v.dia:'—'}{bF?' ⚠':''}</td>
            <td style={{padding:'8px 10px',fontFamily:'var(--mo)',fontWeight:700,color:hF?'var(--am)':'var(--tx)'}}>{v.hr||'—'}</td>
            <td style={{padding:'8px 10px',fontFamily:'var(--mo)'}}>{v.wt?v.wt+' '+v.wtu:'—'}</td>
            <td style={{padding:'8px 10px',fontFamily:'var(--mo)',fontWeight:700,color:oF?'var(--re)':'var(--tx)'}}>{v.o2?v.o2+'%':'—'}{oF?' ⚠':''}</td>
            <td style={{padding:'8px 10px',fontFamily:'var(--mo)'}}>{v.tmp?v.tmp+'°'+v.tmpu:'—'}</td>
            <td style={{padding:'8px 10px',fontSize:12,color:'var(--mu)',maxWidth:150}}>{v.notes||'—'}</td>
            <td style={{padding:'8px 10px'}}><Btn small variant="danger" onClick={() => del(v.id)}>✕</Btn></td>
          </tr>
        ); })}</tbody>
      </table> : <Emp icon="❤️" text="No vitals recorded yet."/>}</Card>
    </div>
  );
}

// ── Symptoms ──────────────────────────────────────────────────────────────────
function SympTab({ syms, setSyms }) {
  const [sh, setSh] = useState(false);
  const bl = {datetime:new Date().toISOString().slice(0,16),symptom:'',severity:'5',loc:'',pattern:'',trig:'',assoc:'',tried:'',resp:'',rf:false,notes:''};
  const [f, setF] = useState(bl);
  const pats = ['Constant','Intermittent','Progressive','Positional','Post-meal','Morning','Nocturnal','Exercise-related','Stress-related','Other'];
  const add = async () => { if (!f.symptom) return; const u = [{...f,id:Date.now()}, ...(syms||[])]; await sv(K.s, u); setSyms(u); setF({...bl,datetime:new Date().toISOString().slice(0,16)}); setSh(false); };
  const del = async id => { const u = (syms||[]).filter(s => s.id!==id); await sv(K.s, u); setSyms(u); };
  const srt = [...(syms||[])].sort((a,b) => new Date(b.datetime)-new Date(a.datetime));
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Symptom Log</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(syms||[]).length} entries</div></div><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Log Symptom'}</Btn></div>
      {sh && <Card><CT>Log Symptom</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
        <Fld label="Date & Time"><input type="datetime-local" value={f.datetime} onChange={e=>setF(p=>({...p,datetime:e.target.value}))}/></Fld>
        <Fld label="Symptom"><input value={f.symptom} onChange={e=>setF(p=>({...p,symptom:e.target.value}))} placeholder="e.g. Acid reflux"/></Fld>
        <Fld label={'Severity: '+f.severity+'/10'}><input type="range" min="1" max="10" value={f.severity} onChange={e=>setF(p=>({...p,severity:e.target.value}))}/><div style={{textAlign:'center',fontSize:18,fontWeight:700,color:f.severity>=8?'var(--re)':f.severity>=5?'var(--am)':'var(--gr)',marginTop:2}}>{f.severity}/10</div></Fld>
        <Fld label="Location"><input value={f.loc} onChange={e=>setF(p=>({...p,loc:e.target.value}))}/></Fld>
        <Fld label="Pattern"><select value={f.pattern} onChange={e=>setF(p=>({...p,pattern:e.target.value}))}><option value="">Select...</option>{pats.map(pt => <option key={pt}>{pt}</option>)}</select></Fld>
        <Fld label="Trigger"><input value={f.trig} onChange={e=>setF(p=>({...p,trig:e.target.value}))}/></Fld>
        <Fld label="Associated Symptoms"><input value={f.assoc} onChange={e=>setF(p=>({...p,assoc:e.target.value}))}/></Fld>
        <Fld label="Tried"><input value={f.tried} onChange={e=>setF(p=>({...p,tried:e.target.value}))}/></Fld>
        <Fld label="Response"><input value={f.resp} onChange={e=>setF(p=>({...p,resp:e.target.value}))}/></Fld>
        <Fld label="" full><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginTop:6}}><input type="checkbox" checked={f.rf} onChange={e=>setF(p=>({...p,rf:e.target.checked}))} style={{width:15,height:15}}/><span style={{fontSize:13,color:'var(--re)',fontWeight:500}}>🚨 Mark as Red Flag</span></label></Fld>
      </div><div style={{display:'flex',gap:10}}><Btn onClick={add}>Log</Btn><Btn variant="ghost" onClick={() => setSh(false)}>Cancel</Btn></div></Card>}
      <Card mb={0}>{srt.length ? srt.map(s => (
        <div key={s.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',gap:10}}>
          <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontWeight:600,fontSize:14}}>{s.symptom}</span>{s.rf && <Bdg label="Red Flag" color="red"/>}<span style={{marginLeft:'auto',fontSize:16,fontWeight:700,color:s.severity>=8?'var(--re)':s.severity>=5?'var(--am)':'var(--gr)'}}>{s.severity}/10</span></div><div style={{fontSize:12,color:'var(--mu)',display:'flex',flexWrap:'wrap',gap:10}}>{s.datetime&&<span>📅 {s.datetime.replace('T',' ')}</span>}{s.loc&&<span>📍 {s.loc}</span>}{s.pattern&&<span>🔄 {s.pattern}</span>}{s.trig&&<span>⚡ {s.trig}</span>}</div>{s.tried&&<div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>Tried: {s.tried}{s.resp?' → '+s.resp:''}</div>}</div>
          <Btn small variant="danger" onClick={() => del(s.id)}>✕</Btn>
        </div>
      )) : <Emp icon="📡" text="No symptoms logged."/>}</Card>
    </div>
  );
}

// ── Care Plan ─────────────────────────────────────────────────────────────────
function CareTab({ care, setCare }) {
  const [sh, setSh] = useState(false);
  const bl = {type:'',name:'',pd:'',prov:'',cat:'',status:'planned',urgency:'routine',notes:''}; const [f, setF] = useState(bl);
  const types = ['Surgery','Procedure','Consultation','Imaging','Lab Work','Physical Therapy','Follow-up Appointment','Treatment','Other'];
  const cats = ['Orthopedics','Dermatology','Transplant','Cardiology','GI','Endocrine','Oncology','Neurology','Primary Care','Other'];
  const add = async () => { if (!f.name || !f.pd) return; const u = [{...f,id:Date.now()}, ...(care||[])]; await sv(K.c, u); setCare(u); setF(bl); setSh(false); };
  const upd = async (id, st) => { const u = (care||[]).map(e => e.id===id ? {...e,status:st} : e); await sv(K.c, u); setCare(u); };
  const del = async id => { const u = (care||[]).filter(e => e.id!==id); await sv(K.c, u); setCare(u); };
  const srt = [...(care||[])].sort((a,b) => new Date(a.pd)-new Date(b.pd));
  const up = srt.filter(e => e.status!=='completed' && e.status!=='cancelled');
  const past = srt.filter(e => e.status==='completed' || e.status==='cancelled');
  const uc = u => u==='urgent'?'red':u==='high'?'amber':u==='moderate'?'blue':'muted';
  const sc = s => s==='completed'?'green':s==='cancelled'?'muted':'blue';
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Care Plan Radar</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{up.length} upcoming</div></div><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Add Event'}</Btn></div>
      {sh && <Card><CT>Add Care Event</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
        <Fld label="Event Name"><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="e.g. Hip Replacement Surgery"/></Fld>
        <Fld label="Event Type"><select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}><option value="">Select...</option>{types.map(t=><option key={t}>{t}</option>)}</select></Fld>
        <Fld label="Category"><select value={f.cat} onChange={e=>setF(p=>({...p,cat:e.target.value}))}><option value="">Select...</option>{cats.map(c=><option key={c}>{c}</option>)}</select></Fld>
        <Fld label="Planned Date"><input type="date" value={f.pd} onChange={e=>setF(p=>({...p,pd:e.target.value}))}/></Fld>
        <Fld label="Provider / Facility"><input value={f.prov} onChange={e=>setF(p=>({...p,prov:e.target.value}))}/></Fld>
        <Fld label="Urgency"><select value={f.urgency} onChange={e=>setF(p=>({...p,urgency:e.target.value}))}>{['routine','moderate','high','urgent'].map(u=><option key={u}>{u}</option>)}</select></Fld>
        <Fld label="Notes" full><input value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="e.g. Hold Warfarin 5 days prior..."/></Fld>
      </div><div style={{display:'flex',gap:10}}><Btn onClick={add}>Add</Btn><Btn variant="ghost" onClick={() => setSh(false)}>Cancel</Btn></div></Card>}
      {up.length > 0 && <Card>{up.map(e => { const days = dfn(e.pd); const ago = da(e.pd); const dl = days>0?'In '+days+'d':days===0?'Today':ago===1?'Yesterday':ago+'d ago'; return (
        <div key={e.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',gap:10}}>
          <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontWeight:600,fontSize:13}}>{e.name}</span><Bdg label={e.urgency} color={uc(e.urgency)}/><Bdg label={e.status} color={sc(e.status)}/></div><div style={{fontSize:12,color:'var(--mu)',display:'flex',gap:12,flexWrap:'wrap'}}><span style={{color:days<=1&&days>=0?'var(--am)':ago>0?'var(--re)':'var(--mu)',fontWeight:days<=1||ago>0?600:400}}>📅 {e.pd} ({dl})</span>{e.type&&<span>🏥 {e.type}</span>}{e.prov&&<span>👨‍⚕️ {e.prov}</span>}</div>{e.notes&&<div style={{fontSize:12,color:'var(--am)',marginTop:2}}>⚠ {e.notes}</div>}</div>
          <div style={{display:'flex',gap:6}}>{e.status!=='completed'&&<Btn small variant="green" onClick={() => upd(e.id,'completed')}>✓</Btn>}<Btn small variant="danger" onClick={() => del(e.id)}>✕</Btn></div>
        </div>
      ); })}</Card>}
      {past.length > 0 && <Card mb={0}><CT>Completed / Cancelled</CT>{past.map(e => <div key={e.id} style={{padding:'7px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:.5}}><div><span style={{fontWeight:500,fontSize:13}}>{e.name}</span><span style={{fontSize:12,color:'var(--mu)',marginLeft:10}}>{e.pd}</span><span style={{marginLeft:8}}><Bdg label={e.status} color={sc(e.status)}/></span></div><Btn small variant="danger" onClick={() => del(e.id)}>✕</Btn></div>)}</Card>}
      {(care||[]).length === 0 && <Card mb={0}><Emp icon="📅" text="No care events yet."/></Card>}
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────
function DocsTab({ docs, setDocs }) {
  const [sh, setSh] = useState(false); const [ul, setUl] = useState(false); const [err, setErr] = useState('');
  const bl = {title:'',date:td(),spc:'',dtype:'',notes:'',fn:'',fsz:0,fd:''}; const [f, setF] = useState(bl);
  const ref = useRef();
  const sps = ['Cardiology','Dermatology','Endocrinology','Gastroenterology','Hematology','Nephrology','Neurology','Oncology','Orthopedics','Primary Care','Radiology','Transplant','Other'];
  const dts = ['Clinical Note','Lab Report','Imaging Report','Procedure Note','Discharge Summary','Consultation','Pathology','Insurance/EOB','Other'];
  const hFile = e => { const file = e.target.files?.[0]; if (!file) return; if (file.size>2097152) { setErr('File too large — max 2MB.'); return; } setErr(''); setUl(true); const r = new FileReader(); r.onload = ev => { setF(p=>({...p,fn:file.name,fsz:file.size,fd:ev.target.result,title:p.title||file.name.replace(/\.[^/.]+$/,'')})); setUl(false); }; r.readAsDataURL(file); };
  const add = async () => { if (!f.title) return; const u = [{...f,id:Date.now()}, ...(docs||[])]; await sv(K.d, u); setDocs(u); setF(bl); setSh(false); setErr(''); };
  const del = async id => { const u = (docs||[]).filter(d => d.id!==id); await sv(K.d, u); setDocs(u); };
  const open = d => { if (!d.fd) return; const a = document.createElement('a'); a.href=d.fd; a.download=d.fn||d.title; a.click(); };
  const fmt = b => b<1048576 ? (b/1024).toFixed(0)+'KB' : (b/1048576).toFixed(1)+'MB';
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Documents</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(docs||[]).length} stored</div></div><Btn onClick={() => { setSh(!sh); setErr(''); }}>{sh?'Cancel':'+ Upload Document'}</Btn></div>
      {sh && <Card><CT>Upload Document</CT>
        <div style={{marginBottom:14}}>
          <div style={{border:'2px dashed var(--bd)',borderRadius:8,padding:'22px',textAlign:'center',cursor:'pointer'}} onClick={() => ref.current?.click()}>
            <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" onChange={hFile} style={{display:'none'}}/>
            {ul ? <div style={{display:'flex',justifyContent:'center',gap:8}}><div className="spinner"/><span style={{color:'var(--mu)',fontSize:13}}>Reading...</span></div>
            : f.fn ? <div><div style={{fontSize:13,fontWeight:600,color:'var(--gr)'}}>✓ {f.fn}</div><div style={{fontSize:11,color:'var(--mu)',marginTop:2}}>{fmt(f.fsz)}</div></div>
            : <div><div style={{fontSize:18,marginBottom:6}}>📎</div><div style={{fontSize:13,color:'var(--mu)'}}>Click to select (PDF, image, doc — max 2MB)</div></div>}
          </div>
          {err && <div style={{marginTop:6,fontSize:12,color:'var(--re)'}}>{err}</div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
          <Fld label="Title"><input value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} placeholder="e.g. Nephrology Notes"/></Fld>
          <Fld label="Date"><input type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></Fld>
          <Fld label="Specialty"><select value={f.spc} onChange={e=>setF(p=>({...p,spc:e.target.value}))}><option value="">Select...</option>{sps.map(s=><option key={s}>{s}</option>)}</select></Fld>
          <Fld label="Type"><select value={f.dtype} onChange={e=>setF(p=>({...p,dtype:e.target.value}))}><option value="">Select...</option>{dts.map(d=><option key={d}>{d}</option>)}</select></Fld>
          <Fld label="Notes" full><input value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Key findings..."/></Fld>
        </div>
        <div style={{display:'flex',gap:10}}><Btn onClick={add} disabled={!f.title}>Save</Btn><Btn variant="ghost" onClick={() => { setF(bl); setSh(false); setErr(''); }}>Cancel</Btn></div>
      </Card>}
      <Card mb={0}>{(docs||[]).length ? [...(docs||[])].sort((a,b) => new Date(b.date)-new Date(a.date)).map(d => (
        <div key={d.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',justifyContent:'space-between',gap:10}}>
          <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontWeight:600,fontSize:13}}>{d.title}</span>{d.spc&&<Bdg label={d.spc} color="blue"/>}{d.dtype&&<Bdg label={d.dtype} color="muted"/>}</div><div style={{fontSize:12,color:'var(--mu)',display:'flex',gap:12}}>{d.date&&<span>📅 {d.date}</span>}{d.fn&&<span>📎 {d.fn}</span>}</div>{d.notes&&<div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{d.notes}</div>}</div>
          <div style={{display:'flex',gap:6}}>{d.fd&&<Btn small variant="ghost" onClick={() => open(d)}>↓</Btn>}<Btn small variant="danger" onClick={() => del(d.id)}>✕</Btn></div>
        </div>
      )) : <Emp icon="📎" text="No documents stored yet."/>}</Card>
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function NotesTab({ notes, setNotes }) {
  const [sh, setSh] = useState(false); const [flt, setFlt] = useState('all');
  const bl = {date:td(),type:'Observation',title:'',body:'',tags:''}; const [f, setF] = useState(bl);
  const types = ['Observation','Doctor Call Notes','Visit Summary','Pre-appointment Prep','Medication Notes','Lab Interpretation','Insurance/Admin','Personal','Other'];
  const add = async () => { if (!f.body) return; const u = [{...f,id:Date.now()}, ...(notes||[])]; await sv(K.n, u); setNotes(u); setF(bl); setSh(false); };
  const del = async id => { const u = (notes||[]).filter(n => n.id!==id); await sv(K.n, u); setNotes(u); };
  const uT = [...new Set((notes||[]).map(n => n.type).filter(Boolean))];
  const filt = flt==='all' ? (notes||[]) : (notes||[]).filter(n => n.type===flt);
  const srt = [...filt].sort((a,b) => new Date(b.date)-new Date(a.date));
  const tc = t => ({'Doctor Call Notes':'teal','Visit Summary':'blue','Pre-appointment Prep':'purple','Medication Notes':'amber','Lab Interpretation':'green','Insurance/Admin':'muted'}[t]||'muted');
  return (
    <div className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}><div><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Notes & Journal</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{(notes||[]).length} entries</div></div><Btn onClick={() => setSh(!sh)}>{sh?'Cancel':'+ Add Note'}</Btn></div>
      {sh && <Card><CT>New Note</CT>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
          <Fld label="Date"><input type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></Fld>
          <Fld label="Type"><select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>{types.map(t=><option key={t}>{t}</option>)}</select></Fld>
          <Fld label="Title (optional)"><input value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} placeholder="e.g. Call with Dr. Smith"/></Fld>
          <Fld label="Note" full><textarea value={f.body} onChange={e=>setF(p=>({...p,body:e.target.value}))} style={{minHeight:110}} placeholder="Doctor call notes, observations, questions..."/></Fld>
          <Fld label="Tags"><input value={f.tags} onChange={e=>setF(p=>({...p,tags:e.target.value}))} placeholder="e.g. creatinine, transplant"/></Fld>
        </div>
        <div style={{display:'flex',gap:10}}><Btn onClick={add}>Save</Btn><Btn variant="ghost" onClick={() => setSh(false)}>Cancel</Btn></div>
      </Card>}
      {uT.length > 0 && <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{['all',...uT].map(t => <div key={t} onClick={() => setFlt(t)} style={{padding:'4px 11px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:500,border:'1px solid var(--bd)',background:flt===t?'var(--ac)':'transparent',color:flt===t?'white':'var(--mu)',transition:'all .15s'}}>{t==='all'?'All':t}</div>)}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {srt.length ? srt.map(n => (
          <Card key={n.id} mb={0}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:7}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><Bdg label={n.type} color={tc(n.type)}/><span style={{fontSize:11,color:'var(--mu)'}}>{n.date}</span></div>
              <Btn small variant="danger" onClick={() => del(n.id)}>✕</Btn>
            </div>
            {n.title && <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>{n.title}</div>}
            <div style={{fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{n.body}</div>
            {n.tags && <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>{n.tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=><span key={t} style={{fontSize:11,color:'var(--mu)',background:'var(--s2)',padding:'2px 8px',borderRadius:4}}>#{t}</span>)}</div>}
          </Card>
        )) : <Emp icon="📝" text="No notes yet."/>}
      </div>
    </div>
  );
}

// ── AI Analysis ───────────────────────────────────────────────────────────────
function AITab({ p, rec, meds, labs, syms, care, vitals, apiKey, setApiKey }) {
  const [mode, setMode] = useState('structured');
  const [q, setQ] = useState(''); const [res, setRes] = useState(''); const [loading, setLoading] = useState(false); const [err, setErr] = useState(''); const [hist, setHist] = useState([]);
  const [msgs, setMsgs] = useState([]); const [ci, setCi] = useState(''); const [cl, setCl] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey||''); const [showKey, setShowKey] = useState(!apiKey);
  const endRef = useRef();
  const ctx = bCtx(p,rec,meds,labs,syms,care,vitals);
  const qps = ['Analyze my current overall health status and identify the most important concerns.','Review my active medications for interactions with each other and my conditions.','Analyze my recent lab trends and flag anything needing physician attention.','Review my care plan for coordination conflicts or timing issues.','Generate comprehensive questions for my next doctor appointment.','Assess my most recent symptoms in context of my medications and diagnoses.'];
  const saveKey = async () => { await sv(K.ak, keyInput.trim()); setApiKey(keyInput.trim()); setShowKey(false); };
  const callAPI = async (messages, system) => {
    const rs = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system,messages})
    });
    const data = await rs.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.find(b => b.type==='text')?.text || 'No response.';
  };
  const runS = async qr => {
    const r = qr||q; if (!r.trim() || !apiKey) return;
    setLoading(true); setErr(''); setRes('');
    try { const txt = await callAPI([{role:'user',content:ctx+'\n\n=== QUESTION ===\n'+r}], SP); setRes(txt); setHist(h=>[{q:r,res:txt,t:new Date().toLocaleTimeString()},...h.slice(0,4)]); }
    catch (e) { setErr('Failed: '+e.message); }
    setLoading(false);
  };
  const sendChat = async () => {
    if (!ci.trim() || cl || !apiKey) return;
    const um = {role:'user',content:ci.trim()}; const nm = [...msgs,um];
    setMsgs(nm); setCi(''); setCl(true);
    try {
      const am = nm.map((m,i) => i===0&&m.role==='user' ? {role:'user',content:ctx+'\n\n'+m.content} : m);
      const txt = await callAPI(am, CP);
      setMsgs(m => [...m,{role:'assistant',content:txt}]);
    } catch (e) { setMsgs(m => [...m,{role:'assistant',content:'Error: '+e.message}]); }
    setCl(false); setTimeout(() => endRef.current?.scrollIntoView({behavior:'smooth'}),100);
  };
  const hasD = (rec||[]).length>0 || (meds||[]).length>0 || (labs||[]).length>0;
  return (
    <div className="fade">
      <div style={{marginBottom:18}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>AI Analysis Engine</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>Powered by your Operating Rules framework</div></div>
      {/* API Key setup */}
      {(showKey || !apiKey) && <Card style={{marginBottom:18,border:'1px solid rgba(79,142,247,.3)',background:'rgba(79,142,247,.04)'}}>
        <CT>Anthropic API Key</CT>
        <div style={{fontSize:13,color:'var(--mu)',marginBottom:12,lineHeight:1.6}}>Enter your Anthropic API key to enable AI analysis. Your key is stored locally in your browser only. Get one at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:'var(--ac)'}}>console.anthropic.com</a>.</div>
        <div style={{display:'flex',gap:8}}>
          <input type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="sk-ant-..." style={{flex:1,fontFamily:'var(--mo)',fontSize:12}}/>
          <Btn onClick={saveKey} disabled={!keyInput.trim()}>Save Key</Btn>
          {apiKey && <Btn variant="ghost" onClick={() => setShowKey(false)}>Cancel</Btn>}
        </div>
      </Card>}
      {apiKey && !showKey && <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,padding:'8px 12px',background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8}}>
        <span style={{fontSize:12,color:'var(--gr)'}}>✓ API key configured</span>
        <Btn small variant="ghost" onClick={() => setShowKey(true)}>Change Key</Btn>
      </div>}
      <div style={{display:'flex',gap:0,marginBottom:18,background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:8,padding:4,width:'fit-content'}}>
        {[{id:'structured',l:'📊 Structured'},{id:'chat',l:'💬 Chat'}].map(m => <div key={m.id} onClick={() => setMode(m.id)} style={{padding:'7px 16px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:500,transition:'all .15s',background:mode===m.id?'var(--ac)':'transparent',color:mode===m.id?'white':'var(--mu)'}}>{m.l}</div>)}
      </div>
      {!hasD && <div style={{background:'var(--am2)',border:'1px solid rgba(245,158,11,.25)',borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:'var(--am)'}}>⚠ Add data first for meaningful analysis.</div>}
      {mode==='structured' && <>
        <Card><CT>Quick Prompts</CT><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>{qps.map((qp,i) => <div key={i} onClick={() => { setQ(qp); runS(qp); }} style={{padding:'8px 12px',background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:8,cursor:apiKey?'pointer':'not-allowed',fontSize:12,color:'var(--mu)',lineHeight:1.5,transition:'all .15s',opacity:apiKey?1:0.5}} onMouseEnter={e=>{if(apiKey){e.currentTarget.style.borderColor='var(--ac)';e.currentTarget.style.color='var(--tx)';}}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bd)';e.currentTarget.style.color='var(--mu)';}}>{qp}</div>)}</div></Card>
        <Card><CT>Custom Query</CT><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Describe what to analyze..." style={{marginBottom:12,minHeight:90}}/><div style={{display:'flex',gap:10,alignItems:'center'}}><Btn onClick={() => runS()} disabled={loading||!q.trim()||!apiKey}>{loading?<><div className="spinner"/>Analyzing...</>:'🧠 Run Analysis'}</Btn>{res&&<Btn variant="ghost" onClick={() => { setRes(''); setQ(''); }}>Clear</Btn>}</div></Card>
        {err && <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:12,marginBottom:12,color:'var(--re)',fontSize:13}}>{err}</div>}
        {res && <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><CT>Analysis Result</CT><Btn small variant="ghost" onClick={() => navigator.clipboard?.writeText(res)}>Copy</Btn></div><div dangerouslySetInnerHTML={{__html:rHTML(res)}}/><HR/><div style={{fontSize:11,color:'var(--mu)',fontStyle:'italic'}}>⚕ Informational only. Not a substitute for physician advice.</div></Card>}
        {hist.length > 0 && !res && <Card mb={0}><CT>Recent</CT>{hist.map((h,i) => <div key={i} style={{padding:'8px 0',borderBottom:'1px solid rgba(26,42,61,.5)'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><div style={{fontSize:12,fontWeight:500}}>{h.q.slice(0,80)}{h.q.length>80?'...':''}</div><span style={{fontSize:11,color:'var(--mu)'}}>{h.t}</span></div><Btn small variant="ghost" onClick={() => setRes(h.res)}>View</Btn></div>)}</Card>}
      </>}
      {mode==='chat' && <Card style={{display:'flex',flexDirection:'column',height:'500px',padding:0,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bd)',fontSize:12,color:'var(--mu)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>💬 Full medical context included automatically</span>
          {msgs.length > 0 && <button onClick={() => setMsgs([])} style={{background:'none',border:'none',color:'var(--mu)',cursor:'pointer',fontSize:11,textDecoration:'underline'}}>Clear</button>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
          {msgs.length === 0 && <div style={{textAlign:'center',padding:'36px 20px'}}>
            <div style={{fontSize:22,marginBottom:8}}>💬</div>
            <div style={{fontSize:13,color:'var(--mu)',marginBottom:16}}>Ask anything about your health.</div>
            {['What should I watch for before my upcoming procedure?','Can you explain what my recent lab results mean?','What questions should I ask at my next appointment?'].map(qq => (
              <div key={qq} onClick={() => setCi(qq)} style={{padding:'7px 12px',background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:8,cursor:'pointer',fontSize:12,color:'var(--mu)',marginBottom:6,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--ac)';e.currentTarget.style.color='var(--tx)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bd)';e.currentTarget.style.color='var(--mu)';}}>{qq}</div>
            ))}
          </div>}
          {msgs.map((m,i) => <div key={i} className={m.role==='user'?'cu':'ca'}>{m.role==='assistant'?<div dangerouslySetInnerHTML={{__html:rHTML(m.content)}}/>:m.content}</div>)}
          {cl && <div className="ca" style={{display:'flex',alignItems:'center',gap:8}}><div className="spinner"/><span style={{color:'var(--mu)',fontSize:12}}>Thinking...</span></div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:'11px 14px',borderTop:'1px solid var(--bd)',display:'flex',gap:8}}>
          <input value={ci} onChange={e=>setCi(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()} placeholder={apiKey?'Ask anything about your health...':'Set API key above to enable chat'} style={{flex:1}} disabled={!apiKey}/>
          <Btn onClick={sendChat} disabled={cl||!ci.trim()||!apiKey}>{cl?<div className="spinner"/>:'Send'}</Btn>
        </div>
      </Card>}
    </div>
  );
}

// ── Export/Import ─────────────────────────────────────────────────────────────
function ExportTab({ p, rec, meds, labs, syms, care, vitals, vcfg, docs, notes, onImport }) {
  const [imp, setImp] = useState(false); const [msg, setMsg] = useState(''); const ref = useRef();
  const exp = () => {
    const data = {exportedAt:new Date().toISOString(),version:'2.0',profile:p,records:rec,meds,labs,symptoms:syms,care,vitals,vitalsCfg:vcfg,notes,docs:(docs||[]).map(d=>({...d,fd:'[excluded]'}))};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='MedIntel-backup-'+td()+'.json'; a.click(); URL.revokeObjectURL(url);
  };
  const hImp = e => { const file = e.target.files?.[0]; if (!file) return; setImp(true); setMsg(''); const r = new FileReader(); r.onload = ev => { try { const d = JSON.parse(ev.target.result); onImport(d); setMsg('✓ Imported successfully.'); } catch { setMsg('Error: Invalid backup file.'); } setImp(false); }; r.readAsText(file); };
  const tot = [(rec||[]).length,(meds||[]).length,(labs||[]).length,(syms||[]).length,(care||[]).length,(vitals||[]).length,(docs||[]).length,(notes||[]).length].reduce((a,b)=>a+b,0);
  return (
    <div className="fade">
      <div style={{marginBottom:18}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Data & Backup</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{tot} total records</div></div>
      <Card>
        <CT>Export</CT>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8,marginBottom:16}}>
          {[['Records',(rec||[]).length],['Medications',(meds||[]).length],['Labs',(labs||[]).length],['Vitals',(vitals||[]).length],['Symptoms',(syms||[]).length],['Care Events',(care||[]).length],['Documents',(docs||[]).length],['Notes',(notes||[]).length]].map(([l,v]) => (
            <div key={l} style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:8,padding:'9px 11px'}}><div style={{fontSize:20,fontWeight:700,color:'var(--ac)'}}>{v}</div><div style={{fontSize:10,color:'var(--mu)',marginTop:2}}>{l}</div></div>
          ))}
        </div>
        <Btn onClick={exp}>⬇ Export All Data (JSON)</Btn>
      </Card>
      <Card mb={0}>
        <CT>Import / Restore</CT>
        <div style={{fontSize:13,color:'var(--mu)',marginBottom:14}}><strong style={{color:'var(--re)'}}>Warning: overwrites all current data.</strong></div>
        <input ref={ref} type="file" accept=".json" onChange={hImp} style={{display:'none'}}/>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Btn variant="amber" onClick={() => ref.current?.click()} disabled={imp}>{imp?<><div className="spinner"/>Importing...</>:'⬆ Import Backup'}</Btn>
          {msg && <span style={{fontSize:13,color:msg.startsWith('✓')?'var(--gr)':'var(--re)'}}>{msg}</span>}
        </div>
      </Card>
    </div>
  );
}

// ── CCDA Parser ───────────────────────────────────────────────────────────────
const parseCCDA = xmlStr => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr,'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML file.');
  const results = {meds:[],labs:[],conditions:[],allergies:[],vitals:[],encounters:[]};
  const txt = el => el?.textContent?.trim()||'';
  const attr = (el,a) => el?.getAttribute(a)||'';
  const fmtDate = s => { if(!s)return''; const d=s.replace(/[^0-9]/g,'').slice(0,8); if(d.length===8)return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8); if(d.length===6)return d.slice(0,4)+'-'+d.slice(4,6)+'-01'; return d.slice(0,4)||''; };
  doc.querySelectorAll('section').forEach(sec => {
    const code = attr(sec.querySelector('code'),'code');
    const title = txt(sec.querySelector('title')).toLowerCase();
    if (code==='10160-0'||title.includes('medication')) {
      sec.querySelectorAll('substanceAdministration').forEach(e => {
        try { const nameEl=e.querySelector('manufacturedMaterial name')||e.querySelector('name'); const name=txt(nameEl); if(!name||name.length<2)return; const doseEl=e.querySelector('doseQuantity'); const dose=doseEl?(attr(doseEl,'value')+(attr(doseEl,'unit')!=='UNK'?' '+attr(doseEl,'unit'):'')):'' ; const freqEl=e.querySelector('effectiveTime[institutionSpecified]')||e.querySelector('period'); const freq=freqEl?'Every '+attr(freqEl,'value')+' '+attr(freqEl,'unit'):''; const sd=fmtDate(attr(e.querySelector('effectiveTime low')||e.querySelector('low'),'value')); const ed=fmtDate(attr(e.querySelector('effectiveTime high')||e.querySelector('high'),'value')); const active=attr(e.querySelector('statusCode'),'code')!=='completed'; const ind=txt(e.querySelector('reasonCode displayName')||e.querySelector('text')).slice(0,120); results.meds.push({id:Date.now()+Math.random(),name,dose:dose.trim(),freq,sd,ed,active,ind,prov:'',se:'',ixn:''}); } catch {}
      });
    }
    if (code==='30954-2'||code==='26436-6'||title.includes('result')||title.includes('lab')) {
      sec.querySelectorAll('observation').forEach(o => {
        try { const nameEl=o.querySelector('code'); const metric=attr(nameEl,'displayName')||txt(o.querySelector('originalText'))||attr(nameEl,'code'); if(!metric||metric.length<2)return; const valEl=o.querySelector('value'); const value=attr(valEl,'value')||txt(valEl); if(!value)return; const unit=attr(valEl,'unit')!=='UNK'?attr(valEl,'unit'):''; const dateEl=o.querySelector('effectiveTime'); const refEl=o.querySelector('referenceRange observationRange text')||o.querySelector('referenceRange text'); const interp=attr(o.querySelector('interpretationCode'),'code'); const flag=['H','L','HH','LL','A'].includes(interp); results.labs.push({id:Date.now()+Math.random(),date:fmtDate(attr(dateEl,'value')||txt(dateEl))||td(),metric,value,unit,ref:txt(refEl).replace(/\s+/g,' ').slice(0,30),flag}); } catch {}
      });
    }
    if (code==='11450-4'||title.includes('problem')||title.includes('condition')) {
      sec.querySelectorAll('observation').forEach(o => {
        try { const valEl=o.querySelector('value'); const cond=attr(valEl,'displayName')||txt(o.querySelector('originalText')); if(!cond||cond.length<3)return; results.conditions.push({cond,date:fmtDate(attr(o.querySelector('effectiveTime low')||o.querySelector('effectiveTime'),'value'))}); } catch {}
      });
    }
    if (code==='48765-2'||title.includes('allerg')) {
      sec.querySelectorAll('observation').forEach(o => {
        try { const subEl=o.querySelector('participant participantRole playingEntity name')||o.querySelector('code'); const sub=txt(subEl)||attr(o.querySelector('code'),'displayName'); if(!sub)return; const rxnEl=o.querySelector('entryRelationship observation value'); results.allergies.push({sub,rxn:attr(rxnEl,'displayName')||txt(rxnEl)}); } catch {}
      });
    }
    if (code==='8716-3'||title.includes('vital')) {
      sec.querySelectorAll('organizer').forEach(org => {
        try { const date=fmtDate(attr(org.querySelector('effectiveTime'),'value'))||td(); const vobj={id:Date.now()+Math.random(),date,sys:'',dia:'',hr:'',wt:'',wtu:'lbs',o2:'',tmp:'',tmpu:'F',notes:''}; org.querySelectorAll('observation').forEach(o => { const lc=attr(o.querySelector('code'),'code'); const valEl=o.querySelector('value'); const val=attr(valEl,'value'); const unit=attr(valEl,'unit'); if(lc==='8480-6')vobj.sys=val; else if(lc==='8462-4')vobj.dia=val; else if(lc==='8867-4')vobj.hr=val; else if(lc==='29463-7'){vobj.wt=val;vobj.wtu=unit==='kg'?'kg':'lbs';} else if(lc==='2710-2'||lc==='59408-5')vobj.o2=val; else if(lc==='8310-5'){vobj.tmp=val;vobj.tmpu=unit==='Cel'?'C':'F';} }); if(vobj.sys||vobj.hr||vobj.wt||vobj.o2)results.vitals.push(vobj); } catch {}
      });
    }
    if (code==='46240-8'||title.includes('encounter')||title.includes('visit')) {
      sec.querySelectorAll('encounter').forEach(e => {
        try { const dateEl=e.querySelector('effectiveTime low')||e.querySelector('effectiveTime'); const date=fmtDate(attr(dateEl,'value')); if(!date)return; const prov=txt(e.querySelector('performer assignedEntity assignedPerson name')).replace(/\s+/g,' ').trim(); const sum=txt(e.querySelector('text')||e.querySelector('originalText')).slice(0,200).replace(/\s+/g,' '); results.encounters.push({id:Date.now()+Math.random(),date,spc:'Primary Care',dtype:'Clinical Note',prov,sum,mf:'',dx:'',mc:'',fu:''}); } catch {}
      });
    }
  });
  return results;
};

// ── Import Records ────────────────────────────────────────────────────────────
function ImportTab({ rec, setRec, meds, setMeds, labs, setLabs, vitals, setVitals, docs, setDocs, profile, setProfile }) {
  const [mode, setMode] = useState('xdm'); const [result, setResult] = useState(null); const [err, setErr] = useState('');
  const [xdmParsing, setXdmParsing] = useState(false); const [xdmProgress, setXdmProgress] = useState({done:0,total:0,errors:0});
  const [ccdaParsing, setCcdaParsing] = useState(false);
  const [pdfUl, setPdfUl] = useState(false); const [pdfForm, setPdfForm] = useState({title:'',date:td(),spc:'',dtype:'',notes:''}); const [pdfMsg, setPdfMsg] = useState('');
  const xdmRef = useRef(); const ccdaRef = useRef(); const pdfRef = useRef();
  const readText = file => new Promise((res,rej) => { const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.onerror=()=>rej(new Error('Read error')); r.readAsText(file); });
  const merge = (a,b) => ({meds:[...a.meds,...b.meds],labs:[...a.labs,...b.labs],vitals:[...a.vitals,...b.vitals],encounters:[...a.encounters,...b.encounters],conditions:[...a.conditions,...b.conditions],allergies:[...a.allergies,...b.allergies]});
  const empty = () => ({meds:[],labs:[],vitals:[],encounters:[],conditions:[],allergies:[]});
  const dedupMeds = arr => { const seen=new Set(); return arr.filter(m => { const k=m.name.toLowerCase(); if(seen.has(k))return false; seen.add(k); return true; }); };
  const handleXDM = async e => {
    const files = Array.from(e.target.files||[]).filter(f => f.name.match(/\.(xml|ccd|ccda|cda)$/i) && !f.name.match(/^(METADATA|STYLE)/i));
    if (!files.length) { setErr('No DOC XML files found. Select the DOC####.xml files from IHE_XDM/Gregory1.'); return; }
    setErr(''); setResult(null); setXdmParsing(true); setXdmProgress({done:0,total:files.length,errors:0});
    let agg = empty(); let errors = 0;
    for (let i=0; i<files.length; i+=10) {
      const batch = files.slice(i,i+10);
      await Promise.all(batch.map(async f => { try { const text=await readText(f); const parsed=parseCCDA(text); agg=merge(agg,parsed); } catch { errors++; } }));
      setXdmProgress({done:Math.min(i+10,files.length),total:files.length,errors});
      await new Promise(r => setTimeout(r,0));
    }
    agg.meds = dedupMeds(agg.meds);
    const lk = new Set(); agg.labs = agg.labs.filter(l => { const k=l.date+'|'+l.metric+'|'+l.value; if(lk.has(k))return false; lk.add(k); return true; });
    const vk = new Set(); agg.vitals = agg.vitals.filter(v => { const k=v.date+'|'+v.sys+'|'+v.hr; if(vk.has(k))return false; vk.add(k); return true; });
    const ek = new Set(); agg.encounters = agg.encounters.filter(e => { const k=e.date+'|'+e.prov+'|'+(e.sum||'').slice(0,30); if(ek.has(k))return false; ek.add(k); return true; });
    const ck = new Set(); agg.conditions = agg.conditions.filter(c => { const k=c.cond.toLowerCase(); if(ck.has(k))return false; ck.add(k); return true; });
    setXdmParsing(false); setResult({...agg,fileCount:files.length,errors,source:'xdm'}); e.target.value='';
  };
  const handleCCDA = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.match(/\.(xml|ccd|ccda|cda)$/i)) { setErr('Please upload an XML file.'); return; }
    setErr(''); setCcdaParsing(true); setResult(null);
    try { const text = await readText(file); setResult({...parseCCDA(text),source:'ccda'}); } catch (ex) { setErr(ex.message); }
    setCcdaParsing(false); e.target.value='';
  };
  const importData = async (parsed, choices) => {
    if (choices.meds && parsed.meds.length) { const ex=meds||[]; const names=new Set(ex.map(m=>m.name.toLowerCase())); const u=[...parsed.meds.filter(m=>!names.has(m.name.toLowerCase())),...ex]; await sv(K.m,u); setMeds(u); }
    if (choices.labs && parsed.labs.length) { const u=[...parsed.labs,...(labs||[])]; await sv(K.l,u); setLabs(u); }
    if (choices.vitals && parsed.vitals.length) { const u=[...parsed.vitals,...(vitals||[])]; await sv(K.v,u); setVitals(u); }
    if (choices.encounters && parsed.encounters.length) { const u=[...parsed.encounters,...(rec||[])]; await sv(K.r,u); setRec(u); }
    if (choices.conditions && parsed.conditions.length && profile) { const conds=parsed.conditions.map(c=>c.cond).join(', '); const m=profile.chronicConditions?profile.chronicConditions+'; '+conds:conds; const u={...profile,chronicConditions:m}; await sv(K.p,u); setProfile(u); }
    if (choices.allergies && parsed.allergies.length && profile) { const allgs=parsed.allergies.map(a=>a.sub+(a.rxn?' ('+a.rxn+')':'')).join(', '); const m=profile.allergies?profile.allergies+'; '+allgs:allgs; const u={...profile,allergies:m}; await sv(K.p,u); setProfile(u); }
    setResult(prev => ({...prev,imported:true,choices}));
  };
  const ImportPreview = ({ parsed }) => {
    const [choices, setChoices] = useState({meds:parsed.meds.length>0,labs:parsed.labs.length>0,vitals:parsed.vitals.length>0,encounters:parsed.encounters.length>0,conditions:parsed.conditions.length>0,allergies:parsed.allergies.length>0});
    const [done, setDone] = useState(parsed.imported||false);
    const total = Object.entries(choices).filter(([,v])=>v).reduce((acc,[k])=>acc+(parsed[k]?.length||0),0);
    if (done) return (<div style={{background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.25)',borderRadius:10,padding:22,textAlign:'center'}}><div style={{fontSize:22,marginBottom:8}}>✓</div><div style={{fontWeight:600,fontSize:15,color:'var(--gr)',marginBottom:4}}>Import Complete</div><div style={{fontSize:13,color:'var(--mu)',marginBottom:14}}>Records imported into the appropriate tabs.</div><Btn variant="ghost" onClick={() => setResult(null)}>Import More</Btn></div>);
    return (<div>
      <div style={{marginBottom:14}}><div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{parsed.source==='xdm'?'✓ Processed '+parsed.fileCount+' documents'+(parsed.errors>0?' ('+parsed.errors+' unreadable)':''):'✓ CCDA parsed successfully'}</div><div style={{fontSize:13,color:'var(--mu)'}}>Select categories to import. Duplicates removed automatically.</div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[['meds','💊','Medications',parsed.meds.length,'→ Medications tab'],['labs','🧪','Lab Results',parsed.labs.length,'→ Labs & Trends'],['vitals','❤️','Vital Signs',parsed.vitals.length,'→ Vitals tab'],['encounters','📋','Visit Records',parsed.encounters.length,'→ Records tab'],['conditions','🩺','Conditions',parsed.conditions.length,'→ Profile'],['allergies','⚠️','Allergies',parsed.allergies.length,'→ Profile']].map(([k,icon,label,count,dest]) => (
          <div key={k} onClick={() => count>0 && setChoices(c=>({...c,[k]:!c[k]}))} style={{background:choices[k]&&count>0?'var(--ad)':'var(--s2)',border:'1px solid '+(choices[k]&&count>0?'rgba(79,142,247,.35)':'var(--bd)'),borderRadius:8,padding:'12px 14px',cursor:count>0?'pointer':'default',opacity:count===0?0.35:1,transition:'all .15s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><span style={{fontSize:13,fontWeight:500}}>{icon} {label}</span><span style={{fontFamily:'var(--mo)',fontSize:18,fontWeight:700,color:choices[k]&&count>0?'var(--ac)':'var(--mu)'}}>{count}</span></div>
            <div style={{fontSize:11,color:'var(--mu)'}}>{count>0?dest:'None found'}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}><Btn onClick={async()=>{await importData(parsed,choices);setDone(true);}} disabled={total===0}>{'⬇ Import '+total+' records'}</Btn><Btn variant="ghost" onClick={() => setResult(null)}>Cancel</Btn>{total>0&&<span style={{fontSize:12,color:'var(--mu)'}}>{total} selected</span>}</div>
    </div>);
  };
  const handlePDF = e => { const file=e.target.files?.[0]; if(!file)return; if(file.size>5*1024*1024){setPdfMsg('Max 5MB.');return;} setPdfUl(true); setPdfMsg(''); const r=new FileReader(); r.onload=async ev=>{ const nd={id:Date.now(),title:pdfForm.title||file.name.replace(/\.[^/.]+$/,''),date:pdfForm.date||td(),spc:pdfForm.spc,dtype:pdfForm.dtype||'Clinical Note',notes:pdfForm.notes,fn:file.name,fsz:file.size,fd:ev.target.result}; const u=[nd,...(docs||[])]; await sv(K.d,u); setDocs(u); setPdfMsg('✓ Saved to Documents tab.'); setPdfForm({title:'',date:td(),spc:'',dtype:'',notes:''}); setPdfUl(false); }; r.readAsDataURL(file); e.target.value=''; };
  const sps = ['Cardiology','Dermatology','Endocrinology','Gastroenterology','Hematology','Nephrology','Neurology','Oncology','Orthopedics','Primary Care','Radiology','Transplant','Other'];
  const dts = ['Clinical Note','Lab Report','Imaging Report','Procedure Note','Discharge Summary','Consultation','Pathology','Insurance/EOB','Other'];
  const pct = xdmProgress.total>0 ? Math.round(xdmProgress.done/xdmProgress.total*100) : 0;
  return (
    <div className="fade">
      <div style={{marginBottom:18}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Import Records</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>IHE XDM batch, single CCDA, or PDF upload</div></div>
      <div style={{display:'flex',gap:0,marginBottom:20,background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:8,padding:4,width:'fit-content'}}>
        {[{id:'xdm',l:'📦 IHE XDM Batch'},{id:'ccda',l:'📥 Single CCDA'},{id:'pdf',l:'📄 PDF / Scan'}].map(m => (
          <div key={m.id} onClick={() => { setMode(m.id); setResult(null); setErr(''); }} style={{padding:'7px 14px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:500,transition:'all .15s',background:mode===m.id?'var(--ac)':'transparent',color:mode===m.id?'white':'var(--mu)'}}>{m.l}</div>
        ))}
      </div>
      {mode==='xdm' && <>
        <Card>
          <CT>IHE XDM Batch Import</CT>
          <div style={{background:'var(--s2)',borderRadius:8,padding:'12px 14px',marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:12,color:'var(--ac)',marginBottom:8}}>📦 Exactly what to do with your export:</div>
            <div style={{fontSize:12,color:'var(--mu)',lineHeight:1.9}}>
              <b style={{color:'var(--tx)'}}>1.</b> Open <span style={{fontFamily:'var(--mo)',fontSize:11,color:'var(--te)'}}>IHE_XDM → Gregory1</span><br/>
              <b style={{color:'var(--tx)'}}>2.</b> Press <span style={{fontFamily:'var(--mo)',fontSize:11}}>Ctrl+A</span>, then hold Ctrl and deselect <span style={{fontFamily:'var(--mo)',fontSize:11}}>METADATA.XML</span> and <span style={{fontFamily:'var(--mo)',fontSize:11}}>STYLE.XSL</span><br/>
              <b style={{color:'var(--tx)'}}>3.</b> Drag all selected files onto the drop zone below, or click to open file picker<br/>
              <b style={{color:'var(--tx)'}}>4.</b> MedIntel processes all 102 files and routes data to the correct tabs
            </div>
          </div>
          {!result && !xdmParsing && <div style={{border:'2px dashed var(--bd)',borderRadius:8,padding:'36px 20px',textAlign:'center',cursor:'pointer',transition:'all .15s'}} onClick={() => xdmRef.current?.click()} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--ac)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bd)'} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--ac)';e.currentTarget.style.background='var(--ad)';}} onDragLeave={e=>{e.currentTarget.style.borderColor='var(--bd)';e.currentTarget.style.background='transparent';}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--bd)';e.currentTarget.style.background='transparent';const dt=new DataTransfer();Array.from(e.dataTransfer.files).forEach(f=>dt.items.add(f));xdmRef.current.files=dt.files;handleXDM({target:xdmRef.current});}}>
            <input ref={xdmRef} type="file" accept=".xml,.ccd,.ccda,.cda" multiple onChange={handleXDM} style={{display:'none'}}/>
            <div style={{fontSize:28,marginBottom:10}}>📦</div>
            <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Drop all DOC####.xml files here</div>
            <div style={{fontSize:12,color:'var(--mu)'}}>or click to select — use Ctrl+A to select all 102</div>
          </div>}
          {xdmParsing && <div style={{padding:'24px 0'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:500}}>Processing {xdmProgress.total} documents...</span><span style={{fontSize:13,fontFamily:'var(--mo)',color:'var(--ac)'}}>{xdmProgress.done} / {xdmProgress.total}</span></div>
            <div style={{height:6,background:'var(--s2)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',background:'var(--ac)',borderRadius:3,width:pct+'%',transition:'width .2s'}}/></div>
          </div>}
          {err && <div style={{marginTop:10,fontSize:13,color:'var(--re)',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:6,padding:'9px 12px'}}>{err}</div>}
          {result && !xdmParsing && <div style={{marginTop:16}}><ImportPreview parsed={result}/></div>}
        </Card>
        <Card mb={0} style={{background:'rgba(79,142,247,.04)'}}><CT>About IHE XDM</CT><div style={{fontSize:13,color:'var(--mu)',lineHeight:1.8}}>Each DOC####.xml is one clinical document. MedIntel parses all in parallel, deduplicates, and routes to the correct tab. Re-import from any system — data accumulates.</div></Card>
      </>}
      {mode==='ccda' && <Card>
        <CT>Single CCDA / CCD File</CT>
        {!result && <div style={{border:'2px dashed var(--bd)',borderRadius:8,padding:'28px 20px',textAlign:'center',cursor:'pointer'}} onClick={() => ccdaRef.current?.click()}>
          <input ref={ccdaRef} type="file" accept=".xml,.ccd,.ccda,.cda" onChange={handleCCDA} style={{display:'none'}}/>
          {ccdaParsing ? <div style={{display:'flex',justifyContent:'center',gap:8}}><div className="spinner"/><span style={{color:'var(--mu)'}}>Parsing...</span></div>
          : <div><div style={{fontSize:22,marginBottom:6}}>📥</div><div style={{fontSize:13,color:'var(--mu)'}}>Click to select a CCDA / CCD / XML file</div></div>}
        </div>}
        {err && <div style={{marginTop:10,fontSize:13,color:'var(--re)',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:6,padding:'9px 12px'}}>{err}</div>}
        {result && !ccdaParsing && <div style={{marginTop:16}}><ImportPreview parsed={result}/></div>}
      </Card>}
      {mode==='pdf' && <Card>
        <CT>Upload PDF or Scanned Record</CT>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
          <Fld label="Title"><input value={pdfForm.title} onChange={e=>setPdfForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Nephrology Notes"/></Fld>
          <Fld label="Date"><input type="date" value={pdfForm.date} onChange={e=>setPdfForm(p=>({...p,date:e.target.value}))}/></Fld>
          <Fld label="Specialty"><select value={pdfForm.spc} onChange={e=>setPdfForm(p=>({...p,spc:e.target.value}))}><option value="">Select...</option>{sps.map(s=><option key={s}>{s}</option>)}</select></Fld>
          <Fld label="Type"><select value={pdfForm.dtype} onChange={e=>setPdfForm(p=>({...p,dtype:e.target.value}))}><option value="">Select...</option>{dts.map(d=><option key={d}>{d}</option>)}</select></Fld>
          <Fld label="Notes" full><input value={pdfForm.notes} onChange={e=>setPdfForm(p=>({...p,notes:e.target.value}))} placeholder="Brief description..."/></Fld>
        </div>
        <div style={{border:'2px dashed var(--bd)',borderRadius:8,padding:'22px',textAlign:'center',cursor:'pointer'}} onClick={() => pdfRef.current?.click()}>
          <input ref={pdfRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx" onChange={handlePDF} style={{display:'none'}}/>
          {pdfUl ? <div style={{display:'flex',justifyContent:'center',gap:8}}><div className="spinner"/><span style={{color:'var(--mu)',fontSize:13}}>Saving...</span></div>
          : <div><div style={{fontSize:20,marginBottom:6}}>📄</div><div style={{fontSize:13,color:'var(--mu)'}}>Click to select (max 5MB)</div></div>}
        </div>
        {pdfMsg && <div style={{marginTop:10,fontSize:13,color:pdfMsg.startsWith('✓')?'var(--gr)':'var(--re)'}}>{pdfMsg}</div>}
      </Card>}
    </div>
  );
}

// ── Epic Connections ──────────────────────────────────────────────────────────
const KNOWN = [
  {id:'ochsner',name:'Ochsner Health',region:'SE Louisiana',url:'https://fhir.myochsner.org/api/FHIR/R4',portal:'myochsner.org',notes:'SMART on FHIR. Use "Manage My Linked Apps" in MyOchsner.'},
  {id:'srhs',name:'Singing River Health System',region:'South Mississippi',url:'https://fhir.mysrhs.org/api/FHIR/R4',portal:'mysrhs.org',notes:'Export via Health Summary in patient portal.'},
  {id:'merit',name:'Merit Health / Forrest General',region:'Hattiesburg MS',url:'https://fhir.meritchristianhospital.com/api/FHIR/R4',portal:'MyChart',notes:'Download CCD from Health Record section.'},
  {id:'ummc',name:'UMMC',region:'Jackson MS',url:'https://fhir.umc.edu/api/FHIR/R4',portal:'umcmychartplus.com',notes:'Epic-based.'},
];

function ConnectionsTab() {
  const [conns, setConns] = useState([]); const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({name:'',region:'',url:'',portal:'',notes:''}); const [showHelp, setShowHelp] = useState(null);
  useEffect(() => { (async () => { const c = await ld('mi_connections'); if (c) setConns(JSON.parse(c.value)||[]); })(); }, []);
  const saveConns = async u => { await sv('mi_connections', u); setConns(u); };
  const isAdded = id => conns.some(c => c.id===id);
  const statusColor = s => s==='connected'?'green':s==='error'?'red':'muted';
  const statusLabel = s => s==='connected'?'Connected':s==='error'?'Error':'Not Connected';
  return (
    <div className="fade">
      <div style={{marginBottom:18}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:26,fontWeight:600}}>Epic Connections</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>Manage health system connections</div></div>
      <div style={{background:'rgba(245,158,11,.07)',border:'1px solid rgba(245,158,11,.25)',borderRadius:8,padding:'11px 14px',marginBottom:18,fontSize:13,color:'var(--am)',lineHeight:1.6}}>Live OAuth requires the Electron desktop version (Phase 2). Use <strong>Import Records</strong> to upload CCDA exports from each portal now.</div>
      <Card>
        <CT>Known Epic Systems</CT>
        {KNOWN.map(sys => (
          <div key={sys.id} style={{padding:'12px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{fontWeight:600,fontSize:13}}>{sys.name}</span><Bdg label={isAdded(sys.id)?statusLabel(conns.find(c=>c.id===sys.id)?.status):'Not Added'} color={isAdded(sys.id)?statusColor(conns.find(c=>c.id===sys.id)?.status):'muted'}/></div>
              <div style={{fontSize:12,color:'var(--mu)'}}>{sys.region} • <span style={{fontFamily:'var(--mo)',fontSize:11}}>{sys.portal}</span></div>
              {showHelp===sys.id && <div style={{marginTop:8,background:'var(--s2)',borderRadius:6,padding:'8px 12px'}}><div style={{fontFamily:'var(--mo)',fontSize:11,color:'var(--te)',marginBottom:6,wordBreak:'break-all'}}>{sys.url}</div><div style={{fontSize:12,color:'var(--mu)'}}>{sys.notes}</div></div>}
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <Btn small variant="ghost" onClick={() => setShowHelp(showHelp===sys.id?null:sys.id)}>{showHelp===sys.id?'Hide':'Setup'}</Btn>
              {!isAdded(sys.id) ? <Btn small variant="ghost" onClick={async() => { await saveConns([...conns,{...sys,custom:false,status:'not_connected'}]); }}>+ Add</Btn>
              : <Btn small variant="danger" onClick={async() => { await saveConns(conns.filter(c=>c.id!==sys.id)); }}>Remove</Btn>}
            </div>
          </div>
        ))}
      </Card>
      {conns.length > 0 && <Card>
        <CT>My Systems ({conns.length})</CT>
        {conns.map(c => (
          <div key={c.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(26,42,61,.5)',display:'flex',gap:10,alignItems:'center'}}>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{c.name}</div><div style={{fontFamily:'var(--mo)',fontSize:11,color:'var(--mu)',wordBreak:'break-all'}}>{c.url}</div></div>
            <Btn small variant="amber" disabled>Connect (Phase 2)</Btn>
            <Btn small variant="danger" onClick={async() => { await saveConns(conns.filter(x=>x.id!==c.id)); }}>✕</Btn>
          </div>
        ))}
      </Card>}
      <Card mb={0}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:showAdd?14:0}}><CT style={{margin:0}}>Add Custom System</CT><Btn small variant="ghost" onClick={() => setShowAdd(!showAdd)}>{showAdd?'Cancel':'+ Add'}</Btn></div>
        {showAdd && <><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <Fld label="Name"><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Baptist Medical Center"/></Fld>
          <Fld label="Region"><input value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value}))}/></Fld>
          <Fld label="FHIR URL" full><input value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} placeholder="https://fhir.example.com/api/FHIR/R4"/></Fld>
          <Fld label="Portal"><input value={form.portal} onChange={e=>setForm(p=>({...p,portal:e.target.value}))}/></Fld>
        </div><Btn onClick={async() => { if(!form.name||!form.url)return; await saveConns([...conns,{...form,id:'custom_'+Date.now(),custom:true,status:'not_connected'}]); setForm({name:'',region:'',url:'',portal:'',notes:''}); setShowAdd(false); }} disabled={!form.name||!form.url}>Add System</Btn></>}
      </Card>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function MedIntel() {
  useEffect(() => { injectStyles(); }, []);
  const [tab, setTab] = useState('dashboard'); const [loaded, setLoaded] = useState(false);
  const [p, setP] = useState(null); const [rec, setRec] = useState([]); const [meds, setMeds] = useState([]);
  const [labs, setLabs] = useState([]); const [syms, setSyms] = useState([]); const [care, setCare] = useState([]);
  const [vitals, setVitals] = useState([]); const [vcfg, setVcfg] = useState({});
  const [docs, setDocs] = useState([]); const [notes, setNotes] = useState([]); const [dis, setDis] = useState([]);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => { (async () => {
    const load = async k => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch { return null; } };
    const [a,b,c,d,e,f,g,h,i,j,k,ak] = await Promise.all([load(K.p),load(K.r),load(K.m),load(K.l),load(K.s),load(K.c),load(K.v),load(K.vc),load(K.d),load(K.n),load(K.dis),load(K.ak)]);
    if (a) setP(a); if (b) setRec(b); if (c) setMeds(c); if (d) setLabs(d); if (e) setSyms(e); if (f) setCare(f);
    if (g) setVitals(g); if (h) setVcfg(h); if (i) setDocs(i); if (j) setNotes(j); if (k) setDis(k); if (ak) setApiKey(ak);
    setLoaded(true);
  })(); }, []);

  const hImport = async data => {
    const pairs = [[K.p,'profile'],[K.r,'records'],[K.m,'meds'],[K.l,'labs'],[K.s,'symptoms'],[K.c,'care'],[K.v,'vitals'],[K.vc,'vitalsCfg'],[K.n,'notes']];
    const setters = {profile:setP,records:setRec,meds:setMeds,labs:setLabs,symptoms:setSyms,care:setCare,vitals:setVitals,vitalsCfg:setVcfg,notes:setNotes};
    for (const [key,name] of pairs) { if (data[name]) { setters[name](data[name]); await sv(key,data[name]); } }
  };

  const alerts = calcAlerts(care, vitals, vcfg, dis);
  if (!loaded) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',flexDirection:'column',gap:12}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:28,color:'var(--ac)'}}>MedIntel</div><div className="spinner" style={{width:24,height:24}}/></div>;

  const tabs = {
    dashboard: <DashBoard p={p} rec={rec} meds={meds} labs={labs} syms={syms} care={care} vitals={vitals} vcfg={vcfg} dis={dis} setDis={setDis} setTab={setTab}/>,
    profile: <ProfileTab profile={p} setProfile={setP}/>,
    records: <RecordsTab records={rec} setRecords={setRec}/>,
    meds: <MedsTab meds={meds} setMeds={setMeds}/>,
    labs: <LabsTab labs={labs} setLabs={setLabs}/>,
    vitals: <VitalsTab vitals={vitals} setVitals={setVitals} vcfg={vcfg} setVcfg={setVcfg}/>,
    symptoms: <SympTab syms={syms} setSyms={setSyms}/>,
    care: <CareTab care={care} setCare={setCare}/>,
    docs: <DocsTab docs={docs} setDocs={setDocs}/>,
    notes: <NotesTab notes={notes} setNotes={setNotes}/>,
    analysis: <AITab p={p} rec={rec} meds={meds} labs={labs} syms={syms} care={care} vitals={vitals} apiKey={apiKey} setApiKey={setApiKey}/>,
    import: <ImportTab rec={rec} setRec={setRec} meds={meds} setMeds={setMeds} labs={labs} setLabs={setLabs} vitals={vitals} setVitals={setVitals} docs={docs} setDocs={setDocs} profile={p} setProfile={setP}/>,
    connections: <ConnectionsTab/>,
    export: <ExportTab p={p} rec={rec} meds={meds} labs={labs} syms={syms} care={care} vitals={vitals} vcfg={vcfg} docs={docs} notes={notes} onImport={hImport}/>,
  };

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <div style={{width:188,minWidth:188,background:'var(--surf)',borderRight:'1px solid var(--bd)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 14px 12px',borderBottom:'1px solid var(--bd)'}}><div style={{fontFamily:"'Crimson Pro',serif",fontSize:20,fontWeight:600,color:'var(--ac)'}}>MedIntel</div><div style={{fontSize:10,color:'var(--mu)',letterSpacing:1.5,textTransform:'uppercase',marginTop:1}}>Personal Health OS</div></div>
        <nav style={{padding:'5px 0',flex:1,overflowY:'auto'}}>
          {NAV.map(({id,icon,l}) => {
            const a = tab===id; const ac = id==='dashboard' ? alerts.length : 0;
            return (
              <div key={id} onClick={() => setTab(id)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 13px',cursor:'pointer',color:a?'var(--ac)':'var(--mu)',background:a?'var(--ad)':'transparent',borderLeft:'2px solid '+(a?'var(--ac)':'transparent'),fontSize:13,fontWeight:500,transition:'all .15s',userSelect:'none'}}
                onMouseEnter={e => { if(!a){e.currentTarget.style.color='var(--tx)';e.currentTarget.style.background='var(--s2)';} }}
                onMouseLeave={e => { if(!a){e.currentTarget.style.color='var(--mu)';e.currentTarget.style.background='transparent';} }}>
                <span style={{fontSize:12,width:16,textAlign:'center'}}>{icon}</span>
                <span style={{flex:1}}>{l}</span>
                {id==='analysis' && <span style={{fontSize:9,background:'var(--ac)',color:'white',padding:'1px 5px',borderRadius:10}}>AI</span>}
                {ac > 0 && <span style={{fontSize:10,background:'var(--re)',color:'white',padding:'1px 6px',borderRadius:10,fontWeight:700}}>{ac}</span>}
              </div>
            );
          })}
        </nav>
        <div style={{padding:'11px 13px',borderTop:'1px solid var(--bd)'}}>
          {p?.name && <><div style={{fontSize:11,color:'var(--mu)'}}>Patient</div><div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{p.name}</div></>}
          <div style={{fontSize:10,color:'var(--m2)',lineHeight:1.4}}>Data stored locally<br/>Not for emergencies</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',background:'var(--bg)'}}><div style={{padding:'22px 26px',maxWidth:1040}}>{tabs[tab]}</div></div>
    </div>
  );
}
