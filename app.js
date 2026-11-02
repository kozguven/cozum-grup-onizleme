/* Panel iskeleti, yetki, genel bakış, kullanıcılar, ihaleler, sözleşmeler, kurumlar */
const ME = me();
if (!ME) location.replace('index.html');
const F = !!(ME && ME.fiyat), M = !!(ME && ME.maliyet);
const can = m => !!ME && (m === 'kullanicilar' ? ME.rol === 'yonetici' : ME.mods.includes(m));
const view = $('#view');
window.__oturum = oturum();

const NAV = [
  ['', ['ozet']], ['Satış ve ihale', ['ihaleler', 'sozlesmeler', 'kurumlar']], ['Üretim', ['uretim', 'kalite', 'urunler', 'stok']],
  ['Sevkiyat ve finans', ['sevkiyat', 'fatura']], ['Yönetim', ['personel', 'raporlar', 'kullanicilar']]
];

function shell() {
  $('#protoTxt').textContent = PROTO;
  $('#wname').textContent = ME.ad; $('#wrole').textContent = ROLES[ME.rol].ad + (F ? '' : ', fiyatları görmez');
  const sirs = ME.sirketler.map(id => sirket(id));
  let opts = sirs.map(s => `<option value="${s.id}">${esc(s.ad)}</option>`).join('');
  if (ME.rol === 'yonetici') opts = `<option value="hepsi">Tüm şirketler (konsolide)</option>` + opts;
  $('#sir').innerHTML = opts; $('#sir').value = aktifSir();
  if ($('#sir').value !== aktifSir()) { setOturum({ uid: ME.id, sir: ME.sirketler[0] }); $('#sir').value = ME.sirketler[0]; }
  $('#sir').onchange = e => { setOturum({ uid: ME.id, sir: e.target.value }); toast(e.target.value === 'hepsi' ? 'Tüm şirketlerin kayıtları birlikte gösteriliyor.' : sirket(e.target.value).ad + ' seçildi.'); route(); };
  $('#reset2').onclick = () => { resetDemo(); location.href = 'index.html'; };
}
function navCounts() {
  return { kalite: S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).length, uretim: S.emirler.filter(e => e.durum !== 'tamamlandi' && inSir(e)).length,
    fatura: S.faturalar.filter(f => gecikti(f) && inSir(f)).length, ihaleler: S.ihaleler.filter(i => i.durum === 'hazirlaniyor' && inSir(i)).length };
}
function drawNav(top) {
  const c = navCounts();
  $('#nav').innerHTML = NAV.map(([g, ms]) => { const v = ms.filter(can); if (!v.length) return '';
    return (g ? `<div class="grp">${g}</div>` : '') + v.map(m => `<a href="#${m}" data-r="${m}" class="${m === top ? 'on' : ''}">${MODAD[m]}${c[m] ? `<span class="c">${c[m]}</span>` : ''}</a>`).join(''); }).join('');
  $('#msel').innerHTML = MODS.filter(m => can(m[0])).map(m => `<option value="${m[0]}">${m[1]}</option>`).join('');
  $('#msel').value = top;
}
$('#msel').onchange = e => { location.hash = e.target.value; };
window.addEventListener('hashchange', route);

const ROUTES = {};
function route() {
  if (!ME) return;
  const [r, id] = (location.hash.slice(1) || 'ozet').split('/');
  const top = MODAD[r] ? r : 'ozet';
  drawNav(top);
  window.scrollTo(0, 0);
  if (!can(top)) { view.innerHTML = `<div class="noperm"><h2>Bu bölüme yetkiniz yok</h2><p style="margin-top:6px">${esc(MODAD[top])} bölümü ${esc(ME.ad)} kullanıcısına açılmamış. Yetkiyi yönetici "Kullanıcılar ve yetkiler" ekranından verir.</p><p style="margin-top:12px"><a class="btn alt" href="#ozet">Genel bakışa dön</a></p></div>`; return; }
  (ROUTES[top] || ROUTES.ozet)(id);
}

