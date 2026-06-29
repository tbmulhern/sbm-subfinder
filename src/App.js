/* eslint-disable no-restricted-globals */
import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.REACT_APP_API_URL || "https://sbm-subfinder.netlify.app";

async function sb(action, data = {}) {
  const res = await fetch(`${API_URL}/.netlify/functions/db`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

const today = () => new Date().toISOString().split("T")[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const initials = n => n ? n.split(" ").filter(Boolean).map(p => p[0].toUpperCase()).join("").slice(0, 2) : "?";
const fmt12 = t => { if (!t) return null; const [h, m] = t.split(":"); const hr = parseInt(h); return `${hr % 12 || 12}:${m}${hr < 12 ? "am" : "pm"}`; };

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri" };


const C = {
  green: "#3d6b4f", greenDark: "#2a4d38", greenLight: "#eaf2ec", greenMid: "#b8d4c0",
  slate: "#6b8fa3", slateLight: "#e8f0f5", slateDark: "#3d5c6b",
  gold: "#c49a3c", goldLight: "#fdf6e3", goldMid: "#f0d898",
  cream: "#faf8f4", parchment: "#f2ede4",
  text: "#1e2d22", textMid: "#4a5c4e", textLight: "#7a8c7e",
  white: "#ffffff", red: "#b84040", redLight: "#fbeaea", border: "#ddd8ce",
};
const F = "Arial, Helvetica, sans-serif";
const VIEWS = { HOME: "home", TEACHER: "teacher", SUB: "sub", ADMIN: "admin", CALENDAR: "calendar", SCHEDULE: "schedule" };

const emptyT = { name: "", classroom: "", phone: "", email: "", break_time_start: "", break_time_end: "", monday_start: "", monday_end: "", tuesday_start: "", tuesday_end: "", wednesday_start: "", wednesday_end: "", thursday_start: "", thursday_end: "", friday_start: "", friday_end: "" };

export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [view, setView] = useState(VIEWS.HOME);
  const [subId, setSubId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [t, s, r] = await Promise.all([sb("getTeachers"), sb("getSubs"), sb("getRequests")]);
      setTeachers(t); setSubs(s); setRequests(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); const iv = setInterval(loadAll, 10000); return () => clearInterval(iv); }, [loadAll]);

  const todayReqs = requests.filter(r => r.date === today());
  const openReqs = todayReqs.filter(r => r.status === "open");
  const filledToday = todayReqs.filter(r => r.status === "filled");

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.cream, fontFamily: F }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
        <p style={{ color: C.textMid, fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: F, background: C.cream, minHeight: "100vh", paddingBottom: 40 }}>
      <Header view={view} setView={setView} onRefresh={loadAll} />
      <div style={{ padding: "0 16px" }}>
        {view === VIEWS.HOME && <HomeView openReqs={openReqs} filledToday={filledToday} setView={setView} setSubId={setSubId} setSelectedReq={setSelectedReq} />}
        {view === VIEWS.TEACHER && <TeacherView teachers={teachers} subs={subs} requests={requests} onSubmit={loadAll} setView={setView} />}
        {view === VIEWS.SUB && <SubView subs={subs} requests={requests} subId={subId} setSubId={setSubId} onAccept={loadAll} selectedReq={selectedReq} setSelectedReq={setSelectedReq} />}
        {view === VIEWS.SCHEDULE && <ScheduleView teachers={teachers} subs={subs} />}
        {view === VIEWS.CALENDAR && <CalendarView requests={requests} />}
        {view === VIEWS.ADMIN && <AdminGate teachers={teachers} subs={subs} requests={requests} onRefresh={loadAll} />}
      </div>
    </div>
  );
}

function Header({ view, setView, onRefresh }) {
  return (
    <div style={{ background: C.greenDark, marginBottom: 20, paddingTop: "env(safe-area-inset-top)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px" }}>
        {view !== VIEWS.HOME && <button onClick={() => setView(VIEWS.HOME)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 20, padding: "0 4px 0 0", flexShrink: 0 }}>←</button>}
        <button onClick={() => setView(VIEWS.HOME)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 1, minWidth: 0, textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: "bold", color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.3 }}>Small But Mighty</p>
          <p style={{ margin: 0, fontSize: 9, color: C.goldMid, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>Substitute Finder</p>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onRefresh} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 17, padding: "0 2px", flexShrink: 0 }}>↻</button>
        {view === VIEWS.HOME && <>
          <NavPill label="Schedule" onClick={() => setView(VIEWS.SCHEDULE)} />
          <NavPill label="Cal" onClick={() => setView(VIEWS.CALENDAR)} />
          <NavPill label="Admin" onClick={() => setView(VIEWS.ADMIN)} />
        </>}
      </div>
    </div>
  );
}

function NavPill({ label, onClick }) {
  return <button onClick={onClick} style={{ fontSize: 10, padding: "4px 9px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", cursor: "pointer", color: C.white, letterSpacing: 0.5, fontFamily: F, flexShrink: 0, whiteSpace: "nowrap" }}>{label.toUpperCase()}</button>;
}

