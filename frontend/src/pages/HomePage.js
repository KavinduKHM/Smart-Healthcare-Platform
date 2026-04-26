import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './HomePage.css';

const services = [
  {
    id: 'skilled-nursing',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    title: 'Skilled Nursing',
    description:
      'Our licensed nurses provide expert medical care in the comfort of your home, including wound care, medication management, and post-operative monitoring.',
  },
  {
    id: 'physical-therapy',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: 'Physical Therapy',
    description:
      'Our skilled physical therapists restore mobility, strength, and independence through personalised rehabilitation programmes tailored to your unique needs.',
  },
  {
    id: 'speech-therapy',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: 'Speech Therapy',
    description:
      'Our speech‑language pathologists help patients overcome communication challenges and swallowing difficulties, improving quality of life and confidence.',
  },
];

const staffMembers = [
  { id: 1, name: 'Dr. Sarah Mitchell', role: 'Clinical Director', initials: 'SM' },
  { id: 2, name: 'James Okafor RN', role: 'Skilled Nurse', initials: 'JO' },
  { id: 3, name: 'Laura Chen PT', role: 'Physical Therapist', initials: 'LC' },
  { id: 4, name: 'Maria Gonzalez SLP', role: 'Speech Therapist', initials: 'MG' },
];

const HomePage = () => {
  const location = useLocation();
  const flashMessage = location?.state?.flashMessage;

  return (
    <div className="hp-page">
      {flashMessage?.text ? (
        <section className={`hp-flash hp-flash--${flashMessage.type || 'info'}`} role="status" aria-live="polite">
          {flashMessage.text}
        </section>
      ) : null}

      {/* ── Hero ── */}
      <section className="hp-hero">
        <div className="hp-hero-overlay" />
        <div className="hp-hero-content container">
          <div className="hp-hero-copy">
            <span className="hp-eyebrow">Welcome to ELIXRA</span>
            <h1 className="hp-hero-title">Compassionate Care,<br />Right in Your Home</h1>
            <p className="hp-hero-sub">
              We provide expert home health care services — skilled nursing, physical therapy,
              and speech therapy — designed around you.
            </p>
            <div className="hp-hero-actions">
              <Link to="/patient/signup" className="hc-btn hc-btn--primary hp-cta-btn">
                Get Started
              </Link>
              <Link to="/patient/login" className="hc-btn hc-btn--ghost hp-cta-btn hp-cta-ghost">
                Find Care
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Navigation Row ── */}
      <section className="hp-quick-nav">
        <div className="container hp-quick-nav-inner">
          <Link to="/patient" className="hp-quick-card">
            <div className="hp-quick-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
            <span>Service Areas Covered</span>
            <svg className="hp-quick-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>

          <Link to="/doctor" className="hp-quick-card">
            <div className="hp-quick-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span>Meet Our Staff</span>
            <svg className="hp-quick-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>

          <Link to="/patient/login" className="hp-quick-card hp-quick-card--dark">
            <div className="hp-quick-icon hp-quick-icon--light">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
              </svg>
            </div>
            <span>Insurance Accepted</span>
            <svg className="hp-quick-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="hp-services">
        <div className="container">
          <div className="hp-section-head">
            <span className="hp-section-kicker">What We Do</span>
            <h2 className="hp-section-title">Services Offered</h2>
            <p className="hp-section-sub">
              We deliver exceptional home health care services across all specialties.{' '}
              <Link to="/patient" className="hp-section-link">View More Services →</Link>
            </p>
          </div>

          <div className="hp-services-grid">
            {services.map((svc) => (
              <article key={svc.id} className="hp-service-card">
                <div className="hp-service-img">
                  <div className="hp-service-img-placeholder">
                    <div className="hp-service-icon">{svc.icon}</div>
                  </div>
                  <Link to="/patient/signup" className="hp-service-cta-btn">Book Now →</Link>
                </div>
                <div className="hp-service-body">
                  <h3 className="hp-service-title">{svc.title}</h3>
                  <p className="hp-service-desc">{svc.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Company Intro ── */}
      <section className="hp-intro">
        <div className="container hp-intro-inner">
          <div className="hp-intro-visual" aria-hidden="true">
            <div className="hp-intro-img-box">
              <div className="hp-intro-img-placeholder">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#b8d8d7" strokeWidth="1">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="hp-intro-copy">
            <span className="hp-section-kicker">Introducing</span>
            <h2 className="hp-intro-title">ELIXRA<br /><span className="hp-intro-subtitle-text">Home Health Care</span></h2>
            <p>
              We are excited to provide contents on the website. This space is reserved to show information
              about the company. We are committed to delivering outstanding home health care that empowers
              patients to live independently and comfortably. Thank you for visiting our website.
            </p>
            <p>
              Our team of licensed professionals brings expertise, compassion, and a patient-first philosophy
              to every home visit — because you deserve care that comes to you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission Statement ── */}
      <section className="hp-mission">
        <div className="container hp-mission-inner">
          <span className="hp-mission-kicker">Our Commitment</span>
          <h2 className="hp-mission-title">Mission Statement</h2>
          <p className="hp-mission-text">
            We are excited to post content on the website. This space is reserved to show information
            about the company. We are excited to post content on this particular page. Thank you for visiting
            our website. These contents are temporary and only for display purposes.
          </p>
          <Link to="/patient" className="hc-btn hc-btn--primary hp-mission-btn">
            About Us →
          </Link>
        </div>
      </section>

      {/* ── Meet Our Staff ── */}
      <section className="hp-staff">
        <div className="container">
          <div className="hp-section-head">
            <span className="hp-section-kicker">Our Team</span>
            <h2 className="hp-section-title">Meet Our Staff</h2>
            <p className="hp-section-sub">Experienced, caring professionals dedicated to your well-being.</p>
          </div>
          <div className="hp-staff-grid">
            {staffMembers.map((member) => (
              <article key={member.id} className="hp-staff-card">
                <div className="hp-staff-avatar">{member.initials}</div>
                <h3 className="hp-staff-name">{member.name}</h3>
                <p className="hp-staff-role">{member.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact / CTA ── */}
      <section className="hp-contact">
        <div className="container hp-contact-inner">
          <div className="hp-contact-copy">
            <span className="hp-section-kicker">Reach Out To Us</span>
            <h2 className="hp-contact-title">Send Us A Message</h2>
            <form className="hp-contact-form" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" className="hp-input" />
              <input type="email" placeholder="Your Email Address" className="hp-input" />
              <textarea rows={4} placeholder="Message(s)" className="hp-input hp-textarea" />
              <button type="submit" className="hc-btn hc-btn--primary">
                Submit →
              </button>
            </form>
          </div>
          <div className="hp-contact-visual" aria-hidden="true">
            <div className="hp-contact-img-box">
              <div className="hp-contact-img-placeholder">
                <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#c2dedd" strokeWidth="0.8">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.18 9.81a19.79 19.79 0 01-3.07-8.72A2 2 0 012.09 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l.36-.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
