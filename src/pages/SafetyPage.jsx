import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function SafetyPage({ user }) {
  const { refreshUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [target, setTarget] = useState('');
  const [reports, setReports] = useState([]);
  const [category, setCategory] = useState('Safety');
  const [details, setDetails] = useState('');
  const [groupId, setGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getSafetyReports().then(setReports).catch(error => setMessage(error.message)); }, []);
  useEffect(() => { api.getMyGroups().then(setGroups).catch(error => setMessage(error.message)); }, []);
  const members = [...new Map(groups.flatMap(group => group.members || []).filter(member => member.userId && member.userId !== user.id && !member.isCompanion).map(member => [member.userId, member])).values()];
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const report = await api.submitSafetyReport({ category, details, groupId });
      setMessage(`Report recorded (${report.id}). This inbox is not monitored for emergencies; no response time is guaranteed.`);
      setDetails(''); setReports(await api.getSafetyReports());
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl mx-auto p-6 space-y-6">
    <h1 className="text-2xl font-bold">Safety, privacy & support</h1>
    <p>This is a student travel coordination tool. It does not book vehicles, verify drivers, provide insurance, track arrivals, or dispatch emergency help. Institutional sign-in verifies control of a Thapar email address, not personal safety or current enrollment. Companions added by riders are not independently verified.</p>
    <section className="space-y-2"><h2 className="text-lg font-bold">Your information</h2>
      <p>Your profile, memberships, messages and reports are stored in the application database. Profile and travel details are shared with relevant users. Ride contact numbers become visible to co-riders when the ride is confirmed or completed; train/bus groups share contact numbers with joined members. Other people may copy information already shared with them.</p>
      <p>Only provide a companion's contact details with their permission. Share the minimum personal information necessary. Passwords are hashed; group chats are not end-to-end encrypted.</p>
      <p>Records remain stored until removed by the operator; automatic retention limits are not yet implemented. Use the privacy/deletion category below to request removal or correction. Requests require operator review and are not immediate. This student project should not be assumed to be an official TIET service.</p>
    </section>
    <section className="space-y-2"><h2 className="text-lg font-bold">Rides, fares & ratings</h2>
      <p>A slot represents students coordinating a time, not a confirmed vehicle. Fares and potential savings are estimates; agree the actual fare and pickup with co-riders and your independently booked driver. Hometown slots group riders across the city, so confirm the exact stops in chat before joining.</p>
      <p>Regular campus rides may deduct 0.3 reliability points for a change within four hours or 0.8 within thirty minutes of departure, down to a minimum of 1. These are coordination scores, not safety ratings. Community rides currently have no automated deduction. Use Rating appeal for emergencies, mistakes or exceptional circumstances. Departure-based history is unverified and does not establish arrival.</p>
    </section>
    <section className="border rounded-xl p-4 space-y-2"><h2 className="text-lg font-bold">Mute group messages</h2>
      <p>Hide a co-rider's messages and chat popups on your account. This does not remove either rider from shared groups or prevent them seeing information already shared.</p>
      <label>Co-rider<select className="block p-2 border rounded bg-white text-slate-900" value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a co-rider</option>{members.map(member => <option key={member.userId} value={member.userId}>{member.name}</option>)}{(user.mutedUsers || []).filter(id => !members.some(member => member.userId === id)).map(id => <option key={id} value={id}>Muted user {id}</option>)}</select></label>
      <button disabled={!target || busy} className="underline" onClick={async () => { setBusy(true); try { await api.muteUser(target, !(user.mutedUsers || []).includes(target)); await refreshUser(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>{(user.mutedUsers || []).includes(target) ? 'Unmute' : 'Mute messages'}</button>
    </section>
    <form onSubmit={submit} className="space-y-3 border rounded-xl p-4">
      <h2 className="text-lg font-bold">Report a concern or request help</h2>
      <p>For immediate danger, contact emergency services directly. Do not put passwords or unnecessary sensitive information in reports.</p>
      <label className="block">Category<select className="block p-2 border rounded text-slate-900 bg-white" value={category} onChange={e => setCategory(e.target.value)}>{['Safety', 'Privacy / deletion', 'Rating appeal', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block">Group ID (optional)<input className="block p-2 border rounded text-slate-900 bg-white" value={groupId} maxLength={100} onChange={e => setGroupId(e.target.value)} /></label>
      <label className="block">Details<textarea className="block p-2 border rounded w-full text-slate-900 bg-white" required maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} /></label>
      <button disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded">{busy ? 'Submitting…' : 'Submit report'}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <section><h2 className="text-lg font-bold">{user.role === 'admin' ? 'Moderation inbox' : 'Your reports'}</h2>
      {reports.map(report => <article className="border rounded p-3 my-2" key={report._id}><strong>{report.category} — {report.status}</strong><p>{report.details}</p>{user.role === 'admin' && report.status === 'Open' && <button className="underline" onClick={async () => { try { await api.reviewSafetyReport(report._id); setReports(await api.getSafetyReports()); } catch (error) { setMessage(error.message); } }}>Mark reviewed</button>}</article>)}
      {!reports.length && <p>No reports recorded.</p>}
    </section>
  </div>;
}
