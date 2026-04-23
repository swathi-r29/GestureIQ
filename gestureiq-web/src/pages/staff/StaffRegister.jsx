import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

/* ─── Google Fonts injected once ─────────────────────────────────────────── */
const fontLink = document.getElementById('gesture-fonts');
if (!fontLink) {
  const el = document.createElement('link');
  el.id = 'gesture-fonts';
  el.rel = 'stylesheet';
  el.href =
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap';
  document.head.appendChild(el);
}

/* ─── Scoped styles ───────────────────────────────────────────────────────── */
const css = `
  .sr-root {
    --cr: #8B1A1A;
    --cr-light: #A52020;
    --cr-deep: #5C0F0F;
    --gold: #B8973A;
    --gold-light: #D4AF5A;
    --ivory: #FAF7F2;
    --ivory-warm: #F2EDE3;
    --charcoal: #1A1714;
    --text-dark: #2A2420;
    --text-mid: #6B5E54;
    --text-muted: #9A8B80;
    --border: #DDD5C8;
    --err-bg: #FDF0F0;
    --err-border: #C85555;
    font-family: 'Montserrat', sans-serif;
    background: var(--ivory);
    min-height: 100vh;
  }

  /* top bar */
  .sr-topbar {
    padding: 18px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    background: #fff;
  }
  .sr-back {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-mid); cursor: pointer; border: none; background: none;
    font-family: 'Montserrat', sans-serif; transition: color .2s;
  }
  .sr-back:hover { color: var(--cr); }
  .sr-brand {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px; font-weight: 600; color: var(--cr); letter-spacing: 2px;
  }
  .sr-topbar-auth {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted);
  }
  .sr-topbar-auth a {
    color: var(--cr); font-weight: 600;
    border-bottom: 1px solid var(--cr);
    padding-bottom: 1px; text-decoration: none;
  }

  /* hero */
  .sr-hero {
    padding: 36px 40px 0;
    display: flex; align-items: flex-start; justify-content: space-between;
  }
  .sr-hero-title {
    font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--gold); font-weight: 600; margin-bottom: 6px;
  }
  .sr-hero h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 50px; font-weight: 300; color: var(--charcoal);
    line-height: 1; letter-spacing: -1px; margin: 0;
  }

  /* stepper */
  .sr-stepper { display: flex; gap: 6px; align-items: center; padding-top: 8px; }
  .sr-seg {
    height: 3px; width: 56px; border-radius: 2px;
    background: var(--border); transition: background .4s;
  }
  .sr-seg.active { background: var(--cr); }
  .sr-seg.done { background: var(--gold); }
  .sr-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: background .3s; }
  .sr-dot.done { background: var(--gold); }
  .sr-step-count {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted); margin-top: 6px; text-align: right;
  }

  /* main card */
  .sr-main { padding: 24px 40px 40px; }
  .sr-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 40px;
    position: relative;
  }
  .sr-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--cr), var(--gold));
    border-radius: 2px 2px 0 0;
  }

  /* step header */
  .sr-step-header {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 32px; padding-bottom: 24px;
    border-bottom: 1px solid var(--ivory-warm);
  }
  .sr-step-icon {
    width: 48px; height: 48px;
    background: var(--ivory-warm); border: 1px solid var(--border);
    border-radius: 2px;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    flex-shrink: 0;
  }
  .sr-step-num {
    font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--gold); font-weight: 600;
  }
  .sr-step-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px; font-weight: 500; color: var(--charcoal); line-height: 1.1;
  }
  .sr-step-desc {
    font-size: 10px; color: var(--text-muted);
    letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;
  }

  /* error banner */
  .sr-error-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; margin-bottom: 24px;
    background: var(--err-bg);
    border: 1px solid var(--err-border);
    border-left: 3px solid var(--err-border);
    border-radius: 1px;
    font-size: 11px; color: var(--err-border); letter-spacing: 1px;
  }

  /* fields */
  .sr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sr-grid.single { grid-template-columns: 1fr; }
  .sr-field { display: flex; flex-direction: column; gap: 6px; }
  .sr-field.full { grid-column: 1 / -1; }
  .sr-label {
    font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--text-muted); font-weight: 600;
  }
  .sr-label .req { color: var(--cr); margin-left: 3px; }
  .sr-input {
    width: 100%; padding: 12px 16px;
    border: 1px solid var(--border);
    background: var(--ivory);
    color: var(--text-dark);
    font-family: 'Montserrat', sans-serif;
    font-size: 13px; border-radius: 1px; outline: none;
    transition: border-color .2s, background .2s;
    box-sizing: border-box;
  }
  .sr-input::placeholder { color: var(--text-muted); }
  .sr-input:focus { border-color: var(--cr); background: #fff; }
  .sr-input.err { border-color: var(--err-border) !important; background: var(--err-bg); }
  .sr-input.ok { border-color: #6AAA6A; }
  .sr-field-err {
    font-size: 10px; color: var(--err-border); letter-spacing: 1px;
  }
  .sr-select-wrap { position: relative; }
  .sr-select-wrap::after {
    content: '▾';
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    color: var(--text-muted); pointer-events: none; font-size: 12px;
  }
  .sr-select {
    width: 100%; padding: 12px 36px 12px 16px;
    border: 1px solid var(--border); background: var(--ivory);
    color: var(--text-dark); font-family: 'Montserrat', sans-serif;
    font-size: 13px; border-radius: 1px; outline: none;
    -webkit-appearance: none; appearance: none;
    transition: border-color .2s, background .2s;
    box-sizing: border-box;
    cursor: pointer;
  }
  .sr-select:focus { border-color: var(--cr); background: #fff; }
  .sr-select.err { border-color: var(--err-border) !important; background: var(--err-bg); }

  /* password */
  .sr-pass-wrap { position: relative; }
  .sr-pass-toggle {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    font-size: 10px; color: var(--text-muted);
    font-family: 'Montserrat', sans-serif; letter-spacing: 2px; text-transform: uppercase;
  }

  /* strength bar */
  .sr-strength { display: flex; gap: 4px; margin-top: 6px; }
  .sr-s { height: 2px; flex: 1; background: var(--border); border-radius: 1px; transition: background .3s; }

  /* role chips */
  .sr-chips { display: flex; gap: 12px; grid-column: 1 / -1; }
  .sr-chip {
    flex: 1; padding: 16px 12px;
    border: 1px solid var(--border); background: var(--ivory);
    cursor: pointer; border-radius: 1px; text-align: center;
    transition: all .2s; user-select: none;
  }
  .sr-chip.selected {
    border-color: var(--cr); background: #fff;
    box-shadow: inset 0 0 0 1px var(--cr);
  }
  .sr-chip-icon { font-size: 22px; display: block; margin-bottom: 6px; }
  .sr-chip-label {
    font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-mid); font-weight: 600; display: block;
  }
  .sr-chip.selected .sr-chip-label { color: var(--cr); }
  .sr-chip-sub { font-size: 10px; color: var(--text-muted); margin-top: 4px; display: block; }

  /* info note */
  .sr-note {
    background: var(--ivory-warm);
    border-left: 2px solid var(--gold);
    padding: 10px 14px;
    font-size: 11px; color: var(--text-mid);
    letter-spacing: .5px; line-height: 1.7;
    grid-column: 1 / -1; border-radius: 0 1px 1px 0;
  }

  /* actions */
  .sr-actions {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 32px; padding-top: 24px;
    border-top: 1px solid var(--ivory-warm);
  }
  .sr-btn-prev {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-mid); cursor: pointer; border: none; background: none;
    font-family: 'Montserrat', sans-serif; transition: color .2s; padding: 12px 0;
  }
  .sr-btn-prev:hover:not(:disabled) { color: var(--cr); }
  .sr-btn-prev:disabled { opacity: .3; cursor: default; }
  .sr-btn-next {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 32px; background: var(--cr); color: #fff;
    border: none; cursor: pointer;
    font-family: 'Montserrat', sans-serif;
    font-size: 10px; letter-spacing: 4px; text-transform: uppercase; font-weight: 500;
    border-radius: 1px; transition: background .2s, transform .1s;
  }
  .sr-btn-next:hover:not(:disabled) { background: var(--cr-light); }
  .sr-btn-next:active { transform: scale(.98); }
  .sr-btn-next:disabled { opacity: .5; cursor: not-allowed; }

  /* success */
  .sr-success { text-align: center; padding: 40px 20px; }
  .sr-success-emblem {
    width: 80px; height: 80px; border-radius: 50%;
    background: var(--ivory-warm); border: 2px solid var(--gold);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px; margin: 0 auto 20px;
  }
  .sr-success h2 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 34px; font-weight: 400; color: var(--charcoal); margin-bottom: 8px;
  }
  .sr-success p { font-size: 12px; color: var(--text-muted); letter-spacing: .5px; line-height: 1.9; max-width: 380px; margin: 0 auto; }
  .sr-gold-line { width: 60px; height: 1px; background: var(--gold); margin: 16px auto; }
  .sr-ornament { text-align: center; color: var(--gold-light); font-size: 16px; letter-spacing: 8px; opacity: .7; }

  /* bottom auth */
  .sr-bottom {
    text-align: center; padding: 24px;
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted);
  }
  .sr-bottom a { color: var(--cr); font-weight: 600; text-decoration: none; border-bottom: 1px solid var(--cr); padding-bottom: 1px; }

  @media (max-width: 640px) {
    .sr-topbar { padding: 16px 20px; }
    .sr-hero { padding: 28px 20px 0; flex-direction: column; gap: 16px; }
    .sr-hero h1 { font-size: 38px; }
    .sr-main { padding: 16px 20px 32px; }
    .sr-card { padding: 24px 20px; }
    .sr-grid { grid-template-columns: 1fr; }
    .sr-field.full { grid-column: 1; }
    .sr-chips { flex-direction: column; }
    .sr-stepper { gap: 4px; }
    .sr-seg { width: 40px; }
  }
`;

