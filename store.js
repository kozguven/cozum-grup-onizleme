/* Çözüm Grup Yönetim, tıklanabilir demo. Tüm veriler yalnız bu tarayıcıda (localStorage) saklanır. */
const KEY = 'cozum-grup-demo-v2';
const SKEY = 'cozum-grup-oturum';
const PROTO = 'Bu bir ön prototiptir, hazır paket yazılım değildir. Program, firmanızın iş akışına göre size özel geliştirilir; ekranlar ve alanlar sizinle birlikte netleştirilir.';

function dayStr(o) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + (o || 0)); return d.toISOString().slice(0, 10); }
const TODAY = dayStr(0);
function addDays(s, n) { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5); }

/* --- modüller ve roller --- */
const MODS = [
  ['ozet', 'Genel bakış'], ['ihaleler', 'İhaleler'], ['sozlesmeler', 'Sözleşmeler'], ['uretim', 'Üretim'],
  ['kalite', 'Kalite kontrol'], ['sevkiyat', 'Sevkiyat ve nakliye'], ['fatura', 'Cari, fatura, tahsilat'],
  ['urunler', 'Ürünler ve reçeteler'], ['stok', 'Hammadde ve stok'], ['personel', 'Personel ve puantaj'],
  ['kurumlar', 'Kurumlar'], ['raporlar', 'Raporlar'], ['kullanicilar', 'Kullanıcılar ve yetkiler']
];
const MODAD = Object.fromEntries(MODS);
const rolYetki = r => ({ mods: ROLES[r].mods.slice(), fiyat: ROLES[r].fiyat, maliyet: ROLES[r].maliyet, ekip: ROLES[r].ekip });
const ROLES = {
  yonetici: { ad: 'Yönetici', mods: MODS.map(m => m[0]), fiyat: true, maliyet: true, ekip: '' },
  ihale: { ad: 'İhale sorumlusu', mods: ['ozet', 'ihaleler', 'sozlesmeler', 'kurumlar', 'urunler', 'raporlar'], fiyat: true, maliyet: false, ekip: '' },
  uretim: { ad: 'Üretim şefi', mods: ['ozet', 'sozlesmeler', 'uretim', 'urunler', 'stok', 'personel'], fiyat: false, maliyet: false, ekip: 'uretim' },
  kalite: { ad: 'Kalite kontrol', mods: ['ozet', 'kalite', 'urunler'], fiyat: false, maliyet: false, ekip: '' },
  sevkiyat: { ad: 'Sevkiyat', mods: ['ozet', 'sevkiyat', 'sozlesmeler', 'kurumlar', 'personel'], fiyat: false, maliyet: false, ekip: 'sevkiyat' },
  muhasebe: { ad: 'Muhasebe', mods: ['ozet', 'fatura', 'sozlesmeler', 'sevkiyat', 'kurumlar', 'stok', 'raporlar'], fiyat: true, maliyet: true, ekip: '' }
};
const ROLE_NOTE = {
  yonetici: 'Her şeyi görür, personele şifre ve yetki verir.',
  ihale: 'İhaleler, sözleşmeler ve kurumlar. Fiyatları görür.',
  uretim: 'Üretim emirleri, reçete, stok ve ekibinin puantajı. Fiyat görmez.',
  kalite: 'Parti ölçümleri, onay/ret, analiz raporu. Fiyat görmez.',
  sevkiyat: 'Sevkiyat, irsaliye, araçlar, teslim tutanağı. Fiyat görmez.',
  muhasebe: 'Fatura, tahsilat, cari hesaplar, vade takvimi, teminatlar.'
};

const SIRKETLER = [
  { id: 's1', ad: 'Çözüm Kimya Deterjan San. A.Ş.', kisa: 'Çözüm Kimya' },
  { id: 's2', ad: 'Çözüm Temizlik Ürünleri Ltd. Şti.', kisa: 'Çözüm Temizlik' },
  { id: 's3', ad: 'Çözüm Lojistik Nakliye Ltd. Şti.', kisa: 'Çözüm Lojistik' },
  { id: 's4', ad: 'Çözüm Ambalaj San. Ltd. Şti.', kisa: 'Çözüm Ambalaj' }
];

/* --- sabit tanımlar --- */
const KURUMLAR = [
  { id: 'k1', ad: 'Ankara Şehir Hastanesi Başhekimliği', il: 'Ankara', vkn: '0680•••••', yetkili: 'Satın Alma Birimi, Dr. Serkan Aydoğan', tel: '0312 552 •• ••', vade: 60 },
  { id: 'k2', ad: 'İstanbul İl Sağlık Müdürlüğü', il: 'İstanbul', vkn: '4810•••••', yetkili: 'Destek Hizmetleri Şube Md., Nuray Kaplan', tel: '0212 453 •• ••', vade: 60 },
  { id: 'k3', ad: 'Kocaeli Büyükşehir Belediyesi Destek Hizmetleri', il: 'Kocaeli', vkn: '5730•••••', yetkili: 'Satın Alma Şube Md., Kemal Er', tel: '0262 318 •• ••', vade: 30 },
  { id: 'k4', ad: 'Milli Eğitim Bakanlığı Destek Hizmetleri', il: 'Ankara', vkn: '6110•••••', yetkili: 'Tedarik Daire Bşk., Hülya Sezer', tel: '0312 413 •• ••', vade: 30 },
  { id: 'k5', ad: 'Jandarma Genel Komutanlığı Lojistik Başkanlığı', il: 'Ankara', vkn: '4720•••••', yetkili: 'İkmal Şube, Yzb. Onur Tekin', tel: '0312 456 •• ••', vade: 30 },
  { id: 'k6', ad: 'Konya Selçuklu Belediyesi', il: 'Konya', vkn: '7740•••••', yetkili: 'Destek Hizmetleri Md., Ahmet Uçar', tel: '0332 241 •• ••', vade: 30 }
];

