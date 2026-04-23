import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/* ── Inject Google Fonts once ──────────────────────────────────────────── */
if (!document.getElementById('gesture-fonts')) {
  const el = document.createElement('link');
  el.id = 'gesture-fonts';
  el.rel = 'stylesheet';
  el.href =
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap';
  document.head.appendChild(el);
}

/* ── Brand tokens (only for values Tailwind can't express as classes) ── */
const B = {
  cr:      '#8B1A1A',
  crLight: '#A52020',
  gold:    '#B8973A',
  ivory:   '#FAF7F2',
  ivoryW:  '#F2EDE3',
  charcoal:'#1A1714',
  textMid: '#5A4E47',
  muted:   '#9A8B80',
  border:  '#DDD5C8',
  errBg:   '#FDF0F0',
  errBdr:  '#C85555',
};

/* ── Tiny shared components ─────────────────────────────────────────── */
const Label = ({ children, req }) => (
  <label
    className="block mb-2 text-[9px] tracking-[4px] uppercase font-bold"
    style={{ color: B.muted }}
  >
    {children}
    {req && <span style={{ color: B.cr }}> *</span>}
  </label>
);

const Field = ({ err, ...props }) => (
  <input
    {...props}
    className={[
      'w-full px-4 py-3 text-[13px] font-semibold outline-none border transition-all',
      err
        ? 'border-[#C85555] bg-[#FDF0F0]'
        : 'border-[#DDD5C8] bg-[#FAF7F2] focus:bg-white focus:border-[#8B1A1A]',
    ].join(' ')}
    style={{ fontFamily: 'Montserrat,sans-serif', borderRadius: 2, color: B.charcoal, ...props.style }}
  />
);

const Err = ({ msg }) =>
  msg ? (
    <p className="mt-1 text-[10px] font-bold tracking-wide" style={{ color: B.errBdr }}>
      {msg}
    </p>
  ) : null;

