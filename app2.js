/* Üretim, kalite, sevkiyat, cari/fatura, ürünler, stok, personel, raporlar */
const LOCK = '<span class="lock"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>Kalite onayı yok</span>';
const tabsHtml = (list, cur) => `<div class="tabs">${list.map(([k, ad]) => `<button data-tab="${k}" class="${cur === k ? 'on' : ''}">${ad}</button>`).join('')}</div>`;
const bindTabs = (base) => $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = base + '/' + b.dataset.tab; });
const szAd = id => { const z = soz(id); return z ? esc(z.no) + ', ' + kurumAd(z.k) : 'Stok için'; };

/* ============ ÜRETİM ============ */
let emF = 'acik';
ROUTES.uretim = function (id) {
  if (id && emir(id)) return emirDetay(id);
  const all = S.emirler.filter(inSir), list = all.filter(e => emF === 'hepsi' || (emF === 'acik' ? e.durum !== 'tamamlandi' : e.durum === 'tamamlandi')).sort((a, b) => emF === 'acik' ? a.termin.localeCompare(b.termin) : b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<div class="hd"><div><h1>Üretim</h1><p>Sözleşmeye bağlı veya stok için üretim emirleri. Tamamlanan emir parti numarası alır ve kalite kontrole düşer.</p></div><button class="btn" id="stokEmir">Stok için üretim emri</button></div>
    ${sirNote()}
    <div class="seg">${[['acik', 'Açık emirler'], ['bitti', 'Tamamlanan'], ['hepsi', 'Tümü']].map(([k, ad]) => `<button data-f="${k}" class="${emF === k ? 'on' : ''}">${ad} (${k === 'hepsi' ? all.length : all.filter(e => k === 'acik' ? e.durum !== 'tamamlandi' : e.durum === 'tamamlandi').length})</button>`).join('')}</div>
    <div class="card">${tbl([['Emir'], ['Ürün'], ['Miktar', 'r'], ['Bağlı iş'], ['Termin'], ['Durum'], ['Parti']],
      list.map(e => `<tr class="click" data-go="uretim/${e.id}"><td data-l="Emir"><b>${esc(e.no)}</b>${sirCol(e)}</td><td data-l="Ürün">${esc(urun(e.uid).ad)}</td><td data-l="Miktar" class="r num">${nf(e.mik)}</td>
        <td data-l="Bağlı iş" class="small">${szAd(e.szId)}</td><td data-l="Termin" class="small">${trDate(e.termin)}${e.durum !== 'tamamlandi' ? `<div class="${e.termin < TODAY ? 'bad' : 'muted'}">${gunTxt(e.termin)}</div>` : ''}</td>
        <td data-l="Durum">${emTag(e)}</td><td data-l="Parti">${e.partiId ? esc(parti(e.partiId).no) : '<span class="muted">-</span>'}</td></tr>`))}</div>`;
  $$('[data-f]').forEach(b => b.onclick = () => { emF = b.dataset.f; route(); });
  $('#stokEmir').onclick = () => emirModal(null);
  bindClicks();
};
function ihtiyac(uid, adet) { return urun(uid).recete.map(([hid, m]) => { const h = hm(hid); return { h, m, gerek: +(m * adet).toFixed(3), yeter: h.stok >= m * adet }; }); }
function emirDetay(id) {
  const e = emir(id), u = urun(e.uid), ih = ihtiyac(e.uid, e.mik), eksik = ih.filter(x => !x.yeter), p = e.partiId ? parti(e.partiId) : null;
  const acts = { planlandi: '<button class="btn" id="aBasla">Üretime başla</button>', uretimde: `<button class="btn acc" id="aTamam">Üretimi tamamla</button>`, tamamlandi: p && can('kalite') ? `<a class="btn alt" href="#kalite/${p.id}">Partiyi aç</a>` : '' }[e.durum];
  view.innerHTML = `<a class="back" href="#uretim">Üretime dön</a>
    <div class="hd"><div><h1>${esc(e.no)}, ${esc(u.ad)}</h1><p>${emTag(e)} &nbsp; ${nf(e.mik)} adet, termin ${trDate(e.termin)}</p></div><div class="acts">${acts}</div></div>
    <div class="meta"><div><small>Bağlı iş</small><b>${e.szId && can('sozlesmeler') ? `<a href="#sozlesmeler/${e.szId}">${szAd(e.szId)}</a>` : szAd(e.szId)}</b></div>
      <div><small>Emir tarihi</small><b>${trDate(e.tarih)}</b></div><div><small>Şirket</small><b>${esc(sirket(e.sir).kisa)}</b></div>
      ${p ? `<div><small>Parti</small><b>${esc(p.no)}</b> ${paTag(p)}</div><div><small>Üretilen / fire</small><b>${nf(p.mik)} / ${nf(p.fire)} adet</b></div>${M ? `<div><small>Parti maliyeti</small><b class="num">${money0(p.maliyet)}</b><div class="small muted">Birim ${money(p.maliyet / p.mik)}</div></div>` : ''}` : ''}
    </div>
    ${e.durum !== 'tamamlandi' && eksik.length ? `<div class="note w"><b>Stok yetersiz:</b> ${eksik.map(x => esc(x.h.ad)).join(', ')}. Satın alma girişi yapılmadan üretim tamamlanamaz.</div>` : ''}
    <div class="card"><h2>${e.durum === 'tamamlandi' ? 'Reçete' : 'Reçeteye göre hammadde ihtiyacı'}</h2>
      ${tbl([['Malzeme'], ['1 adet için', 'r'], ['Bu emir için', 'r'], ...(e.durum !== 'tamamlandi' ? [['Stokta', 'r'], ['Durum']] : []), ...(M ? [['Tutar', 'r']] : [])],
        ih.map(x => `<tr class="${e.durum !== 'tamamlandi' && !x.yeter ? 'crit' : ''}"><td data-l="Malzeme">${esc(x.h.ad)}</td><td data-l="1 adet" class="r num">${nf(x.m, 4)} ${x.h.birim}</td><td data-l="Bu emir" class="r num">${nf(x.gerek)} ${x.h.birim}</td>
          ${e.durum !== 'tamamlandi' ? `<td data-l="Stokta" class="r num">${nf(x.h.stok)} ${x.h.birim}</td><td data-l="Durum">${x.yeter ? tag('Yeterli', 'g') : tag('Eksik ' + nf(x.gerek - x.h.stok) + ' ' + x.h.birim, 'r')}</td>` : ''}
          ${M ? `<td data-l="Tutar" class="r num">${money(x.gerek * x.h.fiyat)}</td>` : ''}</tr>`),
        '', M ? `<tfoot><tr><td colspan="${e.durum !== 'tamamlandi' ? 5 : 3}">Hammadde ve ambalaj + işçilik/enerji (${money(u.iscilik)} × ${nf(e.mik)})</td><td class="r num">${money0(ih.reduce((t, x) => t + x.gerek * x.h.fiyat, 0) + u.iscilik * e.mik)}</td></tr></tfoot>` : '')}
    </div>`;
  const on = (q, f) => { const b = $(q); if (b) b.onclick = f; };
  on('#aBasla', () => { e.durum = 'uretimde'; save(); toast('Emir üretimde. Bitince "Üretimi tamamla" deyin.'); route(); });
  on('#aTamam', () => modal('Üretimi tamamla', `<p class="small muted" style="margin-bottom:12px">${esc(u.ad)}. Tamamlanınca parti numarası verilir, reçetedeki hammadde stoktan düşer ve parti kalite kontrole gider.</p>
    <div class="fg"><label class="f"><span>Üretilen sağlam miktar (adet)</span><input class="inp" id="tmik" value="${e.mik}" inputmode="numeric"></label>
    <label class="f"><span>Fire (adet)</span><input class="inp" id="tfire" value="${Math.round(e.mik * 0.008)}" inputmode="numeric"></label></div>
    <p class="small bad hide" id="terr" style="margin-bottom:8px"></p>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="tok">Tamamla ve partiyi oluştur</button></div>`, m => {
    $('#tok', m).onclick = () => {
      const mik = num($('#tmik', m).value), fire = num($('#tfire', m).value) || 0;
      if (!(mik > 0)) return toast('Üretilen miktarı girin.');
      const need = ihtiyac(e.uid, mik + fire), bad = need.filter(x => !x.yeter);
      if (bad.length) { $('#terr', m).textContent = 'Stok yetersiz: ' + bad.map(x => x.h.ad + ' (gereken ' + nf(x.gerek) + ', stok ' + nf(x.h.stok) + ')').join('; '); $('#terr', m).classList.remove('hide'); return; }
      const p = { id: 'p' + Date.now(), no: nextNo(S, 'P', TODAY), sir: e.sir, emirId: e.id, uid: e.uid, mik, fire, tarih: TODAY, skt: dayStr(730), maliyet: Math.round((mik + fire) * birimMaliyet(e.uid)), durum: 'kalite', olcum: null, kkTarih: null, kkKisi: null, kkNot: '' };
      need.forEach(x => { x.h.stok = +(x.h.stok - x.gerek).toFixed(3); S.hareketler.push({ id: 'hr' + (++S.seq.hrk), tarih: TODAY, hid: x.h.id, mik: -x.gerek, tip: 'Üretim', ack: p.no }); });
      S.partiler.push(p); e.partiId = p.id; e.durum = 'tamamlandi'; save(); m.remove();
      toast('Parti ' + p.no + ' oluşturuldu, hammadde stoktan düşüldü, parti kalite kontrole gönderildi.'); route();
    };
  }));
}

/* ============ KALİTE ============ */
ROUTES.kalite = function (id) {
  if (id && parti(id)) return kaliteForm(id);
  const tab = ['onay', 'red'].includes(id) ? id : 'kalite';
  const all = S.partiler.filter(inSir), list = all.filter(p => p.durum === tab).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<div class="hd"><div><h1>Kalite kontrol</h1><p>Her parti ölçülür; onaylanmayan parti sevkiyatta seçilemez. Onaylı partinin analiz raporu yazdırılır.</p></div></div>
    ${tabsHtml([['kalite', `Bekleyen (${all.filter(p => p.durum === 'kalite').length})`], ['onay', 'Onaylı partiler'], ['red', 'Reddedilen']], tab)}
    <div class="card">${tab === 'kalite' ? tbl([['Parti'], ['Ürün'], ['Miktar', 'r'], ['Üretim tarihi'], ['']],
      list.map(p => `<tr class="click" data-go="kalite/${p.id}"><td data-l="Parti"><b>${esc(p.no)}</b>${sirCol(p)}</td><td data-l="Ürün">${esc(urun(p.uid).ad)}</td><td data-l="Miktar" class="r num">${nf(p.mik)}</td><td data-l="Üretim">${trDate(p.tarih)}</td><td class="r"><a class="btn sm" href="#kalite/${p.id}">Ölçüm gir</a></td></tr>`), 'Kalite bekleyen parti yok.')
    : tab === 'onay' ? tbl([['Parti'], ['Ürün'], ['Üretilen', 'r'], ['Depoda kalan', 'r'], ['Gittiği kurumlar'], ['']],
      list.map(p => { const svs = S.sevkiyatlar.filter(v => v.kalemler.some(l => l.partiId === p.id)); return `<tr class="click" data-go="kalite/${p.id}"><td data-l="Parti"><b>${esc(p.no)}</b><div class="small muted">${trDate(p.tarih)}</div></td><td data-l="Ürün">${esc(urun(p.uid).ad)}</td>
        <td data-l="Üretilen" class="r num">${nf(p.mik)}</td><td data-l="Kalan" class="r num">${nf(partiKalan(p))}</td>
        <td data-l="Gittiği yer" class="small">${[...new Set(svs.map(v => kurum(v.k).ad))].map(esc).join(', ') || '<span class="muted">Depoda</span>'}</td>
        <td class="r"><a class="linkbtn" href="belge.html?tip=analiz&id=${p.id}">Analiz raporu</a></td></tr>`; }))
    : tbl([['Parti'], ['Ürün'], ['Miktar', 'r'], ['Neden']], list.map(p => `<tr class="click" data-go="kalite/${p.id}"><td data-l="Parti"><b>${esc(p.no)}</b></td><td data-l="Ürün">${esc(urun(p.uid).ad)}</td><td data-l="Miktar" class="r num">${nf(p.mik)}</td><td data-l="Neden" class="small">${esc(p.kkNot)}</td></tr>`))}</div>`;
  bindTabs('kalite'); bindClicks();
};
function kaliteForm(id) {
  const p = parti(id), u = urun(p.uid), sp = SPEC[u.spec], ed = p.durum === 'kalite';
  const out = (x, v) => v !== '' && v != null && !isNaN(v) && (v < x.min || v > x.max);
  view.innerHTML = `<a class="back" href="#kalite${p.durum === 'kalite' ? '' : '/' + p.durum}">Kalite kontrole dön</a>
    <div class="hd"><div><h1>Parti ${esc(p.no)}, ${esc(u.ad)}</h1><p>${paTag(p)} &nbsp; ${nf(p.mik)} adet, üretim ${trDate(p.tarih)}, emir ${esc(emir(p.emirId) ? emir(p.emirId).no : '')}</p></div>
      ${p.durum === 'onay' ? `<a class="btn alt" href="belge.html?tip=analiz&id=${p.id}">Analiz raporu</a>` : ''}</div>
    <div class="card" style="max-width:820px"><h2>${ed ? 'Ölçüm formu' : 'Ölçüm sonuçları'}</h2>
      ${tbl([['Parametre'], ['Kabul aralığı'], ['Ölçülen']], sp.map(x => `<tr><td data-l="Parametre">${esc(x.ad)}</td><td data-l="Aralık" class="num">${nf(x.min)} – ${nf(x.max)} ${x.bir}</td>
        <td data-l="Ölçülen">${ed ? `<input class="inp sm" data-k="${x.k}" inputmode="decimal" style="width:120px" aria-label="${esc(x.ad)}">` : `<b class="${out(x, p.olcum[x.k]) ? 'bad' : ''}">${nf(p.olcum[x.k])} ${x.bir}</b>`}</td></tr>`)
        .concat([`<tr><td data-l="Parametre">Görünüm, renk, koku</td><td data-l="Aralık">Standart numuneye uygun</td><td data-l="Ölçülen">${ed ? '<select class="inp sm" id="gor"><option>Uygun</option><option>Uygun değil</option></select>' : esc(p.olcum.gorunum)}</td></tr>`]))}
      ${ed ? `<label class="f" style="margin-top:12px"><span>Not</span><textarea class="inp" id="kknot" rows="2" placeholder="Ret nedeni veya gözlem"></textarea></label>
        <p class="small" id="kkmsg" style="margin-bottom:10px"></p>
        <div class="acts"><button class="btn" id="kOnay" disabled>Onayla</button><button class="btn danger" id="kRed">Reddet</button></div>`
      : `<p class="small muted" style="margin-top:10px">${p.durum === 'onay' ? 'Onaylayan' : 'Reddeden'}: ${esc(p.kkKisi)}, ${trDate(p.kkTarih)}${p.kkNot ? '. Not: ' + esc(p.kkNot) : ''}</p>`}
    </div>`;
  if (!ed) return;
  const vals = () => Object.fromEntries(sp.map(x => [x.k, numIn($(`[data-k="${x.k}"]`).value)]));
  const check = () => {
    const v = vals(); let bos = 0, dis = 0;
    sp.forEach(x => { const i = $(`[data-k="${x.k}"]`); const o = out(x, v[x.k]); i.classList.toggle('out', o); if (isNaN(v[x.k])) bos++; if (o) dis++; });
    if ($('#gor').value !== 'Uygun') dis++;
    $('#kOnay').disabled = bos > 0 || dis > 0;
    $('#kkmsg').innerHTML = dis ? `<span class="bad">${dis} değer kabul aralığı dışında; parti onaylanamaz.</span>` : bos ? '<span class="muted">Tüm ölçümleri girin.</span>' : '<span class="ok">Tüm değerler aralıkta.</span>';
  };
  $$('[data-k]').forEach(i => i.oninput = check); $('#gor').onchange = check; check();
  const bitir = durum => { p.olcum = Object.assign(vals(), { gorunum: $('#gor').value }); p.durum = durum; p.kkTarih = TODAY; p.kkKisi = ME.ad; p.kkNot = $('#kknot').value.trim(); save(); };
  $('#kOnay').onclick = () => { bitir('onay'); toast('Parti ' + p.no + ' onaylandı; artık sevkiyatta seçilebilir.'); route(); };
  $('#kRed').onclick = () => { if (!$('#kknot').value.trim()) return toast('Ret nedenini not alanına yazın.'); bitir('red'); toast('Parti reddedildi.'); route(); };
}

/* ============ SEVKİYAT ============ */
ROUTES.sevkiyat = function (id) {
  if (id && id.startsWith('yeni')) return sevkYeni(id.slice(5));
  if (id && sevk(id)) return sevkDetay(id);
  if (id === 'araclar') return araclar();
  const list = S.sevkiyatlar.filter(inSir).sort((a, b) => (a.durum === 'teslim') - (b.durum === 'teslim') || b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<div class="hd"><div><h1>Sevkiyat ve nakliye</h1><p>Onaylı partilerden sevk, irsaliye, araç veya nakliyeci, teslim ve muayene kabul tutanağı.</p></div><a class="btn" href="#sevkiyat/yeni">Yeni sevkiyat</a></div>
    ${tabsHtml([['liste', 'Sevkiyatlar'], ['araclar', 'Araçlar']], 'liste')}${sirNote()}
    <div class="card">${tbl([['Sevkiyat'], ['Kurum'], ['Tarih'], ['Araç / nakliye'], ['Partiler'], ...(F ? [['Nakliye maliyeti', 'r']] : []), ['Durum']],
      list.map(v => `<tr class="click" data-go="sevkiyat/${v.id}"><td data-l="Sevkiyat"><b>${esc(v.no)}</b><div class="small muted">${esc(soz(v.szId).no)}</div></td><td data-l="Kurum">${kurumAd(v.k)}${sirCol(v)}</td>
        <td data-l="Tarih" class="nowrap">${trDate(v.tarih)}</td><td data-l="Araç" class="small">${esc(v.nakliye.plaka)}<div class="muted">${v.nakliye.tip === 'kendi' ? 'Kendi aracımız' : esc(v.nakliye.firma)}</div></td>
        <td data-l="Partiler" class="small">${v.kalemler.map(l => esc(parti(l.partiId).no)).join(', ')}</td>${F ? `<td data-l="Nakliye" class="r num">${money0(v.nakliye.bedel)}</td>` : ''}<td data-l="Durum">${svTag(v)}</td></tr>`))}</div>`;
  $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = b.dataset.tab === 'araclar' ? 'sevkiyat/araclar' : 'sevkiyat'; });
  bindClicks();
};
function sevkYeni(szId) {
  const aktif = S.sozlesmeler.filter(z => inSir(z) && !sozBitti(z));
  const z = soz(szId) || aktif[0];
  if (!z) { view.innerHTML = '<div class="noperm">Sevk edilecek aktif sözleşme yok.</div>'; return; }
  const rows = z.kalemler.map(x => {
    const kalan = Math.max(0, x.mik - teslimEdilen(z, x.uid) - yoldaMik(z, x.uid));
    const ps = S.partiler.filter(p => p.uid === x.uid && p.sir === z.sir && (p.durum !== 'onay' || partiKalan(p) > 0));
    return `<div style="padding:10px 0;border-bottom:1px solid var(--line-2)"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(urun(x.uid).ad)}</b><span class="small muted">Sözleşmede kalan: <b data-kalan="${x.uid}">${nf(kalan)}</b> adet</span></div>
      ${ps.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0 0 12px;flex-wrap:wrap"><span class="small">${esc(p.no)}, ${p.durum === 'onay' ? 'depoda ' + nf(partiKalan(p)) + ' adet' : nf(p.mik) + ' adet'}</span>
        ${p.durum === 'onay' ? `<input class="inp sm" data-pid="${p.id}" data-u="${x.uid}" data-max="${partiKalan(p)}" inputmode="numeric" placeholder="Sevk adedi" style="width:120px" aria-label="${esc(p.no)} sevk adedi">` : (p.durum === 'red' ? '<span class="lock">Reddedildi</span>' : LOCK)}</div>`).join('') || '<p class="small muted" style="padding-left:12px">Bu ürünün depoda partisi yok; önce üretim emri verin.</p>'}</div>`;
  }).join('');
  view.innerHTML = `<a class="back" href="#sevkiyat">Sevkiyata dön</a><div class="hd"><div><h1>Yeni sevkiyat</h1><p>Yalnız kalite onaylı partiler seçilebilir. Hangi partinin hangi kuruma gittiği kayda geçer.</p></div></div>
    <div class="card" style="max-width:860px">
      <div class="fg"><label class="f"><span>Sözleşme</span><select class="inp" id="ssz">${aktif.map(a => `<option value="${a.id}" ${a.id === z.id ? 'selected' : ''}>${esc(a.no)}, ${esc(kurum(a.k).ad)}</option>`).join('')}</select></label>
      <label class="f"><span>Sevk tarihi</span><input class="inp" type="date" id="star" value="${dayStr(1)}"></label></div>
      <h3 style="margin-top:6px">Partiler</h3>${rows}
      <h3 style="margin-top:16px;margin-bottom:8px">Nakliye</h3>
      <div class="seg" id="ntip"><button type="button" data-n="kendi" class="on">Kendi aracımız</button><button type="button" data-n="nakliyeci">Nakliyeci</button></div>
      <div id="nk" class="fg">
        <label class="f"><span>Araç</span><select class="inp" id="sarac">${S.araclar.map(a => `<option value="${a.id}">${esc(a.plaka)}, ${esc(a.tip)}, ${esc(per(a.sofor) ? per(a.sofor).ad : '')}</option>`).join('')}</select></label>
        <label class="f"><span>Gidiş-dönüş km</span><input class="inp" id="skm" value="${({ k1: 680, k2: 230, k3: 30, k4: 680, k5: 690, k6: 1120 })[z.k] || 300}" inputmode="numeric"></label>
      </div>
      <div id="nn" class="fg hide">
        <label class="f"><span>Nakliye firması</span><input class="inp" id="sfirma" value="Anadolu Ekspres Nakliyat"></label>
        <label class="f"><span>Plaka</span><input class="inp" id="splaka" placeholder="06 ABC 123"></label>
        <label class="f"><span>Şoför</span><input class="inp" id="ssofor"></label>
        ${F ? '<label class="f"><span>Nakliye bedeli (₺)</span><input class="inp" id="sbedel" inputmode="decimal" placeholder="Örn. 14000"></label>' : ''}
      </div>
      ${F ? '<p class="small muted" id="nmal" style="margin-bottom:12px"></p>' : ''}
      <p class="small bad hide" id="serr" style="margin-bottom:8px"></p>
      <div class="acts"><button class="btn" id="sok">Sevkiyatı oluştur</button><a class="btn alt" href="#sevkiyat">Vazgeç</a></div>
    </div>`;
  let ntip = 'kendi';
  const hesap = () => { if (!F) return; const a = arac($('#sarac').value), km = num($('#skm').value) || 0; $('#nmal').textContent = ntip === 'kendi' ? `Tahmini nakliye maliyeti: ${nf(km)} km × ${money(a.kmMaliyet)} = ${money0(km * a.kmMaliyet)} (yakıt, otoyol, şoför). Sözleşme kârlılığına yansır.` : 'Nakliyeci bedeli sözleşme kârlılığına yansır.'; };
  $$('#ntip button').forEach(b => b.onclick = () => { ntip = b.dataset.n; $$('#ntip button').forEach(x => x.classList.toggle('on', x === b)); $('#nk').classList.toggle('hide', ntip !== 'kendi'); $('#nn').classList.toggle('hide', ntip === 'kendi'); hesap(); });
  $('#sarac').onchange = hesap; $('#skm').oninput = hesap; hesap();
  $('#ssz').onchange = e => { location.hash = 'sevkiyat/yeni-' + e.target.value; };
  $('#sok').onclick = () => {
    const err = t => { $('#serr').textContent = t; $('#serr').classList.remove('hide'); };
    const lines = $$('[data-pid]').map(i => ({ partiId: i.dataset.pid, uid: i.dataset.u, mik: num(i.value) || 0, max: +i.dataset.max })).filter(l => l.mik > 0);
    if (!lines.length) return err('En az bir partiden sevk adedi girin.');
    const fazla = lines.find(l => l.mik > l.max); if (fazla) return err(parti(fazla.partiId).no + ' partisinde depoda ' + nf(fazla.max) + ' adet var.');
    for (const x of z.kalemler) { const top = lines.filter(l => l.uid === x.uid).reduce((t, l) => t + l.mik, 0), kal = x.mik - teslimEdilen(z, x.uid) - yoldaMik(z, x.uid); if (top > kal) return err(urun(x.uid).ad + ' için sözleşmede kalan ' + nf(kal) + ' adet.'); }
    let nak;
    if (ntip === 'kendi') { const a = arac($('#sarac').value), km = num($('#skm').value) || 0; nak = { tip: 'kendi', aracId: a.id, plaka: a.plaka, sofor: per(a.sofor) ? per(a.sofor).ad : '', km, bedel: km * a.kmMaliyet }; }
    else { if (!$('#splaka').value.trim()) return err('Nakliyeci aracının plakasını girin.'); nak = { tip: 'nakliyeci', firma: $('#sfirma').value, plaka: $('#splaka').value.trim().toUpperCase(), sofor: $('#ssofor').value, km: 0, bedel: F ? (num($('#sbedel').value) || 0) : 0 }; }
    const v = { id: 'sv' + Date.now(), no: 'SV-2026-0' + (++S.seq.sevk), irsNo: 'CZI2026000000' + (++S.seq.irs), sir: z.sir, szId: z.id, k: z.k, tarih: $('#star').value, durum: 'hazirlaniyor', kalemler: lines.map(l => ({ partiId: l.partiId, uid: l.uid, mik: l.mik })), nakliye: nak, tutanak: null, faturaId: null };
    S.sevkiyatlar.push(v); save(); toast('Sevkiyat ' + v.no + ' oluşturuldu, irsaliye hazır.'); location.hash = 'sevkiyat/' + v.id;
  };
}
function sevkDetay(id) {
  const v = sevk(id), z = soz(v.szId), f = v.faturaId ? fatura(v.faturaId) : null;
  const acts = { hazirlaniyor: '<button class="btn" id="aYol">Yola çıktı</button>', yolda: '<button class="btn acc" id="aTes">Teslim edildi</button>', teslim: '' }[v.durum];
  view.innerHTML = `<a class="back" href="#sevkiyat">Sevkiyata dön</a>
    <div class="hd"><div><h1>${esc(v.no)}, ${kurumAd(v.k)}</h1><p>${svTag(v)} &nbsp; Sevk tarihi ${trDate(v.tarih)}, irsaliye ${esc(v.irsNo)}</p></div>
      <div class="acts">${acts}<a class="btn alt" href="belge.html?tip=irsaliye&id=${v.id}">İrsaliye</a></div></div>
    <div class="meta"><div><small>Sözleşme</small><b>${can('sozlesmeler') ? `<a href="#sozlesmeler/${z.id}">${esc(z.no)}</a>` : esc(z.no)}</b></div>
      <div><small>Araç</small><b>${esc(v.nakliye.plaka)}</b><div class="small muted">${v.nakliye.tip === 'kendi' ? 'Kendi aracımız' : esc(v.nakliye.firma)}, ${esc(v.nakliye.sofor)}</div></div>
      ${F ? `<div><small>Nakliye maliyeti</small><b class="num">${money0(v.nakliye.bedel)}</b>${v.nakliye.km ? `<div class="small muted">${nf(v.nakliye.km)} km</div>` : ''}</div>` : ''}
      <div><small>Muayene ve kabul tutanağı</small><b>${v.tutanak ? esc(v.tutanak.no) + ', ' + trDate(v.tutanak.tarih) : 'Teslimde girilir'}</b></div>
      ${F && can('fatura') ? `<div><small>Fatura</small><b>${f ? `<a href="belge.html?tip=fatura&id=${f.id}">${esc(f.no)}</a>` : v.durum === 'teslim' ? '<a href="#fatura/kesilecek">Kesilecek</a>' : 'Teslimden sonra'}</b></div>` : ''}
    </div>
    <div class="card"><h2>Sevk edilen partiler</h2>${tbl([['Ürün'], ['Parti'], ['Üretim'], ['Miktar', 'r']], v.kalemler.map(l => { const p = parti(l.partiId); return `<tr><td data-l="Ürün">${esc(urun(l.uid).ad)}</td><td data-l="Parti">${can('kalite') ? `<a href="#kalite/${p.id}">${esc(p.no)}</a>` : esc(p.no)}</td><td data-l="Üretim">${trDate(p.tarih)}</td><td data-l="Miktar" class="r num">${nf(l.mik)} adet</td></tr>`; }))}</div>`;
  const on = (q, fn) => { const b = $(q); if (b) b.onclick = fn; };
  on('#aYol', () => { v.durum = 'yolda'; save(); toast('Sevkiyat yolda.'); route(); });
  on('#aTes', () => modal('Teslim edildi', `<p class="small muted" style="margin-bottom:12px">Kurumun muayene ve kabul komisyonu tutanağını girin. Teslim edilen miktar sözleşmeye işlenir.</p>
    <div class="fg"><label class="f"><span>Tutanak no</span><input class="inp" id="tno" value="MKT-2026/${200 + S.seq.sevk}"></label><label class="f"><span>Tutanak tarihi</span><input class="inp" type="date" id="ttar" value="${TODAY}"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="tok">Teslimi kaydet</button></div>`, m => {
    $('#tok', m).onclick = () => { if (!$('#tno', m).value.trim()) return toast('Tutanak numarası girin.'); v.durum = 'teslim'; v.tutanak = { no: $('#tno', m).value.trim(), tarih: $('#ttar', m).value }; save(); m.remove(); toast('Teslim kaydedildi; sözleşmenin teslim edilen miktarı güncellendi.'); route(); };
  }));
}
function araclar() {
  view.innerHTML = `<div class="hd"><div><h1>Sevkiyat ve nakliye</h1><p>Grup araçları (Çözüm Lojistik) ve sefer maliyetleri.</p></div><button class="btn" id="yar">Araç ekle</button></div>
    ${tabsHtml([['liste', 'Sevkiyatlar'], ['araclar', 'Araçlar']], 'araclar')}
    <div class="card">${tbl([['Plaka'], ['Tip'], ['Kapasite'], ['Şoför'], ...(F ? [['Km maliyeti', 'r']] : []), ['Sefer', 'r'], ...(F ? [['Toplam nakliye', 'r']] : [])],
      S.araclar.map(a => { const sv = S.sevkiyatlar.filter(v => v.nakliye.aracId === a.id); return `<tr><td data-l="Plaka"><b>${esc(a.plaka)}</b></td><td data-l="Tip">${esc(a.tip)}</td><td data-l="Kapasite">${esc(a.kapasite)}</td><td data-l="Şoför">${esc(per(a.sofor) ? per(a.sofor).ad : '-')}</td>
        ${F ? `<td data-l="Km maliyeti" class="r num">${money(a.kmMaliyet)}</td>` : ''}<td data-l="Sefer" class="r">${sv.length}</td>${F ? `<td data-l="Toplam" class="r num">${money0(sv.reduce((t, v) => t + v.nakliye.bedel, 0))}</td>` : ''}</tr>`; }))}</div>`;
  $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = b.dataset.tab === 'araclar' ? 'sevkiyat/araclar' : 'sevkiyat'; });
  $('#yar').onclick = () => modal('Araç ekle', `<div class="fg"><label class="f"><span>Plaka</span><input class="inp" id="apl" placeholder="41 ÇZM 450"></label><label class="f"><span>Tip</span><input class="inp" id="atp" value="Kamyon"></label>
    <label class="f"><span>Kapasite</span><input class="inp" id="akp" value="10 palet"></label><label class="f"><span>Şoför</span><select class="inp" id="asf">${S.personel.filter(p => p.tip === 'Şoför').map(p => `<option value="${p.id}">${esc(p.ad)}</option>`).join('')}</select></label>
    <label class="f"><span>Km maliyeti (₺)</span><input class="inp" id="akm" value="22"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="aok">Kaydet</button></div>`, m => {
    $('#aok', m).onclick = () => { const pl = $('#apl', m).value.trim().toUpperCase(); if (!pl) return toast('Plaka girin.'); S.araclar.push({ id: 'ar' + (++S.seq.arac), plaka: pl, tip: $('#atp', m).value, kapasite: $('#akp', m).value, sofor: $('#asf', m).value, kmMaliyet: numIn($('#akm', m).value) || 0 }); save(); m.remove(); toast('Araç eklendi.'); route(); };
  });
}