function HomeView({ openReqs, filledToday, setView, setSubId, setSelectedReq }) {
  const allToday = [...openReqs, ...filledToday];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard label="Open requests" value={openReqs.length} color={C.red} bg={C.redLight} />
        <StatCard label="Filled today" value={filledToday.length} color={C.green} bg={C.greenLight} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <ActionCard icon="👩‍🏫" title="I need a substitute" sub="Submit an absence request" onClick={() => setView(VIEWS.TEACHER)} accent={C.gold} bg={C.goldLight} />
        <ActionCard icon="🙋" title="I'm a substitute" sub="See open positions" onClick={() => { setSubId(null); setView(VIEWS.SUB); }} accent={C.green} bg={C.greenLight} />
      </div>
      {allToday.length > 0 && <><SectionLabel>Today's requests</SectionLabel>{allToday.map(r => <ReqCard key={r.id} r={r} showStatus clickable onClick={() => { setSelectedReq(r); setView(VIEWS.SUB); }} />)}</>}
      {allToday.length === 0 && <EmptyState icon="🌿" msg="No requests today" />}
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return <div style={{ background: bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${color}22` }}><p style={{ margin: 0, fontSize: 11, color, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</p><p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: "bold", color }}>{value}</p></div>;
}

function ActionCard({ icon, title, sub, onClick, accent, bg }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: bg, border: `1px solid ${accent}44`, borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: "bold", fontSize: 15, color: C.text }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMid }}>{sub}</p>
      </div>
      <span style={{ color: accent, fontSize: 22, marginRight: 4 }}>›</span>
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <p style={{ margin: 0, fontSize: 11, fontWeight: "bold", color: C.textLight, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</p>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function ReqCard({ r, showStatus, clickable, onClick }) {
  return (
    <div onClick={clickable ? onClick : undefined} style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${r.status === "open" ? C.red : C.green}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: clickable ? "pointer" : "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: 15, color: C.text }}>{r.teacher_name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMid }}>{r.classroom}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textLight }}>{r.date} · {r.time}</p>
          {r.break_time && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.slate }}>🥪 Break: {r.break_time}</p>}
          {r.notes && <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textLight, fontStyle: "italic" }}>{r.notes}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 8 }}>
          {showStatus && <StatusBadge r={r} />}
          {clickable && <span style={{ color: C.textLight, fontSize: 16 }}>›</span>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ r }) {
  return <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: "bold", background: r.status === "open" ? C.redLight : C.greenLight, color: r.status === "open" ? C.red : C.green, whiteSpace: "nowrap", border: `1px solid ${r.status === "open" ? C.red : C.green}33` }}>{r.status === "open" ? "Open" : `Filled · ${r.accepted_by}`}</span>;
}

function EmptyState({ icon, msg }) {
  return <div style={{ textAlign: "center", padding: "40px 0" }}><p style={{ fontSize: 32, margin: "0 0 8px" }}>{icon}</p><p style={{ fontSize: 14, color: C.textLight }}>{msg}</p></div>;
}

function TeacherView({ teachers, subs, requests, onSubmit, setView }) {
  const [teacherId, setTeacherId] = useState("");
  const [date, setDate] = useState(today());
  const [fullShift, setFullShift] = useState(true);
  const [customTime, setCustomTime] = useState("");
  const [reason, setReason] = useState("sickness");
  const [reasonDetail, setReasonDetail] = useState("");
  const [notifySubIds, setNotifySubIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedTeacher = teachers.find(t => t.id === teacherId);
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(date + "T12:00:00").getDay()];
  const schedStart = selectedTeacher?.[`${weekday}_start`];
  const schedEnd = selectedTeacher?.[`${weekday}_end`];
  const scheduleStr = schedStart && schedEnd ? `${fmt12(schedStart)} – ${fmt12(schedEnd)}` : null;
  const effectiveTime = fullShift ? (scheduleStr || "Full shift") : customTime;

  const monthlyFilled = teacherId ? requests.filter(r => r.teacher_id === teacherId && r.status === "filled" && r.date?.startsWith(thisMonth())).length : 0;
  const atLimit = monthlyFilled >= 5;
  const dayCount = requests.filter(r => r.date === date).length;
  const dayAtLimit = dayCount >= 3;

  const toggleNotify = id => setNotifySubIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSubmit = async () => {
    if (!teacherId || atLimit || dayAtLimit) return;
    if (reason === "other" && !reasonDetail.trim()) { alert("Please describe the reason for the absence."); return; }
    if (!fullShift && !customTime.trim()) { alert("Please enter the hours/times needed."); return; }
    if (reason === "sickness") {
      const sickDates = new Set(requests.filter(r => r.teacher_id === teacherId && r.reason === "sickness" && r.date?.startsWith(thisMonth())).map(r => r.date));
      sickDates.add(date);
      if (sickDates.size >= 3) {
        const ok = window.confirm(`⚠️ ${selectedTeacher.name} has requested sick coverage for ${sickDates.size} days this month.\n\nA doctor's note is required for absences longer than 2 days. Continue?`);
        if (!ok) return;
      }
    }
    setSaving(true);
    try {
      const breakTime = selectedTeacher.break_time_start && selectedTeacher.break_time_end
        ? `${fmt12(selectedTeacher.break_time_start)} – ${fmt12(selectedTeacher.break_time_end)}` : null;
      const [req] = await sb("addRequest", {
        teacher_id: selectedTeacher.id,
        teacher_name: selectedTeacher.name,
        classroom: selectedTeacher.classroom,
        break_time: breakTime,
        date,
        time: effectiveTime,
        notes,
        reason,
        reason_detail: reason === "other" ? reasonDetail : null,
        notify_subs: notifySubIds,
      });
      await onSubmit();
      setSubmitted(req);
    } catch (e) {
      alert(e.message === "limit reached"
        ? "Limit reached — there are already 3 substitute requests for this day."
        : "Error: " + e.message);
    } finally { setSaving(false); }
  };

  if (submitted) {
    const appUrl = window.location.href;
    const msg = `Sub needed at Small But Mighty Preschool!\n\n👩‍🏫 ${submitted.teacher_name} is absent\n📚 ${submitted.classroom}\n📅 ${submitted.date} · ${submitted.time}${submitted.break_time ? `\n🥪 Break: ${submitted.break_time}` : ""}${submitted.notes ? `\n📝 ${submitted.notes}` : ""}\n\nFirst sub to accept gets the spot!\nOpen the app: ${appUrl}`;
    const notifyIds = submitted.notify_subs || notifySubIds;
    const notifiedSubs = subs.filter(s => notifyIds.includes(s.id));
    const phones = notifiedSubs.map(s => s.phone).filter(Boolean).join(",");
    const smsHref = phones ? `sms:${phones}?&body=${encodeURIComponent(msg)}` : `sms:?&body=${encodeURIComponent(msg)}`;
    return (
      <div>
        <div style={{ background: C.greenLight, border: `1px solid ${C.greenMid}`, borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: 16, color: C.greenDark }}>Request submitted!</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.green }}>Now notify your subs so they can accept.</p>
        </div>
        <ReqCard r={submitted} />
        {notifiedSubs.length > 0 && (
          <div style={{ margin: "12px 0", padding: "10px 12px", background: C.slateLight, borderRadius: 8, border: `1px solid ${C.slate}33` }}>
            <p style={{ margin: 0, fontSize: 12, color: C.slateDark }}>Notifying: <strong>{notifiedSubs.map(s => s.name).join(", ")}</strong></p>
          </div>
        )}
        <div style={{ marginTop: 16, marginBottom: 8 }}><SectionLabel>Notify substitutes</SectionLabel></div>
        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#25D366", borderRadius: 10, textDecoration: "none", marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>💬</span><span style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>Send via WhatsApp</span>
        </a>
        <a href={smsHref} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: C.slateLight, border: `1px solid ${C.slate}44`, borderRadius: 10, textDecoration: "none", marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>📱</span><span style={{ color: C.slateDark, fontWeight: "bold", fontSize: 14 }}>Send via SMS{phones ? ` (${notifiedSubs.length})` : ""}</span>
        </a>
        <Btn onClick={() => setView(VIEWS.HOME)} variant="outline">Back to home</Btn>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 20px" }}>Fill in your details and we'll help you notify subs right away.</p>
      <Lbl>Your name</Lbl>
      <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={iS}>
        <option value="">Select your name...</option>
        {teachers.map(t => <option key={t.id} value={t.id}>{t.name} — {t.classroom}</option>)}
      </select>
      {teacherId && selectedTeacher?.break_time_start && (
        <div style={{ marginTop: 12, marginBottom: 12, padding: "8px 12px", background: C.slateLight, borderRadius: 8, border: `1px solid ${C.slate}33` }}>
          <p style={{ margin: 0, fontSize: 12, color: C.slateDark }}>🥪 Break time on file: <strong>{fmt12(selectedTeacher.break_time_start)} – {fmt12(selectedTeacher.break_time_end)}</strong> — will be included in the request.</p>
        </div>
      )}
      {teacherId && (
        <div style={{ marginTop: 12, marginBottom: 16, padding: "10px 12px", background: atLimit ? C.redLight : C.greenLight, borderRadius: 8, border: `1px solid ${atLimit ? C.red : C.green}33` }}>
          <p style={{ margin: 0, fontSize: 13, color: atLimit ? C.red : C.green, fontWeight: "bold" }}>
            {atLimit ? "⚠️ You've reached your limit of 5 subs for the month." : `✓ ${monthlyFilled}/5 sub requests used this month`}
          </p>
        </div>
      )}
      {teacherId && !atLimit && <>
        <Lbl>Date</Lbl>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...iS, marginBottom: 8 }} />
        <div style={{ marginBottom: 14, padding: "8px 12px", background: dayAtLimit ? C.redLight : C.greenLight, borderRadius: 8, border: `1px solid ${dayAtLimit ? C.red : C.green}33` }}>
          <p style={{ margin: 0, fontSize: 12, color: dayAtLimit ? C.red : C.green, fontWeight: "bold" }}>
            {dayAtLimit ? "⚠️ Limit reached — 3 subs already requested for this day." : `${dayCount}/3 subs requested for this day`}
          </p>
        </div>
        {!dayAtLimit && <>
          <Lbl>Reason for absence</Lbl>
          <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...iS, marginBottom: reason === "other" ? 8 : 14 }}>
            <option value="sickness">Sickness</option>
            <option value="other">Other</option>
          </select>
          {reason === "other" && (
            <input value={reasonDetail} onChange={e => setReasonDetail(e.target.value)} placeholder="Please specify the reason" style={{ ...iS, marginBottom: 14 }} />
          )}
          <Lbl>Hours needed</Lbl>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: fullShift ? 14 : 8, cursor: "pointer" }}>
            <input type="checkbox" checked={fullShift} onChange={e => setFullShift(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, color: C.text }}>Full shift{scheduleStr ? ` (${scheduleStr})` : ""}</span>
          </label>
          {!fullShift && (
            <input value={customTime} onChange={e => setCustomTime(e.target.value)} placeholder="e.g. 8:00 AM - 12:00 PM, or 4 hours" style={{ ...iS, marginBottom: 14 }} />
          )}
          <Lbl>Notify specific subs (optional)</Lbl>
          {subs.length === 0
            ? <p style={{ margin: "0 0 14px", fontSize: 12, color: C.textLight }}>No substitutes on file yet.</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                {subs.map(s => {
                  const on = notifySubIds.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleNotify(s.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: `1px solid ${on ? C.green : C.border}`, background: on ? C.greenLight : C.white, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${on ? C.green : C.border}`, background: on ? C.green : C.white, color: C.white, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{on ? "✓" : ""}</span>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: "bold" }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: C.textLight, marginLeft: "auto" }}>{s.phone}</span>
                    </button>
                  );
                })}
              </div>
          }
          <p style={{ margin: "0 0 14px", fontSize: 11, color: C.textLight }}>Leave all unchecked to notify everyone.</p>
          <Lbl>Notes (optional)</Lbl>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. lesson plan on desk, allergies to be aware of..." style={{ ...iS, height: 80, resize: "vertical", marginBottom: 20 }} />
          <Btn onClick={handleSubmit} disabled={!teacherId || saving} variant="primary">{saving ? "Submitting..." : "Submit request"}</Btn>
        </>}
      </>}
    </div>
  );
}

function SubView({ subs, requests, subId, setSubId, onAccept, selectedReq, setSelectedReq }) {
  const [accepting, setAccepting] = useState(null);
  const [historySubId, setHistorySubId] = useState(null);
  const openReqs = requests.filter(r => r.status === "open");
  const currentSub = subs.find(s => s.id === subId);

  const accept = async id => {
    if (!currentSub) return;
    const req = requests.find(r => r.id === id);
    const alreadyBooked = requests.some(r => r.status === "filled" && r.accepted_by === currentSub.name && r.date === req?.date);
    if (alreadyBooked) { alert(`You already have a position on ${req?.date}. Only one position per day.`); return; }
    setAccepting(id);
    try {
      await sb("acceptRequest", { id, accepted_by: currentSub.name });
      await onAccept();
      setSelectedReq(null);
    } catch (e) { alert("Error: " + e.message); }
    finally { setAccepting(null); }
  };

  if (selectedReq) {
    const req = requests.find(r => r.id === selectedReq.id) || selectedReq;
    const alreadyBooked = currentSub && requests.some(r => r.status === "filled" && r.accepted_by === currentSub.name && r.date === req.date);
    return (
      <div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${req.status === "open" ? C.red : C.green}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: 17, color: C.text }}>{req.teacher_name}</p>
          <p style={{ margin: "0 0 2px", fontSize: 13, color: C.textMid }}>{req.classroom}</p>
          <p style={{ margin: "0 0 2px", fontSize: 13, color: C.textLight }}>{req.date} · {req.time}</p>
          {req.break_time && <p style={{ margin: "2px 0 4px", fontSize: 13, color: C.slate }}>🥪 Break: {req.break_time}</p>}
          {req.notes && <p style={{ margin: "0 0 10px", fontSize: 12, color: C.textLight, fontStyle: "italic" }}>{req.notes}</p>}
          <StatusBadge r={req} />
        </div>
        {req.status === "open" && (subId
          ? alreadyBooked
            ? <div style={{ background: C.redLight, border: `1px solid ${C.red}33`, borderRadius: 10, padding: 14, marginBottom: 12 }}><p style={{ margin: 0, fontSize: 13, color: C.red }}>You already have a position on this day.</p></div>
            : <div style={{ marginBottom: 12 }}><Btn onClick={() => accept(req.id)} disabled={accepting === req.id} variant="primary">{accepting === req.id ? "Accepting..." : "Accept this position"}</Btn></div>
          : <div style={{ background: C.goldLight, border: `1px solid ${C.goldMid}`, borderRadius: 10, padding: 14, marginBottom: 12 }}><p style={{ margin: 0, fontSize: 13, color: C.gold }}>Select your name below to accept this position.</p></div>
        )}
        <Btn onClick={() => setSelectedReq(null)} variant="outline">← Back</Btn>
        {!subId && <div style={{ marginTop: 20 }}><SectionLabel>Select your name</SectionLabel>{subs.map(s => <SubBtn key={s.id} s={s} onClick={() => setSubId(s.id)} />)}</div>}
      </div>
    );
  }

  if (historySubId) {
    const hs = subs.find(s => s.id === historySubId);
    const hist = requests.filter(r => r.status === "filled" && r.accepted_by === hs?.name).sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, padding: "12px 14px", background: C.greenLight, borderRadius: 10, border: `1px solid ${C.greenMid}` }}>
          <div><p style={{ margin: 0, fontWeight: "bold", color: C.greenDark, fontSize: 15 }}>{hs?.name}</p><p style={{ margin: 0, fontSize: 12, color: C.green }}>{hist.length} positions filled total</p></div>
          <button onClick={() => setHistorySubId(null)} style={{ marginLeft: "auto", fontSize: 12, color: C.textLight, background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        </div>
        {hist.length === 0 ? <EmptyState icon="📋" msg="No history yet" /> : hist.map(r => <ReqCard key={r.id} r={r} showStatus />)}
      </div>
    );
  }

  return (
    <div>
      {!subId ? (
        <>
          <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 12px" }}>Who are you?</p>
          {subs.map(s => <SubBtn key={s.id} s={s} onClick={() => setSubId(s.id)} />)}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: C.greenLight, borderRadius: 10, border: `1px solid ${C.greenMid}` }}>
            <Avatar name={currentSub?.name} bg={C.green} color={C.white} />
            <div>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: 14, color: C.greenDark }}>{currentSub?.name}</p>
              <button onClick={() => setHistorySubId(subId)} style={{ fontSize: 11, color: C.slate, background: "none", border: "none", cursor: "pointer", padding: 0 }}>View history →</button>
            </div>
            <button onClick={() => setSubId(null)} style={{ marginLeft: "auto", fontSize: 11, color: C.textLight, background: "none", border: "none", cursor: "pointer" }}>Change</button>
          </div>
          {openReqs.length === 0
            ? <EmptyState icon="🌿" msg="No open positions right now" />
            : <><SectionLabel>{openReqs.length} open position{openReqs.length > 1 ? "s" : ""} — first come, first served</SectionLabel>{openReqs.map(r => <ReqCard key={r.id} r={r} showStatus clickable onClick={() => setSelectedReq(r)} />)}</>
          }
        </>
      )}
    </div>
  );
}

function SubBtn({ s, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", width: "100%", marginBottom: 8 }}>
      <Avatar name={s.name} bg={C.slateLight} color={C.slateDark} />
      <div style={{ textAlign: "left" }}>
        <p style={{ margin: 0, fontWeight: "bold", fontSize: 14, color: C.text }}>{s.name}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{s.phone}</p>
      </div>
      <span style={{ marginLeft: "auto", color: C.textLight, fontSize: 18 }}>›</span>
    </button>
  );
}

function Avatar({ name, bg, color, size = 36 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: "bold", color, flexShrink: 0 }}>{initials(name)}</div>;
}

function ScheduleView({ teachers, subs }) {
  const [activeDay, setActiveDay] = useState("monday");
  const teachersOnDay = teachers.filter(t => t[`${activeDay}_start`]);
  const subsOnDay = subs.filter(s => (s.available_days || []).includes(activeDay));

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {DAYS.map(d => (
          <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, padding: "8px 2px", borderRadius: 8, border: `1px solid ${activeDay === d ? C.green : C.border}`, background: activeDay === d ? C.green : C.white, cursor: "pointer", fontSize: 11, fontWeight: "bold", color: activeDay === d ? C.white : C.textMid }}>{DAY_SHORT[d]}</button>
        ))}
      </div>
      <SectionLabel>Teachers scheduled</SectionLabel>
      {teachersOnDay.length === 0
        ? <EmptyState icon="👩‍🏫" msg="No teachers scheduled this day" />
        : teachersOnDay.map(t => (
          <div key={t.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.gold}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={t.name} bg={C.goldLight} color={C.gold} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: 14, color: C.text }}>{t.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMid }}>{t.classroom}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textLight }}>
                {fmt12(t[`${activeDay}_start`])} – {fmt12(t[`${activeDay}_end`])}
                {t.break_time_start ? ` · 🥪 ${fmt12(t.break_time_start)}–${fmt12(t.break_time_end)}` : ""}
              </p>
            </div>
          </div>
        ))
      }
      <div style={{ marginTop: 20 }}><SectionLabel>Substitutes available</SectionLabel></div>
      {subsOnDay.length === 0
        ? <EmptyState icon="🙋" msg="No subs available this day" />
        : subsOnDay.map(s => (
          <div key={s.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.slate}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={s.name} bg={C.slateLight} color={C.slateDark} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: 14, color: C.text }}>{s.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textLight }}>{s.phone}</p>
            </div>
            {s.opt_in_sms !== false && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: C.greenLight, color: C.green, fontWeight: "bold" }}>SMS</span>}
          </div>
        ))
      }
    </div>
  );
}

function CalendarView({ requests }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const now = new Date(); now.setMonth(now.getMonth() + monthOffset);
  const year = now.getFullYear(), month = now.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const reqsByDate = {};
  requests.filter(r => r.date?.startsWith(monthStr)).forEach(r => {
    if (!reqsByDate[r.date]) reqsByDate[r.date] = [];
    reqsByDate[r.date].push(r);
  });

  if (selectedDate) {
    const dayReqs = reqsByDate[selectedDate] || [];
    const label = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });
    return (
      <div>
        <button onClick={() => setSelectedDate(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 14, padding: "0 0 12px", display: "block" }}>← Back to calendar</button>
        <p style={{ margin: "0 0 14px", fontWeight: "bold", fontSize: 16, color: C.text }}>{label}</p>
        {dayReqs.length === 0 ? <EmptyState icon="📅" msg="No requests on this day" /> : dayReqs.map(r => <ReqCard key={r.id} r={r} showStatus />)}
      </div>
    );
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.textMid, padding: "0 8px" }}>‹</button>
        <p style={{ margin: 0, fontWeight: "bold", fontSize: 16, color: C.text }}>{monthName}</p>
        <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.textMid, padding: "0 8px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
        {days.map(d => <p key={d} style={{ margin: 0, textAlign: "center", fontSize: 10, fontWeight: "bold", color: C.textLight }}>{d}</p>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const d = i + 1;
          const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
          const dayReqs = reqsByDate[dateStr] || [];
          const isToday = dateStr === today();
          return (
            <div key={d} onClick={() => dayReqs.length > 0 && setSelectedDate(dateStr)} style={{ minHeight: 58, background: isToday ? C.goldLight : C.white, border: `1px solid ${isToday ? C.gold : C.border}`, borderRadius: 8, padding: "4px 4px 3px", cursor: dayReqs.length > 0 ? "pointer" : "default" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: isToday ? "bold" : "normal", color: isToday ? C.gold : C.textMid, textAlign: "center" }}>{d}</p>
              {dayReqs.slice(0, 2).map(r => (
                <div key={r.id} style={{ background: r.status === "open" ? C.redLight : C.greenLight, borderRadius: 3, padding: "1px 3px", marginBottom: 2, border: `1px solid ${r.status === "open" ? C.red : C.green}33` }}>
                  <p style={{ margin: 0, fontSize: 9, color: r.status === "open" ? C.red : C.green, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: "bold" }}>{initials(r.teacher_name)}</p>
                </div>
              ))}
              {dayReqs.length > 2 && <p style={{ margin: 0, fontSize: 9, color: C.textLight, textAlign: "center" }}>+{dayReqs.length - 2}</p>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center" }}>
        <Legend color={C.red} bg={C.redLight} label="Open" />
        <Legend color={C.green} bg={C.greenLight} label="Filled" />
        <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Tap a day to view</p>
      </div>
    </div>
  );
}

function Legend({ color, bg, label }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${color}` }} /><span style={{ fontSize: 11, color: C.textLight }}>{label}</span></div>;
}

const ADMIN_PIN_KEY = "sbm_admin_pin";
const DEFAULT_PIN = "1234";

function AdminGate({ teachers, subs, requests, onRefresh }) {
  const [unlocked, setUnlocked] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  const storedPin = () => localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;

  const attempt = () => {
    if (entry === storedPin()) { setUnlocked(true); setError(false); }
    else { setError(true); setEntry(""); }
  };

  if (unlocked) return <AdminView teachers={teachers} subs={subs} requests={requests} onRefresh={onRefresh} onChangePinSuccess={() => {}} />;

  return (
    <div style={{ maxWidth: 280, margin: "40px auto", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <p style={{ margin: "0 0 6px", fontWeight: "bold", fontSize: 17, color: C.text }}>Admin access</p>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textLight }}>Enter your PIN to continue.</p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={8}
        value={entry}
        onChange={e => { setEntry(e.target.value); setError(false); }}
        onKeyDown={e => e.key === "Enter" && attempt()}
        placeholder="PIN"
        style={{ ...iS, textAlign: "center", fontSize: 22, letterSpacing: 8, marginBottom: 12 }}
      />
      {error && <p style={{ margin: "0 0 10px", fontSize: 13, color: C.red }}>Incorrect PIN. Try again.</p>}
      <Btn onClick={attempt} variant="primary">Unlock</Btn>
    </div>
  );
}

function AdminView({ teachers, subs, requests, onRefresh }) {
  const [tab, setTab] = useState("requests");
  const [newT, setNewT] = useState(emptyT);
  const [newS, setNewS] = useState({ name: "", phone: "", email: "", opt_in_sms: true, available_days: [] });
  const [saving, setSaving] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [changingPin, setChangingPin] = useState(false);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinMsg, setPinMsg] = useState(null);

  const optInSubs = subs.filter(s => s.opt_in_sms !== false);

  const addTeacher = async () => {
    if (!newT.name) return; setSaving(true);
    try { await sb("addTeacher", newT); await onRefresh(); setNewT(emptyT); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const addSub = async () => {
    if (!newS.name) return; setSaving(true);
    try { await sb("addSub", newS); await onRefresh(); setNewS({ name: "", phone: "", email: "", opt_in_sms: true, available_days: [] }); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const saveTeacher = async (id, data) => {
    try { await sb("updateTeacher", { ...data, id }); setEditingTeacher(null); onRefresh(); }
    catch (e) { alert(e.message); }
  };
  const saveSub = async (id, data) => {
    try { await sb("updateSub", { ...data, id }); setEditingSub(null); onRefresh(); }
    catch (e) { alert(e.message); }
  };
  const removeTeacher = async id => { if (!window.confirm("Remove this teacher?")) return; await sb("deleteTeacher", { id }); onRefresh(); };
  const removeSub = async id => { if (!window.confirm("Remove this substitute?")) return; await sb("deleteSub", { id }); onRefresh(); };
  const removeReq = async id => { await sb("deleteRequest", { id }); onRefresh(); };
  const clearAll = async () => { if (!window.confirm("Clear all requests?")) return; await sb("clearRequests", {}); onRefresh(); };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(r => keys.map(k => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
  };

  const groupMsg = `📢 Sub needed at Small But Mighty Preschool! Please open the app to view and accept open positions: ${window.location.href}`;
  const allPhones = optInSubs.map(s => s.phone).filter(Boolean).join(",");
  const smsGroupUrl = `sms:${allPhones}?&body=${encodeURIComponent(groupMsg)}`;
  const waGroupUrl = `https://wa.me/?text=${encodeURIComponent(groupMsg)}`;

  return (
    <div>
      <div style={{ background: C.greenLight, border: `1px solid ${C.greenMid}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontWeight: "bold", fontSize: 13, color: C.greenDark }}>Notify all opted-in subs ({optInSubs.length})</p>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={waGroupUrl} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", background: "#25D366", borderRadius: 8, textDecoration: "none" }}>
            <span style={{ fontSize: 16 }}>💬</span><span style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>WhatsApp</span>
          </a>
          <a href={smsGroupUrl} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", background: C.slateLight, border: `1px solid ${C.slate}44`, borderRadius: 8, textDecoration: "none" }}>
            <span style={{ fontSize: 16 }}>📱</span><span style={{ color: C.slateDark, fontWeight: "bold", fontSize: 12 }}>Group SMS</span>
          </a>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["requests", "teachers", "subs", "pin"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: `1px solid ${tab === t ? C.green : C.border}`, background: tab === t ? C.green : C.white, cursor: "pointer", fontSize: 12, fontWeight: "bold", color: tab === t ? C.white : C.textMid, textTransform: "capitalize", letterSpacing: 0.3 }}>{t === "pin" ? "🔒 PIN" : t}</button>
        ))}
      </div>

      {tab === "requests" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <ExportBtn onClick={() => exportCSV(requests, "sbm-requests.csv")} />
            {requests.length > 0 && <button onClick={clearAll} style={dangerBtnStyle}>Clear all</button>}
          </div>
          {requests.length === 0 ? <EmptyState icon="📋" msg="No requests yet" /> :
            requests.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1 }}><ReqCard r={r} showStatus /></div>
                <button onClick={() => removeReq(r.id)} style={{ padding: "10px 8px", background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 16 }}>✕</button>
              </div>
            ))}
        </div>
      )}

      {tab === "teachers" && (
        <div>
          <div style={{ marginBottom: 12 }}><ExportBtn onClick={() => exportCSV(teachers, "sbm-teachers.csv")} /></div>
          {teachers.map(t => (
            editingTeacher?.id === t.id
              ? <TeacherEditCard key={t.id} data={editingTeacher} onChange={setEditingTeacher} onSave={() => saveTeacher(t.id, editingTeacher)} onCancel={() => setEditingTeacher(null)} />
              : <PersonRow key={t.id} name={t.name} line2={t.classroom} line3={t.break_time_start ? `Break: ${fmt12(t.break_time_start)} – ${fmt12(t.break_time_end)}` : null} bg={C.goldLight} color={C.gold} onEdit={() => setEditingTeacher({ ...t })} onRemove={() => removeTeacher(t.id)} />
          ))}
          <AddCard title="Add teacher">
            <Lbl>Full name</Lbl>
            <input placeholder="Teacher's name" value={newT.name} onChange={e => setNewT(p => ({ ...p, name: e.target.value }))} style={{ ...iS, marginBottom: 8 }} />
            <Lbl>Classroom</Lbl>
            <input placeholder="e.g. Sunflower Room (Age 3)" value={newT.classroom} onChange={e => setNewT(p => ({ ...p, classroom: e.target.value }))} style={{ ...iS, marginBottom: 8 }} />
            <Lbl>Phone</Lbl>
            <input placeholder="403-555-0000" value={newT.phone} onChange={e => setNewT(p => ({ ...p, phone: e.target.value }))} style={{ ...iS, marginBottom: 8 }} />
            <Lbl>Email</Lbl>
            <input placeholder="teacher@email.com" value={newT.email} onChange={e => setNewT(p => ({ ...p, email: e.target.value }))} style={{ ...iS, marginBottom: 8 }} />
            <Lbl>Break time</Lbl>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input type="time" value={newT.break_time_start} onChange={e => setNewT(p => ({ ...p, break_time_start: e.target.value }))} style={{ ...iS, flex: 1 }} />
              <input type="time" value={newT.break_time_end} onChange={e => setNewT(p => ({ ...p, break_time_end: e.target.value }))} style={{ ...iS, flex: 1 }} />
            </div>
            <Lbl>Work schedule</Lbl>
            {DAYS.map(day => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.textMid, width: 32, textTransform: "capitalize" }}>{DAY_SHORT[day]}</span>
                <input type="time" value={newT[`${day}_start`]} onChange={e => setNewT(p => ({ ...p, [`${day}_start`]: e.target.value }))} style={{ ...iS, flex: 1 }} />
                <input type="time" value={newT[`${day}_end`]} onChange={e => setNewT(p => ({ ...p, [`${day}_end`]: e.target.value }))} style={{ ...iS, flex: 1 }} />
              </div>
            ))}
            <div style={{ marginTop: 8 }}><Btn onClick={addTeacher} disabled={saving} variant="primary">Add teacher</Btn></div>
          </AddCard>
        </div>
      )}

      {tab === "subs" && (
        <div>
          <div style={{ marginBottom: 12 }}><ExportBtn onClick={() => exportCSV(subs, "sbm-substitutes.csv")} /></div>
          {subs.map(s => (
            editingSub?.id === s.id
              ? <EditCard key={s.id} fields={[
                { label: "Name", key: "name", placeholder: "Full name" },
                { label: "Phone", key: "phone", placeholder: "403-555-0000" },
                { label: "Email", key: "email", placeholder: "sub@email.com" },
                { label: "SMS opt-in", key: "opt_in_sms", type: "checkbox" },
                { label: "Available days", key: "available_days", type: "days" },
              ]} data={editingSub} onChange={d => setEditingSub(d)} onSave={() => saveSub(s.id, editingSub)} onCancel={() => setEditingSub(null)} />
              : <PersonRow key={s.id} name={s.name} line2={s.phone} line3={s.email}
                badge={s.opt_in_sms !== false ? { label: "SMS opt-in", color: C.green, bg: C.greenLight } : { label: "No SMS", color: C.textLight, bg: C.parchment }}
                extra={`${requests.filter(r => r.accepted_by === s.name && r.status === "filled").length} filled · Available: ${(s.available_days || []).map(d => DAY_SHORT[d]).join(", ") || "Not set"}`}
                bg={C.slateLight} color={C.slateDark}
                onEdit={() => setEditingSub({ ...s, available_days: s.available_days || [] })} onRemove={() => removeSub(s.id)} />
          ))}
          <AddCard title="Add substitute">
            {[{ label: "Full name", key: "name", ph: "Sub's name" }, { label: "Phone", key: "phone", ph: "403-555-0000" }, { label: "Email", key: "email", ph: "sub@email.com" }].map(f => (
              <span key={f.key}><Lbl>{f.label}</Lbl><input placeholder={f.ph} value={newS[f.key]} onChange={e => setNewS(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...iS, marginBottom: 8 }} /></span>
            ))}
            <Lbl>Available days</Lbl>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {DAYS.map(d => {
                const on = (newS.available_days || []).includes(d);
                return <button key={d} onClick={() => setNewS(p => ({ ...p, available_days: on ? (p.available_days || []).filter(x => x !== d) : [...(p.available_days || []), d] }))} style={{ flex: 1, padding: "6px 2px", borderRadius: 6, border: `1px solid ${on ? C.green : C.border}`, background: on ? C.green : C.white, color: on ? C.white : C.textMid, fontSize: 11, fontWeight: "bold", cursor: "pointer" }}>{DAY_SHORT[d]}</button>;
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="optin" checked={newS.opt_in_sms} onChange={e => setNewS(p => ({ ...p, opt_in_sms: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <label htmlFor="optin" style={{ fontSize: 13, color: C.textMid }}>Opt in to group SMS notifications</label>
            </div>
            <Btn onClick={addSub} disabled={saving} variant="primary">Add substitute</Btn>
          </AddCard>
        </div>
      )}

      {tab === "pin" && (
        <div style={{ maxWidth: 300, margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>Change the PIN required to access the Admin section. The default PIN is <strong>1234</strong>.</p>
          {pinMsg && <div style={{ padding: "10px 12px", borderRadius: 8, background: pinMsg.ok ? C.greenLight : C.redLight, border: `1px solid ${pinMsg.ok ? C.green : C.red}33`, marginBottom: 14 }}><p style={{ margin: 0, fontSize: 13, color: pinMsg.ok ? C.green : C.red }}>{pinMsg.text}</p></div>}
          <Lbl>Current PIN</Lbl>
          <input type="password" inputMode="numeric" maxLength={8} value={pinCurrent} onChange={e => setPinCurrent(e.target.value)} placeholder="Current PIN" style={{ ...iS, marginBottom: 12 }} />
          <Lbl>New PIN</Lbl>
          <input type="password" inputMode="numeric" maxLength={8} value={pinNew} onChange={e => setPinNew(e.target.value)} placeholder="New PIN (numbers only)" style={{ ...iS, marginBottom: 12 }} />
          <Lbl>Confirm new PIN</Lbl>
          <input type="password" inputMode="numeric" maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} placeholder="Confirm new PIN" style={{ ...iS, marginBottom: 20 }} />
          <Btn variant="primary" onClick={() => {
            const stored = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;
            if (pinCurrent !== stored) { setPinMsg({ ok: false, text: "Current PIN is incorrect." }); return; }
            if (pinNew.length < 4) { setPinMsg({ ok: false, text: "New PIN must be at least 4 digits." }); return; }
            if (pinNew !== pinConfirm) { setPinMsg({ ok: false, text: "New PINs don't match." }); return; }
            localStorage.setItem(ADMIN_PIN_KEY, pinNew);
            setPinCurrent(""); setPinNew(""); setPinConfirm("");
            setPinMsg({ ok: true, text: "PIN updated successfully." });
          }}>Update PIN</Btn>
        </div>
      )}
    </div>
  );
}

function TeacherEditCard({ data, onChange, onSave, onCancel }) {
  return (
    <div style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
      {[{ label: "Name", key: "name", ph: "Full name" }, { label: "Classroom", key: "classroom", ph: "e.g. Sunflower Room" }, { label: "Phone", key: "phone", ph: "403-555-0000" }, { label: "Email", key: "email", ph: "teacher@email.com" }].map(f => (
        <span key={f.key}><Lbl>{f.label}</Lbl><input value={data[f.key] || ""} onChange={e => onChange({ ...data, [f.key]: e.target.value })} placeholder={f.ph} style={{ ...iS, marginBottom: 8 }} /></span>
      ))}
      <Lbl>Break time</Lbl>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="time" value={data.break_time_start || ""} onChange={e => onChange({ ...data, break_time_start: e.target.value })} style={{ ...iS, flex: 1 }} />
        <input type="time" value={data.break_time_end || ""} onChange={e => onChange({ ...data, break_time_end: e.target.value })} style={{ ...iS, flex: 1 }} />
      </div>
      <Lbl>Work schedule</Lbl>
      {DAYS.map(day => (
        <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textMid, width: 32 }}>{DAY_SHORT[day]}</span>
          <input type="time" value={data[`${day}_start`] || ""} onChange={e => onChange({ ...data, [`${day}_start`]: e.target.value })} style={{ ...iS, flex: 1 }} />
          <input type="time" value={data[`${day}_end`] || ""} onChange={e => onChange({ ...data, [`${day}_end`]: e.target.value })} style={{ ...iS, flex: 1 }} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={onSave} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: C.green, color: C.white, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>Save</button>
        <button onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.textMid, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

function EditCard({ fields, data, onChange, onSave, onCancel }) {
  return (
    <div style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
      {fields.map(f => {
        if (f.type === "checkbox") return (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <input type="checkbox" checked={!!data[f.key]} onChange={e => onChange({ ...data, [f.key]: e.target.checked })} style={{ width: 16, height: 16 }} />
            <label style={{ fontSize: 13, color: C.textMid }}>{f.label}</label>
          </div>
        );
        if (f.type === "days") {
          const avail = data[f.key] || [];
          return (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <Lbl>{f.label}</Lbl>
              <div style={{ display: "flex", gap: 6 }}>
                {DAYS.map(d => {
                  const on = avail.includes(d);
                  return <button key={d} onClick={() => onChange({ ...data, [f.key]: on ? avail.filter(x => x !== d) : [...avail, d] })} style={{ flex: 1, padding: "6px 2px", borderRadius: 6, border: `1px solid ${on ? C.green : C.border}`, background: on ? C.green : C.white, color: on ? C.white : C.textMid, fontSize: 11, fontWeight: "bold", cursor: "pointer" }}>{DAY_SHORT[d]}</button>;
                })}
              </div>
            </div>
          );
        }
        return <span key={f.key}><Lbl>{f.label}</Lbl><input value={data[f.key] || ""} onChange={e => onChange({ ...data, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ ...iS, marginBottom: 8 }} /></span>;
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={onSave} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: C.green, color: C.white, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>Save</button>
        <button onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.textMid, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

function PersonRow({ name, line2, line3, badge, extra, bg, color, onEdit, onRemove }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={name} bg={bg} color={color} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: 14, color: C.text }}>{name}</p>
            {badge && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: badge.bg, color: badge.color, fontWeight: "bold" }}>{badge.label}</span>}
          </div>
          {line2 && <p style={{ margin: 0, fontSize: 11, color: C.textMid }}>{line2}</p>}
          {line3 && <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{line3}</p>}
          {extra && <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>{extra}</p>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={onEdit} style={{ padding: "6px 8px", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", color: C.textMid, fontSize: 12 }}>Edit</button>
        <button onClick={onRemove} style={{ padding: "6px 8px", background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 16 }}>✕</button>
      </div>
    </div>
  );
}

function ExportBtn({ onClick }) {
  return <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.green}`, background: C.greenLight, cursor: "pointer", fontSize: 12, color: C.green }}>↓ Export CSV</button>;
}

function AddCard({ title, children }) {
  return <div style={{ marginTop: 16, padding: 14, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12 }}><SectionLabel>{title}</SectionLabel><div style={{ marginTop: 10 }}>{children}</div></div>;
}

function Btn({ onClick, children, disabled, variant }) {
  const s = { primary: { background: C.green, color: C.white, border: "none" }, outline: { background: C.white, color: C.textMid, border: `1px solid ${C.border}` } };
  return <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: "bold", fontFamily: F, opacity: disabled ? 0.6 : 1, ...s[variant] }}>{children}</button>;
}

function Lbl({ children }) {
  return <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: "bold", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>{children}</p>;
}

const iS = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 14, fontFamily: F, boxSizing: "border-box", marginBottom: 0, outline: "none" };
const dangerBtnStyle = { padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.red}44`, background: C.redLight, cursor: "pointer", fontSize: 12, color: C.red, fontFamily: F };