/* ─── Inject CSS once ─────────────────────────────────────────────────────── */
if (!document.getElementById('sr-styles')) {
  const style = document.createElement('style');
  style.id = 'sr-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* ─── Step config ─────────────────────────────────────────────────────────── */
const STEPS = [
  { icon: '🎭', num: '01 — Role',      name: 'Your Role',          desc: 'Instructor · Choreographer · Academy' },
  { icon: '🪷', num: '02 — Identity',  name: 'Personal Details',   desc: 'Name · Contact · Institution' },
  { icon: '✦',  num: '03 — Expertise', name: 'Professional Details', desc: 'Experience · Profile' },
  { icon: '🔑', num: '04 — Access',    name: 'Secure Credentials', desc: 'Set your password' },
];

/* ─── Sub-Components (Moved outside to prevent focus loss) ─────────────────── */

const Stepper = ({ step, submitted }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
    <div className="sr-stepper">
      {[0, 1, 2, 3].map(i => (
        <span key={i}>
          <span className={`sr-seg ${i < step || submitted ? 'done' : i === step ? 'active' : ''}`} />
          {i < 3 && <span className={`sr-dot ${i < step ? 'done' : ''}`} />}
        </span>
      ))}
    </div>
    <div className="sr-step-count">
      {submitted ? 'Application Submitted' : `Step ${step + 1} of 4`}
    </div>
  </div>
);

const Step0 = ({ form, set }) => (
  <div className="sr-grid single">
    <div className="sr-field full">
      <label className="sr-label">Select your role <span className="req">*</span></label>
      <div className="sr-chips">
        {[
          { val: 'instructor', icon: '💃', label: 'Instructor', sub: 'Teach individual students' },
          { val: 'choreographer', icon: '🎶', label: 'Choreographer', sub: 'Create & direct routines' },
          { val: 'academy', icon: '🏛️', label: 'Academy', sub: 'Manage an institution' },
        ].map(r => (
          <div
            key={r.val}
            className={`sr-chip ${form.role_type === r.val ? 'selected' : ''}`}
            onClick={() => set('role_type', r.val)}
          >
            <span className="sr-chip-icon">{r.icon}</span>
            <span className="sr-chip-label">{r.label}</span>
            <span className="sr-chip-sub">{r.sub}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="sr-note full">
      Your account will be reviewed by our admin team. You will receive an email once approved to access the platform.
    </div>
  </div>
);

const Step1 = ({ form, errors, set, clearErr }) => (
  <div className="sr-grid">
    <div className="sr-field full">
      <label className="sr-label">Full name <span className="req">*</span></label>
      <input
        className={`sr-input ${errors.name ? 'err' : form.name ? 'ok' : ''}`}
        type="text" placeholder="Priya Nataraj"
        value={form.name}
        onChange={e => { set('name', e.target.value); clearErr('name'); }}
      />
      {errors.name && <span className="sr-field-err">{errors.name}</span>}
    </div>
    <div className="sr-field">
      <label className="sr-label">Email address <span className="req">*</span></label>
      <input
        className={`sr-input ${errors.email ? 'err' : form.email ? 'ok' : ''}`}
        type="email" placeholder="priya@academy.com"
        value={form.email}
        onChange={e => { set('email', e.target.value); clearErr('email'); }}
      />
      {errors.email && <span className="sr-field-err">{errors.email}</span>}
    </div>
    <div className="sr-field">
      <label className="sr-label">Contact number <span className="req">*</span></label>
      <input
        className={`sr-input ${errors.phone ? 'err' : form.phone ? 'ok' : ''}`}
        type="tel" placeholder="+91 98765 43210"
        value={form.phone}
        onChange={e => { set('phone', e.target.value); clearErr('phone'); }}
      />
      {errors.phone && <span className="sr-field-err">{errors.phone}</span>}
    </div>
    <div className="sr-field">
      <label className="sr-label">Institution / Academy name <span className="req">*</span></label>
      <input
        className={`sr-input ${errors.institution ? 'err' : form.institution ? 'ok' : ''}`}
        type="text" placeholder="Natya Kala Academy"
        value={form.institution}
        onChange={e => { set('institution', e.target.value); clearErr('institution'); }}
      />
      {errors.institution && <span className="sr-field-err">{errors.institution}</span>}
    </div>
    <div className="sr-field">
      <label className="sr-label">City</label>
      <input
        className="sr-input"
        type="text" placeholder="Chennai, Tamil Nadu"
        value={form.city}
        onChange={e => set('city', e.target.value)}
      />
    </div>
  </div>
);

const Step2 = ({ form, errors, set, clearErr }) => {
  const fileInputRef = useRef(null);
  
  return (
    <div className="sr-grid">
      <div className="sr-field full">
        <label className="sr-label">Years of experience <span className="req">*</span></label>
        <input
          className={`sr-input ${errors.experience ? 'err' : form.experience ? 'ok' : ''}`}
          type="number" min="0" max="60" placeholder="e.g. 8"
          value={form.experience}
          onChange={e => { set('experience', e.target.value); clearErr('experience'); }}
        />
        {errors.experience && <span className="sr-field-err">{errors.experience}</span>}
      </div>
      
      {/* NEW: BIO FIELD */}
      <div className="sr-field full" style={{ marginTop: '10px' }}>
        <label className="sr-label">Detailed Bio / Teaching Style <span className="req">*</span></label>
        <textarea
          className={`sr-input ${errors.bio ? 'err' : form.bio ? 'ok' : ''}`}
          rows="4"
          placeholder="Tell us about your journey, teaching philosophy, and expertise..."
          value={form.bio}
          onChange={e => { set('bio', e.target.value); clearErr('bio'); }}
          style={{ resize: 'vertical', minHeight: '100px' }}
        />
        {errors.bio && <span className="sr-field-err">{errors.bio}</span>}
      </div>

      {/* NEW: PROFILE IMAGE FIELD */}
      <div className="sr-field full" style={{ marginTop: '10px' }}>
        <label className="sr-label">Profile Identity (Image) <span className="req">*</span></label>
        <div 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            border: '2px dashed var(--border)', 
            borderRadius: '2px', 
            padding: '20px', 
            textAlign: 'center', 
            cursor: 'pointer',
            background: 'var(--ivory)',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--cr)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          {form.profile_image ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={URL.createObjectURL(form.profile_image)} 
                alt="Preview" 
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--gold)' }} 
              />
              <div style={{ fontSize: '10px', marginTop: '5px', color: 'var(--cr)', fontWeight: 'bold' }}>Change Photo</div>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '5px' }}>📸</span>
              <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6 }}>Upload Professional Headshot</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files[0];
            if (file) {
              set('profile_image', file);
              clearErr('profile_image');
            }
          }}
        />
        {errors.profile_image && <span className="sr-field-err">{errors.profile_image}</span>}
      </div>
    </div>
  );
};