/* ortak parçalar */
const tag = (txt, c) => `<span class="st ${c || ''}">${esc(txt)}</span>`;
const ihTag = i => tag(IHALE_DURUM[i.durum], { hazirlaniyor: 'w', teklif: 'b', kazanildi: 'g', kaybedildi: '' }[i.durum]);
const emTag = e => tag(EMIR_DURUM[e.durum], { planlandi: 'w', uretimde: 'b', tamamlandi: 'g' }[e.durum]);
const paTag = p => tag(PARTI_DURUM[p.durum], { kalite: 'a', onay: 'g', red: 'r' }[p.durum]);
const svTag = v => tag(SEVK_DURUM[v.durum], { hazirlaniyor: 'w', yolda: 'b', teslim: 'g' }[v.durum]);
const szTag = z => sozBitti(z) ? tag('Tamamlandı', 'g') : tag('Devam ediyor', 'b');
const prog = (o, cls) => `<div class="prog"><div class="bar ${o >= 1 ? 'ok' : ''} ${cls || ''}"><i style="width:${Math.min(100, o * 100).toFixed(0)}%"></i></div><span>%${Math.round(o * 100)}</span></div>`;
const sirCol = x => aktifSir() === 'hepsi' ? `<div class="small muted">${esc(sirket(x.sir).kisa)}</div>` : '';
const sirNote = () => aktifSir() === 'hepsi' ? '<div class="note">Tüm şirketlerin kayıtları birlikte gösteriliyor. Yeni kayıtlar Çözüm Kimya adına açılır; tek şirket seçerek çalışabilirsiniz.</div>' : '';
const tbl = (heads, rows, empty, foot) => `<div class="tw"><table class="t resp"><thead><tr>${heads.map(h => `<th class="${h[1] || ''}">${h[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${heads.length}" class="empty">${empty || 'Kayıt yok.'}</td></tr>`}</tbody>${foot || ''}</table></div>`;
function bindClicks(el) { $$('[data-go]', el || view).forEach(x => x.onclick = e => { if (e.target.closest('a,button,input,select') && e.target.closest('[data-go]') !== e.target.closest('a,button,input,select')) return; location.hash = x.dataset.go; }); }
const kurumAd = id => esc(kurum(id).ad);

/* ============ GENEL BAKIŞ ============ */
ROUTES.ozet = function () {
  const kp = [];
  const ih = S.ihaleler.filter(inSir), sz = S.sozlesmeler.filter(inSir);
  if (can('ihaleler')) kp.push(['ihaleler', ih.filter(i => i.durum === 'hazirlaniyor' || i.durum === 'teklif').length, 'Açık ihale']);
  if (can('sozlesmeler')) kp.push(['sozlesmeler', sz.filter(z => !sozBitti(z)).length, 'Aktif sözleşme']);
  if (can('uretim')) kp.push(['uretim', S.emirler.filter(e => e.durum !== 'tamamlandi' && inSir(e)).length, 'Açık üretim emri']);
  if (can('kalite')) kp.push(['kalite', S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).length, 'Kalite bekleyen parti']);
  if (can('sevkiyat')) kp.push(['sevkiyat', S.sevkiyatlar.filter(v => v.durum !== 'teslim' && v.tarih <= dayStr(7) && inSir(v)).length, 'Bu haftaki sevkiyat']);
  if (can('fatura') && F) kp.push(['fatura', money0(S.faturalar.filter(inSir).reduce((t, f) => t + kalanF(f), 0)), 'Kurumlardan alacak', S.faturalar.some(f => gecikti(f) && inSir(f))]);
  if (can('personel')) { const pz = S.puantaj[TODAY] || {}; const ps = S.personel.filter(p => inSir(p) && (!ME.ekip || p.ekip === ME.ekip)); kp.push(['personel', ps.filter(p => pz[p.id] && pz[p.id].d === 'geldi').length + ' / ' + ps.length, 'Bugün işbaşında']); }

  const uy = [];
  if (can('ihaleler')) ih.forEach(i => {
    if (i.durum === 'hazirlaniyor' && diffDays(i.tarih, TODAY) <= 14) { const eks = i.evrak.filter(e => !e.ok).length; uy.push([i.tarih, `İhale günü: <b>${esc(i.ikn)}</b>, ${kurumAd(i.k)}${eks ? `, <span class="bad">${eks} evrak eksik</span>` : ''}`, 'ihaleler/' + i.id, eks > 0]); }
    if (!i.gecici.iade && i.durum !== 'kazanildi' && diffDays(i.gecici.bitis, TODAY) <= 30) uy.push([i.gecici.bitis, `Geçici teminat bitişi: ${esc(i.ikn)}${F ? ', ' + money0(i.gecici.tutar) : ''}`, 'ihaleler/' + i.id, true]);
  });
  if (can('sozlesmeler')) sz.filter(z => !sozBitti(z)).forEach(z => z.plan.forEach(p => { const d = diffDays(p.tarih, TODAY); if (d >= -3 && d <= 14) uy.push([p.tarih, `Teslim günü: <b>${esc(z.no)}</b>, ${kurumAd(z.k)}, ${esc(p.not)}`, 'sozlesmeler/' + z.id, d < 0]); }));
  if (can('fatura') && F) S.faturalar.filter(f => gecikti(f) && inSir(f)).forEach(f => uy.push([f.vade, `Vadesi geçti: ${esc(f.no)}, ${kurumAd(f.k)}, kalan ${money0(kalanF(f))}`, 'fatura', true]));
  if (can('fatura')) sz.filter(z => sozBitti(z) && !z.kesin.iade).forEach(z => uy.push([TODAY, `Kesin teminat iadesi istenecek: ${esc(z.no)}`, 'sozlesmeler/' + z.id, false]));
  if (can('fatura') && F) S.alimlar.filter(a => alimKalan(a) > 0 && inSir(a) && diffDays(a.vade, TODAY) <= 10).forEach(a => uy.push([a.vade, `Tedarikçi ödemesi: ${esc(ted(a.tedId).ad)}, ${money0(alimKalan(a))}`, 'fatura/vade', a.vade < TODAY]));
  if (can('kalite')) S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).forEach(p => uy.push([p.tarih, `Kalite onayı bekliyor: ${esc(p.no)}, ${esc(urun(p.uid).ad)}`, 'kalite/' + p.id, false]));
  if (can('sevkiyat')) S.sevkiyatlar.filter(v => v.durum !== 'teslim' && inSir(v)).forEach(v => uy.push([v.tarih, `Sevkiyat ${SEVK_DURUM[v.durum].toLowerCase()}: ${esc(v.no)}, ${kurumAd(v.k)}`, 'sevkiyat/' + v.id, false]));
  uy.sort((a, b) => a[0].localeCompare(b[0]));

  const krit = S.hammaddeler.filter(h => h.stok < h.kritik);
  const saat = new Date().getHours();
  view.innerHTML = `
    <div class="hd"><div><h1>${saat < 12 ? 'Günaydın' : 'İyi çalışmalar'}, ${esc(ME.ad.split(' ')[0])}</h1><p>${trDate(TODAY)}, ${aktifSir() === 'hepsi' ? 'tüm şirketler' : esc(sirket(aktifSir()).ad)}</p></div>
      ${can('ihaleler') ? '<a class="btn" href="#ihaleler/yeni">Yeni ihale</a>' : ''}</div>
    <div class="kpis">${kp.map(k => `<a class="kpi ${k[3] ? 'alert' : ''}" href="#${k[0]}" data-kpi="${k[0]}"><div class="v">${k[1]}</div><div class="k">${k[2]}</div></a>`).join('')}</div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h2>Yaklaşan işler ve uyarılar</h2><span class="small muted">${uy.length} kayıt</span></div>
        ${uy.map(u => `<div class="uy ${u[3] ? 'al' : ''}"><a href="#${u[2]}" style="color:inherit;text-decoration:none">${u[1]}</a><span class="t">${trDate(u[0])}, ${gunTxt(u[0])}</span></div>`).join('') || '<p class="empty">Bekleyen uyarı yok.</p>'}
      </div>
      <div>
        ${can('stok') || can('uretim') ? `<div class="card"><div class="card-h"><h2>Kritik stok</h2>${can('stok') ? '<a class="small" href="#stok">Stoka git</a>' : ''}</div>
          ${krit.map(h => `<div class="uy al"><span><b>${esc(h.ad)}</b></span><span class="t">${nf(h.stok)} / kritik ${nf(h.kritik)} ${h.birim}</span></div>`).join('') || '<p class="empty">Kritik seviyede malzeme yok.</p>'}</div>` : ''}
        ${can('sozlesmeler') ? `<div class="card"><div class="card-h"><h2>Sözleşme teslim durumu</h2><a class="small" href="#sozlesmeler">Tümü</a></div>
          ${sz.filter(z => !sozBitti(z)).map(z => `<div style="padding:6px 0"><a href="#sozlesmeler/${z.id}" class="small" style="color:inherit">${esc(z.no)}, ${kurumAd(z.k)}</a>${prog(sozOran(z))}</div>`).join('') || '<p class="empty">Aktif sözleşme yok.</p>'}</div>` : ''}
      </div>
    </div>`;
};

