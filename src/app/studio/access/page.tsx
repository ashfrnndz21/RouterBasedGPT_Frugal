'use client'
// src/app/studio/access/page.tsx — Warm Workera-inspired access & roles
import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'

const ROLES = ['super_admin','content_admin','read_only']
const ROLE_COLORS: Record<string,string> = { super_admin:'#EF6461', content_admin:'#fac957', read_only:'#7EC8E3' }

export default function AccessPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', role: 'read_only' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    fetch('/api/studio/access')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setAdmins(d.admins ?? []))
      .catch(() => {})
  }
  useEffect(() => { load() }, [])

  const addAdmin = async () => {
    if (!newAdmin.email) return
    setSaving(true)
    const res = await fetch('/api/studio/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAdmin),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { setMsg('Admin invited'); setShowAdd(false); setNewAdmin({ email: '', name: '', role: 'read_only' }); load() }
    else setMsg(data.error ?? 'Error')
  }

  const updateRole = async (id: string, role: string) => {
    await fetch('/api/studio/access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    load()
  }

  const PERMISSIONS: Record<string, string[]> = {
    super_admin: ['View Dashboard', 'Edit Agents', 'Edit Taxonomy', 'Edit Personas', 'Build Pathways', 'Review Scores', 'View Learners', 'Manage Questions', 'Manage Access', 'Change Settings'],
    content_admin: ['View Dashboard', 'Edit Agents', 'Edit Taxonomy', 'Edit Personas', 'Build Pathways', 'Review Scores', 'View Learners', 'Manage Questions'],
    read_only: ['View Dashboard', 'Review Scores', 'View Learners'],
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,148,18,0.12)' }}>
            <Shield className="w-4.5 h-4.5" style={{ color: 'var(--studio-orange)' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Access & Roles</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Manage admin team access to the Studio
            </p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="studio-btn-primary">+ Invite Admin</button>
      </div>

      {msg && (
        <div className="mb-4 text-[12px] px-4 py-2.5 rounded-xl"
          style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)' }}>
          {msg}
        </div>
      )}

      {/* Admin table */}
      <div className="studio-card overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--studio-border)' }}>
              {['Admin','Email','Role','Joined','Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold tracking-[0.08em] uppercase"
                  style={{ color: 'var(--studio-dust)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}
                className="transition-colors duration-200"
                style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,92,198,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <td className="px-5 py-3 text-[13px] font-medium" style={{ color: 'var(--studio-dune)' }}>{a.name}</td>
                <td className="px-5 py-3 text-[12px]" style={{ color: 'var(--studio-dust)' }}>{a.email}</td>
                <td className="px-5 py-3">
                  <select value={a.role} onChange={e => updateRole(a.id, e.target.value)}
                    className="text-[11px] font-bold rounded-lg px-2 py-1 outline-none"
                    style={{
                      color: ROLE_COLORS[a.role],
                      background: 'var(--studio-bg-input)',
                      border: '1px solid var(--studio-border)',
                    }}>
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-[11px]" style={{ color: 'var(--studio-ash)' }}>
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-5 py-3">
                  <button className="text-[11px] transition-colors duration-200"
                    style={{ color: 'rgba(239,100,97,0.5)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#EF6461' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,100,97,0.5)' }}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>No admins yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Permissions matrix */}
      <div className="studio-card p-6">
        <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>Role Permissions</h2>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--studio-border)' }}>
              <th className="text-left py-2.5 font-normal" style={{ color: 'var(--studio-dust)' }}>Permission</th>
              {ROLES.map(r => (
                <th key={r} className="text-center py-2.5 font-bold capitalize" style={{ color: ROLE_COLORS[r] }}>
                  {r.replace(/_/g,' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {['View Dashboard','Edit Agents','Edit Taxonomy','Edit Personas','Build Pathways','Review Scores','View Learners','Manage Questions','Manage Access','Change Settings'].map(perm => (
              <tr key={perm} style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}>
                <td className="py-2.5" style={{ color: 'var(--studio-sand)' }}>{perm}</td>
                {ROLES.map(r => (
                  <td key={r} className="py-2.5 text-center">
                    {PERMISSIONS[r].includes(perm)
                      ? <span style={{ color: '#4ECDC4' }}>&#10003;</span>
                      : <span style={{ color: 'var(--studio-ash)', opacity: 0.4 }}>-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add admin modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(26,18,32,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="studio-card p-6 w-96">
            <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>Invite Admin</h2>
            <div className="flex flex-col gap-4 mb-5">
              {[['name','Name','text'],['email','Email','email']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="studio-label">{l}</label>
                  <input type={t} value={(newAdmin as any)[k]} onChange={e => setNewAdmin(p => ({ ...p, [k]: e.target.value }))}
                    className="studio-input" />
                </div>
              ))}
              <div>
                <label className="studio-label">Role</label>
                <select value={newAdmin.role} onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value }))}
                  className="studio-input" style={{ cursor: 'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="studio-btn-ghost flex-1">Cancel</button>
              <button onClick={addAdmin} disabled={saving} className="studio-btn-primary flex-1 disabled:opacity-40">
                {saving ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