const TEDARIKCILER = [
  { id: 't1', ad: 'Kimpa Kimya San. A.Ş.', il: 'Kocaeli', vade: 45 },
  { id: 't2', ad: 'Ege Kimya Dağıtım Ltd.', il: 'İzmir', vade: 30 },
  { id: 't3', ad: 'Anadolu Mineral A.Ş.', il: 'Eskişehir', vade: 30 },
  { id: 't4', ad: 'Kocaeli Klor Kimya', il: 'Kocaeli', vade: 30 },
  { id: 't5', ad: 'Esans Dünyası Ltd.', il: 'İstanbul', vade: 30 },
  { id: 't6', ad: 'Trakya Plastik Ambalaj', il: 'Tekirdağ', vade: 45 },
  { id: 't7', ad: 'Bursa Oluklu Mukavva', il: 'Bursa', vade: 30 },
  { id: 't8', ad: 'Marmara Yağ Asitleri', il: 'Balıkesir', vade: 30 }
];

const HAMMADDE = [
  ['h1', 'LABSA (lineer alkil benzen sülfonik asit)', 'hammadde', 'kg', 2850, 1500, 75, 't1'],
  ['h2', 'SLES %70', 'hammadde', 'kg', 1920, 1000, 85, 't1'],
  ['h3', 'Sodyum karbonat (soda külü)', 'hammadde', 'kg', 8400, 4000, 18, 't2'],
  ['h4', 'Sodyum sülfat', 'hammadde', 'kg', 9600, 4000, 9, 't2'],
  ['h5', 'Zeolit 4A', 'hammadde', 'kg', 3100, 2000, 28, 't3'],
  ['h6', 'Sodyum hidroksit (kostik)', 'hammadde', 'kg', 1450, 600, 30, 't1'],
  ['h7', 'Potasyum hidroksit', 'hammadde', 'kg', 520, 300, 45, 't1'],
  ['h8', 'Bitkisel yağ asidi', 'hammadde', 'kg', 1800, 1000, 62, 't8'],
  ['h9', 'Sodyum hipoklorit %15', 'hammadde', 'kg', 6200, 3000, 9, 't4'],
  ['h10', 'Parfüm (limon / lavanta)', 'hammadde', 'kg', 38, 50, 650, 't5'],
  ['h11', 'Boya (su bazlı)', 'hammadde', 'kg', 14, 5, 900, 't5'],
  ['h12', 'Koruyucu (izotiazolinon)', 'hammadde', 'kg', 62, 25, 400, 't1'],
  ['h13', 'Tuz (sodyum klorür)', 'hammadde', 'kg', 3500, 1000, 4, 't2'],
  ['h14', 'Bidon 5 L (HDPE, kapaklı)', 'ambalaj', 'adet', 9800, 4000, 14, 't6'],
  ['h15', 'Bidon 20 L (HDPE)', 'ambalaj', 'adet', 120, 200, 42, 't6'],
  ['h16', 'Şişe 4 L (çamaşır suyu)', 'ambalaj', 'adet', 7400, 3000, 11, 't6'],
  ['h17', 'Torba 10 kg (PE, baskılı)', 'ambalaj', 'adet', 2600, 1000, 9, 't7'],
  ['h18', 'Koli (4\'lü)', 'ambalaj', 'adet', 3900, 1500, 18, 't7'],
  ['h19', 'Etiket', 'ambalaj', 'adet', 21000, 8000, 1.5, 't7']
].map(([id, ad, tur, birim, stok, kritik, fiyat, ted]) => ({ id, ad, tur, birim, stok, kritik, fiyat, ted }));

const S_ = (k, ad, bir, min, max) => ({ k, ad, bir, min, max });
const SPEC = {
  toz: [S_('ph', 'pH (%1 çözelti)', '', 10, 11.5), S_('yog', 'Kütle yoğunluğu', 'g/cm³', 0.45, 0.7), S_('aktif', 'Aktif madde', '%', 8, 12), S_('nem', 'Nem', '%', 0, 5)],
  toz2: [S_('ph', 'pH (%1 çözelti)', '', 10.5, 12), S_('yog', 'Kütle yoğunluğu', 'g/cm³', 0.8, 1.1), S_('nem', 'Nem', '%', 0, 4)],
  bulasik: [S_('ph', 'pH', '', 6.5, 8), S_('yog', 'Yoğunluk', 'g/cm³', 1.02, 1.06), S_('aktif', 'Aktif madde', '%', 14, 18), S_('visk', 'Viskozite', 'cP', 800, 2000)],
  yuzey: [S_('ph', 'pH', '', 7, 9), S_('yog', 'Yoğunluk', 'g/cm³', 1, 1.03), S_('aktif', 'Aktif madde', '%', 5, 8), S_('visk', 'Viskozite', 'cP', 50, 300)],
  klor: [S_('ph', 'pH', '', 11.5, 13), S_('yog', 'Yoğunluk', 'g/cm³', 1.08, 1.12), S_('aktif', 'Aktif klor', '%', 4.5, 5.5)],
  sabun: [S_('ph', 'pH', '', 9, 10.5), S_('yog', 'Yoğunluk', 'g/cm³', 1.02, 1.06), S_('aktif', 'Aktif madde', '%', 18, 22), S_('visk', 'Viskozite', 'cP', 300, 1200)],
  el: [S_('ph', 'pH', '', 5.5, 7), S_('yog', 'Yoğunluk', 'g/cm³', 1.01, 1.04), S_('aktif', 'Aktif madde', '%', 10, 14), S_('visk', 'Viskozite', 'cP', 1500, 3500)],
  yag: [S_('ph', 'pH', '', 12, 13.5), S_('yog', 'Yoğunluk', 'g/cm³', 1.05, 1.1), S_('aktif', 'Aktif madde', '%', 6, 10)]
};

