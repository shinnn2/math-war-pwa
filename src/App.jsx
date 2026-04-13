import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Coins, Sword, Shield, Home, ShoppingBag, X, Check, Gift, Settings, Info, Clock } from 'lucide-react';

// --- LocalStorage Helper ---
const STORAGE_KEY = 'levelup-kids-data';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return null;
};

const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
};

// --- Sound Effects Generator ---
const playSound = (type) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  if (type === 'levelUp') {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  } else if (type === 'coupon') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
};

// --- Confetti Component ---
const Confetti = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const particles = React.useMemo(() =>
    [...Array(50)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: ['#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'][Math.floor(Math.random() * 5)],
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
    })),
    []
  );

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            backgroundColor: p.color,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            animation: `confetti-fall ${p.duration}s linear forwards`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// --- Shop Data ---
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
  { id: 'uss', name: 'Ultimate Sentosa Day (USS or Waterpark)', price: 1000, minLevel: 5, category: 'Epic Adventures', icon: '🎢', color: 'bg-amber-100' },
  { id: 'mandai', name: 'Mandai Explorer (River Wonders or Night Safari)', price: 1500, minLevel: 10, category: 'Epic Adventures', icon: '🦁', color: 'bg-orange-100' },
  { id: 'robux_400', name: '400 Robux', price: 200, minLevel: 20, category: 'Legendary', icon: '💎', color: 'bg-purple-100', oneTime: true },
];

// --- Helper ---
const normalizeInventory = (inv) => {
  if (Array.isArray(inv)) return inv;
  if (typeof inv === 'number' && inv > 0) {
    return Array(inv).fill({ name: 'Roblox 30 Minutes', icon: '🎮', color: 'bg-blue-100' });
  }
  return [];
};

const getTitle = (level) => {
  if (level < 5) return { text: 'Trainee', emoji: '🌱', gear: '' };
  if (level < 10) return { text: 'Junior Warrior', emoji: '🗡️', gear: '🗡️' };
  if (level < 20) return { text: 'Brave Warrior', emoji: '⚔️', gear: '⚔️' };
  if (level < 50) return { text: 'Super Warrior', emoji: '🛡️', gear: '🛡️' };
  return { text: 'Master Warrior', emoji: '👑', gear: '👑' };
};

const getToday = () => new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

const DEFAULT_STATE = {
  activeUser: 'Penelope',
  players: {
    Penelope: { exp: 0, level: 1, coins: 0, inventory: [], age: 12, purchasedOneTimeItems: [], history: [] },
    Pollyanna: { exp: 0, level: 1, coins: 0, inventory: [], age: 9, purchasedOneTimeItems: [], history: [] },
  },
};

