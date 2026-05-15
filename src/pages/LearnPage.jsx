import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import PageShell from '../components/PageShell'

export default function LearnPage() {
  const navigate = useNavigate()
  return (
    <PageShell>
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a14',
          color: '#e8e8e8',
          padding: '24px 20px 100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 16,
        }}
      >
        <BookOpen size={56} color="#d4af37" strokeWidth={1.25} />
        <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d4af37', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Learn Chess</h1>
        <p style={{ opacity: 0.85, maxWidth: 400 }}>Coming Soon</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginTop: 8,
            minHeight: 44,
            padding: '0 24px',
            borderRadius: 10,
            border: '1px solid rgba(212,175,55,0.4)',
            background: 'transparent',
            color: '#d4af37',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>
    </PageShell>
  )
}