/* ════════════════════════════════════════════════════════════════════════ */
export default function StudentRegister() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [step,         setStep]         = useState(1);
  const [institutes,   setInstitutes]   = useState([]);
  const [selectedInst, setSelectedInst] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [banner,       setBanner]       = useState('');
  const [errors,       setErrors]       = useState({});
  const [showPass,     setShowPass]     = useState(false);
  const [showConf,     setShowConf]     = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    contact_number: '', learning_mode: 'self', instituteId: '',
  });

  useEffect(() => {
    axios.get('/api/auth/institutes').then(r => setInstitutes(r.data)).catch(() => {});
  }, []);

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clrE = k => setErrors(e => { const n = { ...e }; delete n[k]; return n; });

  /* ── validators ── */
  const valid1 = () => {
    if (form.learning_mode === 'institute' && !form.instituteId) {
      setBanner('Please select an academy to join.'); return false;
    }
    setBanner(''); return true;
  };

  const valid2 = () => {
    const e = {};
    if (!form.name.trim())        e.name    = 'Full name is required';
    if (!form.email.trim())       e.email   = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                  e.email   = 'Enter a valid email';
    if (!form.contact_number.trim())  e.contact = 'Contact number is required';
    else if (form.contact_number.replace(/\D/g,'').length < 7)
                                  e.contact = 'Enter a valid phone number';
    if (!form.password)           e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    if (!form.confirm)            e.confirm = 'Please confirm your password';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) { setBanner('Please correct the highlighted fields.'); return false; }
    setBanner(''); return true;
  };

  /* ── submit ── */
  const submit = async () => {
    if (!valid2()) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register/student', form);
      const { token, user } = res.data;
      if (user.status === 'pending') { setStep(3); return; }
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      setBanner(err.response?.data?.msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Progress indicator ── */
  const Progress = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2].map((n, i) => (
        <div key={n} className="flex items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all"
            style={{
              borderColor: step > n ? B.gold  : step === n ? B.cr : B.border,
              background:  step > n ? B.gold  : '#fff',
              color:       step > n ? '#fff'  : step === n ? B.cr : B.muted,
              fontFamily:  'Montserrat,sans-serif',
            }}
          >
            {step > n ? '✓' : `0${n}`}
          </div>
          {i < 1 && (
            <div className="w-12 h-0.5 transition-all" style={{ background: step > 1 ? B.gold : B.border }} />
          )}
        </div>
      ))}
    </div>
  );

  /* ── Hover helpers for plain buttons ── */
  const hoverCr  = e => (e.currentTarget.style.background = B.crLight);
  const outCr    = e => (e.currentTarget.style.background = B.cr);

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: B.ivory, fontFamily: 'Montserrat,sans-serif' }}>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-10 py-4 bg-white border-b" style={{ borderColor: B.border }}>
        <button
          className="flex items-center gap-2 text-[10px] tracking-[3px] uppercase font-bold bg-transparent border-none cursor-pointer transition-colors"
          style={{ color: B.muted, fontFamily: 'Montserrat,sans-serif' }}
          onClick={() => step > 1 ? (setBanner(''), setErrors({}), setStep(s => s - 1)) : navigate(-1)}
          onMouseOver={e => (e.currentTarget.style.color = B.cr)}
          onMouseOut={e  => (e.currentTarget.style.color = B.muted)}
        >
          ← {step > 1 ? 'Back' : 'Home'}
        </button>

        <span className="font-bold tracking-[3px]" style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 22, color: B.cr }}>
          GestureIQ
        </span>

        <span className="text-[10px] tracking-[2px] uppercase font-semibold" style={{ color: B.muted }}>
          Have an account?{' '}
          <Link to="/login" className="font-bold no-underline pb-px border-b" style={{ color: B.cr, borderColor: B.cr }}>
            Sign In
          </Link>
        </span>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">

          {step < 3 && <Progress />}

          {/* Card */}
          <div className="bg-white border relative overflow-hidden" style={{ borderColor: B.border, borderRadius: 2 }}>
            {/* gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg,${B.cr},${B.gold})` }} />

            <div className="px-10 pt-10 pb-8">

              {/* Error banner */}
              {banner && (
                <div
                  className="flex items-center gap-3 px-4 py-3 mb-6 text-[11px] font-bold tracking-wide border-l-4"
                  style={{ background: B.errBg, borderColor: B.errBdr, color: B.errBdr, borderRadius: 1 }}
                >
                  <span>⚠</span><span>{banner}</span>
                </div>
              )}

              {/* ══ STEP 1 ══ */}
              {step === 1 && (
                <>
                  <div className="text-center mb-8 pb-6 border-b" style={{ borderColor: B.ivoryW }}>
                    <p className="text-[9px] tracking-[5px] uppercase font-bold mb-3" style={{ color: B.gold }}>
                      Student Enrollment
                    </p>
                    <h1 className="leading-none font-bold" style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 42, color: B.charcoal }}>
                      Choose Your Path
                    </h1>
                    <p className="text-[11px] font-semibold mt-2" style={{ color: B.muted }}>
                      How would you like to learn?
                    </p>
                  </div>

                  <Label>Select Learning Mode</Label>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { val: 'self',      icon: '🧘', label: 'Self Study',  sub: 'Learn at your own pace' },
                      { val: 'institute', icon: '🏛️', label: 'Academy',     sub: 'Join a dance institution' },
                    ].map(opt => (
                      <div
                        key={opt.val}
                        onClick={() => { set('learning_mode', opt.val); setBanner(''); }}
                        className="p-5 text-center cursor-pointer border-2 select-none transition-all"
                        style={{
                          borderColor: form.learning_mode === opt.val ? B.cr : B.border,
                          background:  form.learning_mode === opt.val ? '#fff' : B.ivory,
                          boxShadow:   form.learning_mode === opt.val ? `inset 0 0 0 1px ${B.cr}` : 'none',
                          borderRadius: 2,
                        }}
                      >
                        <span className="text-[30px] block mb-3">{opt.icon}</span>
                        <span
                          className="text-[10px] tracking-[3px] uppercase font-bold block mb-1"
                          style={{ color: form.learning_mode === opt.val ? B.cr : B.charcoal }}
                        >
                          {opt.label}
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: B.muted }}>{opt.sub}</span>
                      </div>
                    ))}
                  </div>

                  {form.learning_mode === 'institute' && (
                    <div className="mb-6">
                      <Label req>Select Academy</Label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 text-[13px] font-semibold border outline-none cursor-pointer appearance-none pr-9"
                          style={{ borderColor: B.border, background: B.ivory, color: B.charcoal, fontFamily: 'Montserrat,sans-serif', borderRadius: 2 }}
                          value={form.instituteId}
                          onChange={e => {
                            set('instituteId', e.target.value);
                            setSelectedInst(institutes.find(i => i._id === e.target.value) || null);
                            setBanner('');
                          }}
                        >
                          <option value="">— Choose an Academy —</option>
                          {institutes.map(i => (
                            <option key={i._id} value={i._id}>{i.institution_name} ({i.name})</option>
                          ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: B.muted }}>▾</span>
                      </div>

                      {selectedInst && (
                        <div className="mt-4 p-5 border relative group animate-fadeIn" style={{ background: B.ivoryW, borderColor: B.border, borderRadius: 4 }}>
                          <div className="flex gap-4 items-start">
                            {selectedInst.profile_image ? (
                              <img 
                                src={selectedInst.profile_image} 
                                alt={selectedInst.name}
                                className="w-14 h-14 rounded-full object-cover border-2 shadow-sm"
                                style={{ borderColor: B.gold }}
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 shadow-sm"
                                style={{ background: '#fff', borderColor: B.gold, color: B.gold }}>
                                {selectedInst.name[0]}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-bold leading-tight mb-1" style={{ color: B.charcoal }}>{selectedInst.institution_name}</p>
                              <p className="text-[10px] font-bold tracking-[2px] uppercase mb-2" style={{ color: B.gold }}>
                                {selectedInst.name} · {selectedInst.years_of_experience} Yrs Exp.
                              </p>
                              <div className="flex gap-2 mb-3">
                                <span className="text-[8px] tracking-[1px] uppercase font-bold px-2 py-0.5 rounded border" 
                                  style={{ background: '#fff', borderColor: B.border, color: B.muted }}>
                                  {selectedInst.teaching_mode}
                                </span>
                              </div>
                            </div>
                          </div>
                          {selectedInst.bio && (
                            <p className="text-[11px] font-medium leading-relaxed italic border-t pt-3" style={{ color: B.textMid, borderColor: 'rgba(0,0,0,0.05)' }}>
                              "{selectedInst.bio.substring(0, 150)}..."
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => valid1() && setStep(2)}
                    className="w-full py-4 text-white text-[11px] tracking-[4px] uppercase font-bold flex items-center justify-center gap-3 transition-all mt-2"
                    style={{ background: B.cr, borderRadius: 1, fontFamily: 'Montserrat,sans-serif' }}
                    onMouseOver={hoverCr} onMouseOut={outCr}
                  >
                    Continue <span>→</span>
                  </button>
                </>
              )}

              {/* ══ STEP 2 ══ */}
              {step === 2 && (
                <>
                  <div className="text-center mb-8 pb-6 border-b" style={{ borderColor: B.ivoryW }}>
                    <p className="text-[9px] tracking-[5px] uppercase font-bold mb-3" style={{ color: B.gold }}>
                      Step 2 of 2
                    </p>
                    <h1 className="leading-none font-bold" style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 42, color: B.charcoal }}>
                      Your Details
                    </h1>
                    <p className="text-[11px] font-semibold mt-2" style={{ color: B.muted }}>
                      {selectedInst ? `Joining ${selectedInst.institution_name}` : 'Independent · Self Study'}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label req>Full Name</Label>
                      <Field type="text" placeholder="Priya Nataraj" value={form.name} err={errors.name}
                        onChange={e => { set('name', e.target.value); clrE('name'); }} />
                      <Err msg={errors.name} />
                    </div>

                    <div>
                      <Label req>Email Address</Label>
                      <Field type="email" placeholder="priya@example.com" value={form.email} err={errors.email}
                        onChange={e => { set('email', e.target.value); clrE('email'); }} />
                      <Err msg={errors.email} />
                    </div>

                    <div>
                      <Label req>Contact Number</Label>
                      <Field type="tel" placeholder="+91 98765 43210" value={form.contact_number} err={errors.contact}
                        onChange={e => { set('contact_number', e.target.value); clrE('contact'); }} />
                      <Err msg={errors.contact} />
                    </div>

                    <div>
                      <Label req>Password</Label>
                      <div className="relative">
                        <Field type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                          value={form.password} err={errors.password} style={{ paddingRight: 56 }}
                          onChange={e => { set('password', e.target.value); clrE('password'); }} />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-[10px] font-bold tracking-widest uppercase"
                          style={{ color: B.muted, fontFamily: 'Montserrat,sans-serif' }}>
                          {showPass ? 'hide' : 'show'}
                        </button>
                      </div>
                      <Err msg={errors.password} />
                    </div>

                    <div>
                      <Label req>Confirm Password</Label>
                      <div className="relative">
                        <Field type={showConf ? 'text' : 'password'} placeholder="Repeat password"
                          value={form.confirm} err={errors.confirm} style={{ paddingRight: 56 }}
                          onChange={e => { set('confirm', e.target.value); clrE('confirm'); }} />
                        <button type="button" onClick={() => setShowConf(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-[10px] font-bold tracking-widest uppercase"
                          style={{ color: B.muted, fontFamily: 'Montserrat,sans-serif' }}>
                          {showConf ? 'hide' : 'show'}
                        </button>
                      </div>
                      <Err msg={errors.confirm} />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => { setBanner(''); setErrors({}); setStep(1); }}
                      className="flex-1 py-4 text-[11px] tracking-[3px] uppercase font-bold border transition-all"
                      style={{ borderColor: B.border, background: B.ivoryW, color: B.charcoal, borderRadius: 1, fontFamily: 'Montserrat,sans-serif' }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={loading}
                      className="flex-[2] py-4 text-[11px] tracking-[4px] uppercase font-bold text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                      style={{ background: B.cr, borderRadius: 1, fontFamily: 'Montserrat,sans-serif' }}
                      onMouseOver={e => !loading && hoverCr(e)} onMouseOut={outCr}
                    >
                      {loading ? 'Processing…' : <><span>Complete Enrollment</span><span>→</span></>}
                    </button>
                  </div>
                </>
              )}

              {/* ══ STEP 3 — Success ══ */}
              {step === 3 && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-[30px] mx-auto mb-5 border-2"
                    style={{ background: B.ivoryW, borderColor: B.gold }}>
                    ✦
                  </div>
                  <p className="text-[9px] tracking-[6px] uppercase font-bold mb-3" style={{ color: B.gold }}>— ✦ —</p>
                  <h1 className="font-bold leading-none mb-3" style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 40, color: B.charcoal }}>
                    {form.learning_mode === 'institute' ? 'Enrollment Pending' : 'Welcome Aboard'}
                  </h1>
                  <div className="w-14 h-px mx-auto mb-5" style={{ background: B.gold }} />
                  <p className="text-[12px] font-semibold leading-loose max-w-sm mx-auto mb-3" style={{ color: B.muted }}>
                    {form.learning_mode === 'institute' && selectedInst
                      ? <>Your application to join <strong style={{ color: B.charcoal }}>{selectedInst.institution_name}</strong> has been submitted. The instructor will review and approve your request.</>
                      : <>Welcome, <strong style={{ color: B.charcoal }}>{form.name}</strong>! Your account is ready. You can now log in and begin your learning journey.</>
                    }
                  </p>
                  <p className="text-[9px] tracking-[5px] font-bold mb-8" style={{ color: B.gold }}>✦ ✦ ✦</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-4 text-white text-[11px] tracking-[4px] uppercase font-bold transition-all"
                    style={{ background: B.cr, borderRadius: 1, fontFamily: 'Montserrat,sans-serif' }}
                    onMouseOver={hoverCr} onMouseOut={outCr}
                  >
                    Proceed to Login →
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Bottom link */}
          <p className="text-center mt-6 text-[10px] tracking-[2px] uppercase font-semibold" style={{ color: B.muted }}>
            Already have an account?{' '}
            <Link to="/login" className="font-bold no-underline pb-px border-b" style={{ color: B.cr, borderColor: B.cr }}>
              Sign In
            </Link>
          </p>

          <p className="text-center mt-4 text-[9px] tracking-[2px] uppercase font-semibold opacity-60" style={{ color: B.muted }}>
            Are you an instructor?{' '}
            <Link to="/staff/register" className="font-bold underline" style={{ color: B.charcoal }}>
              Apply here
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}