/* ============ CARİ, FATURA, TAHSİLAT ============ */
ROUTES.fatura = function (id) {
  if (!F) { view.innerHTML = '<div class="noperm"><h2>Tutarları görme yetkiniz yok</h2><p>Bu bölüm fiyat ve tutar yetkisi gerektirir.</p></div>'; return; }
  const tab = ['kesilecek', 'kurum', 'tedarikci', 'vade', 'teminat'].includes(id) ? id : 'faturalar';
  const ft = S.faturalar.filter(inSir), kes = S.sevkiyatlar.filter(v => inSir(v) && v.durum === 'teslim' && !v.faturaId);
  const al = ft.reduce((t, f) => t + kalanF(f), 0), gec = ft.filter(gecikti).reduce((t, f) => t + kalanF(f), 0), borc = S.alimlar.filter(inSir).reduce((t, a) => t + alimKalan(a), 0);
  let body = '';
  if (tab === 'faturalar') body = tbl([['Fatura'], ['Kurum'], ['Tarih'], ['Vade'], ['Toplam (KDV dahil)', 'r'], ['Tahsil edilen', 'r'], ['Kalan', 'r'], ['', 'r']],
    ft.slice().sort((a, b) => b.tarih.localeCompare(a.tarih)).map(f => `<tr class="${gecikti(f) ? 'crit' : ''}"><td data-l="Fatura"><b>${esc(f.no)}</b>${sirCol(f)}</td><td data-l="Kurum">${kurumAd(f.k)}</td><td data-l="Tarih">${trDate(f.tarih)}</td>
      <td data-l="Vade" class="${gecikti(f) ? 'bad' : ''}">${trDate(f.vade)}${gecikti(f) ? `<div class="small">${-diffDays(f.vade, TODAY)} gün gecikti</div>` : ''}</td>
      <td data-l="Toplam" class="r num">${money(f.toplam)}</td><td data-l="Tahsil" class="r num">${money(tahsil(f))}</td><td data-l="Kalan" class="r num"><b class="${gecikti(f) ? 'bad' : ''}">${kalanF(f) > 0.5 ? money(kalanF(f)) : 'Kapandı'}</b></td>
      <td class="r"><div class="acts" style="justify-content:flex-end">${kalanF(f) > 0.5 ? `<button class="btn sm" data-th="${f.id}">Tahsilat gir</button>` : ''}<a class="linkbtn" href="belge.html?tip=fatura&id=${f.id}">Fatura</a></div></td></tr>`));
  if (tab === 'kesilecek') body = tbl([['Sevkiyat'], ['Kurum'], ['Teslim / tutanak'], ['Tutar (KDV hariç)', 'r'], ['', 'r']],
    kes.map(v => `<tr><td data-l="Sevkiyat"><b>${esc(v.no)}</b><div class="small muted">${esc(soz(v.szId).no)}</div></td><td data-l="Kurum">${kurumAd(v.k)}</td><td data-l="Tutanak" class="small">${esc(v.tutanak.no)}, ${trDate(v.tutanak.tarih)}</td>
      <td data-l="Tutar" class="r num">${money(svCiro(v))}</td><td class="r"><button class="btn acc sm" data-fk="${v.id}">Fatura kes</button></td></tr>`), 'Faturası kesilecek teslimat yok. Kabul tutanağı girilen sevkiyatlar buraya düşer.');
  if (tab === 'kurum') body = tbl([['Kurum'], ['Faturalanan', 'r'], ['Tahsil edilen', 'r'], ['Bakiye', 'r'], ['Vadesi geçen', 'r'], ['', 'r']],
    S.kurumlar.map(k => { const fs = ft.filter(f => f.k === k.id); if (!fs.length) return ''; const g = fs.filter(gecikti).reduce((t, f) => t + kalanF(f), 0);
      return `<tr><td data-l="Kurum"><b>${esc(k.ad)}</b></td><td data-l="Faturalanan" class="r num">${money0(fs.reduce((t, f) => t + f.toplam, 0))}</td><td data-l="Tahsil" class="r num">${money0(fs.reduce((t, f) => t + tahsil(f), 0))}</td>
        <td data-l="Bakiye" class="r num"><b>${money0(fs.reduce((t, f) => t + kalanF(f), 0))}</b></td><td data-l="Vadesi geçen" class="r num ${g ? 'bad' : ''}">${money0(g)}</td><td class="r"><a class="linkbtn" href="belge.html?tip=ekstre&id=${k.id}">Ekstre</a></td></tr>`; }).filter(Boolean));
  if (tab === 'tedarikci') body = `<div class="acts" style="margin-bottom:10px"><span class="small muted">Satın alma girişleri (Hammadde ve stok) tedarikçi carisine borç yazar.</span></div>` + tbl([['Tedarikçi'], ['Alımlar (KDV dahil)', 'r'], ['Ödenen', 'r'], ['Borç', 'r'], ['En yakın vade'], ['', 'r']],
    S.tedarikciler.map(t => { const as = S.alimlar.filter(a => a.tedId === t.id && inSir(a)); if (!as.length) return ''; const acik = as.filter(a => alimKalan(a) > 0).sort((a, b) => a.vade.localeCompare(b.vade)), b = as.reduce((s, a) => s + alimKalan(a), 0);
      return `<tr><td data-l="Tedarikçi"><b>${esc(t.ad)}</b><div class="small muted">${esc(t.il)}, vade ${t.vade} gün</div></td><td data-l="Alımlar" class="r num">${money0(as.reduce((s, a) => s + a.tutar, 0))}</td><td data-l="Ödenen" class="r num">${money0(as.reduce((s, a) => s + alimOdenen(a), 0))}</td>
        <td data-l="Borç" class="r num"><b>${money0(b)}</b></td><td data-l="En yakın vade" class="${acik[0] && acik[0].vade < TODAY ? 'bad' : ''}">${acik[0] ? trDate(acik[0].vade) : '-'}</td><td class="r">${b > 0 ? `<button class="btn sm alt" data-od="${t.id}">Ödeme gir</button>` : ''}</td></tr>`; }).filter(Boolean));
  if (tab === 'vade') {
    const rows = ft.filter(f => kalanF(f) > 0.5).map(f => ({ v: f.vade, tur: 'Tahsilat', cari: kurum(f.k).ad, belge: f.no, tutar: kalanF(f) }))
      .concat(S.alimlar.filter(a => inSir(a) && alimKalan(a) > 0).map(a => ({ v: a.vade, tur: 'Ödeme', cari: ted(a.tedId).ad, belge: a.belge, tutar: -alimKalan(a) }))).sort((a, b) => a.v.localeCompare(b.v));
    const grp = [['Vadesi geçenler', r => r.v < TODAY], ['Bu hafta', r => r.v >= TODAY && diffDays(r.v, TODAY) <= 7], ['8–30 gün', r => diffDays(r.v, TODAY) > 7 && diffDays(r.v, TODAY) <= 30], ['30 günden sonra', r => diffDays(r.v, TODAY) > 30]];
    body = `<div class="legend"><span style="--c:var(--ok)">Tahsil edilecek: ${money0(rows.filter(r => r.tutar > 0).reduce((t, r) => t + r.tutar, 0))}</span><span style="--c:var(--bad)">Ödenecek: ${money0(-rows.filter(r => r.tutar < 0).reduce((t, r) => t + r.tutar, 0))}</span></div>` +
      grp.map(([ad, fn]) => { const rs = rows.filter(fn); if (!rs.length) return ''; return `<h3 style="margin:14px 0 6px">${ad}</h3>` + tbl([['Vade'], ['Tür'], ['Cari'], ['Belge'], ['Tutar', 'r']],
        rs.map(r => `<tr class="${r.v < TODAY ? 'crit' : ''}"><td data-l="Vade">${trDate(r.v)}<div class="small muted">${gunTxt(r.v)}</div></td><td data-l="Tür">${r.tutar > 0 ? tag('Tahsilat', 'g') : tag('Ödeme', 'a')}</td><td data-l="Cari">${esc(r.cari)}</td><td data-l="Belge" class="small">${esc(r.belge)}</td><td data-l="Tutar" class="r num">${money0(Math.abs(r.tutar))}</td></tr>`)); }).join('');
  }
  if (tab === 'teminat') body = tbl([['Mektup'], ['İş'], ['Banka'], ['Tutar', 'r'], ['Durum'], ['', 'r']],
    S.ihaleler.filter(i => inSir(i) && i.durum !== 'hazirlaniyor').map(i => `<tr><td data-l="Mektup">Geçici teminat<div class="small muted">Bitiş ${trDate(i.gecici.bitis)}</div></td><td data-l="İş">${esc(i.ikn)}, ${kurumAd(i.k)}</td><td data-l="Banka" class="small">${esc(i.gecici.banka)}</td><td data-l="Tutar" class="r num">${money0(i.gecici.tutar)}</td>
      <td data-l="Durum">${i.gecici.iade ? tag('İade alındı', 'g') : i.durum === 'teklif' ? tag('Kurumda, sonuç bekleniyor', 'b') : tag('İade istenecek', 'a')}</td><td class="r">${!i.gecici.iade && i.durum !== 'teklif' ? `<button class="linkbtn" data-gi="${i.id}">İade alındı</button>` : ''}</td></tr>`)
    .concat(S.sozlesmeler.filter(inSir).map(z => `<tr><td data-l="Mektup">Kesin teminat<div class="small muted">${esc(z.kesin.no)}</div></td><td data-l="İş">${esc(z.no)}, ${kurumAd(z.k)}</td><td data-l="Banka" class="small">${esc(z.kesin.banka)}</td><td data-l="Tutar" class="r num">${money0(z.kesin.tutar)}</td>
      <td data-l="Durum">${z.kesin.iade ? tag('İade alındı', 'g') : sozBitti(z) ? tag('İş bitti, iade istenecek', 'a') : tag('Kurumda, iş sürüyor', '')}</td><td class="r">${!z.kesin.iade && sozBitti(z) ? `<button class="linkbtn" data-ki="${z.id}">İade alındı</button>` : ''}</td></tr>`)));
  view.innerHTML = `<div class="hd"><div><h1>Cari, fatura ve tahsilat</h1><p>Kurum alacakları, tedarikçi borçları, vade takvimi ve teminat mektupları.</p></div></div>
    <div class="kpis" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">
      <div class="kpi"><div class="v">${money0(al)}</div><div class="k">Kurumlardan alacak</div></div>
      <div class="kpi ${gec ? 'alert' : ''}"><div class="v">${money0(gec)}</div><div class="k">Vadesi geçen alacak</div></div>
      <div class="kpi"><div class="v">${money0(borc)}</div><div class="k">Tedarikçilere borç</div></div>
      <div class="kpi"><div class="v">${kes.length}</div><div class="k">Faturası kesilecek teslimat</div></div></div>
    ${tabsHtml([['faturalar', 'Faturalar'], ['kesilecek', `Faturalanacak (${kes.length})`], ['kurum', 'Kurum carileri'], ['tedarikci', 'Tedarikçi carileri'], ['vade', 'Vade takvimi'], ['teminat', 'Teminatlar']], tab)}
    ${sirNote()}<div class="card">${body}</div>`;
  bindTabs('fatura');
  $$('[data-th]').forEach(b => b.onclick = () => { const f = fatura(b.dataset.th); modal('Tahsilat gir: ' + f.no, `<p class="small muted" style="margin-bottom:12px">${kurumAd(f.k)}, kalan ${money(kalanF(f))}. Kısmi tahsilat girilebilir.</p>
    <div class="fg"><label class="f"><span>Tutar (₺)</span><input class="inp" id="tt" value="${String(Math.round(kalanF(f) * 100) / 100).replace('.', ',')}" inputmode="decimal"></label><label class="f"><span>Tarih</span><input class="inp" type="date" id="td" value="${TODAY}"></label></div>
    <label class="f"><span>Açıklama</span><input class="inp" id="ta" value="Banka havalesi"></label>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="tok">Tahsilatı kaydet</button></div>`, m => {
    $('#tok', m).onclick = () => { const t = numIn($('#tt', m).value.replace(/\./g, '')); if (!(t > 0) || t > kalanF(f) + 0.01) return toast('Tutar 0 ile kalan arasında olmalı.'); f.tahsilat.push({ tarih: $('#td', m).value, tutar: t, ack: $('#ta', m).value }); save(); m.remove(); toast(kalanF(f) > 0.5 ? 'Kısmi tahsilat kaydedildi, kalan ' + money(kalanF(f)) : 'Fatura tamamen tahsil edildi.'); route(); };
  }); });
  $$('[data-fk]').forEach(b => b.onclick = () => { const v = sevk(b.dataset.fk), mat = svCiro(v), k = kurum(v.k); modal('Fatura kes: ' + v.no, `
    <div class="meta" style="margin-bottom:12px"><div><small>Matrah</small><b class="num">${money(mat)}</b></div><div><small>KDV %20</small><b class="num">${money(mat * 0.2)}</b></div><div><small>Toplam</small><b class="num">${money(mat * 1.2)}</b></div></div>
    <div class="fg"><label class="f"><span>Fatura tarihi</span><input class="inp" type="date" id="fd" value="${TODAY}"></label><label class="f"><span>Vade (${k.vade} gün)</span><input class="inp" type="date" id="fv" value="${addDays(TODAY, k.vade)}"></label></div>
    <p class="small muted" style="margin-bottom:10px">Gerçek sistemde e-Fatura özel entegratör üzerinden kuruma iletilir.</p>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="fok">Faturayı kes</button></div>`, m => {
    $('#fok', m).onclick = () => { const f = mkFatura(S, v, $('#fd', m).value); f.vade = $('#fv', m).value; save(); m.remove(); toast('Fatura ' + f.no + ' kesildi; alacaklara eklendi.'); location.hash = 'fatura/faturalar'; };
  }); });
  $$('[data-od]').forEach(b => b.onclick = () => { const t = ted(b.dataset.od), as = S.alimlar.filter(a => a.tedId === t.id && alimKalan(a) > 0 && inSir(a)).sort((a, c) => a.vade.localeCompare(c.vade)), top = as.reduce((s, a) => s + alimKalan(a), 0);
    modal('Ödeme gir: ' + t.ad, `<p class="small muted" style="margin-bottom:12px">Borç ${money(top)}. Ödeme en eski vadeli faturadan başlayarak kapatılır.</p>
      <div class="fg"><label class="f"><span>Tutar (₺)</span><input class="inp" id="ot" value="${Math.round(alimKalan(as[0]))}" inputmode="decimal"></label><label class="f"><span>Tarih</span><input class="inp" type="date" id="odt" value="${TODAY}"></label></div>
      <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="ook">Ödemeyi kaydet</button></div>`, m => {
      $('#ook', m).onclick = () => { let t2 = numIn($('#ot', m).value); if (!(t2 > 0) || t2 > top + 0.01) return toast('Tutar 0 ile borç arasında olmalı.'); as.forEach(a => { if (t2 <= 0) return; const k = Math.min(t2, alimKalan(a)); a.odeme.push({ tarih: $('#odt', m).value, tutar: k }); t2 -= k; }); save(); m.remove(); toast('Ödeme kaydedildi.'); route(); };
    }); });
  $$('[data-gi]').forEach(b => b.onclick = () => { ihale(b.dataset.gi).gecici.iade = true; save(); toast('Geçici teminat iadesi kaydedildi.'); route(); });
  $$('[data-ki]').forEach(b => b.onclick = () => { const z = soz(b.dataset.ki); z.kesin.iade = true; z.kesin.iadeTarih = TODAY; save(); toast('Kesin teminat iadesi kaydedildi.'); route(); });
};

