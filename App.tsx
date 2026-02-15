
import React, { useState, useEffect, useRef } from 'react';
import { Reservation, PackageKey, ExtraServices } from './types';
import { dataService } from './services/dataService';
import { PACKAGES, COLORS, DEPOSIT_AMOUNT, ALL_DAY_SLOTS } from './constants';
import AdminPortal from './components/AdminPortal';
import PrivacyPolicy from './components/PrivacyPolicy';
import Toast from './components/Toast';

declare global {
  interface Window {
    paypal: any;
  }
}

// Lokalni folder za slike je "./slike/".
const PKG_IMAGES: Record<PackageKey, string> = {
  kids: "./slike/paketi/deca.jpg",
  teen: "./slike/paketi/zurka6.jpg",
  adult: "./slike/paketi/rodjenje.jpg",
  baby: "./slike/paketi/rodjenje1.jpg",
  gender: "./slike/paketi/gender.jpg",
  eighteen: "./slike/paketi/zurka5.jpg",
  slavlja: "./slike/paketi/slavlja.jpg"
};

const GALLERY_IMAGES = [
  "./slike/galerija/zurka1.jpg",
  "./slike/galerija/rodjenje1.jpg",
  "./slike/galerija/prosotr1.jpg",
  "./slike/galerija/pozadina.jpg",
  "./slike/galerija/zurka.jpg",
  "./slike/galerija/zurka6.jpg"
];