const URUNLER = [
  { id: 'u1', ad: 'Toz Çamaşır Deterjanı 10 kg', grup: 'Toz', spec: 'toz', fiyat: 470, iscilik: 15, recete: [['h1', 1], ['h3', 3], ['h4', 3.5], ['h5', 1.8], ['h10', 0.02], ['h17', 1], ['h19', 1]] },
  { id: 'u2', ad: 'Toz Bulaşık Makinesi Deterjanı 10 kg', grup: 'Toz', spec: 'toz2', fiyat: 430, iscilik: 14, recete: [['h3', 5], ['h4', 3.5], ['h5', 1], ['h6', 0.3], ['h17', 1], ['h19', 1]] },
  { id: 'u3', ad: 'Sıvı Bulaşık Deterjanı 5 L', grup: 'Sıvı', spec: 'bulasik', fiyat: 165, iscilik: 6, recete: [['h1', 0.45], ['h2', 0.25], ['h6', 0.06], ['h13', 0.12], ['h10', 0.01], ['h11', 0.0005], ['h12', 0.005], ['h14', 1], ['h19', 1], ['h18', 0.25]] },
  { id: 'u4', ad: 'Yüzey Temizleyici 5 L', grup: 'Sıvı', spec: 'yuzey', fiyat: 140, iscilik: 6, recete: [['h2', 0.2], ['h1', 0.1], ['h6', 0.02], ['h10', 0.015], ['h11', 0.0005], ['h12', 0.005], ['h14', 1], ['h19', 1], ['h18', 0.25]] },
  { id: 'u5', ad: 'Çamaşır Suyu 4 L', grup: 'Sıvı', spec: 'klor', fiyat: 85, iscilik: 4, recete: [['h9', 1.4], ['h6', 0.03], ['h16', 1], ['h19', 1], ['h18', 0.25]] },
  { id: 'u6', ad: 'Sıvı Arap Sabunu 5 L', grup: 'Sıvı', spec: 'sabun', fiyat: 175, iscilik: 7, recete: [['h8', 0.9], ['h7', 0.22], ['h12', 0.005], ['h14', 1], ['h19', 1], ['h18', 0.25]] },
  { id: 'u7', ad: 'Sıvı El Sabunu 5 L', grup: 'Sıvı', spec: 'el', fiyat: 150, iscilik: 6, recete: [['h2', 0.5], ['h13', 0.15], ['h10', 0.02], ['h11', 0.0005], ['h12', 0.01], ['h14', 1], ['h19', 1], ['h18', 0.25]] },
  { id: 'u8', ad: 'Endüstriyel Yağ Çözücü 20 L', grup: 'Sıvı', spec: 'yag', fiyat: 780, iscilik: 18, recete: [['h6', 1.2], ['h2', 0.6], ['h1', 0.4], ['h15', 1], ['h19', 1]] }
];

const EVRAK = ['İhale dokümanı EKAP\'tan indirildi', 'Teklif mektubu', 'Birim fiyat teklif cetveli', 'Geçici teminat mektubu', 'İmza sirküleri', 'Ticaret sicil gazetesi', 'Kapasite raporu', 'TSE / ISO belgeleri', 'Numune ve analiz raporları', 'Vergi ve SGK borcu yoktur yazısı'];

const IHALE_DURUM = { hazirlaniyor: 'Hazırlanıyor', teklif: 'Teklif verildi', kazanildi: 'Kazanıldı', kaybedildi: 'Kaybedildi' };
const EMIR_DURUM = { planlandi: 'Planlandı', uretimde: 'Üretimde', tamamlandi: 'Tamamlandı' };
const PARTI_DURUM = { kalite: 'Kalite bekliyor', onay: 'Onaylı', red: 'Reddedildi' };
const SEVK_DURUM = { hazirlaniyor: 'Hazırlanıyor', yolda: 'Yolda', teslim: 'Teslim edildi' };
const PUANTAJ = { geldi: 'Geldi', gelmedi: 'Gelmedi', izinli: 'İzinli', rapor: 'Raporlu' };