/* ============ ÜRÜNLER ============ */
ROUTES.urunler = function (id) {
  if (id && urun(id)) return urunDetay(id);
  view.innerHTML = `<div class="hd"><div><h1>Ürünler ve reçeteler</h1><p>Her ürünün 1 adedi için hammadde ve ambalaj reçetesi; üretimde stoktan bu reçeteye göre düşülür.</p></div>${ME.rol === 'yonetici' || can('uretim') ? '<button class="btn" id="yu">Yeni ürün</button>' : ''}</div>
    <div class="cards">${S.urunler.map(u => `<button class="pcard" data-go="urunler/${u.id}"><h3>${esc(u.ad)}</h3><span class="small muted">${u.grup} grubu, ${u.recete.length} reçete kalemi</span>
      <dl><dt>Stokta (onaylı)</dt><dd>${nf(S.partiler.filter(p => p.uid === u.id && p.durum === 'onay').reduce((t, p) => t + partiKalan(p), 0))} adet</dd>
      ${F ? `<dt>Liste fiyatı</dt><dd class="num">${money(u.fiyat)}</dd>` : ''}${M ? `<dt>Birim maliyet</dt><dd class="num">${money(birimMaliyet(u.id))}</dd>` : ''}</dl></button>`).join('')}</div>`;
  bindClicks();
  const b = $('#yu'); if (b) b.onclick = () => modal('Yeni ürün', `<label class="f"><span>Ürün adı</span><input class="inp" id="ua" placeholder="Örn. Kireç Çözücü 5 L"></label>
    <div class="fg"><label class="f"><span>Grup</span><select class="inp" id="ug"><option value="yuzey">Sıvı</option><option value="toz">Toz</option></select></label>
    <label class="f"><span>Liste fiyatı (₺)</span><input class="inp" id="uf" value="150"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="uok">Ekle ve reçeteye geç</button></div>`, m => {
    $('#uok', m).onclick = () => { const ad = $('#ua', m).value.trim(); if (!ad) return toast('Ürün adı girin.'); const g = $('#ug', m).value;
      const u = { id: 'u' + (++S.seq.urun) + 'n', ad, grup: g === 'toz' ? 'Toz' : 'Sıvı', spec: g, fiyat: numIn($('#uf', m).value) || 0, iscilik: 6, recete: g === 'toz' ? [['h17', 1], ['h19', 1]] : [['h14', 1], ['h19', 1]] };
      S.urunler.push(u); save(); m.remove(); location.hash = 'urunler/' + u.id; };
  });
};
function urunDetay(id) {
  const u = urun(id), ed = ME.rol === 'yonetici' || can('uretim');
  view.innerHTML = `<a class="back" href="#urunler">Ürünlere dön</a><div class="hd"><div><h1>${esc(u.ad)}</h1><p>${u.grup} grubu${M ? ', birim maliyet ' + money(birimMaliyet(u.id)) : ''}${F ? ', liste fiyatı ' + money(u.fiyat) : ''}</p></div></div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h2>Reçete (1 adet için)</h2></div>
        ${tbl([['Malzeme'], ['Miktar', 'r'], ...(M ? [['Tutar', 'r']] : []), ...(ed ? [['', 'r']] : [])], u.recete.map(([hid, m], n) => { const h = hm(hid); return `<tr><td data-l="Malzeme">${esc(h.ad)}</td>
          <td data-l="Miktar" class="r">${ed ? `<input class="inp sm num" data-rq="${n}" value="${String(m).replace('.', ',')}" style="width:90px" aria-label="${esc(h.ad)} miktar">` : nf(m, 4)} ${h.birim}</td>${M ? `<td data-l="Tutar" class="r num">${money(m * h.fiyat)}</td>` : ''}${ed ? `<td class="r"><button class="linkbtn" data-rr="${n}">Çıkar</button></td>` : ''}</tr>`; }),
          '', M ? `<tfoot><tr><td>İşçilik ve enerji</td><td></td><td class="r num">${money(u.iscilik)}</td>${ed ? '<td></td>' : ''}</tr></tfoot>` : '')}
        ${ed ? `<div class="acts" style="margin-top:10px"><select class="inp sm" id="rh" aria-label="Malzeme">${S.hammaddeler.filter(h => !u.recete.some(r => r[0] === h.id)).map(h => `<option value="${h.id}">${esc(h.ad)}</option>`).join('')}</select>
          <input class="inp sm" id="rm" placeholder="Miktar" style="width:90px" aria-label="Miktar"><button class="btn sm alt" id="radd">Ekle</button><button class="btn sm" id="rsave">Reçeteyi kaydet</button></div>` : ''}
      </div>
      <div class="card"><h2>Kalite kabul aralıkları</h2>${SPEC[u.spec].map(x => `<div class="uy"><span>${esc(x.ad)}</span><span class="num">${nf(x.min)} – ${nf(x.max)} ${x.bir}</span></div>`).join('')}<div class="uy"><span>Görünüm, renk, koku</span><span>Standart numune</span></div></div>
    </div>`;
  if (!ed) return;
  const read = () => $$('[data-rq]').forEach(i => { u.recete[+i.dataset.rq][1] = numIn(i.value) || 0; });
  $('#rsave').onclick = () => { read(); save(); toast('Reçete kaydedildi; yeni üretim emirleri bu reçeteyle hesaplanır.'); route(); };
  $('#radd').onclick = () => { read(); const m = numIn($('#rm').value); if (!(m > 0)) return toast('Miktar girin.'); u.recete.push([$('#rh').value, m]); save(); route(); };
  $$('[data-rr]').forEach(b => b.onclick = () => { read(); u.recete.splice(+b.dataset.rr, 1); save(); route(); });
}

