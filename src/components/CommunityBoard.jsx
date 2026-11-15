import React, { useState } from 'react';
import { tripButton, tripInput } from '../utils/tripUi';

function CommentForm({ postId, onAddComment, onError }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="flex gap-2 mt-3" onSubmit={async event => {
    event.preventDefault(); if (!text.trim() || busy) return; setBusy(true);
    try { await onAddComment(postId, text.trim()); setText(''); } catch (error) { onError(error.message); } finally { setBusy(false); }
  }}><input aria-label="Write a reply" className={tripInput} value={text} onChange={e => setText(e.target.value)} maxLength={500} required placeholder="Write a reply…" /><button disabled={busy} className={tripButton}>{busy ? 'Sending…' : 'Reply'}</button></form>;
}

export default function CommunityBoard({ community, enrolled, posts, onAddPost, onLikePost, onAddComment }) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ride Sharing');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = posts.filter(post => post.communityId === community.id);
  if (!enrolled) return <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">The notice board is private to members of this hometown community.</div>;
  return <section className="space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Community board</h2><p className="text-sm text-slate-500 mt-1">Questions, travel tips and updates for {community.name}.</p></div><button className={tripButton} onClick={() => setComposing(value => !value)}>{composing ? 'Cancel post' : 'New post'}</button></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {composing && <form className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try { await onAddPost({ communityId: community.id, title: title.trim(), content: content.trim(), category }); setTitle(''); setContent(''); setComposing(false); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
    }}>
      <label className="block text-sm">Category<select className={tripInput} value={category} onChange={e => setCategory(e.target.value)}>{['Ride Sharing', 'Travel Tip', 'Train / Bus Cohort', 'General Query'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm">Title<input className={tripInput} required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block text-sm">Details<textarea className={tripInput} required rows={3} maxLength={2000} value={content} onChange={e => setContent(e.target.value)} /></label>
      <button className={tripButton} disabled={busy}>{busy ? 'Publishing…' : 'Publish post'}</button>
    </form>}
    {!list.length && <p className="p-8 border border-dashed rounded-2xl text-sm text-center text-slate-500">No posts yet. Start a conversation with your community.</p>}
    {list.map(post => <article key={post.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
      <div className="flex justify-between gap-3 text-xs text-slate-500"><span>{post.author} · {post.category}</span></div><h3 className="font-bold">{post.title}</h3><p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
      <button className="text-sm text-blue-600" onClick={async () => { try { await onLikePost(post.id); } catch (failure) { setError(failure.message); } }}>{post.isLiked ? 'Unlike' : 'Like'} · {post.likes || 0}</button>
      {(post.comments || []).map(comment => <p key={comment.id} className="text-sm border-l-2 border-slate-200 pl-3 break-words"><strong>{comment.author}</strong> {comment.text}</p>)}
      <CommentForm postId={post.id} onAddComment={onAddComment} onError={setError} />
    </article>)}
  </section>;
}