/* ============ KULLANICILAR ============ */
ROUTES.kullanicilar = function () {
  view.innerHTML = `
    <div class="hd"><div><h1>Kullanıcılar ve yetkiler</h1><p>Her personele ayrı kullanıcı adı ve şifre verin; personel yalnız tiklediğiniz bölümleri ve şirketleri görür.</p></div>
      <button class="btn acc" id="yeniKul">Yeni personel ekle</button></div>
    <div class="note">Fiyat ve tutar yetkisi kapalı olan personel (üretim, kalite, sevkiyat) teklif fiyatlarını, fatura ve tahsilat tutarlarını, maliyetleri hiçbir ekranda görmez. Pasif yapılan kullanıcı giriş yapamaz.</div>
    <div class="card">${tbl([['Personel'], ['Kullanıcı adı'], ['Rol'], ['Şirketler'], ['Yetkili bölümler'], ['Fiyat'], ['Son giriş'], ['Durum'], ['', 'r']],
      S.kullanicilar.map(u => `<tr data-kul="${u.id}">
        <td data-l="Personel"><b>${esc(u.ad)}</b></td><td data-l="Kullanıcı adı">${esc(u.kadi)}</td><td data-l="Rol">${esc(ROLES[u.rol].ad)}</td>
        <td data-l="Şirketler" class="small">${u.sirketler.map(id => esc(sirket(id).kisa)).join(', ')}</td>
        <td data-l="Bölümler" class="small">${u.rol === 'yonetici' ? 'Tümü' : u.mods.filter(m => m !== 'ozet').map(m => MODAD[m]).join(', ')}</td>
        <td data-l="Fiyat">${u.fiyat ? 'Görür' : '<span class="muted">Görmez</span>'}</td>
        <td data-l="Son giriş" class="small">${trDate(u.son)}</td>
        <td data-l="Durum">${u.aktif ? tag('Aktif', 'g') : tag('Pasif', '')}</td>
        <td class="r"><div class="acts" style="justify-content:flex-end"><button class="linkbtn" data-ed="${u.id}">Düzenle</button><button class="linkbtn" data-pw="${u.id}">Şifre sıfırla</button>${u.id !== ME.id ? `<button class="linkbtn" data-ak="${u.id}">${u.aktif ? 'Pasif yap' : 'Aktif yap'}</button>` : ''}</div></td></tr>`))}</div>`;
  $('#yeniKul').onclick = () => kulForm();
  $$('[data-ed]').forEach(b => b.onclick = () => kulForm(b.dataset.ed));
  $$('[data-ak]').forEach(b => b.onclick = () => { const u = S.kullanicilar.find(x => x.id === b.dataset.ak); u.aktif = !u.aktif; save(); toast(u.ad + (u.aktif ? ' yeniden aktif.' : ' pasif yapıldı; artık giriş yapamaz.')); route(); });
  $$('[data-pw]').forEach(b => b.onclick = () => {
    const u = S.kullanicilar.find(x => x.id === b.dataset.pw);
    modal('Şifre sıfırla: ' + u.ad, `<label class="f"><span>Yeni şifre</span><input class="inp" id="npw" value="${Math.floor(100000 + Math.random() * 899999)}"></label>
      <p class="small muted" style="margin-bottom:12px">Gerçek sistemde şifre personele tek kullanımlık bağlantıyla iletilir, personel ilk girişte kendi şifresini belirler.</p>
      <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="pwok">Şifreyi kaydet</button></div>`, m => {
      $('#pwok', m).onclick = () => { const v = $('#npw', m).value.trim(); if (v.length < 4) return toast('Şifre en az 4 karakter olmalı.'); u.sifre = v; save(); m.remove(); toast(u.ad + ' için yeni şifre kaydedildi.'); };
    });
  });
};
function kulForm(id) {
  const u = id ? S.kullanicilar.find(x => x.id === id) : null;
  const d = u || Object.assign(rolYetki('uretim'), { ad: '', kadi: '', sifre: '', rol: 'uretim', sirketler: ['s1'] });
  const modsHtml = (mods, rol) => MODS.filter(m => m[0] !== 'ozet').map(([k, ad]) => `<label class="chk"><input type="checkbox" name="mod" value="${k}" ${rol === 'yonetici' || mods.includes(k) ? 'checked' : ''} ${k === 'kullanicilar' || rol === 'yonetici' ? 'disabled' : ''}><span>${ad}</span></label>`).join('');
  modal(u ? 'Kullanıcıyı düzenle' : 'Yeni personel ekle', `
    <div class="fg">
      <label class="f"><span>Ad soyad</span><input class="inp" id="kad" value="${esc(d.ad)}" placeholder="Örn. Kemal Aydın"></label>
      <label class="f"><span>Kullanıcı adı</span><input class="inp" id="kkadi" value="${esc(d.kadi)}" placeholder="Örn. kemal" autocomplete="off"></label>
      ${u ? '' : `<label class="f"><span>Şifre belirleyin</span><input class="inp" id="ksifre" autocomplete="new-password" placeholder="En az 4 karakter"></label>`}
      <label class="f"><span>Rol</span><select class="inp" id="krol">${Object.keys(ROLES).map(r => `<option value="${r}" ${d.rol === r ? 'selected' : ''}>${ROLES[r].ad}</option>`).join('')}</select></label>
    </div>
    <p class="small" style="font-weight:600;margin-bottom:4px">Hangi şirketlerde çalışır</p>
    <div class="chks" id="ksir">${S.sirketler.map(s => `<label class="chk"><input type="checkbox" value="${s.id}" ${d.sirketler.includes(s.id) ? 'checked' : ''}><span>${esc(s.kisa)}</span></label>`).join('')}</div>
    <p class="small" style="font-weight:600;margin-bottom:4px">Görebileceği bölümler <span class="muted" style="font-weight:400">(rol seçince öneri gelir, tek tek değiştirebilirsiniz)</span></p>
    <div class="chks" id="kmods">${modsHtml(d.mods, d.rol)}</div>
    <div class="chks" style="grid-template-columns:1fr">
      <label class="chk"><input type="checkbox" id="kfiyat" ${d.fiyat ? 'checked' : ''}><span><b>Fiyat ve tutarları görür</b><br><span class="small muted">Teklif fiyatları, sözleşme tutarları, fatura ve tahsilatlar</span></span></label>
      <label class="chk"><input type="checkbox" id="kmal" ${d.maliyet ? 'checked' : ''}><span><b>Üretim maliyetini ve kârlılığı görür</b></span></label>
    </div>
    <label class="f"><span>Puantajda hangi ekibi görür</span><select class="inp" id="kekip"><option value="">Tüm personel</option><option value="uretim">Üretim ekibi</option><option value="sevkiyat">Sevkiyat ve şoförler</option><option value="kalite">Kalite</option><option value="ofis">Ofis</option></select></label>
    <p class="small bad hide" id="kerr" style="margin-bottom:8px"></p>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="kok">${u ? 'Kaydet' : 'Personeli ekle'}</button></div>`, m => {
    $('#kekip', m).value = d.ekip || '';
    $('#krol', m).onchange = e => { const R = ROLES[e.target.value]; $('#kmods', m).innerHTML = modsHtml(R.mods, e.target.value); $('#kfiyat', m).checked = R.fiyat; $('#kmal', m).checked = R.maliyet; $('#kekip', m).value = R.ekip; };
    $('#kok', m).onclick = () => {
      const err = t => { $('#kerr', m).textContent = t; $('#kerr', m).classList.remove('hide'); };
      const ad = $('#kad', m).value.trim(), kadi = $('#kkadi', m).value.trim().toLowerCase(), rol = $('#krol', m).value;
      const sir = $$('#ksir input:checked', m).map(i => i.value);
      if (!ad || !kadi) return err('Ad soyad ve kullanıcı adı zorunlu.');
      if (S.kullanicilar.some(x => x.kadi === kadi && x !== u)) return err('Bu kullanıcı adı başka bir personelde var.');
      if (!u && ($('#ksifre', m).value || '').length < 4) return err('Şifre en az 4 karakter olmalı.');
      if (!sir.length) return err('En az bir şirket seçin.');
      const mods = rol === 'yonetici' ? ROLES.yonetici.mods.slice() : ['ozet', ...$$('#kmods input:checked', m).map(i => i.value)];
      const rec = u || { id: 'kl' + (++S.seq.kul), aktif: true, son: '' };
      Object.assign(rec, { ad, kadi, rol, sirketler: sir, mods, fiyat: $('#kfiyat', m).checked, maliyet: $('#kmal', m).checked, ekip: $('#kekip', m).value });
      if (!u) { rec.sifre = $('#ksifre', m).value; S.kullanicilar.push(rec); }
      save(); m.remove(); toast(u ? 'Yetkiler güncellendi.' : ad + ' eklendi. Giriş ekranında bu kullanıcıyla deneyebilirsiniz.'); route();
    };
  });
}

