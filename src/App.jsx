import React, { useState, useEffect, useCallback } from 'react';
import { Home, ShoppingBag, Check, Gift, Settings, Clock, LogOut } from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// === Sound ===
const playSound = (type) => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  if (type === 'levelUp') {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.15);
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.05);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.4);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  } else if (type === 'coupon') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(523.25, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.5);
  }
};

// === Confetti ===
const Confetti = ({ onComplete }) => {
  useEffect(() => { const t = setTimeout(onComplete, 3000); return () => clearTimeout(t); }, [onComplete]);
  const particles = React.useMemo(() => [...Array(50)].map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`,
    color: ['#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'][Math.floor(Math.random() * 5)],
    duration: 2 + Math.random() * 3, delay: Math.random() * 2,
  })), []);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {particles.map(p => (
        <div key={p.id} style={{ position: 'absolute', left: p.left, top: '-20px', backgroundColor: p.color, width: '10px', height: '10px', borderRadius: '50%', animation: `cf ${p.duration}s linear forwards`, animationDelay: `${p.delay}s` }} />
      ))}
      <style>{`@keyframes cf { to { transform: translateY(100vh) rotate(360deg); opacity: 0; } }`}</style>
    </div>
  );
};

// === Constants ===
const SHOP_CATEGORIES = [
  { name: 'Everyday Perks', desc: 'No title required' },
  { name: 'Special Treats', desc: 'Requires Junior Warrior+' },
  { name: 'Epic Adventures', desc: 'Requires Brave Warrior+' },
  { name: 'Legendary', desc: 'Requires Super Warrior+' },
];

const SHOP_ITEMS = [
  { id: 'skip_math', name: 'Skip 1 Page of Math', price: 100, minLevel: 1, category: 'Everyday Perks', icon: '📝', color: 'bg-green-100' },
  { id: 'extra_screen', name: 'Extra 30 Min Roblox/YouTube', price: 200, minLevel: 1, category: 'Everyday Perks', icon: '📺', color: 'bg-blue-100' },
  { id: 'movie', name: 'Choose Friday Family Movie', price: 250, minLevel: 1, category: 'Everyday Perks', icon: '🍿', color: 'bg-red-100' },
  { id: 'boba', name: 'Boba Tea or Special Dessert Date', price: 300, minLevel: 5, category: 'Special Treats', icon: '🧋', color: 'bg-pink-100' },
  { id: 'robux_40', name: '40 Robux', price: 100, minLevel: 5, category: 'Special Treats', icon: '💵', color: 'bg-emerald-100', oneTime: true },
  { id: 'robux_80', name: '80 Robux', price: 150, minLevel: 10, category: 'Epic Adventures', icon: '💰', color: 'bg-emerald-200', oneTime: true },
  { id: 'uss', name: 'Ultimate Sentosa Day', price: 1000, minLevel: 5, category: 'Epic Adventures', icon: '🎢', color: 'bg-amber-100' },
  { id: 'mandai', name: 'Mandai Explorer', price: 1500, minLevel: 10, category: 'Epic Adventures', icon: '🦁', color: 'bg-orange-100' },
  { id: 'robux_400', name: '400 Robux', price: 200, minLevel: 20, category: 'Legendary', icon: '💎', color: 'bg-purple-100', oneTime: true },
];

const normalizeInventory = (inv) => Array.isArray(inv) ? inv : [];
const getTitle = (lv) => {
  if (lv < 5) return { text: 'Trainee', emoji: '🌱', gear: '' };
  if (lv < 10) return { text: 'Junior Warrior', emoji: '🗡️', gear: '🗡️' };
  if (lv < 20) return { text: 'Brave Warrior', emoji: '⚔️', gear: '⚔️' };
  if (lv < 50) return { text: 'Super Warrior', emoji: '🛡️', gear: '🛡️' };
  return { text: 'Master Warrior', emoji: '👑', gear: '👑' };
};
const getToday = () => new Date().toISOString().split('T')[0];

const DEFAULT_PLAYERS = {
  Penelope: { exp: 0, level: 1, coins: 0, inventory: [], age: 12, purchasedOneTimeItems: [], history: [] },
  Pollyanna: { exp: 0, level: 1, coins: 0, inventory: [], age: 9, purchasedOneTimeItems: [], history: [] },
};

// ========================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeUser, setActiveUser] = useState('Penelope');
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [isLoaded, setIsLoaded] = useState(false);
  // ★ FIX 1: 데이터를 성공적으로 불러왔는지 추적하는 플래그
  const [dataFromServer, setDataFromServer] = useState(false);

  const [currentTab, setCurrentTab] = useState('bag');
  const [showConfetti, setShowConfetti] = useState(false);
  const [couponIndexToUse, setCouponIndexToUse] = useState(null);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [message, setMessage] = useState('');

  // ★ FIX 2: 날짜 자동 갱신 — 앱이 백그라운드에서 돌아올 때 화면 새로고침
  const [todayDate, setTodayDate] = useState(getToday());

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        const newToday = getToday();
        if (newToday !== todayDate) {
          setTodayDate(newToday);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 1분마다 날짜 체크 (자정 넘김 대비)
    const interval = setInterval(() => {
      const newToday = getToday();
      if (newToday !== todayDate) {
        setTodayDate(newToday);
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [todayDate]);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return () => unsub();
  }, []);

  // ★ FIX 1: Firestore 데이터 로딩 — 기본값 덮어쓰기 방지
  useEffect(() => {
    if (!user) { setIsLoaded(true); return; }
    const ref = doc(db, 'families', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.players) setPlayers(data.players);
        if (data.activeUser) setActiveUser(data.activeUser);
        setDataFromServer(true); // ★ 서버 데이터 로드 성공
      } else {
        // 첫 로그인 시에만 기본 데이터 저장
        setDoc(ref, { players: DEFAULT_PLAYERS, activeUser: 'Penelope' });
        setDataFromServer(true);
      }
      setIsLoaded(true);
    }, (error) => {
      // ★ FIX 1: 로드 실패 시 기본값을 서버에 저장하지 않음
      console.error("Firestore load error:", error);
      setIsLoaded(true);
      // dataFromServer는 false로 유지 → 저장 차단
    });
    return () => unsub();
  }, [user]);

  // ★ FIX 1: 서버 데이터가 로드되지 않았으면 저장 차단
  const saveState = useCallback(async (newPlayers, newActiveUser) => {
    setPlayers(newPlayers);
    setActiveUser(newActiveUser);
    if (user && dataFromServer) {
      try {
        await setDoc(doc(db, 'families', user.uid), { players: newPlayers, activeUser: newActiveUser }, { merge: true });
      } catch (error) {
        console.error("Save failed:", error);
      }
    }
  }, [user, dataFromServer]);

  const triggerAlert = useCallback((t) => { setMessage(t); setTimeout(() => setMessage(''), 3000); }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); triggerAlert('Login failed'); }
  };
  const handleLogout = async () => { setDataFromServer(false); await signOut(auth); };

  // --- Actions ---
  const handleDailyMission = () => {
    const up = players[activeUser];
    const inv = normalizeInventory(up.inventory);
    const hist = up.history || [];
    // ★ FIX 2: todayDate 상태값 사용 (실시간 갱신됨)
    if (hist.some(h => h.date === todayDate && h.type === 'daily')) {
      triggerAlert("Today's mission already done! ✅"); return;
    }
    let nExp = up.exp + 20, nLv = up.level, nCoins = up.coins + 50, leveled = false, titleCh = false;
    if (nExp >= 100) {
      nExp = 0; nLv += 1; leveled = true;
      if (getTitle(nLv).text !== getTitle(up.level).text) titleCh = true;
    } else triggerAlert('Daily Mission Complete! +20 EXP, +50 Coins, +1 Coupon! 🌟');
    const entry = { id: Date.now(), date: todayDate, type: 'daily', description: 'Daily Mission Complete', rewards: '+20 EXP, +50 Coins, +1 Coupon', levelAfter: nLv };
    const nP = { ...players, [activeUser]: { ...up, inventory: [...inv, { name: 'Roblox 30 Minutes', icon: '🎮', color: 'bg-blue-100' }], exp: nExp, level: nLv, coins: nCoins, history: [...hist, entry] } };
    saveState(nP, activeUser);
    setShowParentModal(false);
    if (leveled) {
      playSound('levelUp'); setShowLevelUp(true);
      setTimeout(() => { setShowLevelUp(false); if (titleCh) triggerAlert(`Title Up! ${getTitle(nLv).gear}`); }, 4000);
    }
  };

  const handleUndoDailyMission = () => {
    const up = players[activeUser];
    const inv = normalizeInventory(up.inventory);
    const hist = up.history || [];
    if (inv.length <= 0) { triggerAlert('No coupons to cancel!'); return; }
    let nExp = up.exp - 20, nLv = up.level, nCoins = Math.max(0, up.coins - 50);
    if (nExp < 0) { if (nLv > 1) { nLv -= 1; nExp = 100 + nExp; } else nExp = 0; }
    const nInv = [...inv]; nInv.pop();
    const nHist = [...hist];
    for (let i = nHist.length - 1; i >= 0; i--) { if (nHist[i].type === 'daily') { nHist.splice(i, 1); break; } }
    saveState({ ...players, [activeUser]: { ...up, inventory: nInv, exp: nExp, level: nLv, coins: nCoins, history: nHist } }, activeUser);
    setShowParentModal(false);
    triggerAlert('Mission Cancelled! ⏪');
  };

  const handleManualStat = (eD, cD, msg) => {
    const up = players[activeUser];
    let nExp = up.exp + eD, nLv = up.level, nCoins = Math.max(0, up.coins + cD), leveled = false, titleCh = false;
    if (eD > 0 && nExp >= 100) { nExp = 0; nLv += 1; leveled = true; if (getTitle(nLv).text !== getTitle(up.level).text) titleCh = true; }
    else if (eD < 0 && nExp < 0) { if (nLv > 1) { nLv -= 1; nExp = 100 + nExp; } else nExp = 0; }
    saveState({ ...players, [activeUser]: { ...up, exp: nExp, level: nLv, coins: nCoins } }, activeUser);
    triggerAlert(msg);
    if (leveled) { playSound('levelUp'); setShowLevelUp(true); setTimeout(() => { setShowLevelUp(false); if (titleCh) triggerAlert(`Title Up! ${getTitle(nLv).gear}`); }, 4000); }
  };

  const handleManualCoupon = (d, msg) => {
    const up = players[activeUser];
    const inv = normalizeInventory(up.inventory);
    let nInv = [...inv];
    if (d > 0) nInv.push({ name: 'Roblox 30 Minutes', icon: '🎮', color: 'bg-blue-100' });
    else if (d < 0) { if (nInv.length === 0) { triggerAlert('No coupons!'); return; } nInv.pop(); }
    saveState({ ...players, [activeUser]: { ...up, inventory: nInv } }, activeUser);
    triggerAlert(msg);
  };

  const handleBuyItem = (item) => {
    const up = players[activeUser];
    if (up.coins >= item.price) {
      const inv = normalizeInventory(up.inventory);
      const po = up.purchasedOneTimeItems || [];
      const hist = up.history || [];
      const entry = { id: Date.now(), date: todayDate, type: 'purchase', description: `Purchased: ${item.name}`, rewards: `-${item.price} Coins` };
      saveState({ ...players, [activeUser]: { ...up, coins: up.coins - item.price, inventory: [...inv, { name: item.name, icon: item.icon, color: item.color }], purchasedOneTimeItems: item.oneTime ? [...po, item.id] : po, history: [...hist, entry] } }, activeUser);
      playSound('coupon'); triggerAlert(`Purchased: ${item.name}! 🎉`);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '0123') { setShowPinModal(false); setPinInput(''); setShowParentModal(true); }
    else { triggerAlert('Access Denied! 🚫'); setPinInput(''); }
  };

  const handleUseCoupon = () => {
    const inv = normalizeInventory(players[activeUser].inventory);
    if (couponIndexToUse !== null && couponIndexToUse < inv.length) {
      const used = inv[couponIndexToUse];
      const nInv = [...inv]; nInv.splice(couponIndexToUse, 1);
      const hist = players[activeUser].history || [];
      const entry = { id: Date.now(), date: todayDate, type: 'used', description: `Used: ${used.name || 'Coupon'}`, rewards: '' };
      saveState({ ...players, [activeUser]: { ...players[activeUser], inventory: nInv, history: [...hist, entry] } }, activeUser);
      playSound('coupon'); setShowConfetti(true); setCouponIndexToUse(null); triggerAlert('Coupon Used! 🎉');
    }
  };

  const colorMap = {
    'bg-green-100': '#dcfce7', 'bg-blue-100': '#dbeafe', 'bg-red-100': '#fee2e2', 'bg-pink-100': '#fce7f3',
    'bg-emerald-100': '#d1fae5', 'bg-emerald-200': '#a7f3d0', 'bg-amber-100': '#fef3c7', 'bg-orange-100': '#ffedd5',
    'bg-purple-100': '#f3e8ff', 'bg-indigo-100': '#e0e7ff', 'bg-gray-100': '#f3f4f6',
  };
  const getBg = (c) => colorMap[c] || '#f3f4f6';

  // --- Loading ---
  if (authLoading || (user && !isLoaded)) {
    return (
      <div style={{ minHeight: '100vh', background: '#eef2ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '4px solid #c7d2fe', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // --- Login ---
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Nunito', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚔️</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#4f46e5', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Math War</h1>
        <p style={{ color: '#6b7280', fontWeight: 700, marginBottom: 32, textAlign: 'center', maxWidth: 300 }}>Family Chore & Reward Tracker. Sign in to sync across all your family's devices.</p>
        <button onClick={handleLogin} style={{ background: '#fff', border: '2px solid #e5e7eb', padding: '14px 28px', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 7.1 29.3 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.8 44 30.3 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  // ★ FIX 1: 서버 데이터 로드 실패 시 에러 표시 (기본값으로 동작하지 않음)
  if (!dataFromServer) {
    return (
      <div style={{ minHeight: '100vh', background: '#eef2ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, fontFamily: "'Nunito', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#4f46e5', textAlign: 'center' }}>Loading your data...</h2>
        <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', maxWidth: 300 }}>If this takes too long, please check your internet connection and refresh the page.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Refresh</button>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>Logout</button>
      </div>
    );
  }

  const cur = players[activeUser];
  const curTitle = getTitle(cur.level);
  const curInv = normalizeInventory(cur.inventory);
  const curHist = cur.history || [];
  // ★ FIX 2: todayDate 상태값 사용
  const isTodayDone = curHist.some(h => h.date === todayDate && h.type === 'daily');

  return (
    <div style={{ minHeight: '100vh', background: '#eef2ff', fontFamily: "'Nunito', sans-serif", color: '#1f2937', paddingBottom: 100, userSelect: 'none' }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      {showLevelUp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <Confetti onComplete={() => {}} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🌟</div>
            <h1 style={{ fontSize: 44, fontWeight: 900, background: 'linear-gradient(90deg, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: 4 }}>Level Up!</h1>
            <p style={{ fontSize: 20, color: '#fff', fontWeight: 700, background: 'rgba(79,70,229,0.5)', padding: '8px 24px', borderRadius: 50, display: 'inline-block', marginTop: 8 }}>{activeUser} is now Lv {cur.level}!</p>
          </div>
        </div>
      )}

      {message && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#fff', border: '2px solid #a5b4fc', padding: '10px 20px', borderRadius: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✨</span><span style={{ fontWeight: 700, color: '#4338ca', fontSize: 13 }}>{message}</span>
        </div>
      )}

      <header style={{ background: '#fff', padding: '12px 16px 8px', borderBottom: '1px solid #e0e7ff', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ width: 60 }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#4f46e5', letterSpacing: 1, textTransform: 'uppercase', fontStyle: 'italic' }}>⚔️ Math War</h1>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }} title="Logout"><LogOut size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {['Penelope', 'Pollyanna'].map(n => {
            const g = getTitle(players[n].level).gear;
            const act = activeUser === n;
            return (
              <button key={n} onClick={() => saveState(players, n)} style={{ padding: '8px 18px', borderRadius: '16px 16px 0 0', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, background: act ? '#4f46e5' : '#e0e7ff', color: act ? '#fff' : '#818cf8', transform: act ? 'scale(1.05)' : 'scale(1)' }}>
                {n} {g && <span style={{ fontSize: 16 }}>{g}</span>} ({players[n].age})
              </button>
            );
          })}
        </div>
      </header>

      <section style={{ padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2 }}>Warrior Rank</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#4338ca' }}>{curTitle.text}</span>
                <span style={{ fontSize: 20 }}>{curTitle.emoji}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2 }}>Level</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#4f46e5', fontStyle: 'italic' }}>Lv {cur.level}</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 900, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>
              <span>Experience</span><span>{cur.exp} / 100</span>
            </div>
            <div style={{ width: '100%', height: 14, background: '#f3f4f6', borderRadius: 50, overflow: 'hidden', padding: 2 }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #818cf8, #a78bfa)', borderRadius: 50, transition: 'width 0.5s', width: `${cur.exp}%` }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', padding: '8px 16px', borderRadius: 16, border: '1px solid #fde68a' }}>
              <span style={{ fontSize: 17 }}>🪙</span><span style={{ fontWeight: 900, color: '#92400e' }}>{cur.coins}</span>
            </div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700 }}>🌱1 → 🗡️5 → ⚔️10 → 🛡️20 → 👑50</div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, background: isTodayDone ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isTodayDone ? '#bbf7d0' : '#fde68a'}` }}>
            <span style={{ fontSize: 16 }}>{isTodayDone ? '✅' : '⏳'}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: isTodayDone ? '#16a34a' : '#b45309' }}>
              {isTodayDone ? "Today's mission complete!" : "Today's mission waiting..."}
            </span>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowPinModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#d1d5db', fontSize: 10, fontWeight: 700 }}>
          <Settings size={14} />Parent Zone
        </button>
      </div>

      <main style={{ padding: '0 16px' }}>
        {currentTab === 'bag' && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#374151', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Gift size={20} color="#4f46e5" /> My Bag <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>Total: {curInv.length}</span>
            </h2>
            {curInv.length > 0 ? curInv.map((item, i) => (
              <button key={i} onClick={() => setCouponIndexToUse(i)} style={{ width: '100%', background: '#fff', padding: 18, borderRadius: 28, border: '2px solid #e0e7ff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 56, height: 56, background: getBg(item.color), borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{item.icon || '🎮'}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 900, color: '#4338ca', fontSize: 14 }}>{item.name || 'Coupon'}</h3>
                  <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>Ready to use!</p>
                </div>
                <div style={{ background: '#4f46e5', color: '#fff', padding: 8, borderRadius: 12 }}><Check size={16} /></div>
              </button>
            )) : (
              <div style={{ border: '2px dashed #d1d5db', borderRadius: 28, padding: 48, textAlign: 'center', opacity: 0.6 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🎒</div>
                <p style={{ fontWeight: 700, color: '#9ca3af', fontSize: 13 }}>Bag is empty!</p>
              </div>
            )}
          </div>
        )}

        {currentTab === 'history' && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#374151', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Clock size={20} color="#4f46e5" /> History <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{curHist.length} records</span>
            </h2>
            {curHist.length > 0 ? [...curHist].reverse().map((h) => {
              const cfg = h.type === 'daily' ? { icon: '🌟', color: '#4338ca', bg: '#eef2ff' } : h.type === 'purchase' ? { icon: '🛒', color: '#b45309', bg: '#fffbeb' } : { icon: '🎉', color: '#059669', bg: '#ecfdf5' };
              return (
                <div key={h.id} style={{ background: '#fff', padding: 14, borderRadius: 20, border: '1px solid #f3f4f6', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, background: cfg.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: cfg.color, fontSize: 13 }}>{h.description}</span>
                    <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>{h.date} {h.rewards && `· ${h.rewards}`}</span>
                  </div>
                </div>
              );
            }) : <div style={{ border: '2px dashed #d1d5db', borderRadius: 28, padding: 48, textAlign: 'center', opacity: 0.6 }}><div style={{ fontSize: 36 }}>📜</div><p style={{ fontWeight: 700, color: '#9ca3af', fontSize: 13, marginTop: 14 }}>No history yet!</p></div>}
          </div>
        )}

        {currentTab === 'shop' && SHOP_CATEGORIES.map(cat => {
          const items = SHOP_ITEMS.filter(i => i.category === cat.name);
          return (
            <div key={cat.name} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: 2 }}>{cat.name}</h3>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>{cat.desc}</span>
              {items.map(item => {
                const po = cur.purchasedOneTimeItems || [];
                const sold = item.oneTime && po.includes(item.id);
                const lock = cur.level < item.minLevel;
                const afford = cur.coins >= item.price;
                return (
                  <div key={item.id} style={{ background: '#fff', padding: 14, borderRadius: 22, border: '2px solid #e0e7ff', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: lock || sold ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: lock || sold ? '#f3f4f6' : getBg(item.color) }}>{item.icon}</div>
                      <div>
                        <h4 style={{ fontWeight: 900, fontSize: 13, color: '#4338ca', maxWidth: 150 }}>{item.name}</h4>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fffbeb', padding: '2px 8px', borderRadius: 6 }}>🪙 {item.price}</span>
                      </div>
                    </div>
                    <button disabled={sold || lock || !afford} onClick={() => handleBuyItem(item)} style={{ padding: '10px 16px', borderRadius: 16, fontWeight: 900, border: 'none', cursor: sold || lock || !afford ? 'not-allowed' : 'pointer', fontSize: 13, background: sold ? '#e5e7eb' : lock ? '#f3f4f6' : afford ? '#4f46e5' : '#e5e7eb', color: sold ? '#6b7280' : lock ? '#9ca3af' : afford ? '#fff' : '#9ca3af' }}>
                      {sold ? 'Sold Out' : lock ? '🔒' : 'Buy'}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>

      {couponIndexToUse !== null && curInv[couponIndexToUse] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(49,46,129,0.4)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 340, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: getBg(curInv[couponIndexToUse].color), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 20px' }}>{curInv[couponIndexToUse].icon || '🎮'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Use Coupon?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 700, marginBottom: 20 }}>{curInv[couponIndexToUse].name}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setCouponIndexToUse(null)} style={{ flex: 1, padding: '14px 0', background: '#f3f4f6', borderRadius: 16, fontWeight: 700, color: '#6b7280', border: 'none', cursor: 'pointer' }}>Not now</button>
              <button onClick={handleUseCoupon} style={{ flex: 1, padding: '14px 0', background: '#4f46e5', color: '#fff', borderRadius: 16, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Yes, Use!</button>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(12px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 340, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>🔒</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Parent Only</h3>
            <form onSubmit={handlePinSubmit}>
              <input type="password" inputMode="numeric" maxLength="4" autoFocus value={pinInput} onChange={e => setPinInput(e.target.value)} style={{ width: '100%', textAlign: 'center', fontSize: 28, letterSpacing: '0.8em', fontWeight: 900, background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 16, padding: '14px 0', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} placeholder="••••" />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowPinModal(false); setPinInput(''); }} style={{ flex: 1, padding: '14px 0', background: '#f3f4f6', borderRadius: 16, fontWeight: 700, color: '#6b7280', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '14px 0', background: '#4f46e5', color: '#fff', borderRadius: 16, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showParentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(12px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 360, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', marginBottom: 4 }}>Parent Zone</h3>
            <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 18 }}>Manage {activeUser}</p>
            <div style={{ background: '#fffbeb', padding: 16, borderRadius: 24, border: '2px solid #fde68a' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { l: '+20 EXP', c: '#4f46e5', a: () => handleManualStat(20, 0, '+20 EXP ✨') },
                  { l: '-20 EXP', c: '#ef4444', a: () => handleManualStat(-20, 0, '-20 EXP 📉') },
                  { l: '+50 🪙', c: '#b45309', a: () => handleManualStat(0, 50, '+50 🪙') },
                  { l: '-50 🪙', c: '#ef4444', a: () => handleManualStat(0, -50, '-50 🪙') },
                  { l: '+🎟️', c: '#7c3aed', a: () => handleManualCoupon(1, '+1 🎟️') },
                  { l: '-🎟️', c: '#ef4444', a: () => handleManualCoupon(-1, '-1 🎟️') },
                ].map((b, i) => <button key={i} onClick={b.a} style={{ padding: '10px 0', background: '#fff', color: b.c, borderRadius: 16, fontWeight: 900, fontSize: 11, border: '1px solid #e5e7eb', cursor: 'pointer' }}>{b.l}</button>)}
              </div>
              <button onClick={handleDailyMission} disabled={isTodayDone} style={{ width: '100%', background: isTodayDone ? '#f0fdf4' : '#fff', padding: 12, borderRadius: 16, border: `1px solid ${isTodayDone ? '#86efac' : '#e0e7ff'}`, cursor: isTodayDone ? 'default' : 'pointer', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, background: isTodayDone ? '#dcfce7' : '#eef2ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{isTodayDone ? '✅' : '🌟'}</div>
                <span style={{ fontWeight: 900, fontSize: 13, color: isTodayDone ? '#16a34a' : '#4338ca' }}>{isTodayDone ? "Today's Mission Done!" : 'Complete Daily Mission'}</span>
              </button>
              <button onClick={handleUndoDailyMission} disabled={curInv.length === 0} style={{ width: '100%', background: '#fff', padding: 12, borderRadius: 16, border: '1px solid #fecaca', cursor: curInv.length > 0 ? 'pointer' : 'not-allowed', opacity: curInv.length > 0 ? 1 : 0.5, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, background: '#fef2f2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⏪</div>
                <span style={{ fontWeight: 900, fontSize: 13, color: '#ef4444' }}>Undo Daily Mission</span>
              </button>
            </div>
            <button onClick={() => setShowParentModal(false)} style={{ width: '100%', padding: '14px 0', background: '#f3f4f6', borderRadius: 16, fontWeight: 700, color: '#6b7280', border: 'none', cursor: 'pointer', marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e0e7ff', padding: 14, display: 'flex', justifyContent: 'space-around', zIndex: 40 }}>
        {[
          { id: 'bag', label: 'My Bag', icon: <Home size={22} /> },
          { id: 'history', label: 'History', icon: <Clock size={22} /> },
          { id: 'shop', label: 'Shop', icon: <ShoppingBag size={22} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setCurrentTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', color: currentTab === t.id ? '#4f46e5' : '#d1d5db' }}>
            <div style={{ padding: 10, borderRadius: 16, background: currentTab === t.id ? '#e0e7ff' : '#f9fafb' }}>{t.icon}</div>
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