/* --- tohum --- */
function rnd(seed) { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
function seed() {
  const r = rnd(42);
  const s = {
    sirketler: SIRKETLER, kurumlar: KURUMLAR.slice(), tedarikciler: TEDARIKCILER.slice(),
    hammaddeler: JSON.parse(JSON.stringify(HAMMADDE)), urunler: JSON.parse(JSON.stringify(URUNLER)),
    hareketler: [], alimlar: [], ihaleler: [], sozlesmeler: [], emirler: [], partiler: [], sevkiyatlar: [], faturalar: [],
    araclar: [], personel: [], puantaj: {}, isler: [], kullanicilar: [],
    seq: { ihale: 20, soz: 14, sevk: 40, irs: 40, fat: 120, kul: 10, per: 40, is: 60, hrk: 100, alim: 30, arac: 10, ted: 10, kur: 10, urun: 10, hm: 30, ay: {} }
  };
  const bm = uid => birimMaliyet(uid, s);

  /* kullanıcılar */
  const U = (id, ad, kadi, rol, sir) => Object.assign(rolYetki(rol), { id, ad, kadi, sifre: '1234', rol, aktif: true, sirketler: sir, son: dayStr(-Math.floor(r() * 3)) });
  s.kullanicilar = [
    U('kl1', 'Taner Bey', 'taner', 'yonetici', ['s1', 's2', 's3', 's4']),
    U('kl2', 'Elif Aksoy', 'elif', 'ihale', ['s1', 's2']),
    U('kl3', 'Murat Kaya', 'murat', 'uretim', ['s1']),
    U('kl4', 'Zeynep Demir', 'zeynep', 'kalite', ['s1']),
    U('kl5', 'Hasan Çelik', 'hasan', 'sevkiyat', ['s1', 's3']),
    U('kl6', 'Ayşe Yıldız', 'ayse', 'muhasebe', ['s1', 's2', 's3', 's4'])
  ];
  s.kullanicilar[0].son = TODAY;

  /* personel */
  const P = (id, ad, gorev, tip, ekip, sir) => ({ id, ad, gorev, tip, ekip, sir, aktif: true });
  s.personel = [
    P('pr1', 'Murat Kaya', 'Üretim şefi', 'Fabrika', 'uretim', 's1'),
    P('pr2', 'Ali Rıza Polat', 'Reaktör operatörü', 'Fabrika', 'uretim', 's1'),
    P('pr3', 'Emre Şahin', 'Dolum hattı operatörü', 'Fabrika', 'uretim', 's1'),
    P('pr4', 'Burak Güneş', 'Toz hattı operatörü', 'Fabrika', 'uretim', 's1'),
    P('pr5', 'Sedat Aslan', 'Dolum hattı operatörü', 'Fabrika', 'uretim', 's1'),
    P('pr6', 'Yusuf Erdem', 'Forklift operatörü', 'Fabrika', 'sevkiyat', 's1'),
    P('pr7', 'Zeynep Demir', 'Kalite kontrol kimyageri', 'Fabrika', 'kalite', 's1'),
    P('pr8', 'Hasan Çelik', 'Sevkiyat sorumlusu', 'Ofis', 'sevkiyat', 's1'),
    P('pr9', 'Elif Aksoy', 'İhale sorumlusu', 'Ofis', 'ofis', 's1'),
    P('pr10', 'Ayşe Yıldız', 'Muhasebe', 'Ofis', 'ofis', 's1'),
    P('pr11', 'Kadir Öztürk', 'Tır şoförü', 'Şoför', 'sevkiyat', 's3'),
    P('pr12', 'Mehmet Koç', 'Kamyon şoförü', 'Şoför', 'sevkiyat', 's3'),
    P('pr13', 'İsmail Acar', 'Kamyonet şoförü', 'Şoför', 'sevkiyat', 's3'),
    P('pr14', 'Gökhan Tunç', 'Şişirme makinesi operatörü', 'Fabrika', 'uretim', 's4'),
    P('pr15', 'Serap Kılıç', 'Satış destek', 'Ofis', 'ofis', 's2')
  ];
  for (let g = -6; g <= 0; g++) {
    const t = dayStr(g); const wd = new Date(t + 'T12:00:00').getDay(); if (wd === 0) continue;
    s.puantaj[t] = {};
    s.personel.forEach((p, i) => {
      let d = 'geldi'; if (p.id === 'pr5' && g >= -2) d = 'rapor'; else if (p.id === 'pr13' && g === -1) d = 'izinli'; else if (r() < 0.03) d = 'gelmedi';
      if (g === 0 && i % 3 === 2) return; // bugün henüz girilmemiş satırlar
      s.puantaj[t][p.id] = { d, mesai: d === 'geldi' && p.tip === 'Fabrika' && r() < 0.35 ? 2 : 0 };
    });
  }
  const IS = (pid, is, g, ok) => ({ id: 'is' + (++s.seq.is), pid, is, tarih: dayStr(g), yapildi: ok });
  s.isler = [
    IS('pr2', 'Reaktör 2 temizliği ve kostik hattı kontrolü', 0, true), IS('pr3', 'UE emri: El sabunu dolumu, 1. vardiya', 0, false),
    IS('pr4', 'Toz hattı elek değişimi', 0, false), IS('pr6', 'Jandarma sevkiyatı için 12 palet streçleme', 0, false),
    IS('pr7', 'Çamaşır suyu partisi aktif klor ölçümü', 0, false), IS('pr11', 'Ankara Şehir Hastanesi teslimatı', 0, true),
    IS('pr12', 'Kocaeli depoya hammadde alımı (Kimpa)', 1, false), IS('pr2', 'Bulaşık deterjanı karışımı 1.200 adet', -1, true),
    IS('pr3', 'Yüzey temizleyici dolumu', -1, true), IS('pr14', '5 L bidon şişirme, 3.000 adet', 0, false)
  ];

  s.araclar = [
    { id: 'ar1', plaka: '41 ÇZM 410', tip: 'Tır (13,6 m)', kapasite: '24 palet', sofor: 'pr11', kmMaliyet: 32 },
    { id: 'ar2', plaka: '41 ÇZM 425', tip: 'Kamyon (10 teker)', kapasite: '14 palet', sofor: 'pr12', kmMaliyet: 24 },
    { id: 'ar3', plaka: '41 ÇZM 433', tip: 'Kamyonet', kapasite: '4 palet', sofor: 'pr13', kmMaliyet: 14 }
  ];
  const KM = { k1: 340, k2: 115, k3: 15, k4: 340, k5: 345, k6: 560 };

  /* ihaleler */
  const IH = (id, sir, k, ikn, konu, g, durum, kal, yakOran, rakip, evrakN, gecBitisG, gecIade) => {
    const teklif = kal.reduce((t, x) => t + x[1] * x[2], 0);
    return { id, sir, k, ikn, konu, tarih: dayStr(g), durum, kalemler: kal.map(([uid, mik, fiyat]) => ({ uid, mik, fiyat })),
      yaklasik: Math.round(teklif * yakOran / 1000) * 1000, rakip, evrak: EVRAK.map((ad, i) => ({ ad, ok: i < evrakN })),
      gecici: { tutar: Math.round(teklif * 0.03 / 100) * 100, banka: ['Halkbank Ankara Kurumsal', 'Vakıfbank Gebze Ticari', 'Ziraat Bankası Kocaeli OSB'][id.length % 3], bitis: dayStr(gecBitisG), iade: gecIade }, sozId: null };
  };
  s.ihaleler = [
    IH('i1', 's1', 'k1', '2026/1384521', 'Hastane temizlik malzemesi alımı (3 kalem)', -58, 'kazanildi', [['u3', 3000, 162], ['u4', 2400, 138], ['u5', 4000, 84]], 1.11, 'İkinci: Özdemir Temizlik, %3,4 yüksek.', 10, 32, true),
    IH('i2', 's1', 'k2', '2026/1402276', 'İl geneli sağlık tesisleri deterjan alımı', -40, 'kazanildi', [['u1', 1200, 462], ['u7', 2000, 147]], 1.09, 'İkinci: Marmara Hijyen, %1,8 yüksek.', 10, 50, true),
    IH('i3', 's1', 'k3', '2026/1297740', 'Belediye hizmet binaları temizlik malzemesi', -75, 'kazanildi', [['u5', 6000, 83], ['u8', 300, 770]], 1.12, 'İkinci: Kocaeli Kimya, %5,2 yüksek.', 10, -15, true),
    IH('i4', 's1', 'k4', '2026/1455093', 'Okullar için temizlik ve hijyen malzemesi', -30, 'kazanildi', [['u3', 2500, 160], ['u7', 2500, 145], ['u6', 800, 172]], 1.1, 'İkinci: Başkent Deterjan, %2,2 yüksek.', 10, 60, true),
    IH('i5', 's2', 'k6', '2026/1189034', 'Belediye tesisleri yüzey temizleyici ve toz deterjan', -95, 'kazanildi', [['u4', 1500, 139], ['u2', 400, 425]], 1.08, 'İkinci: Konya Temizlik, %4,0 yüksek.', 10, -40, true),
    IH('i6', 's1', 'k5', '2026/1501347', 'Birlikler için temizlik malzemesi alımı', -2, 'teklif', [['u1', 800, 468], ['u5', 2500, 84], ['u8', 120, 775]], 1.1, 'Oturumda en düşük teklif bizde; değerlendirme sürüyor.', 10, 88, false),
    IH('i7', 's2', 'k6', '2026/1523901', 'Spor tesisleri hijyen malzemesi', 5, 'hazirlaniyor', [['u7', 1200, 149], ['u4', 900, 140]], 1.1, '', 6, 95, false),
    IH('i8', 's1', 'k1', '2026/1530188', '2027 yılı ilk yarı deterjan ihtiyacı', 9, 'hazirlaniyor', [['u3', 4000, 164], ['u5', 5000, 85], ['u7', 2500, 150]], 1.1, '', 3, 100, false),
    IH('i9', 's1', 'k2', '2026/1266710', 'Toz deterjan alımı', -50, 'kaybedildi', [['u1', 1500, 474], ['u2', 600, 438]], 1.07, 'Kazanan: Marmara Hijyen, %2,7 düşük. Fiyat farkı toz grubunda.', 10, -20, true),
    IH('i10', 's2', 'k4', '2026/1215582', 'Pansiyonlar için çamaşır suyu ve el sabunu', -68, 'kaybedildi', [['u5', 3000, 86], ['u7', 1500, 152]], 1.06, 'Kazanan: Başkent Deterjan, %1,1 düşük.', 10, -38, true)
  ];

  /* sözleşmeler */
  const SZ = (id, ihId, no, g, plan, kesinIade) => {
    const ih = s.ihaleler.find(i => i.id === ihId); ih.sozId = id;
    const tutar = ih.kalemler.reduce((t, x) => t + x.mik * x.fiyat, 0);
    return { id, no, sir: ih.sir, ihId, k: ih.k, tarih: dayStr(g), kalemler: JSON.parse(JSON.stringify(ih.kalemler)),
      plan: plan.map(([pg, not]) => ({ tarih: dayStr(pg), not })),
      kesin: { tutar: Math.round(tutar * 0.06 / 100) * 100, banka: ih.gecici.banka, no: 'KTM-2026-' + (300 + no.length * 7 + g * -1), iade: kesinIade, iadeTarih: kesinIade ? dayStr(-20) : null } };
  };
  s.sozlesmeler = [
    SZ('sz1', 'i1', 'SZ-2026-009', -45, [[-35, '1. teslim, %25'], [-10, '2. teslim, %25'], [20, '3. teslim, %25'], [50, '4. teslim, %25']], false),
    SZ('sz2', 'i2', 'SZ-2026-011', -28, [[6, '1. teslim, %50'], [40, '2. teslim, %50']], false),
    SZ('sz3', 'i3', 'SZ-2026-006', -62, [[-40, '1. teslim, %50'], [-12, '2. teslim, %40'], [8, '3. teslim, %10']], false),
    SZ('sz4', 'i4', 'SZ-2026-012', -20, [[-6, '1. teslim, ~%35'], [14, '2. teslim, ~%35'], [35, '3. teslim, kalan']], false),
    SZ('sz5', 'i5', 'SZ-2026-003', -85, [[-70, 'Tek teslim, %100']], true)
  ];

  /* üretim emirleri ve partiler */
  const mkEmir = (uid, mik, szId, g, durum, sir) => {
    const e = { id: 'e' + (s.emirler.length + 1), no: '', sir: sir || 's1', uid, mik, szId, tarih: dayStr(g - 2), termin: dayStr(g), durum, partiId: null };
    s.emirler.push(e); return e;
  };
  const mkParti = (uid, mik, szId, g, durum, sir, ol) => {
    const e = mkEmir(uid, mik, szId, g, 'tamamlandi', sir);
    const fire = Math.round(mik * 0.008);
    const p = { id: 'p' + (s.partiler.length + 1), no: '', sir: sir || 's1', emirId: e.id, uid, mik, fire, tarih: dayStr(g), skt: dayStr(g + 730),
      maliyet: Math.round((mik + fire) * bm(uid)), durum, olcum: null, kkTarih: null, kkKisi: null, kkNot: '' };
    if (durum !== 'kalite') {
      p.olcum = { gorunum: 'Uygun' };
      SPEC[prodOf(uid, s).spec].forEach(x => { p.olcum[x.k] = +(x.min + (x.max - x.min) * (0.3 + r() * 0.4)).toFixed(x.max > 50 ? 0 : 2); });
      p.kkTarih = dayStr(g); p.kkKisi = 'Zeynep Demir';
    }
    e.partiId = p.id; s.partiler.push(p); return p;
  };

  /* sevkiyat */
  const SV = (szId, g, durum, lines, aracId, tutanakG, nakliyeci) => {
    const sz = s.sozlesmeler.find(x => x.id === szId);
    const sv = { id: 'sv' + (s.sevkiyatlar.length + 1), no: 'SV-2026-0' + (++s.seq.sevk), irsNo: 'CZI2026000000' + (++s.seq.irs), sir: sz.sir, szId, k: sz.k, tarih: dayStr(g), durum,
      kalemler: lines, nakliye: nakliyeci ? { tip: 'nakliyeci', firma: nakliyeci, plaka: '06 TR 7731', sofor: 'Nakliyeci şoförü', km: KM[sz.k], bedel: Math.round(KM[sz.k] * 38 / 100) * 100 }
        : { tip: 'kendi', aracId, plaka: s.araclar.find(a => a.id === aracId).plaka, sofor: s.personel.find(p => p.id === s.araclar.find(a => a.id === aracId).sofor).ad, km: KM[sz.k] * 2, bedel: KM[sz.k] * 2 * s.araclar.find(a => a.id === aracId).kmMaliyet },
      tutanak: tutanakG != null ? { no: 'MKT-' + (2026) + '/' + (140 + s.sevkiyatlar.length * 3), tarih: dayStr(tutanakG) } : null, faturaId: null };
    s.sevkiyatlar.push(sv); return sv;
  };
  const histSevk = (szId, g, items, aracId, nakliyeci, durum) => {
    const lines = items.map(([uid, mik]) => ({ partiId: mkParti(uid, mik, szId, g - 4, 'onay', s.sozlesmeler.find(x => x.id === szId).sir).id, uid, mik }));
    return SV(szId, g, durum || 'teslim', lines, aracId, durum === 'teslim' || !durum ? g + 1 : null, nakliyeci);
  };
  const sv5 = histSevk('sz5', -70, [['u4', 1500], ['u2', 400]], null, 'Anadolu Ekspres Nakliyat');
  const sv1 = histSevk('sz3', -40, [['u5', 3000], ['u8', 150]], 'ar2');
  const sv2 = histSevk('sz1', -34, [['u3', 750], ['u4', 600], ['u5', 1000]], 'ar1');
  const sv3 = histSevk('sz3', -12, [['u5', 2400], ['u8', 120]], 'ar2');
  const sv4 = histSevk('sz1', -9, [['u3', 750], ['u4', 600], ['u5', 1000]], 'ar1');
  const sv6 = histSevk('sz4', -6, [['u3', 800], ['u7', 900], ['u6', 300]], 'ar1');

  const pA = mkParti('u3', 1200, 'sz1', -3, 'onay');
  const pB = mkParti('u1', 500, 'sz2', -4, 'onay');
  mkParti('u4', 800, 'sz1', -5, 'onay');
  mkParti('u7', 1000, 'sz4', -1, 'kalite');
  mkParti('u5', 2000, 'sz3', 0, 'kalite');
  const pE = mkParti('u6', 400, 'sz4', -2, 'red');
  pE.olcum.ph = 11.2; pE.kkNot = 'pH üst sınırın üzerinde (KOH fazlası). Partiye yağ asidi ilavesiyle yeniden işleme alınacak.';
  SV('sz1', 0, 'yolda', [{ partiId: pA.id, uid: 'u3', mik: 600 }], 'ar1', null);
  SV('sz2', 3, 'hazirlaniyor', [{ partiId: pB.id, uid: 'u1', mik: 300 }], null, null, 'Anadolu Ekspres Nakliyat');

  mkEmir('u7', 1500, 'sz2', 3, 'uretimde');
  mkEmir('u5', 600, 'sz3', 4, 'planlandi');
  mkEmir('u8', 200, null, 6, 'planlandi');
  mkEmir('u3', 1000, 'sz1', 7, 'planlandi');

  /* numaralar: tarih sırasına göre */
  const numara = (list, pre) => list.slice().sort((a, b) => a.tarih.localeCompare(b.tarih)).forEach(x => { x.no = nextNo(s, pre, x.tarih); });
  numara(s.partiler, 'P'); numara(s.emirler, 'UE');

  /* faturalar */
  const FT = (sv, g, tahs) => { const f = mkFatura(s, sv, dayStr(g)); f.tahsilat = tahs.map(([tg, tutar, ack]) => ({ tarih: dayStr(tg), tutar: tutar === 'tam' ? f.toplam : tutar, ack })); return f; };
  FT(sv5, -69, [[-35, 'tam', 'Belediye ödeme emri']]);
  FT(sv1, -39, [[-6, 300000, 'Kısmi ödeme, kalan bütçe ödeneği bekleniyor']]);
  FT(sv2, -33, [[-4, 'tam', 'Döner sermaye ödemesi']]);
  FT(sv3, -11, []);
  FT(sv4, -8, []);
  /* sv6 teslim edildi, faturası henüz kesilmedi */

  /* tedarikçi alımları ve hareketler */
  const AL = (hid, mik, fiyat, g, odendi) => {
    const h = s.hammaddeler.find(x => x.id === hid), t = s.tedarikciler.find(x => x.id === h.ted);
    const tutar = Math.round(mik * fiyat * 1.2);
    s.alimlar.push({ id: 'al' + (++s.seq.alim), sir: 's1', tedId: t.id, hid, mik, fiyat, tarih: dayStr(g), vade: dayStr(g + t.vade), tutar, belge: 'Fatura ' + (7700 + s.seq.alim), odeme: odendi ? [{ tarih: dayStr(g + t.vade - 2), tutar }] : [] });
    s.hareketler.push({ id: 'hr' + (++s.seq.hrk), tarih: dayStr(g), hid, mik, tip: 'Satın alma', ack: t.ad });
  };
  AL('h1', 2000, 74, -52, true); AL('h3', 6000, 18, -40, true); AL('h9', 8000, 9, -33, false); AL('h14', 8000, 14, -25, false);
  AL('h2', 1500, 85, -18, false); AL('h5', 2500, 28, -12, false); AL('h18', 3000, 18, -8, false); AL('h10', 40, 640, -60, true);
  s.partiler.filter(p => diffDays(p.tarih, TODAY) >= -6).forEach(p => {
    prodOf(p.uid, s).recete.forEach(([hid, m]) => s.hareketler.push({ id: 'hr' + (++s.seq.hrk), tarih: p.tarih, hid, mik: -+(m * (p.mik + p.fire)).toFixed(3), tip: 'Üretim', ack: p.no }));
  });
  return s;
}

function nextNo(s, pre, tarih) {
  const ym = tarih.slice(2, 4) + tarih.slice(5, 7), key = pre + ym;
  s.seq.ay[key] = (s.seq.ay[key] || 0) + 1;
  return pre + '-' + ym + '-' + String(s.seq.ay[key]).padStart(3, '0');
}
function mkFatura(s, sv, tarih) {
  const sz = s.sozlesmeler.find(x => x.id === sv.szId), k = s.kurumlar.find(x => x.id === sv.k);
  const matrah = sv.kalemler.reduce((t, l) => t + l.mik * sz.kalemler.find(x => x.uid === l.uid).fiyat, 0);
  const f = { id: 'f' + (++s.seq.fat), no: 'CZF2026000000' + s.seq.fat, sir: sv.sir, svId: sv.id, szId: sv.szId, k: sv.k, tarih, vade: addDays(tarih, k.vade), matrah, kdv: matrah * 0.2, toplam: matrah * 1.2, tahsilat: [] };
  sv.faturaId = f.id; s.faturalar.push(f); return f;
}
function prodOf(uid, s) { return (s || S).urunler.find(u => u.id === uid); }
function birimMaliyet(uid, s) {
  s = s || S; const u = prodOf(uid, s);
  return u.recete.reduce((t, [hid, m]) => t + m * s.hammaddeler.find(h => h.id === hid).fiyat, 0) + u.iscilik;
}

/* --- saklama --- */
let S;
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); return; } } catch (e) { /* özel pencere */ }
  S = seed(); save();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* saklanamazsa demo yine çalışır */ } }