/* ============ İHALELER ============ */
let ihF = 'hepsi';
ROUTES.ihaleler = function (id) {
  if (id === 'yeni') return ihaleYeni();
  if (id && ihale(id)) return ihaleDetay(id);
  const all = S.ihaleler.filter(inSir), list = all.filter(i => ihF === 'hepsi' || i.durum === ihF).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `
    <div class="hd"><div><h1>İhaleler</h1><p>Hazırlıktan sonuca kadar tüm kamu ihaleleri, evrak ve teminat takibi.</p></div><a class="btn" href="#ihaleler/yeni">Yeni ihale</a></div>
    ${sirNote()}
    <div class="seg">${['hepsi', ...Object.keys(IHALE_DURUM)].map(k => `<button data-f="${k}" class="${ihF === k ? 'on' : ''}">${k === 'hepsi' ? 'Tümü' : IHALE_DURUM[k]} (${k === 'hepsi' ? all.length : all.filter(i => i.durum === k).length})</button>`).join('')}</div>
    <div class="card">${tbl([['İKN'], ['Kurum ve konu'], ['İhale tarihi'], ...(F ? [['Teklifimiz', 'r']] : []), ['Evrak'], ['Durum']],
      list.map(i => `<tr class="click" data-go="ihaleler/${i.id}"><td data-l="İKN"><b class="num">${esc(i.ikn)}</b></td>
        <td data-l="Kurum">${kurumAd(i.k)}<div class="small muted">${esc(i.konu)}</div>${sirCol(i)}</td>
        <td data-l="İhale tarihi" class="nowrap">${trDate(i.tarih)}<div class="small muted">${gunTxt(i.tarih)}</div></td>
        ${F ? `<td data-l="Teklifimiz" class="r num">${i.kalemler.length ? money0(ihaleTutar(i)) : '<span class="muted">Hazırlanıyor</span>'}</td>` : ''}
        <td data-l="Evrak" class="small">${i.evrak.filter(e => e.ok).length}/${i.evrak.length}</td><td data-l="Durum">${ihTag(i)}</td></tr>`))}</div>`;
  $$('[data-f]').forEach(b => b.onclick = () => { ihF = b.dataset.f; route(); });
  bindClicks();
};
function ihaleYeni() {
  view.innerHTML = `<a class="back" href="#ihaleler">İhalelere dön</a><div class="hd"><div><h1>Yeni ihale</h1><p>Temel bilgileri girin; kalemleri ve evrakları sonraki ekranda eklersiniz.</p></div></div>
    <div class="card" style="max-width:760px"><form id="ihf">
      <div class="fg">
        <label class="f"><span>Kurum</span><select class="inp" id="ik">${S.kurumlar.map(k => `<option value="${k.id}">${esc(k.ad)}</option>`).join('')}</select></label>
        <label class="f"><span>İKN (ihale kayıt numarası)</span><input class="inp" id="iikn" placeholder="2026/1234567" required></label>
        <label class="f" style="grid-column:1/-1"><span>İşin adı</span><input class="inp" id="ikonu" placeholder="Örn. Temizlik malzemesi alımı" required></label>
        <label class="f"><span>İhale tarihi</span><input class="inp" type="date" id="itar" value="${dayStr(10)}" required></label>
        <label class="f"><span>Yaklaşık maliyet (₺)</span><input class="inp" id="iyak" inputmode="decimal" placeholder="Örn. 850000"></label>
        <label class="f"><span>Geçici teminat tutarı (₺)</span><input class="inp" id="igt" inputmode="decimal" placeholder="Teklifin en az %3'ü"></label>
        <label class="f"><span>Teminat bankası</span><input class="inp" id="igb" value="Halkbank Ankara Kurumsal"></label>
        <label class="f"><span>Teminat mektubu bitişi</span><input class="inp" type="date" id="igbit" value="${dayStr(100)}"></label>
      </div>
      <div class="acts"><button class="btn" type="submit">İhaleyi kaydet</button><a class="btn alt" href="#ihaleler">Vazgeç</a></div></form></div>`;
  $('#ihf').onsubmit = e => {
    e.preventDefault();
    const ikn = $('#iikn').value.trim(); if (!/^\d{4}\/\d{5,8}$/.test(ikn)) return toast('İKN biçimi 2026/1234567 gibi olmalı.');
    const i = { id: 'i' + (++S.seq.ihale), sir: yeniSir(), k: $('#ik').value, ikn, konu: $('#ikonu').value.trim(), tarih: $('#itar').value, durum: 'hazirlaniyor', kalemler: [],
      yaklasik: num($('#iyak').value) || 0, rakip: '', evrak: EVRAK.map(ad => ({ ad, ok: false })), gecici: { tutar: num($('#igt').value) || 0, banka: $('#igb').value, bitis: $('#igbit').value, iade: false }, sozId: null };
    S.ihaleler.push(i); save(); toast('İhale kaydedildi. Şimdi kalemleri ekleyin.'); location.hash = 'ihaleler/' + i.id;
  };
}
function ihaleDetay(id) {
  const i = ihale(id), top = ihaleTutar(i), ed = i.durum === 'hazirlaniyor';
  const acts = {
    hazirlaniyor: `<button class="btn" id="aTeklif">Teklif verildi olarak işaretle</button>`,
    teklif: `<button class="btn" id="aKaz">Kazanıldı</button><button class="btn danger" id="aKay">Kaybedildi</button>`,
    kazanildi: i.sozId ? (can('sozlesmeler') ? `<a class="btn alt" href="#sozlesmeler/${i.sozId}">Sözleşmeyi aç</a>` : '') : `<button class="btn acc" id="aSoz">Sözleşme oluştur</button>`,
    kaybedildi: ''
  }[i.durum];
  const fark = i.yaklasik ? (top / i.yaklasik - 1) * 100 : 0;
  view.innerHTML = `<a class="back" href="#ihaleler">İhalelere dön</a>
    <div class="hd"><div><h1>${esc(i.konu)}</h1><p>${ihTag(i)} &nbsp; İKN ${esc(i.ikn)}</p></div><div class="acts">${acts}</div></div>
    <div class="meta">
      <div><small>Kurum</small><b>${kurumAd(i.k)}</b></div>
      <div><small>İhale tarihi</small><b>${trDate(i.tarih)}</b> <span class="small muted">${gunTxt(i.tarih)}</span></div>
      <div><small>Şirket</small><b>${esc(sirket(i.sir).kisa)}</b></div>
      ${F ? `<div><small>Yaklaşık maliyet</small><b class="num">${money0(i.yaklasik)}</b></div>
      <div><small>Teklifimiz (KDV hariç)</small><b class="num">${money0(top)}</b>${i.yaklasik && top ? `<div class="small muted">Yaklaşık maliyetin %${nf(Math.abs(fark), 1)} ${fark < 0 ? 'altında' : 'üstünde'}</div>` : ''}</div>` : ''}
    </div>
    <div class="card"><div class="card-h"><h2>Kalemler</h2>${ed ? '<span class="small muted">Teklif verilene kadar düzenlenebilir</span>' : ''}</div>
      ${tbl([['Ürün'], ['Miktar', 'r'], ...(F ? [['Birim teklif', 'r'], ['Tutar', 'r']] : []), ...(M ? [['Birim maliyet', 'r'], ['Marj', 'r']] : []), ...(ed ? [['', 'r']] : [])],
        i.kalemler.map((x, n) => { const bmv = birimMaliyet(x.uid); return `<tr><td data-l="Ürün">${esc(urun(x.uid).ad)}</td><td data-l="Miktar" class="r num">${nf(x.mik)} adet</td>
          ${F ? `<td data-l="Birim teklif" class="r num">${money(x.fiyat)}</td><td data-l="Tutar" class="r num">${money0(x.mik * x.fiyat)}</td>` : ''}
          ${M ? `<td data-l="Birim maliyet" class="r num">${money(bmv)}</td><td data-l="Marj" class="r">%${nf((1 - bmv / x.fiyat) * 100, 1)}</td>` : ''}
          ${ed ? `<td class="r"><button class="linkbtn" data-rm="${n}">Sil</button></td>` : ''}</tr>`; }), 'Henüz kalem eklenmedi.')}
      ${ed ? `<div class="acts" style="margin-top:12px">
        <select class="inp sm" id="ku" aria-label="Ürün">${S.urunler.map(u => `<option value="${u.id}">${esc(u.ad)}</option>`).join('')}</select>
        <input class="inp sm" id="km" placeholder="Miktar" inputmode="numeric" style="width:100px" aria-label="Miktar">
        <input class="inp sm" id="kf" placeholder="Birim fiyat ₺" inputmode="decimal" style="width:120px" aria-label="Birim fiyat">
        <button class="btn sm" id="kadd">Kalem ekle</button></div>` : ''}
    </div>
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><div class="card-h"><h2>Evrak listesi</h2><span class="small muted" id="evs">${i.evrak.filter(e => e.ok).length}/${i.evrak.length} hazır</span></div>
        ${i.evrak.map((e, n) => `<label class="chk"><input type="checkbox" data-ev="${n}" ${e.ok ? 'checked' : ''}><span>${esc(e.ad)}</span></label>`).join('')}</div>
      <div>
        <div class="card"><h2>Geçici teminat mektubu</h2>
          <div class="meta" style="border:0;padding:0;margin:0">
            ${F ? `<div><small>Tutar</small><b class="num">${money0(i.gecici.tutar)}</b></div>` : ''}
            <div><small>Banka</small><b>${esc(i.gecici.banka)}</b></div>
            <div><small>Bitiş</small><b class="${!i.gecici.iade && diffDays(i.gecici.bitis, TODAY) <= 30 ? 'bad' : ''}">${trDate(i.gecici.bitis)}</b></div>
            <div><small>Durum</small><b>${i.gecici.iade ? 'Bankaya iade edildi' : 'Kurumda'}</b></div>
          </div>
          ${!i.gecici.iade && (i.durum === 'kaybedildi' || i.sozId) ? '<button class="btn alt sm" id="gIade" style="margin-top:10px">İade alındı olarak işaretle</button>' : ''}
        </div>
        <div class="card"><h2>Rakip ve sonuç notu</h2><textarea class="inp" id="rakip" rows="3" placeholder="Rakip en düşük teklif, sıralama, itiraz notu">${esc(i.rakip)}</textarea>
          <button class="btn alt sm" id="rkSave" style="margin-top:8px">Notu kaydet</button></div>
      </div>
    </div>`;
  $$('[data-ev]').forEach(c => c.onchange = () => { i.evrak[c.dataset.ev].ok = c.checked; save(); $('#evs').textContent = i.evrak.filter(e => e.ok).length + '/' + i.evrak.length + ' hazır'; });
  $('#rkSave').onclick = () => { i.rakip = $('#rakip').value; save(); toast('Not kaydedildi.'); };
  const on = (q, f) => { const b = $(q); if (b) b.onclick = f; };
  on('#kadd', () => { const mik = num($('#km').value), fy = numIn($('#kf').value); if (!(mik > 0) || !(fy > 0)) return toast('Miktar ve birim fiyat girin.'); i.kalemler.push({ uid: $('#ku').value, mik, fiyat: fy }); save(); route(); });
  $$('[data-rm]').forEach(b => b.onclick = () => { i.kalemler.splice(+b.dataset.rm, 1); save(); route(); });
  on('#aTeklif', () => { if (!i.kalemler.length) return toast('Önce en az bir kalem ekleyin.'); i.durum = 'teklif'; save(); toast('Teklif verildi. Sonuç açıklanınca Kazanıldı veya Kaybedildi deyin.'); route(); });
  on('#aKaz', () => { i.durum = 'kazanildi'; save(); toast('İhale kazanıldı. Şimdi sözleşmeyi oluşturun.'); route(); });
  on('#aKay', () => { i.durum = 'kaybedildi'; save(); toast('İhale kaybedildi olarak kaydedildi; rakip notunu ekleyebilirsiniz.'); route(); });
  on('#gIade', () => { i.gecici.iade = true; save(); toast('Geçici teminat iadesi kaydedildi.'); route(); });
  on('#aSoz', () => sozModal(i));
}
function sozModal(i) {
  const top = ihaleTutar(i), no = 'SZ-2026-0' + (++S.seq.soz);
  modal('Sözleşme oluştur', `<p class="small muted" style="margin-bottom:12px">${esc(i.ikn)}, ${kurumAd(i.k)}. Kalemler ve fiyatlar ihaleden aktarılır.</p>
    <div class="fg">
      <label class="f"><span>Sözleşme no</span><input class="inp" id="szno" value="${no}"></label>
      <label class="f"><span>Sözleşme tarihi</span><input class="inp" type="date" id="sztar" value="${TODAY}"></label>
      <label class="f"><span>Kesin teminat tutarı (₺, %6)</span><input class="inp" id="ktt" value="${Math.round(top * 0.06)}"></label>
      <label class="f"><span>Kesin teminat mektup no</span><input class="inp" id="ktno" value="KTM-2026-0${400 + S.seq.soz}"></label>
      <label class="f"><span>Banka</span><input class="inp" id="ktb" value="${esc(i.gecici.banka)}"></label>
      <label class="f"><span>Parçalı teslim sayısı</span><select class="inp" id="tsay">${[1, 2, 3, 4, 6].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="f"><span>İlk teslim tarihi</span><input class="inp" type="date" id="tilk" value="${dayStr(15)}"></label>
      <label class="f"><span>Teslimler arası (gün)</span><input class="inp" id="tara" value="30" inputmode="numeric"></label>
    </div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="szok">Sözleşmeyi oluştur</button></div>`, m => {
    $('#szok', m).onclick = () => {
      const n = +$('#tsay', m).value, ara = parseInt($('#tara', m).value) || 30, ilk = $('#tilk', m).value;
      const z = { id: 'sz' + S.seq.soz + 'x' + Date.now() % 1000, no: $('#szno', m).value, sir: i.sir, ihId: i.id, k: i.k, tarih: $('#sztar', m).value, kalemler: JSON.parse(JSON.stringify(i.kalemler)),
        plan: Array.from({ length: n }, (_, j) => ({ tarih: addDays(ilk, j * ara), not: (j + 1) + '. teslim, %' + nf(100 / n, 0) })),
        kesin: { tutar: num($('#ktt', m).value) || 0, banka: $('#ktb', m).value, no: $('#ktno', m).value, iade: false, iadeTarih: null } };
      S.sozlesmeler.push(z); i.sozId = z.id; save(); m.remove(); toast('Sözleşme oluşturuldu. Buradan üretim emri verebilirsiniz.'); location.hash = 'sozlesmeler/' + z.id;
    };
  });
}

