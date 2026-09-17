import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'

export default function Profile({ onNotice }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.profile()
      .then((data) => setProfile(data.user))
      .catch((requestError) => {
        setError(requestError.message)
        onNotice(requestError.message)
      })
  }, [onNotice])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await api.uploadProfile(file)
      setProfile((current) => ({ ...current, profile_pic: result.profile_pic }))
      onNotice('Profile picture updated')
    } catch (error) {
      onNotice(error.message)
    }
  }

  if (!profile) return <div className="page"><Loading error={error} onRetry={() => window.location.reload()} /></div>

  return (
    <div className="page profile-page">
      <div className="page-title">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Profile</h1>
        <p className="page-subtitle">Manage your account and profile picture.</p>
      </div>

      <section className="profile-layout">
        <div className="panel profile-card">
          <p className="eyebrow">PROFILE PICTURE</p>
          <div className="avatar large">
            {profile.profile_pic ? <img src={api.assetUrl(`/static/profile_pics/${profile.profile_pic}`)} alt="Profile" /> : profile.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-name">
            <span>PROFILE NAME</span>
            <h2>{profile.username}</h2>
            <p>Manage your account and profile picture.</p>
          </div>
          <label className="btn success upload-label">
            Change profile picture
            <input type="file" accept="image/*" onChange={handleUpload} hidden />
          </label>
        </div>
        <div className="panel profile-details">
          <p className="eyebrow">ACCOUNT INFORMATION</p>
          <h2>Personal details</h2>
          <div className="detail-list">
            <div><span>Name</span><strong>{profile.username}</strong></div>
            <div><span>Username</span><strong>{profile.username}</strong></div>
            <div><span>Email address</span><strong>{profile.email}</strong></div>
          </div>
        </div>
      </section>
    </div>
  )
}