// ========================
// MAIN APP
// ========================
export default function App() {
  const [activeUser, setActiveUser] = useState('Penelope');
  const [players, setPlayers] = useState(DEFAULT_STATE.players);
  const [isLoaded, setIsLoaded] = useState(false);

  const [currentTab, setCurrentTab] = useState('bag');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [couponIndexToUse, setCouponIndexToUse] = useState(null);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [message, setMessage] = useState('');

  // --- Load data on mount ---
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      if (saved.players) setPlayers(saved.players);
      if (saved.activeUser) setActiveUser(saved.activeUser);
    }
    setIsLoaded(true);
  }, []);

  // --- Save helper ---
  const saveState = useCallback((newPlayers, newActiveUser) => {
    setPlayers(newPlayers);
    setActiveUser(newActiveUser);
    saveToStorage({ players: newPlayers, activeUser: newActiveUser });
  }, []);

  const triggerAlert = useCallback((text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  // --- Shop tab welcome ---
  const handleShopTabClick = () => {
    setCurrentTab('shop');
    const seen = localStorage.getItem('levelUpShopVisited');
    if (!seen) {
      setShowWelcome(true);
      localStorage.setItem('levelUpShopVisited', 'true');
    }
  };

  // --- Actions ---
  const handleDailyMission = () => {
    const userProfile = players[activeUser];
    const currentInv = normalizeInventory(userProfile.inventory);
    const userHistory = userProfile.history || [];
    const today = getToday();

    // Check if today's mission already done
    if (userHistory.some(h => h.date === today && h.type === 'daily')) {
      triggerAlert("Today's mission already done! ✅");
      return;
    }

    let newExp = userProfile.exp + 20;
    let newLevel = userProfile.level;
    let newCoins = userProfile.coins + 50;
    let leveledUp = false;
    let titleChanged = false;

    if (newExp >= 100) {
      newExp = 0;
      newLevel += 1;
      leveledUp = true;
      if (getTitle(newLevel).text !== getTitle(userProfile.level).text) {
        titleChanged = true;
      }
    } else {
      triggerAlert('Daily Mission Complete! +20 EXP, +50 Coins, +1 Coupon! 🌟');
    }

    const historyEntry = {
      id: Date.now(),
      date: today,
      type: 'daily',
      description: 'Daily Mission Complete',
      rewards: '+20 EXP, +50 Coins, +1 Coupon',
      levelAfter: newLevel,
    };

    const newPlayers = {
      ...players,
      [activeUser]: {
        ...userProfile,
        inventory: [...currentInv, { name: 'Roblox 30 Minutes', icon: '🎮', color: 'bg-blue-100' }],
        exp: newExp,
        level: newLevel,
        coins: newCoins,
        history: [...userHistory, historyEntry],
      },
    };
    saveState(newPlayers, activeUser);
    setShowParentModal(false);

    if (leveledUp) {
      playSound('levelUp');
      setShowLevelUp(true);
      setTimeout(() => {
        setShowLevelUp(false);
        if (titleChanged) {
          triggerAlert(`Title Up! You received new gear! ${getTitle(newLevel).gear}`);
        }
      }, 4000);
    }
  };

  const handleUndoDailyMission = () => {
    const userProfile = players[activeUser];
    const currentInv = normalizeInventory(userProfile.inventory);
    const userHistory = userProfile.history || [];

    if (currentInv.length <= 0) {
      triggerAlert('No coupons to cancel! 🎒');
      return;
    }

    let newExp = userProfile.exp - 20;
    let newLevel = userProfile.level;
    let newCoins = Math.max(0, userProfile.coins - 50);

    if (newExp < 0) {
      if (newLevel > 1) {
        newLevel -= 1;
        newExp = 100 + newExp;
      } else {
        newExp = 0;
      }
    }

    const newInv = [...currentInv];
    newInv.pop();

    // Remove the most recent daily history entry
    const newHistory = [...userHistory];
    for (let i = newHistory.length - 1; i >= 0; i--) {
      if (newHistory[i].type === 'daily') {
        newHistory.splice(i, 1);
        break;
      }
    }

    const newPlayers = {
      ...players,
      [activeUser]: {
        ...userProfile,
        inventory: newInv,
        exp: newExp,
        level: newLevel,
        coins: newCoins,
        history: newHistory,
      },
    };
    saveState(newPlayers, activeUser);
    setShowParentModal(false);
    triggerAlert('Mission Cancelled! ⏪');
  };

  const handleManualStat = (expDelta, coinDelta, msg) => {
    const userProfile = players[activeUser];
    let newExp = userProfile.exp + expDelta;
    let newLevel = userProfile.level;
    let newCoins = Math.max(0, userProfile.coins + coinDelta);
    let leveledUp = false;
    let titleChanged = false;

    if (expDelta > 0 && newExp >= 100) {
      newExp = 0;
      newLevel += 1;
      leveledUp = true;
      if (getTitle(newLevel).text !== getTitle(userProfile.level).text) {
        titleChanged = true;
      }
    } else if (expDelta < 0 && newExp < 0) {
      if (newLevel > 1) {
        newLevel -= 1;
        newExp = 100 + newExp;
      } else {
        newExp = 0;
      }
    }

    const newPlayers = {
      ...players,
      [activeUser]: { ...userProfile, exp: newExp, level: newLevel, coins: newCoins },
    };
    saveState(newPlayers, activeUser);
    triggerAlert(msg);

    if (leveledUp) {
      playSound('levelUp');
      setShowLevelUp(true);
      setTimeout(() => {
        setShowLevelUp(false);
        if (titleChanged) {
          triggerAlert(`Title Up! You received new gear! ${getTitle(newLevel).gear}`);
        }
      }, 4000);
    }
  };

  const handleManualCoupon = (delta, msg) => {
    const userProfile = players[activeUser];
    const currentInv = normalizeInventory(userProfile.inventory);
    let newInv = [...currentInv];

    if (delta > 0) {
      newInv.push({ name: 'Roblox 30 Minutes', icon: '🎮', color: 'bg-blue-100' });
    } else if (delta < 0) {
      if (newInv.length === 0) {
        triggerAlert('No coupons to remove! 🎒');
        return;
      }
      newInv.pop();
    }

    const newPlayers = {
      ...players,
      [activeUser]: { ...userProfile, inventory: newInv },
    };
    saveState(newPlayers, activeUser);
    triggerAlert(msg);
  };

  const handleBuyItem = (item) => {
    const userProfile = players[activeUser];
    if (userProfile.coins >= item.price) {
      const currentInv = normalizeInventory(userProfile.inventory);
      const purchasedOneTime = userProfile.purchasedOneTimeItems || [];
      const userHistory = userProfile.history || [];

      const historyEntry = {
        id: Date.now(),
        date: getToday(),
        type: 'purchase',
        description: `Purchased: ${item.name}`,
        rewards: `-${item.price} Coins`,
      };

      const newPlayers = {
        ...players,
        [activeUser]: {
          ...userProfile,
          coins: userProfile.coins - item.price,
          inventory: [...currentInv, { name: item.name, icon: item.icon, color: item.color }],
          purchasedOneTimeItems: item.oneTime ? [...purchasedOneTime, item.id] : purchasedOneTime,
          history: [...userHistory, historyEntry],
        },
      };
      saveState(newPlayers, activeUser);
      playSound('coupon');
      triggerAlert(`Purchased: ${item.name}! 🎉`);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '0123') {
      setShowPinModal(false);
      setPinInput('');
      setShowParentModal(true);
    } else {
      triggerAlert('Access Denied! 🚫');
      setPinInput('');
    }
  };

  const handleUseCoupon = () => {
    const inv = normalizeInventory(players[activeUser].inventory);
    if (couponIndexToUse !== null && couponIndexToUse >= 0 && couponIndexToUse < inv.length) {
      const usedItem = inv[couponIndexToUse];
      const newInv = [...inv];
      newInv.splice(couponIndexToUse, 1);

      const userHistory = players[activeUser].history || [];
      const historyEntry = {
        id: Date.now(),
        date: getToday(),
        type: 'used',
        description: `Used: ${usedItem.name || 'Coupon'}`,
        rewards: '',
      };

      const newPlayers = {
        ...players,
        [activeUser]: { ...players[activeUser], inventory: newInv, history: [...userHistory, historyEntry] },
      };
      saveState(newPlayers, activeUser);
      playSound('coupon');
      setShowConfetti(true);
      setCouponIndexToUse(null);
      triggerAlert('Coupon Used! Have fun! 🎉');
    }
  };

  const currentPlayer = players[activeUser];
  const currentTitle = getTitle(currentPlayer.level);
  const currentInvArray = normalizeInventory(currentPlayer.inventory);
  const currentHistory = currentPlayer.history || [];
  const isTodayMissionDone = currentHistory.some(h => h.date === getToday() && h.type === 'daily');

  // --- Color map for Tailwind-like classes ---
  const colorMap = {
    'bg-green-100': '#dcfce7', 'bg-blue-100': '#dbeafe', 'bg-red-100': '#fee2e2',
    'bg-pink-100': '#fce7f3', 'bg-emerald-100': '#d1fae5', 'bg-emerald-200': '#a7f3d0',
    'bg-amber-100': '#fef3c7', 'bg-orange-100': '#ffedd5', 'bg-purple-100': '#f3e8ff',
    'bg-indigo-100': '#e0e7ff', 'bg-gray-100': '#f3f4f6',
  };
  const getBg = (cls) => colorMap[cls] || '#f3f4f6';

  // --- Loading ---
  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#eef2ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Nunito', 'Noto Sans KR', sans-serif" }}>
        <div style={{ width: 48, height: 48, border: '4px solid #c7d2fe', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ========================
  // RENDER
  // ========================
  return (
    <div style={{ minHeight: '100vh', background: '#eef2ff', fontFamily: "'Nunito', 'Noto Sans KR', sans-serif", color: '#1f2937', paddingBottom: 100, userSelect: 'none' }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />

      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      {/* ===== Welcome Modal ===== */}
      {showWelcome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(49,46,129,0.6)', backdropFilter: 'blur(12px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 360, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', border: '4px solid #e0e7ff', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)' }}>🛒</div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#4f46e5', marginBottom: 12 }}>Welcome to the Reward Shop! 🛒</h3>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', lineHeight: 1.7, marginBottom: 12 }}>
                Complete daily missions to level up and earn Coins (🪙). Use your Coins here to buy awesome Perks and Robux!
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: 12, borderRadius: 16, border: '1px solid #e0e7ff' }}>
                Save up for Epic Adventures like River Wonders or USS! Higher titles unlock better rewards. 💪
              </p>
            </div>
            <button onClick={() => setShowWelcome(false)} style={{ width: '100%', padding: '14px 0', background: '#4f46e5', color: '#fff', borderRadius: 16, fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
              OK, Let's Go!
            </button>
          </div>
        </div>
      )}

      {/* ===== Level Up Overlay ===== */}
      {showLevelUp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <Confetti onComplete={() => {}} />
          <div style={{ textAlign: 'center', animation: 'bounce-in 0.5s ease' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🌟</div>
            <h1 style={{ fontSize: 44, fontWeight: 900, background: 'linear-gradient(90deg, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: 4, marginBottom: 8 }}>
              Level Up!
            </h1>
            <p style={{ fontSize: 20, color: '#fff', fontWeight: 700, background: 'rgba(79,70,229,0.5)', padding: '8px 24px', borderRadius: 50, display: 'inline-block', backdropFilter: 'blur(8px)', border: '1px solid rgba(129,140,248,0.5)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              {activeUser} is now Lv {currentPlayer.level}!
            </p>
          </div>
          <style>{`@keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}

      {/* ===== Alert ===== */}
      {message && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#fff', border: '2px solid #a5b4fc', padding: '10px 20px', borderRadius: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 8, maxWidth: '90%', animation: 'alert-pop 0.3s ease' }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontWeight: 700, color: '#4338ca', fontSize: 13 }}>{message}</span>
        </div>
      )}
      <style>{`@keyframes alert-pop { 0% { transform: translateX(-50%) scale(0.8); opacity: 0; } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }`}</style>

      {/* ===== Header ===== */}
      <header style={{ background: '#fff', paddingTop: 16, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderBottom: '1px solid #e0e7ff', position: 'sticky', top: 0, zIndex: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', color: '#4f46e5', marginBottom: 14, letterSpacing: 1, textTransform: 'uppercase', fontStyle: 'italic' }}>
          ⚔️ Math War
        </h1>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {['Penelope', 'Pollyanna'].map((name) => {
            const userGear = getTitle(players[name].level).gear;
            const isActive = activeUser === name;
            return (
              <button
                key={name}
                onClick={() => saveState(players, name)}
                style={{
                  padding: '8px 18px', borderRadius: '16px 16px 0 0', fontWeight: 700, fontSize: 13,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: isActive ? '#4f46e5' : '#e0e7ff',
                  color: isActive ? '#fff' : '#818cf8',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {name} {userGear && <span style={{ fontSize: 16 }}>{userGear}</span>} ({players[name].age})
              </button>
            );
          })}
        </div>
      </header>

      {/* ===== Profile ===== */}
      <section style={{ padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '2px solid #fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2 }}>Warrior Rank</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#4338ca' }}>{currentTitle.text}</span>
                <span style={{ fontSize: 20 }}>{currentTitle.emoji}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2 }}>Level</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#4f46e5', fontStyle: 'italic' }}>Lv {currentPlayer.level}</div>
            </div>
          </div>

          {/* EXP Bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 900, color: '#9ca3af', marginBottom: 4, padding: '0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
              <span>Experience</span>
              <span>{currentPlayer.exp} / 100</span>
            </div>
            <div style={{ width: '100%', height: 14, background: '#f3f4f6', borderRadius: 50, overflow: 'hidden', padding: 2, border: '1px solid #e5e7eb' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #818cf8, #a78bfa)', borderRadius: 50, transition: 'width 0.5s ease', width: `${currentPlayer.exp}%` }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', padding: '8px 16px', borderRadius: 16, border: '1px solid #fde68a' }}>
              <span style={{ fontSize: 17 }}>🪙</span>
              <span style={{ fontWeight: 900, color: '#92400e' }}>{currentPlayer.coins}</span>
            </div>

            {/* Rank Guide */}
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textAlign: 'right', lineHeight: 1.6 }}>
              🌱1 → 🗡️5 → ⚔️10 → 🛡️20 → 👑50
            </div>
          </div>

          {/* Today's Mission Status */}
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10,
            background: isTodayMissionDone ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${isTodayMissionDone ? '#bbf7d0' : '#fde68a'}`,
          }}>
            <span style={{ fontSize: 16 }}>{isTodayMissionDone ? '✅' : '⏳'}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: isTodayMissionDone ? '#16a34a' : '#b45309' }}>
              {isTodayMissionDone ? "Today's mission complete!" : "Today's mission waiting..."}
            </span>
            {isTodayMissionDone && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#86efac' }}>
                🔥 {currentHistory.filter(h => h.type === 'daily').length} day total
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ===== Parent Zone Button ===== */}
      <div style={{ padding: '0 16px', marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowPinModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#d1d5db', fontSize: 10, fontWeight: 700 }}>
          <Settings size={14} />
          Parent Zone
        </button>
      </div>

      {/* ===== Main Content ===== */}
      <main style={{ padding: '0 16px' }}>

        {/* --- BAG TAB --- */}
        {currentTab === 'bag' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gift size={20} color="#4f46e5" /> My Bag
              </h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>Total: {currentInvArray.length}</span>
            </div>

            {currentInvArray.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {currentInvArray.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setCouponIndexToUse(i)}
                    style={{ background: '#fff', padding: 18, borderRadius: 28, border: '2px solid #e0e7ff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s' }}
                  >
                    <div style={{ width: 56, height: 56, background: getBg(item.color), borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                      {item.icon || '🎮'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 900, color: '#4338ca', fontSize: 14, lineHeight: 1.3 }}>{item.name || 'Coupon'}</h3>
                      <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>Ready to use!</p>
                      <p style={{ fontSize: 8, color: '#d1d5db', marginTop: 6, lineHeight: 1.4 }}>
                        * Can be changed for other purposes after talking with parents.
                      </p>
                    </div>
                    <div style={{ background: '#4f46e5', color: '#fff', padding: 8, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.5)', border: '2px dashed #d1d5db', borderRadius: 28, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.6 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🎒</div>
                <p style={{ fontWeight: 700, color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>Bag is empty!<br />Complete missions to get coupons.</p>
              </div>
            )}
          </div>
        )}

        {/* --- SHOP TAB --- */}
        {currentTab === 'shop' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={20} color="#4f46e5" /> Reward Shop
              </h2>
            </div>

            {SHOP_CATEGORIES.map((cat) => {
              const items = SHOP_ITEMS.filter((i) => i.category === cat.name);
              if (items.length === 0) return null;

              return (
                <div key={cat.name} style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 10, padding: '0 4px' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: 2 }}>{cat.name}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>{cat.desc}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((item) => {
                      const purchasedOneTime = currentPlayer.purchasedOneTimeItems || [];
                      const isSoldOut = item.oneTime && purchasedOneTime.includes(item.id);
                      const isLocked = currentPlayer.level < item.minLevel;
                      const canAfford = currentPlayer.coins >= item.price;

                      return (
                        <div key={item.id} style={{ background: '#fff', padding: 14, borderRadius: 22, border: `2px solid ${isLocked || isSoldOut ? '#e5e7eb' : '#e0e7ff'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isLocked || isSoldOut ? 0.7 : 1, boxShadow: isLocked || isSoldOut ? 'none' : '0 2px 8px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: isLocked || isSoldOut ? '#f3f4f6' : getBg(item.color), filter: isLocked || isSoldOut ? 'grayscale(1)' : 'none' }}>
                              {item.icon}
                            </div>
                            <div>
                              <h4 style={{ fontWeight: 900, fontSize: 13, color: isLocked || isSoldOut ? '#6b7280' : '#4338ca', maxWidth: 150, lineHeight: 1.3 }}>
                                {item.name}
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fffbeb', padding: '2px 8px', borderRadius: 6, border: '1px solid #fef3c7' }}>
                                  🪙 {item.price}
                                </span>
                                {isSoldOut && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Sold Out</span>
                                )}
                                {!isSoldOut && isLocked && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#f87171', background: '#fef2f2', padding: '2px 6px', borderRadius: 6, border: '1px solid #fecaca' }}>
                                    Need {getTitle(item.minLevel).text}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            disabled={isSoldOut || isLocked || !canAfford}
                            onClick={() => handleBuyItem(item)}
                            style={{
                              padding: '10px 16px', borderRadius: 16, fontWeight: 900, border: 'none', cursor: isSoldOut || isLocked || !canAfford ? 'not-allowed' : 'pointer', flexShrink: 0, fontSize: 13, transition: 'all 0.15s',
                              background: isSoldOut ? '#e5e7eb' : isLocked ? '#f3f4f6' : canAfford ? '#4f46e5' : '#e5e7eb',
                              color: isSoldOut ? '#6b7280' : isLocked ? '#9ca3af' : canAfford ? '#fff' : '#9ca3af',
                              boxShadow: canAfford && !isSoldOut && !isLocked ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                            }}
                          >
                            {isSoldOut ? 'Sold Out' : isLocked ? '🔒' : 'Buy'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- HISTORY TAB --- */}
        {currentTab === 'history' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color="#4f46e5" /> Mission History
              </h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>{currentHistory.length} records</span>
            </div>

            {currentHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(() => {
                  // Group by date, show most recent first
                  const grouped = {};
                  [...currentHistory].reverse().forEach(h => {
                    if (!grouped[h.date]) grouped[h.date] = [];
                    grouped[h.date].push(h);
                  });

                  const formatDate = (dateStr) => {
                    const today = getToday();
                    const d = new Date(dateStr + 'T00:00:00');
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yStr = yesterday.toISOString().split('T')[0];

                    if (dateStr === today) return 'Today';
                    if (dateStr === yStr) return 'Yesterday';

                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
                  };

                  const typeConfig = {
                    daily: { icon: '🌟', color: '#4338ca', bg: '#eef2ff' },
                    purchase: { icon: '🛒', color: '#b45309', bg: '#fffbeb' },
                    used: { icon: '🎉', color: '#059669', bg: '#ecfdf5' },
                  };

                  return Object.entries(grouped).map(([date, entries]) => (
                    <div key={date} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 2px' }}>
                        <div style={{ height: 1, flex: 1, background: '#e0e7ff' }} />
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1 }}>{formatDate(date)}</span>
                        <div style={{ height: 1, flex: 1, background: '#e0e7ff' }} />
                      </div>

                      {entries.map((entry) => {
                        const cfg = typeConfig[entry.type] || typeConfig.daily;
                        return (
                          <div key={entry.id} style={{ background: '#fff', padding: 14, borderRadius: 20, border: '1px solid #f3f4f6', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, background: cfg.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                              {cfg.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ display: 'block', fontWeight: 800, color: cfg.color, fontSize: 13, lineHeight: 1.3 }}>{entry.description}</span>
                              {entry.rewards && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginTop: 2, display: 'block' }}>{entry.rewards}</span>
                              )}
                            </div>
                            {entry.levelAfter && (
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#4f46e5', background: '#eef2ff', padding: '3px 8px', borderRadius: 8, flexShrink: 0 }}>Lv {entry.levelAfter}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.5)', border: '2px dashed #d1d5db', borderRadius: 28, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.6 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>📜</div>
                <p style={{ fontWeight: 700, color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>No history yet!<br />Complete missions to see your progress.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===== Use Coupon Modal ===== */}
      {couponIndexToUse !== null && currentInvArray[couponIndexToUse] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(49,46,129,0.4)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 340, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: getBg(currentInvArray[couponIndexToUse].color), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)' }}>
              {currentInvArray[couponIndexToUse].icon || '🎮'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Use Coupon?</h3>
              <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 700 }}>{currentInvArray[couponIndexToUse].name}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button onClick={() => setCouponIndexToUse(null)} style={{ flex: 1, padding: '14px 0', background: '#f3f4f6', borderRadius: 16, fontWeight: 700, color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                Not now
              </button>
              <button onClick={handleUseCoupon} style={{ flex: 1, padding: '14px 0', background: '#4f46e5', color: '#fff', borderRadius: 16, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
                Yes, Use!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PIN Modal ===== */}
      {showPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(12px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 340, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 56, height: 56, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🔒</div>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', marginBottom: 6 }}>Parent Only</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Please enter the 4-digit PIN</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength="4"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{ width: '100%', textAlign: 'center', fontSize: 28, letterSpacing: '0.8em', fontWeight: 900, background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 16, padding: '14px 0', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="••••"
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => { setShowPinModal(false); setPinInput(''); }} style={{ flex: 1, padding: '14px 0', background: '#f3f4f6', borderRadius: 16, fontWeight: 700, color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                    Cancel
                  </button>
                  <button onClick={handlePinSubmit} style={{ flex: 1, padding: '14px 0', background: '#4f46e5', color: '#fff', borderRadius: 16, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
                    Unlock
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Parent Zone Modal ===== */}
      {showParentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(12px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 40, width: '100%', maxWidth: 360, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', marginBottom: 4 }}>Parent Zone</h3>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Manage {activeUser}'s Account</p>
            </div>

            <div style={{ width: '100%' }}>
              <div style={{ background: '#fffbeb', padding: 16, borderRadius: 24, border: '2px solid #fde68a' }}>
                <h4 style={{ fontSize: 9, fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚙️ Manual Adjustments
                </h4>

                {/* Grid buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: '+ 20 EXP', color: '#4f46e5', bg: '#eef2ff', border: '#e0e7ff', action: () => handleManualStat(20, 0, 'Added 20 EXP! ✨') },
                    { label: '- 20 EXP', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', action: () => handleManualStat(-20, 0, 'Removed 20 EXP! 📉') },
                    { label: '+ 50 Coins', color: '#b45309', bg: '#fffbeb', border: '#fde68a', action: () => handleManualStat(0, 50, 'Added 50 Coins! 🪙') },
                    { label: '- 50 Coins', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', action: () => handleManualStat(0, -50, 'Removed 50 Coins! 🪙') },
                    { label: '+ 1 Coupon', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', action: () => handleManualCoupon(1, 'Added 1 Bonus Coupon! 🎟️') },
                    { label: '- 1 Coupon', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', action: () => handleManualCoupon(-1, 'Removed 1 Coupon! 🎒') },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} style={{ padding: '10px 0', background: '#fff', color: btn.color, borderRadius: 16, fontWeight: 900, fontSize: 11, border: `1px solid ${btn.border}`, cursor: 'pointer', transition: 'transform 0.1s' }}>
                      [{btn.label}]
                    </button>
                  ))}
                </div>

                <div style={{ height: 1, background: '#fde68a', opacity: 0.5, marginBottom: 14 }} />

                {/* Daily Mission */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={handleDailyMission}
                    disabled={isTodayMissionDone}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      background: isTodayMissionDone ? '#f0fdf4' : '#fff',
                      border: `1px solid ${isTodayMissionDone ? '#86efac' : '#e0e7ff'}`,
                      cursor: isTodayMissionDone ? 'default' : 'pointer',
                      opacity: isTodayMissionDone ? 0.85 : 1,
                    }}
                  >
                    <div style={{ width: 40, height: 40, background: isTodayMissionDone ? '#dcfce7' : '#eef2ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {isTodayMissionDone ? '✅' : '🌟'}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontWeight: 900, fontSize: 13, color: isTodayMissionDone ? '#16a34a' : '#4338ca' }}>
                        {isTodayMissionDone ? "Today's Mission Done!" : 'Complete Daily Mission'}
                      </span>
                      <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                        {isTodayMissionDone ? 'Come back tomorrow!' : '+1 Coupon, +20 EXP, +50 Coins'}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={handleUndoDailyMission}
                    disabled={currentInvArray.length === 0}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, cursor: currentInvArray.length > 0 ? 'pointer' : 'not-allowed', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      background: currentInvArray.length > 0 ? '#fff' : '#f9fafb',
                      border: `1px solid ${currentInvArray.length > 0 ? '#fecaca' : '#e5e7eb'}`,
                      opacity: currentInvArray.length > 0 ? 1 : 0.5,
                    }}
                  >
                    <div style={{ width: 40, height: 40, background: '#fef2f2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, filter: currentInvArray.length === 0 ? 'grayscale(1)' : 'none' }}>⏪</div>
                    <div>
                      <span style={{ display: 'block', fontWeight: 900, fontSize: 13, color: currentInvArray.length > 0 ? '#ef4444' : '#9ca3af' }}>Undo Daily Mission</span>
                      <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>-1 Coupon, -20 EXP, -50 Coins</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setShowParentModal(false)} style={{ width: '100%', padding: '14px 0', background: '#f3f4f6', borderRadius: 16, fontWeight: 700, color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: 14, marginTop: 4, flexShrink: 0 }}>
              Close Parent Zone
            </button>
          </div>
        </div>
      )}

      {/* ===== Bottom Nav ===== */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e0e7ff', padding: 14, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 40 }}>
        {[
          { id: 'bag', label: 'My Bag', icon: <Home size={22} fill={currentTab === 'bag' ? 'currentColor' : 'none'} /> },
          { id: 'history', label: 'History', icon: <Clock size={22} fill={currentTab === 'history' ? 'currentColor' : 'none'} /> },
          { id: 'shop', label: 'Shop', icon: <ShoppingBag size={22} fill={currentTab === 'shop' ? 'currentColor' : 'none'} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.id === 'shop' ? handleShopTabClick() : setCurrentTab(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', transition: 'all 0.2s',
              color: currentTab === tab.id ? '#4f46e5' : '#d1d5db',
            }}
          >
            <div style={{ padding: 10, borderRadius: 16, background: currentTab === tab.id ? '#e0e7ff' : '#f9fafb', transition: 'all 0.2s' }}>
              {tab.icon}
            </div>
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