/* ============ STOK ============ */
ROUTES.stok = function (id) {
  const tab = ['ambalaj', 'hareket'].includes(id) ? id : 'hammadde';
  const son = hid => S.hareketler.filter(x => x.hid === hid).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
  let body;
  if (tab === 'hareket') body = tbl([['Tarih'], ['Malzeme'], ['Miktar', 'r'], ['Tür'], ['Açıklama']], S.hareketler.slice().sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id.localeCompare(a.id)).slice(0, 80).map(x => { const h = hm(x.hid);
    return `<tr><td data-l="Tarih">${trDate(x.tarih)}</td><td data-l="Malzeme">${esc(h.ad)}</td><td data-l="Miktar" class="r num ${x.mik < 0 ? 'bad' : 'ok'}">${x.mik > 0 ? '+' : ''}${nf(x.mik)} ${h.birim}</td><td data-l="Tür">${esc(x.tip)}</td><td data-l="Açıklama" class="small">${esc(x.ack)}</td></tr>`; }));
  else body = tbl([['Malzeme'], ['Stok', 'r'], ['Kritik seviye', 'r'], ['Durum'], ...(M || F ? [['Birim fiyat', 'r'], ['Stok değeri', 'r']] : []), ['Tedarikçi'], ['Son hareket']],
    S.hammaddeler.filter(h => h.tur === tab).map(h => { const s = son(h.id), k = h.stok < h.kritik; return `<tr class="${k ? 'crit' : ''}"><td data-l="Malzeme"><b>${esc(h.ad)}</b></td><td data-l="Stok" class="r num" data-stok="${h.id}">${nf(h.stok)} ${h.birim}</td><td data-l="Kritik" class="r num">${nf(h.kritik)} ${h.birim}</td>
      <td data-l="Durum">${k ? tag('Kritik', 'r') : h.stok < h.kritik * 1.4 ? tag('Azalıyor', 'w') : tag('Yeterli', 'g')}</td>${M || F ? `<td data-l="Birim fiyat" class="r num">${money(h.fiyat)}</td><td data-l="Değer" class="r num">${money0(h.stok * h.fiyat)}</td>` : ''}
      <td data-l="Tedarikçi" class="small">${esc(ted(h.ted).ad)}</td><td data-l="Son hareket" class="small">${s ? trDate(s.tarih) + ', ' + esc(s.tip) : '-'}</td></tr>`; }));
  view.innerHTML = `<div class="hd"><div><h1>Hammadde ve stok</h1><p>Üretimde reçeteye göre otomatik düşer; satın alma girişi stoku artırır ve tedarikçi carisine borç yazar.</p></div><button class="btn" id="sa">Satın alma girişi</button></div>
    ${tabsHtml([['hammadde', 'Hammaddeler'], ['ambalaj', 'Ambalaj'], ['hareket', 'Stok hareketleri']], tab)}<div class="card">${body}</div>`;
  bindTabs('stok');
  $('#sa').onclick = () => modal('Satın alma girişi', `<label class="f"><span>Malzeme</span><select class="inp" id="sh">${S.hammaddeler.map(h => `<option value="${h.id}">${esc(h.ad)} (${h.birim})</option>`).join('')}</select></label>
    <div class="fg"><label class="f"><span>Miktar</span><input class="inp" id="sm" inputmode="decimal" placeholder="Örn. 1000"></label>
    ${F || M ? '<label class="f"><span>Birim fiyat (₺, KDV hariç)</span><input class="inp" id="sf" inputmode="decimal"></label>' : ''}
    <label class="f"><span>Tedarikçi</span><select class="inp" id="st">${S.tedarikciler.map(t => `<option value="${t.id}">${esc(t.ad)}</option>`).join('')}</select></label>
    <label class="f"><span>İrsaliye / fatura no</span><input class="inp" id="sb" value="F-${7800 + S.seq.alim}"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="sok">Stoka ekle</button></div>`, m => {
    const sync = () => { const h = hm($('#sh', m).value); $('#st', m).value = h.ted; if ($('#sf', m)) $('#sf', m).value = String(h.fiyat).replace('.', ','); };
    $('#sh', m).onchange = sync; sync();
    $('#sok', m).onclick = () => { const h = hm($('#sh', m).value), mik = numIn($('#sm', m).value), fy = $('#sf', m) ? numIn($('#sf', m).value) || h.fiyat : h.fiyat, t = ted($('#st', m).value);
      if (!(mik > 0)) return toast('Miktar girin.');
      h.stok = +(h.stok + mik).toFixed(3); h.fiyat = fy;
      S.hareketler.push({ id: 'hr' + (++S.seq.hrk), tarih: TODAY, hid: h.id, mik, tip: 'Satın alma', ack: t.ad + ', ' + $('#sb', m).value });
      S.alimlar.push({ id: 'al' + (++S.seq.alim), sir: yeniSir(), tedId: t.id, hid: h.id, mik, fiyat: fy, tarih: TODAY, vade: addDays(TODAY, t.vade), tutar: Math.round(mik * fy * 1.2), belge: $('#sb', m).value, odeme: [] });
      save(); m.remove(); toast(h.ad + ' stoğa eklendi: +' + nf(mik) + ' ' + h.birim); route(); };
  });
};