/* ============ SÖZLEŞMELER ============ */
let szF = 'aktif';
ROUTES.sozlesmeler = function (id) {
  if (id && soz(id)) return sozDetay(id);
  const all = S.sozlesmeler.filter(inSir);
  const list = all.filter(z => szF === 'hepsi' || (szF === 'aktif' ? !sozBitti(z) : sozBitti(z))).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<div class="hd"><div><h1>Sözleşmeler</h1><p>Kazanılan ihalelerin sözleşmeleri, parçalı teslim takvimi ve kesin teminatlar.</p></div></div>
    ${sirNote()}
    <div class="seg">${[['aktif', 'Devam eden'], ['bitti', 'Tamamlanan'], ['hepsi', 'Tümü']].map(([k, ad]) => `<button data-f="${k}" class="${szF === k ? 'on' : ''}">${ad}</button>`).join('')}</div>
    <div class="card">${tbl([['Sözleşme'], ['Kurum'], ...(F ? [['Tutar', 'r']] : []), ['Teslim edilen'], ['Sonraki teslim'], ['Kesin teminat']],
      list.map(z => { const nx = z.plan.find(p => p.tarih >= TODAY); return `<tr class="click" data-go="sozlesmeler/${z.id}"><td data-l="Sözleşme"><b>${esc(z.no)}</b><div class="small muted">İKN ${esc(ihale(z.ihId).ikn)}</div></td>
        <td data-l="Kurum">${kurumAd(z.k)}${sirCol(z)}</td>${F ? `<td data-l="Tutar" class="r num">${money0(sozTutar(z))}</td>` : ''}
        <td data-l="Teslim" style="min-width:150px">${prog(sozOran(z))}</td>
        <td data-l="Sonraki teslim" class="small">${sozBitti(z) ? 'Tamamlandı' : nx ? trDate(nx.tarih) + ', ' + gunTxt(nx.tarih) : '<span class="bad">Takvim geçti</span>'}</td>
        <td data-l="Kesin teminat" class="small">${z.kesin.iade ? tag('İade alındı', 'g') : sozBitti(z) ? tag('İade istenecek', 'a') : tag('Kurumda', '')}</td></tr>`; }))}</div>`;
  $$('[data-f]').forEach(b => b.onclick = () => { szF = b.dataset.f; route(); });
  bindClicks();
};
function sozDetay(id) {
  const z = soz(id), svs = S.sevkiyatlar.filter(v => v.szId === z.id), ems = S.emirler.filter(e => e.szId === z.id && e.durum !== 'tamamlandi');
  const tes = svs.filter(v => v.durum === 'teslim');
  const ciro = tes.reduce((t, v) => t + svCiro(v), 0), umal = tes.reduce((t, v) => t + svUrunMaliyet(v), 0), nak = svs.reduce((t, v) => t + v.nakliye.bedel, 0);
  view.innerHTML = `<a class="back" href="#sozlesmeler">Sözleşmelere dön</a>
    <div class="hd"><div><h1>${esc(z.no)}, ${kurumAd(z.k)}</h1><p>${szTag(z)} &nbsp; Sözleşme tarihi ${trDate(z.tarih)}</p></div>
      <div class="acts">${can('uretim') && !sozBitti(z) ? '<button class="btn" id="aEmir">Üretim emri oluştur</button>' : ''}${can('sevkiyat') && !sozBitti(z) ? `<a class="btn alt" href="#sevkiyat/yeni-${z.id}">Sevkiyat oluştur</a>` : ''}</div></div>
    <div class="meta">
      <div><small>İhale</small><b>${can('ihaleler') ? `<a href="#ihaleler/${z.ihId}">${esc(ihale(z.ihId).ikn)}</a>` : esc(ihale(z.ihId).ikn)}</b></div>
      <div><small>Şirket</small><b>${esc(sirket(z.sir).kisa)}</b></div>
      ${F ? `<div><small>Sözleşme tutarı (KDV hariç)</small><b class="num">${money0(sozTutar(z))}</b></div>` : ''}
      <div><small>Genel teslim</small>${prog(sozOran(z))}</div>
    </div>
    <div class="card"><h2>Kalemler ve teslim durumu</h2>
      ${tbl([['Ürün'], ['Sözleşme', 'r'], ['Teslim edilen', 'r'], ['Yolda / hazırlanıyor', 'r'], ['Kalan', 'r'], ['İlerleme'], ...(F ? [['Birim fiyat', 'r'], ['Tutar', 'r']] : [])],
        z.kalemler.map(x => { const t = teslimEdilen(z, x.uid), y = yoldaMik(z, x.uid); return `<tr><td data-l="Ürün">${esc(urun(x.uid).ad)}</td><td data-l="Sözleşme" class="r num">${nf(x.mik)}</td>
          <td data-l="Teslim edilen" class="r num">${nf(t)}</td><td data-l="Yolda" class="r num">${nf(y)}</td><td data-l="Kalan" class="r num"><b>${nf(Math.max(0, x.mik - t))}</b></td>
          <td data-l="İlerleme" style="min-width:130px">${prog(t / x.mik)}</td>${F ? `<td data-l="Birim fiyat" class="r num">${money(x.fiyat)}</td><td data-l="Tutar" class="r num">${money0(x.mik * x.fiyat)}</td>` : ''}</tr>`; }))}
    </div>
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><h2>Teslim takvimi</h2>
        ${z.plan.map(p => { const d = diffDays(p.tarih, TODAY); return `<div class="uy ${d < 0 && !sozBitti(z) ? '' : ''}"><span>${esc(p.not)}</span><span class="t">${trDate(p.tarih)}, ${d < 0 ? 'geçti' : gunTxt(p.tarih)}</span></div>`; }).join('')}
      </div>
      <div class="card"><h2>Kesin teminat mektubu</h2>
        <div class="meta" style="border:0;padding:0;margin:0">
          ${F ? `<div><small>Tutar</small><b class="num">${money0(z.kesin.tutar)}</b></div>` : ''}
          <div><small>Mektup no</small><b>${esc(z.kesin.no)}</b></div><div><small>Banka</small><b>${esc(z.kesin.banka)}</b></div>
          <div><small>Durum</small><b>${z.kesin.iade ? 'İade alındı, ' + trDate(z.kesin.iadeTarih) : sozBitti(z) ? 'İş bitti, iade istenecek' : 'Kurumda (iş sürüyor)'}</b></div>
        </div>
        ${!z.kesin.iade && sozBitti(z) && (can('fatura') || ME.rol === 'yonetici') ? '<button class="btn alt sm" id="kIade" style="margin-top:10px">İade alındı olarak işaretle</button>' : ''}
        ${!sozBitti(z) ? '<p class="small muted" style="margin-top:8px">Tüm teslimler ve kabul tutanakları tamamlanınca iade talebi hatırlatılır.</p>' : ''}
      </div>
    </div>
    ${M ? `<div class="card" style="margin-top:14px"><h2>Kârlılık (teslim edilenler üzerinden)</h2>
      <div class="meta" style="border:0;padding:0;margin:0">
        <div><small>Teslim edilen tutar</small><b class="num">${money0(ciro)}</b></div><div><small>Ürün maliyeti (parti maliyetleri)</small><b class="num">${money0(umal)}</b></div>
        <div><small>Nakliye maliyeti</small><b class="num">${money0(nak)}</b></div><div><small>Brüt kâr</small><b class="num ${ciro - umal - nak < 0 ? 'bad' : 'ok'}">${money0(ciro - umal - nak)}</b>${ciro ? `<div class="small muted">%${nf((ciro - umal - nak) / ciro * 100, 1)}</div>` : ''}</div>
      </div></div>` : ''}
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><h2>Açık üretim emirleri</h2>${ems.map(e => `<div class="uy"><a href="#uretim/${e.id}">${esc(e.no)}, ${esc(urun(e.uid).ad)}, ${nf(e.mik)} adet</a>${emTag(e)}</div>`).join('') || '<p class="empty">Açık emir yok.</p>'}</div>
      <div class="card"><h2>Sevkiyatlar</h2>${svs.map(v => `<div class="uy"><a href="#sevkiyat/${v.id}">${esc(v.no)}, ${trDate(v.tarih)}</a>${svTag(v)}</div>`).join('') || '<p class="empty">Henüz sevkiyat yok.</p>'}</div>
    </div>`;
  const b = $('#aEmir'); if (b) b.onclick = () => emirModal(z.id);
  const k = $('#kIade'); if (k) k.onclick = () => { z.kesin.iade = true; z.kesin.iadeTarih = TODAY; save(); toast('Kesin teminat iadesi kaydedildi.'); route(); };
}
function emirModal(szId) {
  const z = szId ? soz(szId) : null;
  const items = z ? z.kalemler.map(x => ({ uid: x.uid, kalan: Math.max(0, x.mik - teslimEdilen(z, x.uid) - yoldaMik(z, x.uid)) })) : S.urunler.map(u => ({ uid: u.id, kalan: 500 }));
  modal('Üretim emri oluştur', `<p class="small muted" style="margin-bottom:12px">${z ? esc(z.no) + ', ' + kurumAd(z.k) + ' için.' : 'Stok için üretim.'} Emir, reçeteye göre gereken hammaddeyi gösterir.</p>
    <label class="f"><span>Ürün</span><select class="inp" id="eu">${items.map(x => `<option value="${x.uid}" data-k="${x.kalan}">${esc(urun(x.uid).ad)}${z ? ', kalan ' + nf(x.kalan) : ''}</option>`).join('')}</select></label>
    <div class="fg"><label class="f"><span>Miktar (adet)</span><input class="inp" id="em" inputmode="numeric" value="${items[0].kalan || 500}"></label>
    <label class="f"><span>Termin</span><input class="inp" type="date" id="et" value="${dayStr(5)}"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="eok">Emri oluştur</button></div>`, m => {
    $('#eu', m).onchange = e => { $('#em', m).value = e.target.selectedOptions[0].dataset.k || 500; };
    $('#eok', m).onclick = () => {
      const mik = num($('#em', m).value); if (!(mik > 0)) return toast('Miktar girin.');
      const e = { id: 'e' + Date.now(), no: nextNo(S, 'UE', TODAY), sir: z ? z.sir : yeniSir(), uid: $('#eu', m).value, mik, szId: szId || null, tarih: TODAY, termin: $('#et', m).value, durum: 'planlandi', partiId: null };
      S.emirler.push(e); save(); m.remove(); toast('Üretim emri ' + e.no + ' oluşturuldu.'); location.hash = 'uretim/' + e.id;
    };
  });
}

/* ============ KURUMLAR ============ */
ROUTES.kurumlar = function (id) {
  if (id && kurum(id)) return kurumDetay(id);
  view.innerHTML = `<div class="hd"><div><h1>Kurumlar</h1><p>İhale açan kamu kurumları; ihaleleri, sözleşmeleri, sevkiyatları ve alacakları tek yerde.</p></div><button class="btn" id="yk">Yeni kurum</button></div>
    <div class="card">${tbl([['Kurum'], ['İl'], ['İhale'], ['Aktif sözleşme'], ['Ödeme vadesi'], ...(F ? [['Alacak', 'r']] : [])],
      S.kurumlar.map(k => { const al = S.faturalar.filter(f => f.k === k.id && inSir(f)).reduce((t, f) => t + kalanF(f), 0), gec = S.faturalar.some(f => f.k === k.id && gecikti(f) && inSir(f));
        return `<tr class="click" data-go="kurumlar/${k.id}"><td data-l="Kurum"><b>${esc(k.ad)}</b></td><td data-l="İl">${esc(k.il)}</td>
        <td data-l="İhale">${S.ihaleler.filter(i => i.k === k.id && inSir(i)).length}</td><td data-l="Aktif sözleşme">${S.sozlesmeler.filter(z => z.k === k.id && !sozBitti(z) && inSir(z)).length}</td>
        <td data-l="Vade">${k.vade} gün</td>${F ? `<td data-l="Alacak" class="r num ${gec ? 'bad' : ''}">${money0(al)}</td>` : ''}</tr>`; }))}</div>`;
  bindClicks();
  $('#yk').onclick = () => modal('Yeni kurum', `<label class="f"><span>Kurum adı</span><input class="inp" id="ka"></label>
    <div class="fg"><label class="f"><span>İl</span><input class="inp" id="ki"></label><label class="f"><span>Ödeme vadesi (gün)</span><input class="inp" id="kv" value="30"></label></div>
    <label class="f"><span>Yetkili / birim</span><input class="inp" id="ky"></label><label class="f"><span>Telefon</span><input class="inp" id="kt"></label>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="kok">Kaydet</button></div>`, m => {
    $('#kok', m).onclick = () => { const ad = $('#ka', m).value.trim(); if (!ad) return toast('Kurum adı girin.');
      S.kurumlar.push({ id: 'k' + (++S.seq.kur), ad, il: $('#ki', m).value, vkn: '', yetkili: $('#ky', m).value, tel: $('#kt', m).value, vade: parseInt($('#kv', m).value) || 30 }); save(); m.remove(); toast('Kurum eklendi.'); route(); };
  });
};
function kurumDetay(id) {
  const k = kurum(id), ih = S.ihaleler.filter(i => i.k === id && inSir(i)), sz = S.sozlesmeler.filter(z => z.k === id && inSir(z)), sv = S.sevkiyatlar.filter(v => v.k === id && inSir(v)), ft = S.faturalar.filter(f => f.k === id && inSir(f));
  view.innerHTML = `<a class="back" href="#kurumlar">Kurumlara dön</a>
    <div class="hd"><div><h1>${esc(k.ad)}</h1><p>${esc(k.il)}, ödeme vadesi ${k.vade} gün</p></div>${F && can('fatura') ? `<a class="btn alt" href="belge.html?tip=ekstre&id=${k.id}">Kurum ekstresi</a>` : ''}</div>
    <div class="meta"><div><small>Yetkili</small><b>${esc(k.yetkili)}</b></div><div><small>Telefon</small><b>${esc(k.tel)}</b></div><div><small>VKN</small><b>${esc(k.vkn)}</b></div>
      ${F ? `<div><small>Toplam alacak</small><b class="num">${money0(ft.reduce((t, f) => t + kalanF(f), 0))}</b></div>` : ''}</div>
    <div class="grid2e">
      <div class="card"><h2>İhaleler</h2>${ih.map(i => `<div class="uy"><a href="#ihaleler/${i.id}">${esc(i.ikn)}, ${esc(i.konu)}</a>${ihTag(i)}</div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>
      <div class="card"><h2>Sözleşmeler</h2>${sz.map(z => `<div style="padding:6px 0"><a href="#sozlesmeler/${z.id}">${esc(z.no)}</a>${prog(sozOran(z))}</div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>
      <div class="card"><h2>Sevkiyatlar ve partiler</h2>${sv.map(v => `<div class="uy"><span><a href="#sevkiyat/${v.id}">${esc(v.no)}</a> <span class="small muted">${v.kalemler.map(l => esc(parti(l.partiId).no)).join(', ')}</span></span>${svTag(v)}</div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>
      ${F ? `<div class="card"><h2>Faturalar ve alacak</h2>${ft.map(f => `<div class="uy ${gecikti(f) ? 'al' : ''}"><span>${esc(f.no)}<br><span class="small muted">Vade ${trDate(f.vade)}</span></span><b class="num">${kalanF(f) > 0.5 ? money0(kalanF(f)) : '<span class="ok">Ödendi</span>'}</b></div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>` : ''}
    </div>`;
}

if (ME) shell();