function resetDemo() { try { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); } catch (e) {} S = seed(); save(); }
load();

/* --- oturum --- */
function oturum() { let o = null; try { o = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {} return o; }
function setOturum(o) { try { localStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) {} window.__oturum = o; }
function me() { const o = window.__oturum || oturum(); return o ? S.kullanicilar.find(u => u.id === o.uid && u.aktif) : null; }
function aktifSir() { const o = window.__oturum || oturum(); return (o && o.sir) || 's1'; }

/* --- yardımcılar --- */
const $ = (q, el) => (el || document).querySelector(q);
const $$ = (q, el) => [...(el || document).querySelectorAll(q)];
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (Math.round(n * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const money0 = n => Math.round(n).toLocaleString('tr-TR') + ' ₺';
const nf = (n, d) => Number(n).toLocaleString('tr-TR', { maximumFractionDigits: d == null ? 2 : d });
const trDate = d => { if (!d) return ''; const [y, m, g] = d.split('-'); return g + '.' + m + '.' + y; };
const gunTxt = d => { const n = diffDays(d, TODAY); return n === 0 ? 'bugün' : n === 1 ? 'yarın' : n === -1 ? 'dün' : n > 0 ? n + ' gün sonra' : (-n) + ' gün önce'; };
const num = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
const numIn = v => parseFloat(String(v).replace(',', '.'));

const kurum = id => S.kurumlar.find(x => x.id === id);
const urun = id => S.urunler.find(x => x.id === id);
const hm = id => S.hammaddeler.find(x => x.id === id);
const ted = id => S.tedarikciler.find(x => x.id === id);
const ihale = id => S.ihaleler.find(x => x.id === id);
const soz = id => S.sozlesmeler.find(x => x.id === id);
const emir = id => S.emirler.find(x => x.id === id);
const parti = id => S.partiler.find(x => x.id === id);
const sevk = id => S.sevkiyatlar.find(x => x.id === id);
const fatura = id => S.faturalar.find(x => x.id === id);
const sirket = id => S.sirketler.find(x => x.id === id);
const per = id => S.personel.find(x => x.id === id);
const arac = id => S.araclar.find(x => x.id === id);

/* hesaplar */
const ihaleTutar = i => i.kalemler.reduce((t, x) => t + x.mik * x.fiyat, 0);
const sozTutar = z => z.kalemler.reduce((t, x) => t + x.mik * x.fiyat, 0);
function teslimEdilen(z, uid) { return S.sevkiyatlar.filter(v => v.szId === z.id && v.durum === 'teslim').reduce((t, v) => t + v.kalemler.filter(l => l.uid === uid).reduce((a, l) => a + l.mik, 0), 0); }
function yoldaMik(z, uid) { return S.sevkiyatlar.filter(v => v.szId === z.id && v.durum !== 'teslim').reduce((t, v) => t + v.kalemler.filter(l => l.uid === uid).reduce((a, l) => a + l.mik, 0), 0); }
function sozOran(z) { const top = z.kalemler.reduce((t, x) => t + x.mik, 0); const tes = z.kalemler.reduce((t, x) => t + Math.min(x.mik, teslimEdilen(z, x.uid)), 0); return top ? tes / top : 0; }
const sozBitti = z => sozOran(z) >= 0.9999;
function partiKalan(p) { return p.mik - S.sevkiyatlar.reduce((t, v) => t + v.kalemler.filter(l => l.partiId === p.id).reduce((a, l) => a + l.mik, 0), 0); }
const tahsil = f => f.tahsilat.reduce((t, x) => t + x.tutar, 0);
const kalanF = f => Math.max(0, f.toplam - tahsil(f));
const gecikti = f => kalanF(f) > 0.5 && f.vade < TODAY;
const alimOdenen = a => a.odeme.reduce((t, x) => t + x.tutar, 0);
const alimKalan = a => Math.max(0, a.tutar - alimOdenen(a));
const svUrunMaliyet = v => v.kalemler.reduce((t, l) => { const p = parti(l.partiId); return t + (p ? p.maliyet / p.mik : birimMaliyet(l.uid)) * l.mik; }, 0);
const svCiro = v => { const z = soz(v.szId); return v.kalemler.reduce((t, l) => t + l.mik * z.kalemler.find(x => x.uid === l.uid).fiyat, 0); };

/* şirket süzgeci */
const inSir = x => aktifSir() === 'hepsi' || x.sir === aktifSir();
const yeniSir = () => aktifSir() === 'hepsi' ? 's1' : aktifSir();

function toast(msg) {
  const old = $('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3600);
}
function modal(title, body, onReady) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="box-h"><h2>${esc(title)}</h2><button type="button" class="x" data-close aria-label="Kapat">Kapat</button></div><div class="box-b">${body}</div></div>`;
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.remove(); });
  document.body.appendChild(m);
  const f = m.querySelector('.box-b input:not([type=checkbox]),.box-b select'); if (f) f.focus();
  if (onReady) onReady(m);
  return m;
}
function csvIndir(ad, rows) {
  const txt = '﻿' + rows.map(r => r.map(c => { const v = String(c == null ? '' : c); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = ad + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
