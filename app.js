/* Panel iskeleti, yetki, genel bakış, kullanıcılar, ihaleler, sözleşmeler, kurumlar */
const ME = me();
if (!ME) location.replace('index.html');
const F = !!(ME && ME.fiyat), M = !!(ME && ME.maliyet);
const can = m => !!ME && (m === 'kullanicilar' ? ME.rol === 'yonetici' : ME.mods.includes(m));
const view = $('#view');
window.__oturum = oturum();

const NAV = [
  ['', ['ozet']], ['Satış ve ihale', ['ihaleler', 'sozlesmeler', 'teminat', 'kurumlar']], ['Üretim', ['uretim', 'kalite', 'urunler', 'stok']],
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
  return { kalite: S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).length + S.lotlar.filter(l => l.durum === 'karantina' && inSir(l)).length, uretim: S.emirler.filter(e => e.durum !== 'tamamlandi' && inSir(e)).length,
    fatura: S.faturalar.filter(f => gecikti(f) && inSir(f)).length, teminat: teminatlar().filter(x => x.unutuldu && inSir(x)).length, ihaleler: S.ihaleler.filter(i => i.durum === 'hazirlaniyor' && inSir(i)).length };
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
const ihTag = i => tag(durAd(i), { hazirlaniyor: 'w', teklif: 'b', kazanildi: 'g', kaybedildi: '' }[i.durum]);
const emTag = e => tag(EMIR_DURUM[e.durum], { planlandi: 'w', uretimde: 'b', tamamlandi: 'g' }[e.durum]);
const paTag = p => tag(PARTI_DURUM[p.durum], { kalite: 'a', onay: 'g', red: 'r' }[p.durum]);
const svTag = v => tag(SEVK_DURUM[v.durum], { hazirlaniyor: 'w', yolda: 'b', teslim: 'g' }[v.durum]);
const szTag = z => z.kapanis ? tag('Dosya kapandı', 'g') : sozBitti(z) ? tag('Tamamlandı', 'g') : tag('Devam ediyor', 'b');
const prog = (o, cls) => `<div class="prog"><div class="bar ${o >= 1 ? 'ok' : ''} ${cls || ''}"><i style="width:${Math.min(100, o * 100).toFixed(0)}%"></i></div><span>%${Math.round(o * 100)}</span></div>`;
const sirCol = x => aktifSir() === 'hepsi' ? `<div class="small muted">${esc(sirket(x.sir).kisa)}</div>` : '';
const sirNote = () => aktifSir() === 'hepsi' ? '<div class="note">Tüm şirketlerin kayıtları birlikte gösteriliyor. Yeni kayıtlar Çözüm Kimya adına açılır; tek şirket seçerek çalışabilirsiniz.</div>' : '';
const tbl = (heads, rows, empty, foot) => `<div class="tw"><table class="t resp"><thead><tr>${heads.map(h => `<th class="${h[1] || ''}">${h[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${heads.length}" class="empty">${empty || 'Kayıt yok.'}</td></tr>`}</tbody>${foot || ''}</table></div>`;
function bindClicks(el) { $$('[data-go]', el || view).forEach(x => x.onclick = e => { if (e.target.closest('a,button,input,select') && e.target.closest('[data-go]') !== e.target.closest('a,button,input,select')) return; location.hash = x.dataset.go; }); }
const kurumAd = id => esc(kurum(id).ad);
const turTag = t => `<span class="small muted">${esc(turAd(t))}</span>`;
const turSeg = (cur, cnt) => `<div class="seg" id="turSeg">${[['hepsi', 'Tüm işler'], ...Object.entries(TUR)].map(([k, ad]) => `<button data-t="${k}" class="${cur === k ? 'on' : ''}">${ad} (${cnt(k)})</button>`).join('')}</div>`;

/* ---- v4 ortak parçalar: ürün görseli, kalem kartı, teslim yeri notları, dağılım tablosu ---- */
const basHarf = ad => ad.split(' ').filter(w => /^[A-ZÇĞİÖŞÜ]/.test(w)).slice(0, 2).map(w => w[0]).join('');
const urunImg = (uid, amb) => { const u = urun(uid); return `<span class="uimg ${u.grup === 'Toz' ? 'toz' : ''}" aria-hidden="true"><b>${esc(basHarf(u.ad))}</b><small>${esc((amb || AMB[uid] || '').split(' ').slice(0, 2).join(' '))}</small></span>`; };
function kalemKart(x, opt) {
  opt = opt || {};
  return `<div class="kk">${urunImg(x.uid, x.amb)}<div><b>${esc(urun(x.uid).ad)}</b><div class="small muted">İhale ambalajı: <b>${esc(x.amb || AMB[x.uid])}</b>${x.dosya ? ', şartname: ' + esc(x.dosya) : ''}</div>
    ${opt.kisa ? '' : `<ul class="sart">${(x.sartname || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul>`}</div></div>`;
}
function uyusmaz(x, uidSecilen) {
  if (!uidSecilen || uidSecilen === x.uid) return '';
  const a1 = x.amb || AMB[x.uid], a2 = AMB[uidSecilen], u1 = urun(x.uid).ad.replace(/ \d.*$/, ''), u2 = urun(uidSecilen).ad.replace(/ \d.*$/, '');
  return `İhale kalemiyle uyuşmuyor: ihalede "${urun(x.uid).ad}" (${a1}), seçilen "${urun(uidSecilen).ad}" (${a2}).${u1 === u2 ? ' Ürün aynı, ambalaj farklı.' : ' Ürün farklı.'}`;
}
function notKutu(tyId, baslik) {
  const t = tyBy(tyId); if (!t) return '';
  const son = t.notlar.slice().sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 4);
  return `<div class="sari" id="notKutu"><b>${esc(baslik || 'Teslim yeri hafızası')}: ${esc(t.ad)}</b>
    <div class="small">Mal kabul: ${esc(t.saat)}. ${t.forklift ? 'Forklift var.' : '<b>Forklift yok.</b>'} ${esc(t.rampa)}. ${t.hamaliye ? 'Hamaliye yaklaşık ' + (F ? money0(t.hamaliye) : 'ücretli') + '.' : ''} Yetkili: ${esc(t.yetkili)}, ${esc(t.tel)}</div>
    ${son.map(n => `<div class="small" style="margin-top:4px">${n.uyari ? '<b>Uyarı.</b> ' : ''}Önceki ${n.kaynak === 'fatura' ? 'fatura tesliminden' : n.kaynak === 'kart' ? 'kayıttan' : 'sevkiyattan'} not (${trDate(n.tarih)}): ${esc(n.metin)}</div>`).join('')}</div>`;
}
function dagilimTablo(r, isSoz, editable) {
  const tys = Object.keys(r.dagilim || {}), kurTy = S.teslimYerleri.filter(t => t.k === r.k && !tys.includes(t.id)), hata = dagHata(r);
  if (!tys.length && !S.teslimYerleri.some(t => t.k === r.k)) return '';
  const cell = (ty, x) => { const d = (r.dagilim[ty] || {})[x.uid] || 0;
    const inp = editable ? `<input class="inp sm num" data-dg="${ty}|${x.uid}" value="${d || ''}" placeholder="0" style="width:84px" aria-label="${esc(tyBy(ty).ad)} ${esc(urun(x.uid).ad)}">` : `<b class="num">${nf(d)}</b>`;
    if (!isSoz) return inp;
    const tes = teslimEdilen(r, x.uid, ty), yol = yoldaTy(r, x.uid, ty), kal = d - tes - yol;
    return `${inp}<div class="small muted nowrap" data-dk="${ty}|${x.uid}">Teslim ${nf(tes)}${yol ? ', yolda ' + nf(yol) : ''}, kalan <b class="${kal < 0 ? 'bad' : ''}">${nf(kal)}</b></div>`; };
  return `<div class="card" id="dagilim"><div class="card-h"><h2>Teslim yerlerine dağılım</h2><span class="small muted">${isSoz ? 'Her teslim yeri ve kalem için gönderilen ve kalan' : 'İl müdürlüğü ihaleyi yapar, ürünler ilçe hastanelerine dağıtılır'}</span></div>
    ${hata.length ? `<div class="note w" id="dagUyari"><b>Dağılım ana miktarla tutmuyor:</b> ${hata.map(x => `${esc(urun(x.uid).ad)} için dağıtılan ${nf(dagToplam(r, x.uid))}, ana miktar ${nf(x.mik)} (fark ${nf(x.mik - dagToplam(r, x.uid))})`).join('; ')}.</div>` : tys.length ? '<div class="small ok" style="margin-bottom:8px" id="dagTamam">Dağılım toplamları ana miktarlarla tutuyor.</div>' : ''}
    ${tys.length ? `<div class="tw"><table class="t"><thead><tr><th>Teslim yeri</th>${r.kalemler.map(x => `<th class="r">${esc(urun(x.uid).ad)}</th>`).join('')}${editable ? '<th></th>' : ''}</tr></thead><tbody>
      ${tys.map(ty => `<tr><td><a href="#kurumlar/ty-${ty}">${esc(tyBy(ty).ad)}</a></td>${r.kalemler.map(x => `<td class="r">${cell(ty, x)}</td>`).join('')}${editable ? `<td class="r"><button class="linkbtn" data-dgrm="${ty}">Çıkar</button></td>` : ''}</tr>`).join('')}</tbody>
      <tfoot><tr><td>Dağıtılan / ana miktar</td>${r.kalemler.map(x => { const t = dagToplam(r, x.uid); return `<td class="r ${t !== x.mik ? 'bad' : 'ok'}" data-dt="${x.uid}">${nf(t)} / ${nf(x.mik)}${isSoz ? `<div class="small muted">teslim ${nf(teslimEdilen(r, x.uid))}, kalan ${nf(x.mik - teslimEdilen(r, x.uid))}</div>` : ''}</td>`; }).join('')}${editable ? '<td></td>' : ''}</tr></tfoot></table></div>` : '<p class="empty">Henüz dağılım girilmedi.</p>'}
    ${editable && kurTy.length ? `<div class="acts" style="margin-top:10px"><select class="inp sm" id="dgAdd" aria-label="Teslim yeri">${kurTy.map(t => `<option value="${t.id}">${esc(t.ad)}</option>`).join('')}</select><button class="btn sm alt" id="dgAddB">Teslim yeri ekle</button></div>` : ''}</div>`;
}
function bindDagilim(r) {
  $$('[data-dg]').forEach(i => i.onchange = () => { const [ty, uid] = i.dataset.dg.split('|'); r.dagilim[ty] = r.dagilim[ty] || {}; r.dagilim[ty][uid] = num(i.value) || 0; save(); const y = window.scrollY; route(); window.scrollTo(0, y); });
  $$('[data-dgrm]').forEach(b => b.onclick = () => { delete r.dagilim[b.dataset.dgrm]; save(); const y = window.scrollY; route(); window.scrollTo(0, y); });
  const b = $('#dgAddB'); if (b) b.onclick = () => { r.dagilim = r.dagilim || {}; r.dagilim[$('#dgAdd').value] = {}; save(); const y = window.scrollY; route(); window.scrollTo(0, y); };
}
function teknikModal(x, after) {
  modal('Kalem teknik bilgisi: ' + urun(x.uid).ad, `${kalemKart(x, { kisa: true })}
    <label class="f" style="margin-top:12px"><span>Ambalaj (litre / kg)</span><input class="inp" id="tamb" value="${esc(x.amb || '')}"></label>
    <label class="f"><span>Teknik şartname maddeleri (her satır bir madde)</span><textarea class="inp" id="tsart" rows="4">${esc((x.sartname || []).join('\n'))}</textarea></label>
    <label class="f"><span>Şartname dosyası</span><input class="inp" id="tdos" value="${esc(x.dosya || '')}"></label>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="tok2">Kaydet</button></div>`, m => {
    $('#tok2', m).onclick = () => { x.amb = $('#tamb', m).value.trim(); x.sartname = $('#tsart', m).value.split('\n').map(t => t.trim()).filter(Boolean); x.dosya = $('#tdos', m).value.trim(); save(); m.remove(); toast('Teknik bilgi kaydedildi.'); after(); };
  });
}

/* ============ GENEL BAKIŞ ============ */
ROUTES.ozet = function () {
  const kp = [];
  const ih = S.ihaleler.filter(inSir), sz = S.sozlesmeler.filter(inSir);
  if (can('ihaleler')) kp.push(['ihaleler', ih.filter(i => i.durum === 'hazirlaniyor' || i.durum === 'teklif').length, 'Açık ihale']);
  if (can('sozlesmeler')) kp.push(['sozlesmeler', sz.filter(z => !sozBitti(z)).length, 'Aktif sözleşme']);
  if (can('uretim')) kp.push(['uretim', S.emirler.filter(e => e.durum !== 'tamamlandi' && inSir(e)).length, 'Açık üretim emri']);
  if (can('kalite')) kp.push(['kalite', S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).length, 'Kalite bekleyen parti']);
  if (can('sevkiyat')) kp.push(['sevkiyat', S.sevkiyatlar.filter(v => v.durum !== 'teslim' && v.tarih <= dayStr(7) && inSir(v)).length, 'Bu haftaki sevkiyat']);
  if (can('fatura') && F) kp.push(['fatura', money0(S.faturalar.filter(inSir).reduce((t, f) => t + kalanF(f), 0)), 'Kurum ve müşterilerden alacak', S.faturalar.some(f => gecikti(f) && inSir(f))]);
  if (can('fatura') && F) kp.push(['raporlar/gelir', money0(S.faturalar.filter(f => inSir(f) && diffDays(f.tarih, TODAY) >= -30).reduce((t, f) => t + gelir(f), 0)), 'Gelir, son 30 gün', false, 'gelir']);
  if (can('teminat')) { const tl = teminatlar().filter(x => inSir(x) && !x.t.iade); kp.push(['teminat', F ? money0(tl.reduce((t, x) => t + x.t.tutar, 0)) : tl.length + ' adet', 'Kurumda bekleyen teminat', tl.some(x => x.unutuldu), 'teminat']); }
  if (can('personel')) { const pz = S.puantaj[TODAY] || {}; const ps = S.personel.filter(p => inSir(p) && (!ME.ekip || p.ekip === ME.ekip)); kp.push(['personel', ps.filter(p => pz[p.id] && pz[p.id].d === 'geldi').length + ' / ' + ps.length, 'Bugün işbaşında']); }

  const uy = [];
  if (can('ihaleler')) ih.forEach(i => {
    if (i.durum === 'hazirlaniyor' && diffDays(i.tarih, TODAY) <= 14) { const eks = i.evrak.filter(e => !e.ok).length; uy.push([i.tarih, `${i.tur === 'piyasa' ? 'Teklif' : turAd(i.tur)} günü: <b>${esc(i.ikn)}</b>, ${kurumAd(i.k)}${eks ? `, <span class="bad">${eks} evrak eksik</span>` : ''}`, 'ihaleler/' + i.id, eks > 0]); }
    if (i.gecici && !i.gecici.iade && i.durum !== 'kazanildi' && diffDays(i.gecici.bitis, TODAY) <= 30) uy.push([i.gecici.bitis, `Geçici teminat bitişi: ${esc(i.ikn)}${F ? ', ' + money0(i.gecici.tutar) : ''}`, 'ihaleler/' + i.id, true]);
  });
  if (can('sozlesmeler')) sz.filter(z => !sozBitti(z)).forEach(z => z.plan.forEach(p => { const d = diffDays(p.tarih, TODAY); if (d >= -3 && d <= 14) uy.push([p.tarih, `Teslim günü: <b>${esc(z.no)}</b>, ${kurumAd(z.k)}, ${esc(p.not)}`, 'sozlesmeler/' + z.id, d < 0]); }));
  if (can('fatura') && F) S.faturalar.filter(f => gecikti(f) && inSir(f)).forEach(f => uy.push([f.vade, `Vadesi geçti: ${esc(f.no)}, ${kurumAd(f.k)}, kalan ${money0(kalanF(f))}`, 'fatura', true]));
  if (can('teminat')) teminatlar().filter(x => inSir(x) && !x.t.iade && x.iadeEd).forEach(x => uy.push([x.iadeEd, `${x.unutuldu ? 'Unutulan teminat' : 'Teminat iade edilebilir'}: ${x.cins === 'kesin' ? 'kesin' : 'geçici'}, ${esc(x.ikn)}, ${kurumAd(x.k)}${F ? ', ' + money0(x.t.tutar) : ''}${x.unutuldu ? `, <b>${x.bekleme} gündür kurumda</b>` : ''}`, 'teminat/' + (x.cins === 'kesin' ? 'kesin' : 'gecici'), x.unutuldu]));
  if (can('fatura') && F) S.alimlar.filter(a => alimKalan(a) > 0 && inSir(a) && diffDays(a.vade, TODAY) <= 10).forEach(a => uy.push([a.vade, `Tedarikçi ödemesi: ${esc(ted(a.tedId).ad)}, ${money0(alimKalan(a))}`, 'fatura/vade', a.vade < TODAY]));
  if (can('kalite') || can('stok')) S.lotlar.filter(l => l.durum === 'karantina' && inSir(l)).forEach(l => uy.push([l.tarih, `Hammadde karantinada: ${esc(l.no)}, ${esc(hm(l.hid).ad)}, ${nf(l.mik)} ${hm(l.hid).birim}`, can('kalite') ? 'kalite/lot-' + l.id : 'stok', false]));
  if (can('kalite')) S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).forEach(p => uy.push([p.tarih, `Kalite onayı bekliyor: ${esc(p.no)}, ${esc(urun(p.uid).ad)}`, 'kalite/' + p.id, false]));
  if (can('sevkiyat')) S.sevkiyatlar.filter(v => v.durum !== 'teslim' && inSir(v)).forEach(v => uy.push([v.tarih, `Sevkiyat ${SEVK_DURUM[v.durum].toLowerCase()}: ${esc(v.no)}, ${kurumAd(v.k)}`, 'sevkiyat/' + v.id, false]));
  uy.sort((a, b) => a[0].localeCompare(b[0]));

  const krit = S.hammaddeler.filter(h => h.stok < h.kritik);
  const saat = new Date().getHours();
  view.innerHTML = `
    <div class="hd"><div><h1>${saat < 12 ? 'Günaydın' : 'İyi çalışmalar'}, ${esc(ME.ad.split(' ')[0])}</h1><p>${trDate(TODAY)}, ${aktifSir() === 'hepsi' ? 'tüm şirketler' : esc(sirket(aktifSir()).ad)}</p></div>
      ${can('ihaleler') ? '<a class="btn" href="#ihaleler/yeni">Yeni ihale</a>' : ''}</div>
    <div class="kpis">${kp.map(k => `<a class="kpi ${k[3] ? 'alert' : ''}" href="#${k[0]}" data-kpi="${k[4] || k[0]}"><div class="v">${k[1]}</div><div class="k">${k[2]}</div></a>`).join('')}</div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h2>Yaklaşan işler ve uyarılar</h2><span class="small muted">${uy.length} kayıt</span></div>
        ${uy.map(u => `<div class="uy ${u[3] ? 'al' : ''}"><a href="#${u[2]}" style="color:inherit;text-decoration:none">${u[1]}</a><span class="t">${trDate(u[0])}, ${gunTxt(u[0])}</span></div>`).join('') || '<p class="empty">Bekleyen uyarı yok.</p>'}
      </div>
      <div>
        ${can('sozlesmeler') || can('ihaleler') ? turOzet() : ''}
        ${can('stok') || can('uretim') ? `<div class="card"><div class="card-h"><h2>Kritik stok</h2>${can('stok') ? '<a class="small" href="#stok">Stoka git</a>' : ''}</div>
          ${krit.map(h => `<div class="uy al"><span><b>${esc(h.ad)}</b></span><span class="t">${nf(h.stok)} / kritik ${nf(h.kritik)} ${h.birim}</span></div>`).join('') || '<p class="empty">Kritik seviyede malzeme yok.</p>'}</div>` : ''}
        ${can('sozlesmeler') ? `<div class="card"><div class="card-h"><h2>Sözleşme teslim durumu</h2><a class="small" href="#sozlesmeler">Tümü</a></div>
          ${sz.filter(z => !sozBitti(z)).map(z => `<div style="padding:6px 0"><a href="#sozlesmeler/${z.id}" class="small" style="color:inherit">${esc(z.no)}, ${kurumAd(z.k)}</a>${prog(sozOran(z))}</div>`).join('') || '<p class="empty">Aktif sözleşme yok.</p>'}</div>` : ''}
      </div>
    </div>`;
};

function turOzet() {
  const ih = S.ihaleler.filter(inSir), sz = S.sozlesmeler.filter(inSir), ft = S.faturalar.filter(inSir);
  const fT = { acik: 'ihale', dogrudan: 'dogrudan', piyasa: 'piyasa' };
  const rows = Object.entries(TUR).map(([k, ad]) => `<tr><td data-l="Tür"><b>${ad}</b></td><td data-l="Açık teklif" class="r">${ih.filter(i => i.tur === k && (i.durum === 'hazirlaniyor' || i.durum === 'teklif')).length}</td>
    <td data-l="Aktif iş" class="r">${sz.filter(z => z.tur === k && !sozBitti(z)).length}</td>${F ? `<td data-l="Gelir" class="r num">${money0(ft.filter(f => f.tur === fT[k]).reduce((t, f) => t + gelir(f), 0))}</td>` : ''}</tr>`);
  if (F) rows.push(`<tr><td data-l="Tür"><b>Komisyon usulü</b></td><td data-l="Açık teklif" class="r">-</td><td data-l="Aktif iş" class="r">${ft.filter(f => f.tur === 'komisyon' && (kalanF(f) > 0.5 || emanet(f) > 0.5)).length}</td><td data-l="Gelir" class="r num">${money0(ft.filter(f => f.tur === 'komisyon').reduce((t, f) => t + gelir(f), 0))}</td></tr>`);
  return `<div class="card" id="turOzet"><div class="card-h"><h2>İş türüne göre</h2>${F ? '<span class="small muted">Gelir: KDV hariç, komisyon işlerinde yalnız komisyon</span>' : ''}</div>
    ${tbl([['Tür'], ['Açık teklif', 'r'], ['Aktif iş', 'r'], ...(F ? [['Gelir', 'r']] : [])], rows)}</div>`;
}

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
let ihF = 'hepsi', ihT = 'hepsi';
ROUTES.ihaleler = function (id) {
  if (id === 'yeni') return ihaleYeni();
  if (id && ihale(id)) return ihaleDetay(id);
  const all0 = S.ihaleler.filter(inSir), all = all0.filter(i => ihT === 'hepsi' || i.tur === ihT), list = all.filter(i => ihF === 'hepsi' || i.durum === ihF).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `
    <div class="hd"><div><h1>İhale ve teklifler</h1><p>Açık ihaleler, doğrudan temin (22/d) işleri ve piyasa müşterilerine verilen teklifler; evrak ve teminat takibi.</p></div><a class="btn" href="#ihaleler/yeni">Yeni ihale / teklif</a></div>
    ${sirNote()}
    ${turSeg(ihT, k => k === 'hepsi' ? all0.length : all0.filter(i => i.tur === k).length)}<br>
    <div class="seg">${['hepsi', ...Object.keys(IHALE_DURUM)].map(k => `<button data-f="${k}" class="${ihF === k ? 'on' : ''}">${k === 'hepsi' ? 'Tümü' : IHALE_DURUM[k]} (${k === 'hepsi' ? all.length : all.filter(i => i.durum === k).length})</button>`).join('')}</div>
    <div class="card">${tbl([['No'], ['Kurum / müşteri ve konu'], ['Tarih'], ...(F ? [['Teklifimiz', 'r']] : []), ['Evrak'], ['Durum']],
      list.map(i => `<tr class="click" data-go="ihaleler/${i.id}"><td data-l="No"><b class="num">${esc(i.ikn)}</b><div>${turTag(i.tur)}</div></td>
        <td data-l="Kurum">${kurumAd(i.k)}<div class="small muted">${esc(i.konu)}</div>${sirCol(i)}</td>
        <td data-l="İhale tarihi" class="nowrap">${trDate(i.tarih)}<div class="small muted">${gunTxt(i.tarih)}</div></td>
        ${F ? `<td data-l="Teklifimiz" class="r num">${i.kalemler.length ? money0(ihaleTutar(i)) : '<span class="muted">Hazırlanıyor</span>'}</td>` : ''}
        <td data-l="Evrak" class="small">${i.evrak.filter(e => e.ok).length}/${i.evrak.length}</td><td data-l="Durum">${ihTag(i)}</td></tr>`))}</div>`;
  $$('[data-f]').forEach(b => b.onclick = () => { ihF = b.dataset.f; route(); });
  $$('#turSeg [data-t]').forEach(b => b.onclick = () => { ihT = b.dataset.t; route(); });
  bindClicks();
};
function ihaleYeni() {
  view.innerHTML = `<a class="back" href="#ihaleler">İhale ve tekliflere dön</a><div class="hd"><div><h1>Yeni ihale / teklif</h1><p>Temel bilgileri girin; kalemleri ve evrakları sonraki ekranda eklersiniz.</p></div></div>
    <div class="card" style="max-width:760px"><form id="ihf">
      <div class="fg">
        <label class="f" style="grid-column:1/-1"><span>İş türü</span><select class="inp" id="itur">${Object.entries(TUR).map(([k, ad]) => `<option value="${k}" ${k === (ihT === 'hepsi' ? 'acik' : ihT) ? 'selected' : ''}>${ad}</option>`).join('')}</select></label>
        <label class="f"><span id="ikLbl">Kurum</span><select class="inp" id="ik"></select></label>
        <label class="f"><span id="iknLbl">İKN (ihale kayıt numarası)</span><input class="inp" id="iikn" placeholder="2026/1234567" required></label>
        <label class="f" style="grid-column:1/-1"><span>İşin adı</span><input class="inp" id="ikonu" placeholder="Örn. Temizlik malzemesi alımı" required></label>
        <label class="f"><span>İhale / teklif tarihi</span><input class="inp" type="date" id="itar" value="${dayStr(10)}" required></label>
        <label class="f"><span>Yaklaşık maliyet (₺)</span><input class="inp" id="iyak" inputmode="decimal" placeholder="Örn. 850000"></label>
      </div><div class="fg" id="temFg">
        <label class="f"><span>Geçici teminat türü</span><select class="inp" id="igtur"><option value="mektup">Teminat mektubu</option><option value="nakit">Nakit</option></select></label>
      <label class="f"><span>Geçici teminat tutarı (₺)</span><input class="inp" id="igt" inputmode="decimal" placeholder="Teklifin en az %3'ü"></label>
      <label class="f"><span>Mektup no</span><input class="inp" id="igno" placeholder="GTM-2026-0000"></label>
      <label class="f"><span>Veriliş tarihi</span><input class="inp" type="date" id="igver" value="${dayStr(10)}"></label>
        <label class="f"><span>Teminat bankası</span><input class="inp" id="igb" value="Halkbank Ankara Kurumsal"></label>
        <label class="f"><span>Teminat mektubu bitişi</span><input class="inp" type="date" id="igbit" value="${dayStr(100)}"></label>
      </div><div class="fg" id="gidFg">
        <label class="f"><span>İhale doküman bedeli (₺)</span><input class="inp" id="igdok" inputmode="decimal" value="750"></label>
        <label class="f"><span>Damga vergisi (₺)</span><input class="inp" id="igdam" inputmode="decimal" value="0"></label>
        <label class="f"><span>Karar pulu (₺)</span><input class="inp" id="igkar" inputmode="decimal" value="0"></label>
        <p class="small muted" style="grid-column:1/-1;margin:-4px 0 12px">İhale giderleri ihalenin maliyetine yazılır. Damga vergisi ve karar pulu genelde kazanılınca sözleşmede kesinleşir.</p>
      </div>
      <div class="acts"><button class="btn" type="submit">İhaleyi kaydet</button><a class="btn alt" href="#ihaleler">Vazgeç</a></div></form></div>`;
  const turDegis = () => {
    const t = $('#itur').value;
    $('#ik').innerHTML = S.kurumlar.filter(k => (t === 'piyasa') === (k.tip === 'firma')).map(k => `<option value="${k.id}">${esc(k.ad)}</option>`).join('');
    $('#ikLbl').textContent = t === 'piyasa' ? 'Müşteri firma' : 'Kurum';
    $('#iknLbl').textContent = { acik: 'İKN (ihale kayıt numarası)', dogrudan: 'Doğrudan temin no', piyasa: 'Teklif no' }[t];
    $('#iikn').placeholder = { acik: '2026/1234567', dogrudan: 'DT-2026-140', piyasa: 'TKL-2026-040' }[t];
    $('#temFg').classList.toggle('hide', t !== 'acik'); $('#gidFg').classList.toggle('hide', t === 'piyasa');
  };
  $('#itur').onchange = turDegis; turDegis();
  $('#ihf').onsubmit = e => {
    e.preventDefault();
    const tur = $('#itur').value, ikn = $('#iikn').value.trim();
    if (tur === 'acik' && !/^\d{4}\/\d{5,8}$/.test(ikn)) return toast('İKN biçimi 2026/1234567 gibi olmalı.');
    if (!ikn) return toast('Numara girin.');
    const i = { id: 'i' + (++S.seq.ihale), sir: yeniSir(), tur, k: $('#ik').value, ikn, konu: $('#ikonu').value.trim(), tarih: $('#itar').value, durum: 'hazirlaniyor', kalemler: [],
      yaklasik: num($('#iyak').value) || 0, rakip: '', evrak: (EVRAK_T[tur] || EVRAK).map(ad => ({ ad, ok: false })), gecici: tur !== 'acik' ? null : { tur: $('#igtur').value, tutar: num($('#igt').value) || 0, banka: $('#igb').value, no: $('#igno').value.trim(), verilis: $('#igver').value, bitis: $('#igbit').value, iade: false, iadeTarih: null, talep: null },
      gider: tur === 'piyasa' ? { dokuman: 0, damga: 0, karar: 0 } : { dokuman: num($('#igdok').value) || 0, damga: num($('#igdam').value) || 0, karar: num($('#igkar').value) || 0 }, sonuc: null, sozId: null };
    S.ihaleler.push(i); save(); toast('Kaydedildi. Şimdi kalemleri ekleyin.'); location.hash = 'ihaleler/' + i.id;
  };
}
function ihaleDetay(id) {
  const i = ihale(id), top = ihaleTutar(i), ed = i.durum === 'hazirlaniyor';
  const pi = i.tur === 'piyasa';
  const acts = {
    hazirlaniyor: `<button class="btn" id="aTeklif">Teklif verildi olarak işaretle</button>`,
    teklif: `<button class="btn" id="aKaz">${pi ? 'Sipariş alındı' : 'Kazanıldı'}</button><button class="btn danger" id="aKay">${pi ? 'Alınamadı' : 'Kaybedildi'}</button>`,
    kazanildi: i.sozId ? (can('sozlesmeler') ? `<a class="btn alt" href="#sozlesmeler/${i.sozId}">${pi ? 'Siparişi aç' : 'Sözleşmeyi aç'}</a>` : '') : `<button class="btn acc" id="aSoz">${pi ? 'Sipariş kaydı oluştur' : 'Sözleşme oluştur'}</button>`,
    kaybedildi: ''
  }[i.durum];
  const fark = i.yaklasik ? (top / i.yaklasik - 1) * 100 : 0;
  view.innerHTML = `<a class="back" href="#ihaleler">İhale ve tekliflere dön</a>
    <div class="hd"><div><h1>${esc(i.konu)}</h1><p>${ihTag(i)} &nbsp; ${esc(turAd(i.tur))}, ${noEtiket(i.tur)} ${esc(i.ikn)}</p></div><div class="acts">${acts}</div></div>
    <div class="meta">
      <div><small>${pi ? 'Müşteri firma' : 'Kurum'}</small><b>${kurumAd(i.k)}</b></div>
      <div><small>${pi ? 'Teklif tarihi' : 'İhale tarihi'}</small><b>${trDate(i.tarih)}</b> <span class="small muted">${gunTxt(i.tarih)}</span></div>
      <div><small>Şirket</small><b>${esc(sirket(i.sir).kisa)}</b></div>
      ${F ? `<div><small>Yaklaşık maliyet</small><b class="num">${money0(i.yaklasik)}</b></div>
      <div><small>Teklifimiz (KDV hariç)</small><b class="num">${money0(top)}</b>${i.yaklasik && top ? `<div class="small muted">Yaklaşık maliyetin %${nf(Math.abs(fark), 1)} ${fark < 0 ? 'altında' : 'üstünde'}</div>` : ''}</div>` : ''}
    </div>
    <div class="card"><div class="card-h"><h2>Kalemler</h2>${ed ? '<span class="small muted">Teklif verilene kadar düzenlenebilir</span>' : ''}</div>
      ${tbl([['Ürün ve ambalaj'], ['Miktar', 'r'], ...(F ? [['Birim teklif', 'r'], ['Tutar', 'r']] : []), ...(M ? [['Birim maliyet', 'r'], ['Marj', 'r']] : []), ['Teknik', 'r'], ...(ed ? [['', 'r']] : [])],
        i.kalemler.map((x, n) => { const bmv = birimMaliyet(x.uid); return `<tr><td data-l="Ürün"><div class="kk">${urunImg(x.uid, x.amb)}<div>${esc(urun(x.uid).ad)}<div class="small muted">${esc(x.amb || '')}, ${(x.sartname || []).length} şartname maddesi</div></div></div></td><td data-l="Miktar" class="r num">${nf(x.mik)} adet</td>
          ${F ? `<td data-l="Birim teklif" class="r num">${money(x.fiyat)}</td><td data-l="Tutar" class="r num">${money0(x.mik * x.fiyat)}</td>` : ''}
          ${M ? `<td data-l="Birim maliyet" class="r num">${money(bmv)}</td><td data-l="Marj" class="r">%${nf((1 - bmv / x.fiyat) * 100, 1)}</td>` : ''}
          <td data-l="Teknik" class="r"><button class="linkbtn" data-tek="${n}">Teknik bilgi</button></td>
          ${ed ? `<td class="r"><button class="linkbtn" data-rm="${n}">Sil</button></td>` : ''}</tr>`; }), 'Henüz kalem eklenmedi.')}
      ${ed ? `<div class="acts" style="margin-top:12px">
        <select class="inp sm" id="ku" aria-label="Ürün">${S.urunler.map(u => `<option value="${u.id}">${esc(u.ad)}</option>`).join('')}</select>
        <input class="inp sm" id="km" placeholder="Miktar" inputmode="numeric" style="width:100px" aria-label="Miktar">
        <input class="inp sm" id="kf" placeholder="Birim fiyat ₺" inputmode="decimal" style="width:120px" aria-label="Birim fiyat">
        <button class="btn sm" id="kadd">Kalem ekle</button></div>` : ''}
    </div>
    ${i.tur !== 'piyasa' ? dagilimTablo(i, false, i.durum !== 'kaybedildi' && !i.sozId) : ''}
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><div class="card-h"><h2>Evrak listesi</h2><span class="small muted" id="evs">${i.evrak.filter(e => e.ok).length}/${i.evrak.length} hazır</span></div>
        ${i.evrak.map((e, n) => `<label class="chk"><input type="checkbox" data-ev="${n}" ${e.ok ? 'checked' : ''}><span>${esc(e.ad)}</span></label>`).join('')}</div>
      <div>
        ${!i.gecici ? `<div class="card"><h2>${esc(turAd(i.tur))}</h2><p class="small muted">${pi ? 'Piyasa müşterisine verilen fiyat teklifi; teminat mektubu yok. Sipariş alınınca sipariş kaydı açılır ve üretim, sevkiyat, fatura aynı akışla ilerler.' : 'Doğrudan temin (4734 sayılı Kanun 22/d) işi; geçici ve kesin teminat alınmaz. Kazanılınca sözleşme kaydı açılır ve üretim, sevkiyat, fatura aynı akışla ilerler.'}</p></div>` : `<div class="card"><h2>Geçici teminat mektubu</h2>
          <div class="meta" style="border:0;padding:0;margin:0">
            ${F ? `<div><small>Tutar</small><b class="num">${money0(i.gecici.tutar)}</b></div>` : ''}
            <div><small>Tür</small><b>${i.gecici.tur === 'nakit' ? 'Nakit' : 'Teminat mektubu'}</b></div>
            <div><small>Banka / mektup no</small><b>${esc(i.gecici.banka)}</b><div class="small muted">${esc(i.gecici.no || '')}</div></div>
            <div><small>Veriliş</small><b>${trDate(i.gecici.verilis)}</b></div>
            <div><small>Bitiş</small><b class="${!i.gecici.iade && diffDays(i.gecici.bitis, TODAY) <= 30 ? 'bad' : ''}">${trDate(i.gecici.bitis)}</b></div>
            <div><small>Durum</small><b>${i.durum === 'hazirlaniyor' ? 'Henüz verilmedi' : i.gecici.iade ? 'İade alındı, ' + trDate(i.gecici.iadeTarih) : 'Kurumda (cari alacak)'}</b></div>
          </div>
          ${!i.gecici.iade && (i.durum === 'kaybedildi' || i.sozId) ? '<button class="btn alt sm" id="gIade" style="margin-top:10px">İade alındı olarak işaretle</button>' : ''}
        </div>`}
        ${i.tur !== 'piyasa' ? `<div class="card"><div class="card-h"><h2>İhale giderleri</h2>${F ? `<b class="num" id="igTop">${money0(ihGider(i))}</b>` : ''}</div>
          ${F ? `<div class="fg"><label class="f"><span>Doküman bedeli</span><input class="inp sm" id="gdok" value="${i.gider.dokuman || 0}" style="width:100%"></label><label class="f"><span>Damga vergisi</span><input class="inp sm" id="gdam" value="${i.gider.damga || 0}" style="width:100%"></label>
          <label class="f"><span>Karar pulu</span><input class="inp sm" id="gkar" value="${i.gider.karar || 0}" style="width:100%"></label></div><button class="btn alt sm" id="gSave">Giderleri kaydet</button>
          <p class="small muted" style="margin-top:6px">İhalenin maliyetine yazılır; sözleşme kârlılığından düşülür.</p>` : '<p class="small muted">Tutar yetkisi gerekir.</p>'}</div>` : ''}
        <div class="card"><h2>Rakip ve sonuç notu</h2><textarea class="inp" id="rakip" rows="3" placeholder="Rakip en düşük teklif, sıralama, itiraz notu">${esc(i.rakip)}</textarea>
          <button class="btn alt sm" id="rkSave" style="margin-top:8px">Notu kaydet</button></div>
      </div>
    </div>`;
  $$('[data-ev]').forEach(c => c.onchange = () => { i.evrak[c.dataset.ev].ok = c.checked; save(); $('#evs').textContent = i.evrak.filter(e => e.ok).length + '/' + i.evrak.length + ' hazır'; });
  $('#rkSave').onclick = () => { i.rakip = $('#rakip').value; save(); toast('Not kaydedildi.'); };
  const on = (q, f) => { const b = $(q); if (b) b.onclick = f; };
  on('#kadd', () => { const mik = num($('#km').value), fy = numIn($('#kf').value); if (!(mik > 0) || !(fy > 0)) return toast('Miktar ve birim fiyat girin.'); i.kalemler.push(Object.assign({ uid: $('#ku').value, mik, fiyat: fy }, kalemTek($('#ku').value, i.ikn))); save(); route(); });
  $$('[data-tek]').forEach(b => b.onclick = () => teknikModal(i.kalemler[+b.dataset.tek], route));
  bindDagilim(i);
  $$('[data-rm]').forEach(b => b.onclick = () => { i.kalemler.splice(+b.dataset.rm, 1); save(); route(); });
  on('#aTeklif', () => { if (!i.kalemler.length) return toast('Önce en az bir kalem ekleyin.'); i.durum = 'teklif'; save(); toast('Teklif verildi. Sonuç açıklanınca Kazanıldı veya Kaybedildi deyin.'); route(); });
  on('#aKaz', () => { i.durum = 'kazanildi'; i.sonuc = TODAY; save(); toast(pi ? 'Sipariş alındı. Şimdi sipariş kaydını oluşturun.' : 'Kazanıldı. Şimdi sözleşmeyi oluşturun.'); route(); });
  on('#aKay', () => { i.durum = 'kaybedildi'; i.sonuc = TODAY; save(); toast('Sonuç kaydedildi; rakip notunu ekleyebilirsiniz.'); route(); });
  on('#gIade', () => { i.gecici.iade = true; i.gecici.iadeTarih = TODAY; save(); toast('Geçici teminat iade alındı; kurum carisinden düşüldü.'); route(); });
  on('#gSave', () => { i.gider = { dokuman: num($('#gdok').value) || 0, damga: num($('#gdam').value) || 0, karar: num($('#gkar').value) || 0 }; save(); toast('İhale giderleri kaydedildi.'); route(); });
  on('#aSoz', () => sozModal(i));
}
function sozModal(i) {
  const top = ihaleTutar(i), ac = i.tur === 'acik', no = { acik: 'SZ', dogrudan: 'DT', piyasa: 'SP' }[i.tur || 'acik'] + '-2026-0' + (++S.seq.soz);
  modal(i.tur === 'piyasa' ? 'Sipariş kaydı oluştur' : 'Sözleşme oluştur', `<p class="small muted" style="margin-bottom:12px">${esc(i.ikn)}, ${kurumAd(i.k)}. Kalemler ve fiyatlar ${i.tur === 'piyasa' ? 'tekliften' : 'ihaleden'} aktarılır.</p>
    <div class="fg">
      <label class="f"><span>${i.tur === 'piyasa' ? 'Sipariş no' : 'Sözleşme no'}</span><input class="inp" id="szno" value="${no}"></label>
      <label class="f"><span>Tarih</span><input class="inp" type="date" id="sztar" value="${TODAY}"></label>
      ${ac ? `<label class="f"><span>Kesin teminat türü</span><select class="inp" id="kttur"><option value="mektup">Teminat mektubu</option><option value="nakit">Nakit</option></select></label>
      <label class="f"><span>Kesin teminat tutarı (₺, %6)</span><input class="inp" id="ktt" value="${Math.round(top * 0.06)}"></label>
      <label class="f"><span>Kesin teminat mektup no</span><input class="inp" id="ktno" value="KTM-2026-0${400 + S.seq.soz}"></label>
      <label class="f"><span>Banka</span><input class="inp" id="ktb" value="${esc(i.gecici.banka)}"></label>` : ''}
      ${i.tur !== 'piyasa' ? `<label class="f"><span>Damga vergisi (binde 9,48)</span><input class="inp" id="szdam" value="${i.gider.damga || Math.round(top * 0.00948)}"></label>
      ${ac ? `<label class="f"><span>Karar pulu (binde 5,69)</span><input class="inp" id="szkar" value="${i.gider.karar || Math.round(top * 0.00569)}"></label>` : ''}` : ''}
      <label class="f"><span>Parçalı teslim sayısı</span><select class="inp" id="tsay">${[1, 2, 3, 4, 6].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="f"><span>İlk teslim tarihi</span><input class="inp" type="date" id="tilk" value="${dayStr(15)}"></label>
      <label class="f"><span>Teslimler arası (gün)</span><input class="inp" id="tara" value="30" inputmode="numeric"></label>
    </div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="szok">Kaydı oluştur</button></div>`, m => {
    $('#szok', m).onclick = () => {
      const n = +$('#tsay', m).value, ara = parseInt($('#tara', m).value) || 30, ilk = $('#tilk', m).value;
      const z = { id: 'sz' + S.seq.soz + 'x' + Date.now() % 1000, no: $('#szno', m).value, sir: i.sir, ihId: i.id, k: i.k, tur: i.tur || 'acik', tarih: $('#sztar', m).value, kalemler: JSON.parse(JSON.stringify(i.kalemler)),
        plan: Array.from({ length: n }, (_, j) => ({ tarih: addDays(ilk, j * ara), not: (j + 1) + '. teslim, %' + nf(100 / n, 0) })),
        dagilim: JSON.parse(JSON.stringify(i.dagilim || {})), degisiklik: [], ekTeminat: [], kapanis: null,
        kesin: ac ? { tur: $('#kttur', m).value, tutar: num($('#ktt', m).value) || 0, banka: $('#ktb', m).value, no: $('#ktno', m).value, verilis: $('#sztar', m).value, iade: false, iadeTarih: null, talep: null } : null };
      if ($('#szdam', m)) i.gider.damga = num($('#szdam', m).value) || 0; if ($('#szkar', m)) i.gider.karar = num($('#szkar', m).value) || 0;
      S.sozlesmeler.push(z); i.sozId = z.id; save(); m.remove(); toast('Kayıt oluşturuldu. Buradan üretim emri verebilirsiniz.'); location.hash = 'sozlesmeler/' + z.id;
    };
  });
}

/* ============ SÖZLEŞMELER ============ */
let szF = 'aktif', szT = 'hepsi';
ROUTES.sozlesmeler = function (id) {
  if (id && id.startsWith('kapanis-') && soz(id.slice(8))) return sozKapanis(id.slice(8));
  if (id && soz(id)) return sozDetay(id);
  const all0 = S.sozlesmeler.filter(inSir), all = all0.filter(z => szT === 'hepsi' || z.tur === szT);
  const list = all.filter(z => szF === 'hepsi' || (szF === 'aktif' ? !sozBitti(z) : sozBitti(z))).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<div class="hd"><div><h1>Sözleşme ve siparişler</h1><p>Açık ihale sözleşmeleri, doğrudan temin işleri ve piyasa siparişleri; parçalı teslim takvimi ve teminatlar.</p></div></div>
    ${sirNote()}
    ${turSeg(szT, k => k === 'hepsi' ? all0.length : all0.filter(z => z.tur === k).length)}<br>
    <div class="seg">${[['aktif', 'Devam eden'], ['bitti', 'Tamamlanan'], ['hepsi', 'Tümü']].map(([k, ad]) => `<button data-f="${k}" class="${szF === k ? 'on' : ''}">${ad}</button>`).join('')}</div>
    <div class="card">${tbl([['Sözleşme'], ['Kurum'], ...(F ? [['Tutar', 'r']] : []), ['Teslim edilen'], ['Sonraki teslim'], ['Kesin teminat']],
      list.map(z => { const nx = z.plan.find(p => p.tarih >= TODAY); return `<tr class="click" data-go="sozlesmeler/${z.id}"><td data-l="Sözleşme"><b>${esc(z.no)}</b><div class="small muted">${esc(turAd(z.tur))}, ${esc(ihale(z.ihId).ikn)}</div></td>
        <td data-l="Kurum">${kurumAd(z.k)}${sirCol(z)}</td>${F ? `<td data-l="Tutar" class="r num">${money0(sozTutar(z))}</td>` : ''}
        <td data-l="Teslim" style="min-width:150px">${prog(sozOran(z))}</td>
        <td data-l="Sonraki teslim" class="small">${sozBitti(z) ? 'Tamamlandı' : nx ? trDate(nx.tarih) + ', ' + gunTxt(nx.tarih) : '<span class="bad">Takvim geçti</span>'}</td>
        <td data-l="Kesin teminat" class="small">${!z.kesin ? '<span class="muted">Teminat yok</span>' : z.kesin.iade ? tag('İade alındı', 'g') : sozBitti(z) ? tag('İade istenecek', 'a') : tag('Kurumda', '')}</td></tr>`; }))}</div>`;
  $$('[data-f]').forEach(b => b.onclick = () => { szF = b.dataset.f; route(); });
  $$('#turSeg [data-t]').forEach(b => b.onclick = () => { szT = b.dataset.t; route(); });
  bindClicks();
};
function sozDetay(id) {
  const z = soz(id), svs = S.sevkiyatlar.filter(v => v.szId === z.id), ems = S.emirler.filter(e => e.szId === z.id && e.durum !== 'tamamlandi');
  const tes = svs.filter(v => v.durum === 'teslim');
  const ciro = tes.reduce((t, v) => t + svCiro(v), 0), umal = tes.reduce((t, v) => t + svUrunMaliyet(v), 0), nak = svs.reduce((t, v) => t + v.nakliye.bedel, 0);
  const sevkCiro = svs.reduce((t, v) => t + svCiro(v), 0), nk = k => svs.reduce((t, v) => t + (v.nakliye[k] || 0), 0);
  view.innerHTML = `<a class="back" href="#sozlesmeler">Sözleşme ve siparişlere dön</a>
    <div class="hd"><div><h1>${esc(z.no)}, ${kurumAd(z.k)}</h1><p>${szTag(z)} &nbsp; ${esc(turAd(z.tur))}, tarih ${trDate(z.tarih)}</p></div>
      <div class="acts">${can('uretim') && !sozBitti(z) && !z.kapanis ? '<button class="btn" id="aEmir">Üretim emri oluştur</button>' : ''}${can('sevkiyat') && !sozBitti(z) && !z.kapanis ? `<a class="btn alt" href="#sevkiyat/yeni-${z.id}">Sevkiyat oluştur</a>` : ''}<a class="btn ${z.kapanis ? 'alt' : 'acc'}" href="#sozlesmeler/kapanis-${z.id}" id="aKapanis">${z.kapanis ? 'Kapanış özeti' : 'Dosyayı kapat'}</a></div></div>
    <div class="meta">
      <div><small>${noEtiket(z.tur)}</small><b>${can('ihaleler') ? `<a href="#ihaleler/${z.ihId}">${esc(ihale(z.ihId).ikn)}</a>` : esc(ihale(z.ihId).ikn)}</b></div>
      <div><small>Şirket</small><b>${esc(sirket(z.sir).kisa)}</b></div>
      ${F ? `<div><small>Güncel sözleşme bedeli (KDV hariç)</small><b class="num">${money0(guncelBedel(z))}</b>${degNet(z) ? `<div class="small muted">Ana bedel ${money0(sozTutar(z))}</div>` : ''}</div>` : ''}
      <div><small>Genel teslim</small>${prog(sozOran(z))}</div>
      ${F && svs.length ? `<div><small>Nakliye / ana fatura tutarı</small><b class="num" id="szOran">${pct(sevkCiro ? nak / sevkCiro : 0)}</b><div class="small muted">${money0(nak)} / ${money0(sevkCiro)}</div></div>` : ''}
    </div>
    <div class="card"><h2>Kalemler ve teslim durumu</h2>
      ${tbl([['Ürün ve ambalaj'], ['Sözleşme', 'r'], ['Teslim edilen (kabul)', 'r'], ['Muayenede ret', 'r'], ['Yolda / hazırlanıyor', 'r'], ['Kalan', 'r'], ['İlerleme'], ...(F ? [['Birim fiyat', 'r'], ['Tutar', 'r']] : []), ['', 'r']],
        z.kalemler.map((x, n) => { const t = teslimEdilen(z, x.uid), y = yoldaMik(z, x.uid), rd = reddedilen(z, x.uid); return `<tr><td data-l="Ürün"><div class="kk">${urunImg(x.uid, x.amb)}<div>${esc(urun(x.uid).ad)}<div class="small muted">${esc(x.amb || '')}</div></div></div></td><td data-l="Sözleşme" class="r num">${nf(x.mik)}</td>
          <td data-l="Teslim edilen" class="r num">${nf(t)}</td><td data-l="Ret" class="r num ${rd ? 'bad' : ''}">${nf(rd)}</td><td data-l="Yolda" class="r num">${nf(y)}</td><td data-l="Kalan" class="r num"><b>${nf(Math.max(0, x.mik - t))}</b></td>
          <td data-l="İlerleme" style="min-width:130px">${prog(t / x.mik)}</td>${F ? `<td data-l="Birim fiyat" class="r num">${money(x.fiyat)}</td><td data-l="Tutar" class="r num">${money0(x.mik * x.fiyat)}</td>` : ''}<td class="r"><button class="linkbtn" data-tek="${n}">Teknik bilgi</button></td></tr>`; }))}
    </div>
    ${dagVar(z) || S.teslimYerleri.some(t => t.k === z.k) && z.tur === 'acik' ? dagilimTablo(z, true, !z.kapanis) : ''}
    ${bedelKart(z)}
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><h2>Teslim takvimi</h2>
        ${z.plan.map(p => { const d = diffDays(p.tarih, TODAY); return `<div class="uy ${d < 0 && !sozBitti(z) ? '' : ''}"><span>${esc(p.not)}</span><span class="t">${trDate(p.tarih)}, ${d < 0 ? 'geçti' : gunTxt(p.tarih)}</span></div>`; }).join('')}
      </div>
      ${!z.kesin ? `<div class="card"><h2>Teminat</h2><p class="small muted">${esc(turAd(z.tur))} işi; kesin teminat mektubu alınmadı.</p></div>` : `<div class="card"><h2>Kesin teminat mektubu</h2>
        <div class="meta" style="border:0;padding:0;margin:0">
          ${F ? `<div><small>Tutar</small><b class="num">${money0(z.kesin.tutar)}</b></div>` : ''}
          <div><small>Tür</small><b>${z.kesin.tur === 'nakit' ? 'Nakit' : 'Teminat mektubu'}</b></div><div><small>Mektup no</small><b>${esc(z.kesin.no)}</b></div><div><small>Banka</small><b>${esc(z.kesin.banka)}</b></div><div><small>Veriliş</small><b>${trDate(z.kesin.verilis)}</b></div>
          <div><small>Durum</small><b>${z.kesin.iade ? 'İade alındı, ' + trDate(z.kesin.iadeTarih) : sozBitti(z) ? 'İş bitti, iade istenecek' : 'Kurumda (iş sürüyor)'}</b></div>
        </div>
        ${!z.kesin.iade && sozBitti(z) && (can('fatura') || ME.rol === 'yonetici') ? '<button class="btn alt sm" id="kIade" style="margin-top:10px">İade alındı olarak işaretle</button>' : ''}${can('teminat') ? ' <a class="small" href="#teminat/kesin">Verilen teminatlar</a>' : ''}
        ${!sozBitti(z) ? '<p class="small muted" style="margin-top:8px">Tüm teslimler ve kabul tutanakları tamamlanınca iade talebi hatırlatılır.</p>' : ''}
      </div>`}
    </div>
    ${M ? `<div class="card" style="margin-top:14px"><h2>Kârlılık (teslim edilenler üzerinden)</h2>
      <div class="meta" style="border:0;padding:0;margin:0">
        <div><small>Teslim edilen tutar</small><b class="num">${money0(ciro)}</b></div><div><small>Ürün maliyeti (parti maliyetleri)</small><b class="num">${money0(umal)}</b></div>
        <div><small>İhale giderleri (damga, karar pulu, doküman)</small><b class="num">${money0(ihGider(ihale(z.ihId)))}</b></div>
        <div><small>Nakliye maliyeti</small><b class="num">${money0(nak)}</b><div class="small muted">Taşıma ${money0(nk('tasima'))}, hamaliye ${money0(nk('hamaliye'))}, forklift ${money0(nk('forklift'))}</div></div><div><small>Brüt kâr</small><b class="num ${ciro - umal - nak - ihGider(ihale(z.ihId)) < 0 ? 'bad' : 'ok'}">${money0(ciro - umal - nak - ihGider(ihale(z.ihId)))}</b>${ciro ? `<div class="small muted">%${nf((ciro - umal - nak - ihGider(ihale(z.ihId))) / ciro * 100, 1)}</div>` : ''}</div>
      </div></div>` : ''}
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><h2>Açık üretim emirleri</h2>${ems.map(e => `<div class="uy"><a href="#uretim/${e.id}">${esc(e.no)}, ${esc(urun(e.uid).ad)}, ${nf(e.mik)} adet</a>${emTag(e)}</div>`).join('') || '<p class="empty">Açık emir yok.</p>'}</div>
      <div class="card"><h2>Sevkiyatlar</h2>${svs.map(v => `<div class="uy"><a href="#sevkiyat/${v.id}">${esc(v.no)}, ${trDate(v.tarih)}</a>${svTag(v)}</div>`).join('') || '<p class="empty">Henüz sevkiyat yok.</p>'}</div>
    </div>`;
  const b = $('#aEmir'); if (b) b.onclick = () => emirModal(z.id);
  $$('[data-tek]').forEach(x => x.onclick = () => teknikModal(z.kalemler[+x.dataset.tek], route));
  bindDagilim(z);
  const de = $('#degEkle'); if (de) de.onclick = () => degModal(z);
  const k = $('#kIade'); if (k) k.onclick = () => { z.kesin.iade = true; z.kesin.iadeTarih = TODAY; save(); toast('Kesin teminat iade alındı; kurum carisinden düşüldü.'); route(); };
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
  if (id && id.startsWith('ty-') && tyBy(id.slice(3))) return tyKart(id.slice(3));
  if (id && kurum(id)) return kurumDetay(id);
  view.innerHTML = `<div class="hd"><div><h1>Kurumlar ve müşteriler</h1><p>Kamu kurumları ve piyasa müşteri firmaları; ihaleleri, siparişleri, sevkiyatları ve alacakları tek yerde.</p></div><button class="btn" id="yk">Yeni kurum / müşteri</button></div>
    <div class="card">${tbl([['Kurum / müşteri'], ['Tür'], ['İl'], ['İhale'], ['Aktif sözleşme'], ['Ödeme vadesi'], ...(F ? [['Alacak', 'r']] : [])],
      S.kurumlar.map(k => { const al = S.faturalar.filter(f => f.k === k.id && inSir(f)).reduce((t, f) => t + kalanF(f), 0), gec = S.faturalar.some(f => f.k === k.id && gecikti(f) && inSir(f));
        return `<tr class="click" data-go="kurumlar/${k.id}"><td data-l="Kurum"><b>${esc(k.ad)}</b></td><td data-l="Tür" class="small">${k.tip === 'firma' ? 'Piyasa müşterisi' : 'Kamu kurumu'}</td><td data-l="İl">${esc(k.il)}</td>
        <td data-l="İhale">${S.ihaleler.filter(i => i.k === k.id && inSir(i)).length}</td><td data-l="Aktif sözleşme">${S.sozlesmeler.filter(z => z.k === k.id && !sozBitti(z) && inSir(z)).length}</td>
        <td data-l="Vade">${k.vade} gün</td>${F ? `<td data-l="Alacak" class="r num ${gec ? 'bad' : ''}">${money0(al)}</td>` : ''}</tr>`; }))}</div>`;
  bindClicks();
  $('#yk').onclick = () => modal('Yeni kurum / müşteri', `<label class="f"><span>Ad / unvan</span><input class="inp" id="ka"></label>
    <label class="f"><span>Tür</span><select class="inp" id="ktip"><option value="kamu">Kamu kurumu</option><option value="firma">Piyasa müşterisi (firma)</option></select></label>
    <div class="fg"><label class="f"><span>İl</span><input class="inp" id="ki"></label><label class="f"><span>Ödeme vadesi (gün)</span><input class="inp" id="kv" value="30"></label></div>
    <label class="f"><span>Yetkili / birim</span><input class="inp" id="ky"></label><label class="f"><span>Telefon</span><input class="inp" id="kt"></label>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="kok">Kaydet</button></div>`, m => {
    $('#kok', m).onclick = () => { const ad = $('#ka', m).value.trim(); if (!ad) return toast('Kurum adı girin.');
      S.kurumlar.push({ id: 'k' + (++S.seq.kur), ad, il: $('#ki', m).value, vkn: '', yetkili: $('#ky', m).value, tel: $('#kt', m).value, vade: parseInt($('#kv', m).value) || 30, tip: $('#ktip', m).value }); save(); m.remove(); toast('Kurum eklendi.'); route(); };
  });
};
function kurumDetay(id) {
  const k = kurum(id), ih = S.ihaleler.filter(i => i.k === id && inSir(i)), sz = S.sozlesmeler.filter(z => z.k === id && inSir(z)), sv = S.sevkiyatlar.filter(v => v.k === id && inSir(v)), ft = S.faturalar.filter(f => f.k === id && inSir(f));
  view.innerHTML = `<a class="back" href="#kurumlar">Kurumlar ve müşterilere dön</a>
    <div class="hd"><div><h1>${esc(k.ad)}</h1><p>${k.tip === 'firma' ? 'Piyasa müşterisi' : 'Kamu kurumu'}, ${esc(k.il)}, ödeme vadesi ${k.vade} gün</p></div>${F && can('fatura') ? `<a class="btn alt" href="belge.html?tip=ekstre&id=${k.id}">Kurum ekstresi</a>` : ''}</div>
    <div class="meta"><div><small>Yetkili</small><b>${esc(k.yetkili)}</b></div><div><small>Telefon</small><b>${esc(k.tel)}</b></div><div><small>VKN</small><b>${esc(k.vkn)}</b></div>
      ${F ? `<div><small>Fatura alacağı</small><b class="num">${money0(ft.reduce((t, f) => t + kalanF(f), 0))}</b></div><div><small>Teminat alacağı (kurumda bekleyen)</small><b class="num" id="kTem">${money0(teminatAlacak(k.id))}</b></div>` : ''}</div>
    <div class="card" style="margin-bottom:14px"><div class="card-h"><h2>Teslim yerleri (hastane, depo)</h2><button class="btn sm alt" id="tyEkle">Teslim yeri ekle</button></div>
      ${S.teslimYerleri.filter(t => t.k === k.id).map(t => `<div class="uy ${t.notlar.some(n => n.uyari) ? 'al' : ''}"><span><a href="#kurumlar/ty-${t.id}">${esc(t.ad)}</a><br><span class="small muted">${esc(t.yetkili)}, ${esc(t.saat)}</span></span><span class="t">${t.notlar.length} not${t.notlar.some(n => n.uyari) ? ', uyarı var' : ''}</span></div>`).join('') || '<p class="empty">Teslim yeri yok; tek adrese teslim ediliyor.</p>'}</div>
    <div class="grid2e">
      <div class="card"><h2>İhale ve teklifler</h2>${ih.map(i => `<div class="uy"><a href="#ihaleler/${i.id}">${esc(i.ikn)}, ${esc(i.konu)}</a>${ihTag(i)}</div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>
      <div class="card"><h2>Sözleşmeler</h2>${sz.map(z => `<div style="padding:6px 0"><a href="#sozlesmeler/${z.id}">${esc(z.no)}</a>${prog(sozOran(z))}</div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>
      <div class="card"><h2>Sevkiyatlar ve partiler</h2>${sv.map(v => `<div class="uy"><span><a href="#sevkiyat/${v.id}">${esc(v.no)}</a> <span class="small muted">${v.kalemler.map(l => esc(parti(l.partiId).no)).join(', ')}</span></span>${svTag(v)}</div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>
      ${F ? `<div class="card"><h2>Faturalar ve alacak</h2>${ft.map(f => `<div class="uy ${gecikti(f) ? 'al' : ''}"><span>${esc(f.no)} <span class="small muted">${FATURA_TUR[f.tur]}</span><br><span class="small muted">Vade ${trDate(f.vade)}</span></span><b class="num">${kalanF(f) > 0.5 ? money0(kalanF(f)) : '<span class="ok">Ödendi</span>'}</b></div>`).join('') || '<p class="empty">Kayıt yok.</p>'}</div>` : ''}
    </div>`;
  $('#tyEkle').onclick = () => tyEkleModal(k.id);
}


/* ---- v4: bedel karşılaştırma, iş artışı / eksilişi ---- */
function bedelKart(z) {
  if (!F) return '';
  const deg = z.degisiklik || [], net = degNet(z), gb = guncelBedel(z), ft = sozFatura(z), fark = gb - ft;
  const pctTop = deg.reduce((t, d) => t + (d.tip === 'artis' ? d.yuzde : -d.yuzde), 0);
  return `<div class="card" id="bedelKart"><div class="card-h"><h2>Sözleşme bedeli, iş artışı / eksilişi</h2>${z.kapanis ? '' : '<button class="btn sm alt" id="degEkle">İş artışı / eksilişi ekle</button>'}</div>
    <div class="meta" style="border:0;padding:0;margin:0 0 10px">
      <div><small>Ana sözleşme bedeli</small><b class="num">${money0(sozTutar(z))}</b></div>
      <div><small>İş artışı / eksilişi (net)</small><b class="num ${net < 0 ? 'bad' : ''}">${net >= 0 ? '+' : '−'}${money0(Math.abs(net))}</b><div class="small muted">%${nf(pctTop, 1)} (sınır ±%20)</div></div>
      <div><small>Güncel sözleşme bedeli</small><b class="num" id="gBedel">${money0(gb)}</b></div>
      <div><small>Kesilen toplam fatura (KDV hariç)</small><b class="num" id="kFatura">${money0(ft)}</b></div>
      <div><small>Fark (faturalanacak)</small><b class="num ${fark < 0 ? 'bad' : ''}" id="bFark">${money0(fark)}</b></div>
    </div>
    ${deg.map(d => `<div class="uy"><span>${trDate(d.tarih)}, ${d.tip === 'artis' ? 'iş artışı' : 'iş eksilişi'} %${nf(d.yuzde, 1)}${d.ack ? ', ' + esc(d.ack) : ''}</span><b class="num ${d.tip === 'artis' ? '' : 'bad'}">${d.tip === 'artis' ? '+' : '−'}${money0(d.tutar)}</b></div>`).join('')}
    ${(z.ekTeminat || []).map(t => `<div class="uy"><span>İş artışı kesin teminatı, ${esc(t.no)}, ${t.tur === 'nakit' ? 'nakit' : esc(t.banka)}</span><b class="num">${money0(t.tutar)}</b></div>`).join('')}
  </div>`;
}
function degModal(z) {
  const ana = sozTutar(z), mevcut = (z.degisiklik || []).reduce((t, d) => t + (d.tip === 'artis' ? d.yuzde : -d.yuzde), 0);
  modal('İş artışı / eksilişi', `<p class="small muted" style="margin-bottom:12px">Ana bedel ${money0(ana)}. Toplam değişiklik ±%20'yi geçemez (şu an %${nf(mevcut, 1)}). İş artışında ek kesin teminat (%6) verilir ve kurum carisine alacak yazılır.</p>
    <div class="fg"><label class="f"><span>Tür</span><select class="inp" id="dtip"><option value="artis">İş artışı</option><option value="eksilis">İş eksilişi</option></select></label>
      <label class="f"><span>Yüzde</span><input class="inp" id="dyuz" inputmode="decimal" placeholder="Örn. 20"></label>
      <label class="f"><span>Tutar (₺, KDV hariç)</span><input class="inp" id="dtut" inputmode="decimal"></label>
      <label class="f"><span>Tarih</span><input class="inp" type="date" id="dtar" value="${TODAY}"></label></div>
    <label class="f"><span>Açıklama</span><input class="inp" id="dack" placeholder="Örn. İdare yazısı ile %20 iş artışı"></label>
    <div id="dtem" class="fg">${z.kesin ? `<label class="f"><span>Ek kesin teminat türü</span><select class="inp" id="dttur"><option value="mektup">Teminat mektubu</option><option value="nakit">Nakit</option></select></label>
      <label class="f"><span>Ek kesin teminat (₺)</span><input class="inp" id="dtt" inputmode="decimal"></label>
      <label class="f"><span>Banka</span><input class="inp" id="dtb" value="${esc(z.kesin.banka)}"></label><label class="f"><span>Mektup no</span><input class="inp" id="dtno" value="KTM-2026-0${600 + (z.ekTeminat || []).length + S.sozlesmeler.indexOf(z)}"></label>` : '<p class="small muted">Bu iş türünde teminat yok.</p>'}</div>
    <p class="small bad hide" id="derr"></p>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="dok">Kaydet</button></div>`, m => {
    const sync = () => { const y = numIn($('#dyuz', m).value) || 0, t = Math.round(ana * y / 100); $('#dtut', m).value = t || ''; if ($('#dtt', m)) $('#dtt', m).value = Math.round(t * 0.06) || ''; $('#dtem', m).classList.toggle('hide', $('#dtip', m).value !== 'artis'); };
    $('#dyuz', m).oninput = sync; $('#dtip', m).onchange = sync; sync();
    $('#dok', m).onclick = () => {
      const tip = $('#dtip', m).value, yuzde = numIn($('#dyuz', m).value), tutar = numIn($('#dtut', m).value), err = t => { $('#derr', m).textContent = t; $('#derr', m).classList.remove('hide'); };
      if (!(yuzde > 0) || !(tutar > 0)) return err('Yüzde ve tutar girin.');
      const yeni = mevcut + (tip === 'artis' ? yuzde : -yuzde); if (Math.abs(yeni) > 20.0001) return err(`Toplam değişiklik %${nf(yeni, 1)} olur; sınır ±%20.`);
      z.degisiklik = z.degisiklik || []; z.degisiklik.push({ tarih: $('#dtar', m).value, tip, yuzde, tutar, ack: $('#dack', m).value.trim() });
      if (tip === 'artis' && z.kesin && $('#dtt', m) && numIn($('#dtt', m).value) > 0) { z.ekTeminat = z.ekTeminat || []; z.ekTeminat.push({ tur: $('#dttur', m).value, tutar: numIn($('#dtt', m).value), banka: $('#dtb', m).value, no: $('#dtno', m).value, verilis: $('#dtar', m).value, iade: false, iadeTarih: null, talep: null, artis: true }); }
      save(); m.remove(); toast(tip === 'artis' ? 'İş artışı kaydedildi; ek kesin teminat teminatlara ve kurum carisine eklendi.' : 'İş eksilişi kaydedildi.'); route();
    };
  });
}

/* ---- v4: ihale dosyası kapanışı ---- */
function sozKapanis(id) {
  const z = soz(id), ih = ihale(z.ihId), tl = teminatlar().filter(x => x.szId === z.id || x.id === 'g-' + z.ihId), ft = S.faturalar.filter(f => f.szId === z.id);
  const rows = z.kalemler.map(x => { const tes = teslimEdilen(z, x.uid), red = reddedilen(z, x.uid), fat = faturalanan(z, x.uid); return { x, tes, red, fat, eks: x.mik - tes, ff: tes - fat }; });
  const uy = [];
  rows.forEach(r => { if (r.eks > 0) uy.push(`${urun(r.x.uid).ad}: ${nf(r.eks)} adet eksik teslim`); if (r.eks < 0) uy.push(`${urun(r.x.uid).ad}: ${nf(-r.eks)} adet fazla teslim`); if (r.ff > 0) uy.push(`${urun(r.x.uid).ad}: ${nf(r.ff)} adet teslim edildi ama faturalanmadı`); if (r.ff < 0) uy.push(`${urun(r.x.uid).ad}: ${nf(-r.ff)} adet fazla faturalandı`); });
  tl.filter(x => !x.t.iade).forEach(x => uy.push(`${x.cins === 'gecici' ? 'Geçici' : x.alt ? 'İş artışı' : 'Kesin'} teminat iade alınmadı (${F ? money0(x.t.tutar) : x.t.no || ''})`));
  ft.filter(f => kalanF(f) > 0.5).forEach(f => uy.push(`${f.no} faturasında tahsil edilmemiş ${F ? money0(kalanF(f)) : 'tutar'} var`));
  dagHata(z).forEach(x => uy.push(`${urun(x.uid).ad}: teslim yeri dağılımı ana miktarla tutmuyor`));
  const kp = z.kapanis;
  view.innerHTML = `<a class="back" href="#sozlesmeler/${z.id}">Sözleşmeye dön</a>
    <div class="hd"><div><h1>Dosya kapanışı: ${esc(z.no)}</h1><p>${esc(ih.ikn)}, ${kurumAd(z.k)}. Kalem bazında sözleşme, teslim ve fatura mutabakatı.</p></div>${kp ? tag('Dosya kapandı, ' + trDate(kp.tarih), 'g') : ''}</div>
    <div class="card"><h2>Kalem mutabakatı</h2>${tbl([['Kalem'], ['Sözleşme', 'r'], ['Teslim edilen (kabul)', 'r'], ['Muayenede ret', 'r'], ['Faturalanan', 'r'], ['Durum']],
      rows.map(r => `<tr class="${r.eks || r.ff ? 'crit' : ''}" data-mut="${r.x.uid}"><td data-l="Kalem">${esc(urun(r.x.uid).ad)}<div class="small muted">${esc(r.x.amb || '')}</div></td><td data-l="Sözleşme" class="r num">${nf(r.x.mik)}</td><td data-l="Teslim" class="r num">${nf(r.tes)}</td>
        <td data-l="Ret" class="r num ${r.red ? 'bad' : ''}">${nf(r.red)}</td><td data-l="Faturalanan" class="r num">${nf(r.fat)}</td>
        <td data-l="Durum" class="small">${!r.eks && !r.ff ? tag('Tamam', 'g') : [r.eks > 0 ? `Eksik teslim ${nf(r.eks)}` : r.eks < 0 ? `Fazla teslim ${nf(-r.eks)}` : '', r.ff > 0 ? `Faturalanmamış ${nf(r.ff)}` : r.ff < 0 ? `Fazla fatura ${nf(-r.ff)}` : ''].filter(Boolean).map(t => `<span class="bad">${t}</span>`).join('<br>')}</td></tr>`))}</div>
    <div class="grid2e" style="margin-top:14px">
      <div class="card"><h2>Teminat iade durumu</h2>${tl.map(x => `<div class="uy ${x.t.iade ? '' : 'al'}"><span>${x.cins === 'gecici' ? 'Geçici' : x.alt ? 'İş artışı kesin' : 'Kesin'} teminat${F ? ', ' + money0(x.t.tutar) : ''}</span><b>${x.t.iade ? '<span class="ok">İade alındı</span>' : 'Kurumda'}</b></div>`).join('') || '<p class="empty">Teminat yok.</p>'}</div>
      ${F ? `<div class="card"><h2>Fatura ve tahsilat</h2>${ft.map(f => `<div class="uy ${kalanF(f) > 0.5 ? 'al' : ''}"><span>${esc(f.no)}</span><b class="num">${kalanF(f) > 0.5 ? 'Kalan ' + money0(kalanF(f)) : '<span class="ok">Tahsil edildi</span>'}</b></div>`).join('') || '<p class="empty">Fatura yok.</p>'}
        <div class="uy"><span>Güncel sözleşme bedeli / kesilen fatura</span><b class="num">${money0(guncelBedel(z))} / ${money0(sozFatura(z))}</b></div></div>` : ''}
    </div>
    ${uy.length ? `<div class="note w" id="kapUyari" style="margin-top:14px"><b>${uy.length} uyarı:</b><ul style="margin:4px 0 0 18px">${uy.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '<div class="note" id="kapUyari" style="margin-top:14px">Mutabakat tamam: tüm kalemler teslim edildi ve faturalandı, teminatlar iade alındı.</div>'}
    <div class="card" style="margin-top:14px"><h2>Kapanış notu</h2>
      ${kp ? `<p>${esc(kp.not) || '<span class="muted">Not yok.</span>'}</p><p class="small muted" style="margin-top:6px">${esc(kp.kisi)}, ${trDate(kp.tarih)}${kp.uyari ? ', ' + kp.uyari + ' açık uyarıyla kapatıldı' : ''}</p>`
      : `<textarea class="inp" id="kapNot" rows="3" placeholder="Örn. Ceyhan'daki 20 bidon ret ikame edilmeyecek, idare ile mutabık kalındı."></textarea>
        ${uy.length ? '<label class="chk" style="margin-top:8px"><input type="checkbox" id="kapOnay"><span>Uyarıları gördüm, dosyayı yine de kapat</span></label>' : ''}
        <div class="acts" style="margin-top:10px"><button class="btn acc" id="kapBtn">Dosyayı kapat</button></div>`}</div>`;
  const b = $('#kapBtn'); if (b) b.onclick = () => { if (uy.length && !$('#kapOnay').checked) return toast('Açık uyarılar var; kapatmak için onay kutusunu işaretleyin.'); z.kapanis = { tarih: TODAY, not: $('#kapNot').value.trim(), kisi: ME.ad, uyari: uy.length }; save(); toast('İhale dosyası kapatıldı.'); route(); };
}

/* ---- v4: teslim yeri kartı ---- */
function tyKart(id) {
  const t = tyBy(id), k = kurum(t.k), svs = S.sevkiyatlar.filter(v => v.tyId === id).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<a class="back" href="#kurumlar/${k.id}">${esc(k.ad)}</a>
    <div class="hd"><div><h1>${esc(t.ad)}</h1><p>Teslim yeri kartı. Notlar bir sonraki sevkiyatta ve fatura kesiminde sarı kutuda çıkar.</p></div></div>
    <div class="grid2e">
      <div class="card"><h2>Teslim bilgileri</h2>
        <label class="f"><span>Adres</span><input class="inp" id="tyAdr" value="${esc(t.adres)}"></label>
        <div class="fg"><label class="f"><span>Depo yetkilisi / sorumlusu</span><input class="inp" id="tyYet" value="${esc(t.yetkili)}"></label><label class="f"><span>Telefon</span><input class="inp" id="tyTel" value="${esc(t.tel)}"></label></div>
        <label class="f"><span>Mal kabul saatleri</span><input class="inp" id="tySaat" value="${esc(t.saat)}"></label>
        <div class="fg"><label class="f"><span>Rampa / indirme</span><input class="inp" id="tyRam" value="${esc(t.rampa)}"></label><label class="f"><span>Hamaliye ücreti (₺, yaklaşık)</span><input class="inp" id="tyHam" value="${t.hamaliye || 0}" inputmode="decimal"></label></div>
        <label class="chk"><input type="checkbox" id="tyFork" ${t.forklift ? 'checked' : ''}><span>Teslim yerinde forklift var</span></label>
        <button class="btn" id="tyKay" style="margin-top:10px">Kaydet</button></div>
      <div class="card"><h2>Notlar ve yaşanan sorunlar</h2>
        <textarea class="inp" id="tyNot" rows="2" placeholder="Örn. Depo sorumlusu teslimden önce aranmalı"></textarea>
        <div class="acts" style="margin-top:8px"><label class="chk"><input type="checkbox" id="tyUy"><span>Uyarı olarak işaretle</span></label><button class="btn sm" id="tyNotEkle">Not ekle</button></div>
        ${t.notlar.slice().sort((a, b) => b.tarih.localeCompare(a.tarih)).map(n => `<div class="uy ${n.uyari ? 'al' : ''}"><span>${n.uyari ? '<b>Uyarı.</b> ' : ''}${esc(n.metin)}<br><span class="small muted">${trDate(n.tarih)}, ${esc(n.kim)}, ${n.kaynak === 'fatura' ? 'fatura teslimi' : n.kaynak === 'kart' ? 'kart' : 'sevkiyat'}</span></span></div>`).join('') || '<p class="empty">Not yok.</p>'}</div>
    </div>
    <div class="card" style="margin-top:14px"><h2>Bu teslim yerine sevkiyatlar</h2>${svs.map(v => `<div class="uy"><span><a href="#sevkiyat/${v.id}">${esc(v.no)}</a>, ${trDate(v.tarih)}, ${v.kalemler.map(l => nf(l.mik) + ' ' + esc(urun(l.uid).ad)).join(', ')}</span>${svTag(v)}</div>`).join('') || '<p class="empty">Henüz sevkiyat yok.</p>'}</div>`;
  $('#tyKay').onclick = () => { Object.assign(t, { adres: $('#tyAdr').value, yetkili: $('#tyYet').value, tel: $('#tyTel').value, saat: $('#tySaat').value, rampa: $('#tyRam').value, hamaliye: numIn($('#tyHam').value) || 0, forklift: $('#tyFork').checked }); save(); toast('Teslim yeri kartı kaydedildi.'); };
  $('#tyNotEkle').onclick = () => { const m = $('#tyNot').value.trim(); if (!m) return toast('Not yazın.'); t.notlar.push({ tarih: TODAY, metin: m, kaynak: 'kart', uyari: $('#tyUy').checked, kim: ME.ad }); save(); toast('Not eklendi; sonraki sevkiyatta görünecek.'); route(); };
}
function tyEkleModal(kId) {
  modal('Teslim yeri ekle', `<label class="f"><span>Teslim yeri adı</span><input class="inp" id="tya" placeholder="Örn. Kozan Devlet Hastanesi"></label><label class="f"><span>Adres</span><input class="inp" id="tyad"></label>
    <div class="fg"><label class="f"><span>Depo yetkilisi</span><input class="inp" id="tyy"></label><label class="f"><span>Telefon</span><input class="inp" id="tyt"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="tyok">Ekle</button></div>`, m => {
    $('#tyok', m).onclick = () => { const ad = $('#tya', m).value.trim(); if (!ad) return toast('Ad girin.'); const t = { id: 'ty' + Date.now(), k: kId, ad, adres: $('#tyad', m).value, yetkili: $('#tyy', m).value, tel: $('#tyt', m).value, saat: 'Hafta içi 09:00–16:00', forklift: false, hamaliye: 0, rampa: '', notlar: [] }; S.teslimYerleri.push(t); save(); m.remove(); location.hash = 'kurumlar/ty-' + t.id; };
  });
}

if (ME) shell();