const Step3 = ({ form, errors, set, clearErr, strength, strengthColor, showPass, setShowPass, showConfirm, setShowConfirm, calcStrength, setStrength }) => (
  <div className="sr-grid single">
    <div className="sr-field">
      <label className="sr-label">Create password <span className="req">*</span></label>
      <div className="sr-pass-wrap">
        <input
          className={`sr-input ${errors.password ? 'err' : form.password ? 'ok' : ''}`}
          type={showPass ? 'text' : 'password'}
          placeholder="Minimum 8 characters"
          value={form.password}
          style={{ paddingRight: 60 }}
          onChange={e => {
            set('password', e.target.value);
            clearErr('password');
            setStrength(calcStrength(e.target.value));
          }}
        />
        <button className="sr-pass-toggle" type="button" onClick={() => setShowPass(v => !v)}>
          {showPass ? 'hide' : 'show'}
        </button>
      </div>
      <div className="sr-strength">
        {[1,2,3,4].map(i => (
          <div key={i} className="sr-s" style={{ background: i <= strength ? strengthColor() : 'var(--border)' }} />
        ))}
      </div>
      {errors.password && <span className="sr-field-err">{errors.password}</span>}
    </div>
    <div className="sr-field">
      <label className="sr-label">Confirm password <span className="req">*</span></label>
      <div className="sr-pass-wrap">
        <input
          className={`sr-input ${errors.confirm ? 'err' : (form.confirm && form.confirm === form.password) ? 'ok' : ''}`}
          type={showConfirm ? 'text' : 'password'}
          placeholder="Repeat password"
          value={form.confirm}
          style={{ paddingRight: 60 }}
          onChange={e => { set('confirm', e.target.value); clearErr('confirm'); }}
        />
        <button className="sr-pass-toggle" type="button" onClick={() => setShowConfirm(v => !v)}>
          {showConfirm ? 'hide' : 'show'}
        </button>
      </div>
      {errors.confirm && <span className="sr-field-err">{errors.confirm}</span>}
    </div>
    <div className="sr-note full">
      Your application will be reviewed within 24–48 hours. You will receive a confirmation email once your account is approved.
    </div>
  </div>
);