const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [activePackage, setActivePackage] = useState<PackageKey>('kids');
  const [selectedSpace, setSelectedSpace] = useState<'open' | 'closed' | null>(null);
  const [guestCount, setGuestCount] = useState(30);
  const [childrenCount, setChildrenCount] = useState(20);
  const [adultsCount, setAdultsCount] = useState(30);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [extras, setExtras] = useState<ExtraServices>({ 
    tables: 0, waiterHours: 0, ledKg: 0, photographer: false, decoration: false, catering: false, makeup: false, dj: false
  });
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const cartCount = (selectedDate && selectedTimeSlot) ? 1 : 0;

  const refreshData = () => {
    setReservations(dataService.getReservations());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSpace === 'closed') {
      if (guestCount > 70) setGuestCount(70);
      if (childrenCount + adultsCount > 70) {
        const remaining = 70 - childrenCount;
        setAdultsCount(remaining > 0 ? remaining : 0);
      }
    }
  }, [selectedSpace, guestCount, childrenCount, adultsCount]);

  useEffect(() => {
    if (selectedTimeSlot && isPaymentReady && paypalContainerRef.current && window.paypal) {
      paypalContainerRef.current.innerHTML = '';
      window.paypal.HostedButtons({
        hostedButtonId: "KB6QMB3QM5CP8",
        onApprove: (data: any, actions: any) => {
          handleBooking({ preventDefault: () => {} } as React.FormEvent, true);
        }
      }).render("#paypal-container-KB6QMB3QM5CP8");
    }
  }, [selectedTimeSlot, isPaymentReady]);

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const calculateTotalPrice = () => {
    const pkg = PACKAGES[activePackage];
    if (activePackage === 'slavlja') return 0; // Manual pricing

    let base = activePackage === 'kids' 
      ? pkg.calcPrice(childrenCount, adultsCount) 
      : pkg.calcPrice(guestCount, selectedTimeSlot || '');
    
    const extrasTotal = 
      (extras.tables * 10) + 
      (extras.waiterHours * 10) + 
      (extras.ledKg * 0.8);
      
    return base + extrasTotal;
  };

  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    const pkg = PACKAGES[activePackage];
    const dayReservations = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed');
    return pkg.slots.filter(slot => !dayReservations.some(r => r.time_slot === slot));
  };

  const renderCalendar = () => {
    const months = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
    const days = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(<div key={`empty-${i}`}></div>);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = new Date(calYear, calMonth, d) < today;
      const dayReservations = reservations.filter(r => r.date === dateStr && r.status === 'confirmed');
      
      const totalPossibleSlots = ALL_DAY_SLOTS.length;
      const bookedCount = dayReservations.length;
      
      let statusColor = 'bg-green-500';
      if (bookedCount >= totalPossibleSlots) statusColor = 'bg-red-500';
      else if (bookedCount > 0) statusColor = 'bg-orange-400';

      if (isPast) statusColor = 'bg-gray-200 opacity-40 cursor-not-allowed';

      cells.push(
        <div 
          key={dateStr}
          onClick={() => !isPast && bookedCount < totalPossibleSlots && setSelectedDate(dateStr)}
          className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-[10px] md:text-xs cursor-pointer transition-all ${statusColor} ${selectedDate === dateStr ? 'ring-4 ring-[var(--gold)] font-bold' : 'text-white'} shadow-sm`}
        >
          {d}
        </div>
      );
    }

    return (
      <div className="bg-white p-4 md:p-8 rounded-[40px] shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => calMonth === 0 ? (setCalMonth(11), setCalYear(calYear - 1)) : setCalMonth(calMonth - 1)} className="text-[var(--gold)] text-3xl px-3 hover:scale-110 transition-transform">‹</button>
          <span className="font-display font-bold uppercase tracking-[3px] text-sm md:text-base">{months[calMonth]} {calYear}</span>
          <button onClick={() => calMonth === 11 ? (setCalMonth(0), setCalYear(calYear + 1)) : setCalMonth(calMonth + 1)} className="text-[var(--gold)] text-3xl px-3 hover:scale-110 transition-transform">›</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {days.map(d => <div key={d} className="text-[9px] uppercase font-black text-gray-400 mb-3 tracking-widest">{d}</div>)}
          {cells}
        </div>
        <div className="mt-8 flex gap-6 text-[9px] uppercase font-black text-gray-400 justify-center">
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Slobodno</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400"></span> Zauzeto delimično</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Popunjeno</div>
        </div>
      </div>
    );
  };

  const handleBooking = (e: React.FormEvent, isConfirmed: boolean = false) => {
    e.preventDefault();
    if (!isConfirmed) {
      const formData = new FormData(formRef.current!);
      if (!formData.get('name') || !formData.get('phone') || !selectedDate || !selectedTimeSlot || !selectedSpace) {
        addToast('Molimo popunite sva obavezna polja i izaberite termin.', 'error'); return;
      }
      setIsPaymentReady(true); 
      addToast('Uplatite depozit od 40€ za finalnu rezervaciju.', 'info'); 
      return;
    }
    const formData = new FormData(formRef.current!);
    dataService.saveReservation({
      package_type: activePackage, space: selectedSpace!, date: selectedDate!, time_slot: selectedTimeSlot!,
      guest_count: activePackage === 'kids' ? (childrenCount + adultsCount) : guestCount, extras, 
      total_price: calculateTotalPrice(), deposit_paid: true, customer_name: formData.get('name') as string,
      customer_email: formData.get('email') as string, customer_phone: formData.get('phone') as string,
      status: 'confirmed', created_at: new Date().toISOString()
    });
    refreshData(); addToast('Rezervacija uspešno potvrđena! ✨', 'success');
    formRef.current?.reset(); setSelectedDate(null); setSelectedTimeSlot(null); setIsPaymentReady(false);
  };

  const isSlavlja = activePackage === 'slavlja';

  return (
    <div className="min-h-screen selection:bg-[var(--gold)] selection:text-white">
      {isAdminOpen && <AdminPortal onClose={() => { setIsAdminOpen(false); refreshData(); }} />}
      {isPrivacyOpen && <PrivacyPolicy onClose={() => setIsPrivacyOpen(false)} />}
      
      <div className="fixed top-24 right-4 z-[2000] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} message={t.msg} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}
      </div>

      <header className="fixed top-0 inset-x-0 z-[1000] bg-[var(--dark-green)]/95 backdrop-blur-md border-b border-white/5 py-5 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('hero')}>
            <div className="w-10 h-10 md:w-12 md:h-12 border border-[var(--gold)] rounded-full overflow-hidden transition-all group-hover:scale-110 bg-[var(--dark-green)]">
               <img src="./slike/galerija/logo.jpg" alt="Indođija Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display text-white text-xl md:text-2xl tracking-[2px] font-bold">INDOĐIJA LUXURY</span>
          </div>
          <nav className="hidden lg:flex items-center gap-10 text-[10px] tracking-[4px] font-black text-white/80">
            {['O NAMA', 'PONUDE', 'USLUGE', 'GALERIJA', 'KONTAKT'].map(item => (
              <span key={item} className="hover:text-[var(--gold)] cursor-pointer transition-colors uppercase" onClick={() => scrollTo(item === 'KONTAKT' ? 'contact-footer' : item.toLowerCase().replace(' ', ''))}>{item}</span>
            ))}
            <div className="flex items-center gap-3 cursor-pointer group px-6 py-2.5 bg-white/5 rounded-full border border-white/10 hover:border-[var(--gold)]/50 transition-all" onClick={() => scrollTo('booking-section')}>
              <span className="text-[var(--gold)] uppercase tracking-widest">KORPA</span>
              <div className="w-7 h-7 rounded-full bg-[var(--gold)] text-[var(--dark-green)] flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform">
                {cartCount}
              </div>
            </div>
          </nav>
          <button className="lg:hidden text-[var(--gold)] text-3xl" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? '✕' : '☰'}</button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1100] bg-[var(--dark-green)] flex flex-col items-center justify-center gap-10 text-white font-display text-2xl animate-fade-up">
           <button className="absolute top-8 right-8 text-4xl" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
           {['O NAMA', 'PONUDE', 'USLUGE', 'GALERIJA', 'KONTAKT'].map(item => (
              <span key={item} onClick={() => { scrollTo(item === 'KONTAKT' ? 'contact-footer' : item.toLowerCase().replace(' ', '')); setIsMobileMenuOpen(false); }}>{item}</span>
            ))}
        </div>
      )}

      <section id="hero" className="relative h-screen flex items-center justify-center bg-[var(--dark-green)]">
        <div className="absolute inset-0 opacity-40 bg-[url('./images/hero-bg.jpg')] bg-cover bg-center grayscale scale-105"></div>
        <div className="relative z-10 text-center px-6">
           <h1 className="font-display text-7xl md:text-9xl text-white mb-6 drop-shadow-2xl animate-fade-up uppercase tracking-tighter">INDOĐIJA</h1>
           <p className="font-display italic text-2xl md:text-3xl text-[var(--gold)] mb-12 animate-fade-up delay-100">Gde luksuz susreće prirodu.</p>
           <button onClick={() => scrollTo('booking-section')} className="px-14 py-6 bg-[var(--gold)] text-[var(--dark-green)] font-black uppercase text-[11px] tracking-[4px] hover:bg-white transition-all shadow-2xl rounded-sm">Počni Rezervaciju</button>
        </div>
      </section>

      <section id="ponude" className="py-24 px-6 md:px-12 bg-[var(--ivory)]">
        <div id="booking-section" className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl md:text-7xl text-[var(--dark-green)] mb-6">Izaberite Paket</h2>
            <div className="w-24 h-px bg-[var(--gold)] mx-auto"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6 mb-16">
            {(Object.keys(PACKAGES) as PackageKey[]).map(k => (
              <button 
                key={k} 
                onClick={() => { setActivePackage(k); setSelectedDate(null); setSelectedTimeSlot(null); }}
                className={`relative group aspect-square rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 ${activePackage === k ? 'ring-4 ring-[var(--gold)] scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'} ${k === 'slavlja' ? 'border-2 border-[var(--gold)]' : ''}`}
              >
                <img src={PKG_IMAGES[k]} className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0" alt={k} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-6">
                  <span className="text-3xl md:text-4xl mb-2">{PACKAGES[k].emoji}</span>
                  <span className="text-white font-black text-[9px] md:text-[11px] uppercase tracking-[2px] text-center leading-tight">{PACKAGES[k].name}</span>
                </div>
                {k === 'slavlja' && <div className="absolute top-4 right-4 bg-[var(--gold)] text-[var(--dark-green)] text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Premium</div>}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[60px] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-100 min-h-[850px]">
            <div className="flex-1 p-8 md:p-14 lg:border-r border-gray-100 space-y-16">
              <div className="space-y-6">
                 <h3 className="font-display text-4xl text-[var(--dark-green)]">{PACKAGES[activePackage].name}</h3>
                 <p className="text-[var(--gold)] font-black uppercase tracking-[4px] text-xs">U ponudu ulazi: {PACKAGES[activePackage].inclusions}</p>
                 {isSlavlja && <p className="text-gray-400 font-bold italic text-sm tracking-wide">Ozbiljne organizacije proslava sa uključenim sedećim mestima, stolovima, escajgom i premium postavkom.</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <label className="text-[11px] font-black uppercase tracking-[4px] text-[var(--gold)]">01 TIP PROSTORA</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['open', 'closed'].map(type => (
                      <button key={type} onClick={() => setSelectedSpace(type as any)} className={`p-8 rounded-[40px] border-2 transition-all flex flex-col items-center gap-3 ${selectedSpace === type ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                        <span className="text-4xl">{type === 'open' ? '🌳' : '🏠'}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{type === 'open' ? 'Otvoreno' : 'Zatvoreno'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedSpace && (
                  <div className="space-y-6">
                    <label className="text-[11px] font-black uppercase tracking-[4px] text-[var(--gold)]">02 BROJ GOSTIJU</label>
                    <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                      {activePackage === 'kids' ? (
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-gray-400"><span>Deca</span><span className="text-[var(--gold)] font-bold">{childrenCount}</span></div>
                            <input type="range" min="10" max={selectedSpace === 'closed' ? 70 - adultsCount : 200} value={childrenCount} onChange={e => setChildrenCount(parseInt(e.target.value))} className="w-full accent-[var(--gold)]" />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-gray-400"><span>Odrasli</span><span className="text-[var(--gold)] font-bold">{adultsCount}</span></div>
                            <input type="range" min="10" max={selectedSpace === 'closed' ? 70 - childrenCount : 200} value={adultsCount} onChange={e => setAdultsCount(parseInt(e.target.value))} className="w-full accent-[var(--gold)]" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-6xl font-display text-[var(--dark-green)] mb-6">{guestCount}</div>
                          <input type="range" min="10" max={selectedSpace === 'closed' ? 70 : (isSlavlja ? 120 : 200)} value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value))} className="w-full accent-[var(--gold)]" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedSpace && (
                <div className="grid md:grid-cols-2 gap-10 pt-10 border-t border-gray-100">
                  <div className="space-y-6"><label className="text-[11px] font-black uppercase tracking-[4px] text-[var(--gold)]">03 IZABERITE DATUM</label>{renderCalendar()}</div>
                  <div className="space-y-6">
                    <label className="text-[11px] font-black uppercase tracking-[4px] text-[var(--gold)]">04 IZABERITE TERMIN</label>
                    {selectedDate ? (
                      <div className="flex flex-col gap-4">
                        {getAvailableSlots().map(slot => (
                          <button key={slot} onClick={() => { setSelectedTimeSlot(slot); setIsPaymentReady(false); }} className={`p-6 rounded-[24px] border-2 text-[12px] font-black text-left flex justify-between items-center transition-all ${selectedTimeSlot === slot ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-xl' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                            <span className="tracking-widest">{slot}</span>
                            {selectedTimeSlot === slot && <span className="text-[var(--gold)] font-bold">✓</span>}
                          </button>
                        ))}
                        {getAvailableSlots().length === 0 && <p className="text-center text-red-500 font-bold uppercase text-[10px] tracking-widest p-10 bg-red-50 rounded-3xl">Popunjeni svi termini za ovaj dan.</p>}
                      </div>
                    ) : <div className="p-20 border-2 border-dashed border-gray-100 rounded-[40px] text-center text-gray-300 font-bold uppercase text-[10px] tracking-[3px]">Prvo izaberite datum</div>}
                  </div>
                </div>
              )}
            </div>

            <div id="usluge" className="w-full lg:w-[480px] bg-gray-50 p-8 md:p-14 flex flex-col border-t lg:border-t-0">
               <div className="flex-grow">
                  <h3 className="text-[12px] font-black uppercase tracking-[4px] text-[var(--gold)] mb-10">05 DODATNE USLUGE</h3>
                  <div className="grid gap-5 max-h-[480px] overflow-y-auto pr-2 gallery-scroll">
                    {[
                      { id: 'photographer', label: 'Fotograf', desc: 'Na Upit', icon: '📸' },
                      { id: 'decoration', label: 'Dekoracije', desc: 'Na Upit', icon: '✨' },
                      { id: 'catering', label: 'Premium Ketering', desc: 'Na Upit', icon: '🍽️' },
                      { id: 'makeup', label: 'Šminka', desc: 'Na Upit', icon: '💄' },
                      { id: 'dj', label: 'DJ & Audio Paket', desc: 'Ozvučenje uklj.', icon: '🎵' }
                    ].map(item => (
                      <label key={item.id} className="flex items-center p-5 bg-white rounded-3xl shadow-sm cursor-pointer border-2 border-transparent hover:border-[var(--gold)]/20 transition-all">
                        <input type="checkbox" checked={(extras as any)[item.id]} onChange={e => setExtras({...extras, [item.id]: e.target.checked})} className="hidden" />
                        <span className="text-3xl mr-5">{item.icon}</span>
                        <div className="flex-grow">
                           <div className="text-[11px] font-black uppercase text-[var(--dark-green)] tracking-widest">{item.label}</div>
                           <div className="text-[9px] text-gray-400 font-bold uppercase">{item.desc}</div>
                        </div>
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${(extras as any)[item.id] ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-gray-200'}`}>
                           { (extras as any)[item.id] && <span className="text-white text-[12px]">✓</span> }
                        </div>
                      </label>
                    ))}
                    {!isSlavlja && (
                      <>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-gray-500 mb-4"><span>LED za piće (0.8€/kg)</span><span className="text-[var(--gold)] font-bold">{(extras.ledKg * 0.8).toFixed(2)}€</span></div>
                          <div className="flex items-center gap-5">
                              <button onClick={() => setExtras({...extras, ledKg: Math.max(0, extras.ledKg-5)})} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black hover:bg-gray-100">-</button>
                              <span className="text-sm font-black w-10 text-center">{extras.ledKg}kg</span>
                              <button onClick={() => setExtras({...extras, ledKg: extras.ledKg+5})} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black hover:bg-gray-100">+</button>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-gray-500 mb-4"><span>Dodatni Stolovi (10€/kom)</span><span className="text-[var(--gold)] font-bold">{extras.tables * 10}€</span></div>
                          <div className="flex items-center gap-5">
                              <button onClick={() => setExtras({...extras, tables: Math.max(0, extras.tables-1)})} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black hover:bg-gray-100">-</button>
                              <span className="text-sm font-black w-8 text-center">{extras.tables}</span>
                              <button onClick={() => setExtras({...extras, tables: extras.tables+1})} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black hover:bg-gray-100">+</button>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-gray-500 mb-4"><span>Konobar (10€/h)</span><span className="text-[var(--gold)] font-bold">{extras.waiterHours * 10}€</span></div>
                          <div className="flex items-center gap-5">
                              <button onClick={() => setExtras({...extras, waiterHours: Math.max(0, extras.waiterHours-1)})} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black hover:bg-gray-100">-</button>
                              <span className="text-sm font-black w-8 text-center">{extras.waiterHours}h</span>
                              <button onClick={() => setExtras({...extras, waiterHours: extras.waiterHours+1})} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black hover:bg-gray-100">+</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
               </div>
               <div className="mt-14 pt-10 border-t border-gray-200">
                  <form ref={formRef} onSubmit={handleBooking} className="space-y-8">
                     <div className="space-y-4">
                        <input name="name" required placeholder="IME I PREZIME" className="w-full p-5 bg-white border border-gray-100 rounded-3xl outline-none focus:border-[var(--gold)] text-[11px] font-black uppercase tracking-[3px]" />
                        <input name="phone" required placeholder="KONTAKT TELEFON" className="w-full p-5 bg-white border border-gray-100 rounded-3xl outline-none focus:border-[var(--gold)] text-[11px] font-black uppercase tracking-[3px]" />
                     </div>
                     <div className="py-8 border-y border-gray-100 space-y-4">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[3px] text-gray-400"><span>UKUPNA CENA</span><span>{isSlavlja ? 'PO DOGOVORU' : calculateTotalPrice() + '€'}</span></div>
                        {!isSlavlja && (
                          <>
                            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[3px] text-green-600"><span>DEPOZIT (UPLATA SADA)</span><span>{DEPOSIT_AMOUNT}€</span></div>
                            <div className="flex justify-between items-end pt-4"><span className="text-13px font-black uppercase tracking-[4px]">OSTATAK (NA DAN)</span><span className="text-5xl font-display text-[var(--dark-green)] leading-none">{calculateTotalPrice() - DEPOSIT_AMOUNT}€</span></div>
                          </>
                        )}
                        {isSlavlja && <p className="text-[10px] font-bold uppercase text-[var(--gold)] tracking-widest text-center py-4">Cena se formira na osnovu vaših specifičnih zahteva.</p>}
                     </div>
                     {!isPaymentReady ? (
                        <button type="submit" className="w-full py-6 bg-[var(--dark-green)] text-[var(--gold)] font-black rounded-[36px] uppercase tracking-[4px] text-[12px] hover:brightness-125 transition-all shadow-2xl">
                          {isSlavlja ? 'Pošalji Upit' : 'Nastavi Na Plaćanje'}
                        </button>
                     ) : (
                        <div className="animate-fade-up"><div id="paypal-container-KB6QMB3QM5CP8" ref={paypalContainerRef}></div><p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-6">Izvršite uplatu depozita od 40€ za potvrdu.</p></div>
                     )}
                  </form>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="galerija" className="py-32 px-6 md:px-12 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="font-display text-7xl md:text-8xl text-[var(--dark-green)] mb-6">Galerija Indođije</h2><p className="text-[var(--gold)] font-display italic text-2xl tracking-widest">Zakoračite u naš svet</p></div>
          <div className="flex gap-8 md:gap-12 overflow-x-auto pb-20 gallery-scroll snap-x scroll-smooth">
             {GALLERY_IMAGES.map((img, i) => (
               <div key={i} className="flex-shrink-0 w-[300px] md:w-[500px] h-[500px] md:h-[700px] rounded-[80px] overflow-hidden shadow-2xl snap-center group relative transition-all duration-700 hover:w-[350px] md:hover:w-[600px] cursor-pointer">
                  <img src={img} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0" alt={`G ${i}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-green)]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-12"><span className="text-white font-display text-3xl italic tracking-[3px]">Inspiracija #{i+1}</span></div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="onama" className="py-32 px-6 md:px-12 bg-[var(--ivory)] overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
           <div className="flex-1 space-y-12">
              <h2 className="font-display text-7xl text-[var(--dark-green)] leading-tight">Vrt Iz Snova <br/> <span className="text-[var(--gold)] italic tracking-[4px]">U Srcu Ravnice</span></h2>
              <div className="w-24 h-px bg-[var(--gold)]"></div>
              <p className="text-gray-600 leading-[2.2] tracking-[2px] text-lg">Indođija Luxury Event Garden je unikatno mesto za vaše najbitnije proslave. Spoj netaknute prirode i vrhunskog luksuza pruža nezaboravno iskustvo vama i vašim gostima.</p>
              <button onClick={() => scrollTo('booking-section')} className="px-14 py-5 border-2 border-[var(--gold)] text-[var(--gold)] uppercase font-black tracking-[5px] text-[12px] hover:bg-[var(--gold)] hover:text-white transition-all rounded-[4px]">Saznajte Više</button>
           </div>
           <div className="flex-1 relative">
              <div className="w-full h-[650px] rounded-[120px] overflow-hidden shadow-2xl z-10 rotate-[2deg] border-[12px] border-white">
                 <img src="./slike/galerija/slavlja.jpg" className="w-full h-full object-cover" alt="Garden" />
              </div>
              <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[var(--gold)]/30 rounded-full blur-[120px] z-0"></div>
           </div>
        </div>
      </section>

      {/* Map */}
      <section className="h-[650px] w-full relative">
         <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2817.7144741438615!2d20.058923776708873!3d45.07130285956705!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x475af9b3c8e9392d%3A0xeef7e5250975bc63!2zSU5kb8SRaWph!5e0!3m2!1ssr!2srs!4v1770745011422!5m2!1ssr!2srs" width="100%" height="100%" style={{ border: 0 }} allowFullScreen={true} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale brightness-75 contrast-125"></iframe>
         <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[var(--dark-green)] text-[var(--gold)] px-10 py-4 rounded-full font-black uppercase text-[11px] tracking-[4px] shadow-2xl">Naša Lokacija</div>
      </section>

      {/* Footer */}
      <footer id="contact-footer" className="bg-[var(--dark-green)] pt-40 pb-16 px-6 md:px-12 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-24 mb-32 text-center md:text-left">
            <div className="space-y-10 flex flex-col items-center md:items-start">
               <div className="w-24 h-24 border border-white/10 rounded-full overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 mb-6 bg-[var(--dark-green)] flex items-center justify-center">
                 <img src="./slike/galerija/logo.jpg" alt="Indođija Logo" className="w-full h-full object-cover" />
               </div>
               <p className="text-white/30 text-[11px] leading-loose uppercase tracking-[3px]">Inđijski premium event vrt. Vaše uspomene zaslužuju luksuz koji pruža Indođija.</p>
            </div>
            <div className="space-y-10">
               <h4 className="text-[var(--gold)] font-black uppercase tracking-[5px] text-xs">Kontakt</h4>
               <div className="space-y-6">
                  <p className="text-3xl font-display italic tracking-[2px]">+381 63 558 512</p>
                  <p className="text-white/50 text-[11px] uppercase tracking-widest font-bold">info@indodjija.rs</p>
               </div>
            </div>
            <div className="space-y-10">
               <h4 className="text-[var(--gold)] font-black uppercase tracking-[5px] text-xs">Adresa</h4>
               <p className="text-white/50 text-[11px] uppercase tracking-widest font-bold leading-loose">Vocarska 75<br/> 22320 Inđija, Srbija</p>
            </div>
            <div className="space-y-10">
               <h4 className="text-[var(--gold)] font-black uppercase tracking-[5px] text-xs">Pratite Nas</h4>
               <div className="flex justify-center md:justify-start gap-6">
                 <a href="https://www.instagram.com/indodjija023/" target="_blank" className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-[var(--gold)] hover:text-[var(--dark-green)] transition-all">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                 </a>
                 <a href="https://www.tiktok.com/@indodjija023" target="_blank" className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-[var(--gold)] hover:text-[var(--dark-green)] transition-all">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 448 512"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z"/></svg>
                 </a>
                 <a href="https://www.facebook.com" className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-[var(--gold)] hover:text-[var(--dark-green)] transition-all">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.324v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                 </a>
               </div>
            </div>
          </div>
          <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[10px] font-black uppercase tracking-[6px] text-white/20">
            <nav className="flex flex-wrap justify-center gap-12">
               <span className="hover:text-[var(--gold)] cursor-pointer" onClick={() => scrollTo('hero')}>Početna</span>
               <span className="hover:text-[var(--gold)] cursor-pointer" onClick={() => scrollTo('ponude')}>Ponude</span>
               <span className="hover:text-[var(--gold)] cursor-pointer" onClick={() => setIsPrivacyOpen(true)}>Politika Privatnosti</span>
               <span className="hover:text-[var(--gold)] cursor-pointer text-[var(--gold)]" onClick={() => setIsAdminOpen(true)}>Admin Panel</span>
            </nav>
            <p className="tracking-[4px]">© 2026 Indođija Luxury. Sva prava zadržana.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