/* ============ PERSONEL ============ */
let puTarih = TODAY, isTarih = TODAY;
ROUTES.personel = function (id) {
  const tab = ['isler', 'liste'].includes(id) ? id : 'puantaj';
  const ps = S.personel.filter(p => p.aktif && inSir(p) && (!ME.ekip || p.ekip === ME.ekip));
  let body = '';
  if (tab === 'puantaj') {
    const pz = S.puantaj[puTarih] || {};
    const gunler = Array.from({ length: 7 }, (_, n) => addDays(puTarih, n - 6));
    body = `<div class="acts" style="margin-bottom:12px"><label class="small" for="pt">Tarih</label><input class="inp sm" type="date" id="pt" value="${puTarih}"><button class="btn sm alt" id="hepGeldi">Tümünü "geldi" işaretle</button></div>
      ${tbl([['Personel'], ['Görev'], ['Durum'], ['Fazla mesai (saat)']], ps.map(p => { const v = pz[p.id] || {}; return `<tr><td data-l="Personel"><b>${esc(p.ad)}</b>${sirCol(p)}</td><td data-l="Görev" class="small">${esc(p.gorev)}<div class="muted">${p.tip}</div></td>
        <td data-l="Durum"><select class="inp sm" data-pd="${p.id}" aria-label="${esc(p.ad)} durum"><option value="">Girilmedi</option>${Object.entries(PUANTAJ).map(([k, ad]) => `<option value="${k}" ${v.d === k ? 'selected' : ''}>${ad}</option>`).join('')}</select></td>
        <td data-l="Fazla mesai"><input class="inp sm" data-pm="${p.id}" value="${v.mesai || 0}" inputmode="decimal" style="width:70px" aria-label="${esc(p.ad)} fazla mesai"></td></tr>`; }))}
      <div class="acts" style="margin-top:12px"><button class="btn" id="puKaydet">Puantajı kaydet</button></div>
      <h3 style="margin:20px 0 8px">Son 7 gün</h3>
      <div class="tw"><table class="t"><thead><tr><th>Personel</th>${gunler.map(g => `<th class="r">${g.slice(8)}.${g.slice(5, 7)}</th>`).join('')}<th class="r">Mesai</th></tr></thead><tbody>
        ${ps.map(p => `<tr><td class="nowrap">${esc(p.ad)}</td>${gunler.map(g => { const v = (S.puantaj[g] || {})[p.id]; const c = v ? { geldi: 'G', gelmedi: 'Y', izinli: 'İ', rapor: 'R' }[v.d] : '·'; return `<td class="r ${c === 'Y' ? 'bad' : c === 'R' || c === 'İ' ? 'warn' : 'muted'}">${c}</td>`; }).join('')}
          <td class="r num">${nf(gunler.reduce((t, g) => t + (((S.puantaj[g] || {})[p.id] || {}).mesai || 0), 0))}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin-top:6px">G geldi, Y gelmedi, İ izinli, R raporlu, · girilmedi veya Pazar.</p>`;
  }
  if (tab === 'isler') {
    const is = S.isler.filter(x => x.tarih === isTarih && ps.some(p => p.id === x.pid));
    body = `<div class="acts" style="margin-bottom:12px"><label class="small" for="it">Tarih</label><input class="inp sm" type="date" id="it" value="${isTarih}"><span class="small muted">${is.filter(x => x.yapildi).length}/${is.length} iş tamamlandı</span></div>
      ${is.map(x => `<label class="chk" style="border-bottom:1px solid var(--line-2);padding:8px 0"><input type="checkbox" data-is="${x.id}" ${x.yapildi ? 'checked' : ''}><span><span style="${x.yapildi ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(x.is)}</span><br><span class="small muted">${esc(per(x.pid).ad)}, ${esc(per(x.pid).gorev)}</span></span></label>`).join('') || '<p class="empty">Bu güne iş atanmamış.</p>'}
      <h3 style="margin:16px 0 8px">İş ata</h3>
      <div class="acts"><select class="inp sm" id="ip" aria-label="Personel">${ps.map(p => `<option value="${p.id}">${esc(p.ad)}</option>`).join('')}</select><input class="inp sm" id="ii" placeholder="Yapılacak iş" style="flex:1;min-width:200px" aria-label="Yapılacak iş"><button class="btn sm" id="iadd">Ata</button></div>`;
  }
  if (tab === 'liste') body = tbl([['Ad soyad'], ['Görev'], ['Çalışma yeri'], ['Ekip'], ['Şirket']], ps.map(p => `<tr><td data-l="Ad"><b>${esc(p.ad)}</b></td><td data-l="Görev">${esc(p.gorev)}</td><td data-l="Yer">${p.tip}</td><td data-l="Ekip">${{ uretim: 'Üretim', sevkiyat: 'Sevkiyat', kalite: 'Kalite', ofis: 'Ofis' }[p.ekip]}</td><td data-l="Şirket" class="small">${esc(sirket(p.sir).kisa)}</td></tr>`))
    + '<div class="acts" style="margin-top:12px"><button class="btn" id="yper">Personel ekle</button></div>';
  view.innerHTML = `<div class="hd"><div><h1>Personel ve puantaj</h1><p>${ME.ekip ? 'Ekibinizin' : 'Fabrika, ofis ve şoför personelinin'} günlük puantajı ve iş takibi.${ME.ekip ? ' Yalnız kendi ekibinizi görürsünüz.' : ''}</p></div></div>
    ${tabsHtml([['puantaj', 'Günlük puantaj'], ['isler', 'Günlük işler'], ['liste', 'Personel listesi']], tab)}<div class="card">${body}</div>`;
  bindTabs('personel');
  const on = (q, f) => { const b = $(q); if (b) b.onclick = f; };
  if ($('#pt')) $('#pt').onchange = e => { puTarih = e.target.value; route(); };
  if ($('#it')) $('#it').onchange = e => { isTarih = e.target.value; route(); };
  on('#hepGeldi', () => $$('[data-pd]').forEach(s => { if (!s.value) s.value = 'geldi'; }));
  on('#puKaydet', () => { const pz = S.puantaj[puTarih] = S.puantaj[puTarih] || {}; $$('[data-pd]').forEach(s => { const pid = s.dataset.pd; if (s.value) pz[pid] = { d: s.value, mesai: numIn($(`[data-pm="${pid}"]`).value) || 0 }; else delete pz[pid]; }); save(); toast('Puantaj kaydedildi.'); route(); });
  $$('[data-is]').forEach(c => c.onchange = () => { S.isler.find(x => x.id === c.dataset.is).yapildi = c.checked; save(); route(); });
  on('#iadd', () => { const t = $('#ii').value.trim(); if (!t) return toast('İş tanımı girin.'); S.isler.push({ id: 'is' + (++S.seq.is), pid: $('#ip').value, is: t, tarih: isTarih, yapildi: false }); save(); toast('İş atandı.'); route(); });
  on('#yper', () => modal('Personel ekle', `<div class="fg"><label class="f"><span>Ad soyad</span><input class="inp" id="pa"></label><label class="f"><span>Görev</span><input class="inp" id="pg" value="Dolum hattı operatörü"></label>
    <label class="f"><span>Çalışma yeri</span><select class="inp" id="py"><option>Fabrika</option><option>Ofis</option><option>Şoför</option></select></label>
    <label class="f"><span>Ekip</span><select class="inp" id="pe"><option value="uretim">Üretim</option><option value="sevkiyat">Sevkiyat</option><option value="kalite">Kalite</option><option value="ofis">Ofis</option></select></label>
    <label class="f"><span>Şirket</span><select class="inp" id="ps">${S.sirketler.filter(s => ME.sirketler.includes(s.id)).map(s => `<option value="${s.id}">${esc(s.kisa)}</option>`).join('')}</select></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="pok">Kaydet</button></div>`, m => {
    if (ME.ekip) { $('#pe', m).value = ME.ekip; $('#pe', m).disabled = true; }
    $('#pok', m).onclick = () => { const ad = $('#pa', m).value.trim(); if (!ad) return toast('Ad soyad girin.'); S.personel.push({ id: 'pr' + (++S.seq.per), ad, gorev: $('#pg', m).value, tip: $('#py', m).value, ekip: $('#pe', m).value, sir: $('#ps', m).value, aktif: true }); save(); m.remove(); toast(ad + ' personel listesine eklendi.'); route(); };
  }));
};

/* ============ RAPORLAR ============ */
ROUTES.raporlar = function (id) {
  const R = [['ihale', 'İhale başarı oranı', true], ['teslim', 'Sözleşme teslim durumu', true], ['maliyet', 'Ürün ve parti maliyeti', M], ['tuketim', 'Hammadde tüketimi', true], ['yaslandirma', 'Alacak yaşlandırma', F], ['karlilik', 'Sözleşme kârlılığı', M]].filter(r => r[2]);
  const tab = R.some(r => r[0] === id) ? id : R[0][0];
  const bar = (o, c) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, o * 100)).toFixed(1)}%;${c ? 'background:' + c : ''}"></i></div>`;
  let head = [], rows = [], viz = '';
  if (tab === 'ihale') {
    const ih = S.ihaleler.filter(inSir);
    head = ['Kurum', 'Katılınan', 'Kazanılan', 'Kaybedilen', 'Sonuç bekleyen', 'Başarı oranı %', ...(F ? ['Kazanılan tutar ₺'] : [])];
    rows = S.kurumlar.map(k => { const l = ih.filter(i => i.k === k.id && i.durum !== 'hazirlaniyor'); if (!l.length) return null; const kz = l.filter(i => i.durum === 'kazanildi'), ky = l.filter(i => i.durum === 'kaybedildi');
      return [k.ad, l.length, kz.length, ky.length, l.length - kz.length - ky.length, kz.length + ky.length ? Math.round(kz.length / (kz.length + ky.length) * 100) : 0, ...(F ? [Math.round(kz.reduce((t, i) => t + ihaleTutar(i), 0))] : [])]; }).filter(Boolean);
    const kz = ih.filter(i => i.durum === 'kazanildi').length, ky = ih.filter(i => i.durum === 'kaybedildi').length;
    viz = `<p style="margin-bottom:10px">Sonuçlanan ${kz + ky} ihalenin <b>${kz}</b> tanesi kazanıldı: başarı oranı <b>%${kz + ky ? Math.round(kz / (kz + ky) * 100) : 0}</b>.</p><div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span>${bar(r[5] / 100, 'var(--ok)')}<span class="num">%${r[5]}</span>`).join('')}</div>`;
  }
  if (tab === 'teslim') {
    head = ['Sözleşme', 'Kurum', 'Teslim %', 'Sonraki teslim', 'Kesin teminat'];
    rows = S.sozlesmeler.filter(inSir).map(z => { const nx = z.plan.find(p => p.tarih >= TODAY); return [z.no, kurum(z.k).ad, Math.round(sozOran(z) * 100), sozBitti(z) ? 'Tamamlandı' : nx ? trDate(nx.tarih) : 'Takvim geçti', z.kesin.iade ? 'İade alındı' : 'Kurumda']; });
    viz = `<div class="hbar">${rows.map(r => `<span>${esc(r[0])}<span class="small muted"> ${esc(r[1])}</span></span>${bar(r[2] / 100, r[2] >= 100 ? 'var(--ok)' : '')}<span class="num">%${r[2]}</span>`).join('')}</div>`;
  }
  if (tab === 'maliyet') {
    head = ['Ürün', 'Birim maliyet ₺', 'Liste fiyatı ₺', 'Marj %', 'Son parti', 'Son parti birim maliyet ₺'];
    rows = S.urunler.map(u => { const bm = birimMaliyet(u.id), sp = S.partiler.filter(p => p.uid === u.id).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return [u.ad, +bm.toFixed(2), u.fiyat, Math.round((1 - bm / u.fiyat) * 100), sp ? sp.no : '-', sp ? +(sp.maliyet / sp.mik).toFixed(2) : '-']; });
    viz = `<div class="legend"><span style="--c:var(--pet)">Maliyet</span><span style="--c:var(--line-2)">Liste fiyatına kalan</span></div><div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span>${bar(r[1] / r[2])}<span class="num">%${r[3]} marj</span>`).join('')}</div>`;
  }
  if (tab === 'tuketim') {
    const sinir = dayStr(-30), mp = {};
    S.hareketler.filter(x => x.tip === 'Üretim' && x.tarih >= sinir).forEach(x => { mp[x.hid] = (mp[x.hid] || 0) - x.mik; });
    head = ['Malzeme', 'Son 30 gün tüketim', 'Birim', 'Mevcut stok', 'Kaç günlük stok'];
    rows = Object.entries(mp).sort((a, b) => b[1] * hm(b[0]).fiyat - a[1] * hm(a[0]).fiyat).map(([hid, t]) => { const h = hm(hid); return [h.ad, +t.toFixed(2), h.birim, h.stok, t > 0 ? Math.round(h.stok / (t / 30)) : '-']; });
    const mx = Math.max(...rows.map(r => r[1] / Math.max(1, r[3] + r[1])), 0.01);
    viz = `<p class="small muted" style="margin-bottom:8px">Çubuk: tüketimin (tüketim + mevcut stok) içindeki payı.</p><div class="hbar">${rows.slice(0, 12).map(r => `<span>${esc(r[0])}</span>${bar(r[1] / (r[3] + r[1]) / mx * 0.9, typeof r[4] === 'number' && r[4] < 30 ? 'var(--bad)' : '')}<span class="num">${nf(r[1])} ${r[2]}</span>`).join('')}</div>`;
  }
  if (tab === 'yaslandirma') {
    const b = f => { if (kalanF(f) < 0.5) return -1; const g = diffDays(TODAY, f.vade); return g <= 0 ? 0 : g <= 30 ? 1 : g <= 60 ? 2 : 3; };
    head = ['Kurum', 'Vadesi gelmemiş ₺', '1-30 gün gecikmiş ₺', '31-60 gün ₺', '60+ gün ₺', 'Toplam ₺'];
    rows = S.kurumlar.map(k => { const fs = S.faturalar.filter(f => f.k === k.id && inSir(f)); const c = [0, 0, 0, 0]; fs.forEach(f => { const i = b(f); if (i >= 0) c[i] += kalanF(f); }); const t = c.reduce((a, x) => a + x, 0); return t ? [k.ad, ...c.map(Math.round), Math.round(t)] : null; }).filter(Boolean);
    const mx = Math.max(...rows.map(r => r[5]), 1), C = ['var(--pet)', 'var(--acc)', 'var(--bad)', '#6B1B14'];
    viz = `<div class="legend">${['Vadesi gelmemiş', '1-30 gün', '31-60 gün', '60+ gün'].map((l, i) => `<span style="--c:${C[i]}">${l}</span>`).join('')}</div>
      <div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span><div class="stack" style="width:${(r[5] / mx * 100).toFixed(1)}%">${[1, 2, 3, 4].map(i => r[i] ? `<i style="width:${(r[i] / r[5] * 100).toFixed(1)}%;background:${C[i - 1]}"></i>` : '').join('')}</div><span class="num">${money0(r[5])}</span>`).join('')}</div>`;
  }
  if (tab === 'karlilik') {
    head = ['Sözleşme', 'Kurum', 'Teslim edilen ₺', 'Ürün maliyeti ₺', 'Nakliye ₺', 'Brüt kâr ₺', 'Marj %'];
    rows = S.sozlesmeler.filter(inSir).map(z => { const svs = S.sevkiyatlar.filter(v => v.szId === z.id), t = svs.filter(v => v.durum === 'teslim'); const c = t.reduce((a, v) => a + svCiro(v), 0), um = t.reduce((a, v) => a + svUrunMaliyet(v), 0), nk = svs.reduce((a, v) => a + v.nakliye.bedel, 0);
      return [z.no, kurum(z.k).ad, Math.round(c), Math.round(um), Math.round(nk), Math.round(c - um - nk), c ? Math.round((c - um - nk) / c * 100) : 0]; });
    viz = `<div class="hbar">${rows.map(r => `<span>${esc(r[0])}<span class="small muted"> ${esc(r[1])}</span></span>${bar(r[6] / 100, 'var(--ok)')}<span class="num">%${r[6]}</span>`).join('')}</div>`;
  }
  const fmt = (v, i) => typeof v === 'number' && i > 0 ? (/₺/.test(head[i]) ? money0(v) : nf(v)) : esc(v);
  view.innerHTML = `<div class="hd"><div><h1>Raporlar</h1><p>${aktifSir() === 'hepsi' ? 'Tüm şirketler, konsolide.' : esc(sirket(aktifSir()).ad) + (sirket(aktifSir()).ad.endsWith('.') ? '' : '.')} Her rapor Excel'e aktarılabilir.</p></div><button class="btn alt" id="csv">Excel'e aktar</button></div>
    ${tabsHtml(R.map(r => [r[0], r[1]]), tab)}
    <div class="card"><h2>${R.find(r => r[0] === tab)[1]}</h2>${viz}</div>
    <div class="card">${tbl(head.map((h, i) => [h, i > 0 && rows[0] && typeof rows[0][i] === 'number' ? 'r' : '']), rows.map(r => `<tr>${r.map((v, i) => `<td data-l="${esc(head[i])}" class="${typeof v === 'number' && i > 0 ? 'r num' : ''}">${fmt(v, i)}</td>`).join('')}</tr>`))}</div>`;
  bindTabs('raporlar');
  $('#csv').onclick = () => { csvIndir('cozum-grup-' + tab + '-' + TODAY, [head, ...rows.map(r => r.map(v => typeof v === 'number' ? String(v).replace('.', ',') : v))]); toast('Rapor CSV olarak indirildi; Excel ile açılır.'); };
};

if (ME) route();
