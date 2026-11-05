import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AccessBar from './AccessBar';
import LogoMark from './LogoMark';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="logo" to="/">
          <LogoMark />
          Karya<span className="accent-italic" style={{ fontStyle: 'normal' }}>siri</span>
        </Link>
        <nav className="main-nav" aria-label="Primary">
          <ul>
            <li><Link to="/">{t('nav.home')}</Link></li>
            <li><Link to="/jobs">{t('nav.jobs')}</Link></li>
            <li><Link to="/schemes">{t('nav.schemes')}</Link></li>
            <li><Link to="/courses">{t('nav.courses')}</Link></li>
            {user?.role === 'candidate' && <li><Link to="/profile">{t('nav.profile')}</Link></li>}
            {user?.role === 'candidate' && <li><Link to="/applications">{t('nav.applications')}</Link></li>}
            {user?.role === 'employer' && <li><Link to="/employer">{t('nav.employerDashboard')}</Link></li>}
            {!user && <li><Link to="/login">{t('nav.login')}</Link></li>}
            {!user && <li><Link to="/register" className="btn btn-primary btn-sm">{t('nav.signup')}</Link></li>}
            {user && <li><button onClick={handleLogout}>{t('nav.logout')} ({user.name})</button></li>}
          </ul>
        </nav>
      </div>
      <AccessBar />
    </header>
  );
}