const SuccessView = ({ form }) => (
  <div className="sr-success">
    <div className="sr-success-emblem">✦</div>
    <div className="sr-ornament">— ✦ —</div>
    <h2>Application Received</h2>
    <div className="sr-gold-line" />
    <p>
      Thank you, <strong>{form.name}</strong>. Your enrollment as a <em>{form.role_type}</em>
      {form.institution && <> at <em>{form.institution}</em></>} has been submitted.
    </p>
    <p style={{ marginTop: 12 }}>
      Our team will review your application within <strong>24–48 hours</strong> and reach out to{' '}
      <strong>{form.email}</strong> with your approval status.
      You will be redirected to login shortly.
    </p>
    <div className="sr-ornament" style={{ marginTop: 24 }}>✦ ✦ ✦</div>
  </div>
);

/* ─── Main Component ───────────────────────────────────────────────────────── */

export default function StaffRegister() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState(0);

  const [form, setForm] = useState({
    role_type: 'instructor',
    name: '', email: '', phone: '', institution: '', city: '',
    experience: '',
    bio: '', profile_image: null,
    password: '', confirm: '',
  });

  const [errors, setErrors] = useState({});

  /* helpers */
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const clearErr = (key) => setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  
  const calcStrength = (val) => {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    return s;
  };

  const strengthColor = () => {
    const c = ['#E24B4A', '#E2914A', '#B8973A', '#6AAA6A'];
    return strength > 0 ? c[strength - 1] : 'var(--border)';
  };

  /* validation */
  const validate = () => {
    const newErr = {};

    if (step === 0) {
      if (!form.role_type) newErr._banner = 'Please select your role to continue.';
    }

    if (step === 1) {
      if (!form.name.trim()) newErr.name = 'Full name is required';
      if (!form.email.trim()) newErr.email = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErr.email = 'Please enter a valid email';
      if (!form.phone.trim()) newErr.phone = 'Contact number is required';
      else if (form.phone.replace(/\D/g, '').length < 7) newErr.phone = 'Please enter a valid phone number';
      if (!form.institution.trim()) newErr.institution = 'Institution name is required';
    }

    if (step === 2) {
      if (!form.experience.toString().trim() || isNaN(form.experience) || Number(form.experience) < 0)
        newErr.experience = 'Please enter valid years of experience';
      if (!form.bio.trim()) newErr.bio = 'Bio is required for professional profile';
      if (!form.profile_image) newErr.profile_image = 'Professional headshot is required';
    }

    if (step === 3) {
      if (!form.password) newErr.password = 'Password is required';
      else if (form.password.length < 8) newErr.password = 'Password must be at least 8 characters';
      if (!form.confirm) newErr.confirm = 'Please confirm your password';
      else if (form.password !== form.confirm) newErr.confirm = 'Passwords do not match';
    }

    setErrors(newErr);
    const hasErrors = Object.keys(newErr).length > 0;
    if (hasErrors && !newErr._banner) setBanner('Please correct the highlighted fields.');
    else if (newErr._banner) setBanner(newErr._banner);
    else setBanner('');
    return !hasErrors;
  };

  /* navigation */
  const next = async () => {
    if (!validate()) return;
    if (step === 3) {
      await submit();
      return;
    }
    setBanner('');
    setStep(s => s + 1);
  };

  const prev = () => {
    setBanner('');
    setErrors({});
    setStep(s => s - 1);
  };

  /* submit */
  const submit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('email', form.email);
      data.append('password', form.password);
      data.append('role', 'staff');
      data.append('contact_number', form.phone);
      data.append('institution_name', form.institution);
      data.append('location', form.city);
      data.append('institution_type', form.role_type === 'academy' ? 'Institution' : 'Individual Instructor');
      data.append('years_of_experience', form.experience);
      data.append('teaching_mode', 'Both'); // Defaulting for now
      data.append('bio', form.bio);
      if (form.profile_image) {
        data.append('profile_image', form.profile_image);
      }

      await axios.post('/api/auth/register/staff', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitted(true);
      setTimeout(() => navigate('/login'), 5000);
    } catch (err) {
      setBanner(err.response?.data?.msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const s = STEPS[step];

  return (
    <div className="sr-root">
      {/* Top bar */}
      <div className="sr-topbar">
        <button className="sr-back" onClick={() => step > 0 ? prev() : navigate(-1)}>
          ← {step > 0 ? 'Previous' : 'Back'}
        </button>
        <div className="sr-brand">GestureIQ</div>
        <div className="sr-topbar-auth">
          Have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="sr-hero">
        <div>
          <div className="sr-hero-title">Staff Enrollment</div>
          <h1>Join Our Academy</h1>
        </div>
        <Stepper step={step} submitted={submitted} />
      </div>

      {/* Form card */}
      <div className="sr-main">
        <div className="sr-card">
          {/* Error banner */}
          {banner && (
            <div className="sr-error-banner">
              <span>⚠</span>
              <span>{banner}</span>
            </div>
          )}

          {submitted ? (
            <SuccessView form={form} />
          ) : (
            <>
              {/* Step header */}
              <div className="sr-step-header">
                <div className="sr-step-icon">{s.icon}</div>
                <div>
                  <div className="sr-step-num">{s.num}</div>
                  <div className="sr-step-name">{s.name}</div>
                  <div className="sr-step-desc">{s.desc}</div>
                </div>
              </div>

              {/* Step fields */}
              {step === 0 && <Step0 form={form} set={set} />}
              {step === 1 && <Step1 form={form} errors={errors} set={set} clearErr={clearErr} />}
              {step === 2 && <Step2 form={form} errors={errors} set={set} clearErr={clearErr} />}
              {step === 3 && (
                <Step3 
                  form={form} 
                  errors={errors} 
                  set={set} 
                  clearErr={clearErr} 
                  strength={strength} 
                  strengthColor={strengthColor}
                  showPass={showPass}
                  setShowPass={setShowPass}
                  showConfirm={showConfirm}
                  setShowConfirm={setShowConfirm}
                  calcStrength={calcStrength}
                  setStrength={setStrength}
                />
              )}

              {/* Actions */}
              <div className="sr-actions">
                <button className="sr-btn-prev" disabled={step === 0} onClick={prev}>
                  ← Previous
                </button>
                <button className="sr-btn-next" disabled={loading} onClick={next}>
                  <span>{step === 3 ? (loading ? 'Submitting…' : 'Submit Application') : 'Next Protocol'}</span>
                  <span>→</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom auth */}
      <div className="sr-bottom">
        Already have a partner account?{' '}
        <Link to="/login">Authenticate here</Link>
      </div>
    </div>
  );
}