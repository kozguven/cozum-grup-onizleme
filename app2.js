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
const lot = id => S.lotlar.find(x => x.id === id);
const lotTag = l => tag(LOT_DURUM[l.durum], { karantina: 'a', kabul: 'g', red: 'r' }[l.durum]);
ROUTES.kalite = function (id) {
  if (id && id.startsWith('lot-') && lot(id.slice(4))) return lotForm(id.slice(4));
  if (id && parti(id)) return kaliteForm(id);
  const hmTab = !!(id && id.startsWith('hm'));
  const top = `<div class="hd"><div><h1>Kalite kontrol</h1><p>İki kol: üretilen partilerin kontrolü ve satın alınan hammaddenin giriş kontrolü. Onaylanmayan parti sevk edilemez, onaylanmayan hammadde stoğa girmez.</p></div></div>
    <div class="seg" id="kolSeg"><button data-kol="kalite" class="${hmTab ? '' : 'on'}">Üretim kalite kontrol (${S.partiler.filter(p => p.durum === 'kalite' && inSir(p)).length} bekliyor)</button><button data-kol="hm" class="${hmTab ? 'on' : ''}">Hammadde giriş kontrolü (${S.lotlar.filter(l => l.durum === 'karantina' && inSir(l)).length} karantinada)</button></div>`;
  const bindKol = () => $$('[data-kol]').forEach(b => b.onclick = () => { location.hash = b.dataset.kol === 'hm' ? 'kalite/hm' : 'kalite'; });
  if (hmTab) {
    const tab = ['hmkabul', 'hmred'].includes(id) ? id : 'hm', dmap = { hm: 'karantina', hmkabul: 'kabul', hmred: 'red' };
    const all = S.lotlar.filter(inSir), list = all.filter(l => l.durum === dmap[tab]).sort((a, b) => b.tarih.localeCompare(a.tarih));
    view.innerHTML = top + tabsHtml([['hm', `Karantinada (${all.filter(l => l.durum === 'karantina').length})`], ['hmkabul', 'Kabul edilen lotlar'], ['hmred', 'Reddedilen']], tab) +
      `<div class="note">Satın alma ile gelen her hammadde ve ambalaj lotu önce karantinaya alınır. Kalite onayı verilene kadar stokta kullanılabilir görünmez ve üretimde düşülemez.</div>
      <div class="card">${tbl([['Lot'], ['Malzeme'], ['Miktar', 'r'], ['Tedarikçi'], ['Geliş'], ['Durum'], ['']], list.map(l => { const h = hm(l.hid); return `<tr class="click" data-go="kalite/lot-${l.id}"><td data-l="Lot"><b>${esc(l.no)}</b><div class="small muted">${esc(l.belge)}</div></td><td data-l="Malzeme">${esc(h.ad)}</td>
        <td data-l="Miktar" class="r num">${nf(l.mik)} ${h.birim}</td><td data-l="Tedarikçi" class="small">${esc(ted(l.tedId).ad)}</td><td data-l="Geliş">${trDate(l.tarih)}</td><td data-l="Durum">${lotTag(l)}</td>
        <td class="r">${l.durum === 'karantina' ? `<a class="btn sm" href="#kalite/lot-${l.id}">Kontrol et</a>` : ''}</td></tr>`; }), tab === 'hm' ? 'Karantinada bekleyen lot yok.' : 'Kayıt yok.')}</div>`;
    bindTabs('kalite'); bindKol(); bindClicks(); return;
  }
  const tab = ['onay', 'red'].includes(id) ? id : 'kalite';
  const all = S.partiler.filter(inSir), list = all.filter(p => p.durum === tab).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = top + `
    ${tabsHtml([['kalite', `Bekleyen partiler (${all.filter(p => p.durum === 'kalite').length})`], ['onay', 'Onaylı partiler'], ['red', 'Reddedilen']], tab)}
    <div class="card">${tab === 'kalite' ? tbl([['Parti'], ['Ürün'], ['Miktar', 'r'], ['Üretim tarihi'], ['']],
      list.map(p => `<tr class="click" data-go="kalite/${p.id}"><td data-l="Parti"><b>${esc(p.no)}</b>${sirCol(p)}</td><td data-l="Ürün">${esc(urun(p.uid).ad)}</td><td data-l="Miktar" class="r num">${nf(p.mik)}</td><td data-l="Üretim">${trDate(p.tarih)}</td><td class="r"><a class="btn sm" href="#kalite/${p.id}">Ölçüm gir</a></td></tr>`), 'Kalite bekleyen parti yok.')
    : tab === 'onay' ? tbl([['Parti'], ['Ürün'], ['Üretilen', 'r'], ['Depoda kalan', 'r'], ['Gittiği kurumlar'], ['']],
      list.map(p => { const svs = S.sevkiyatlar.filter(v => v.kalemler.some(l => l.partiId === p.id)); return `<tr class="click" data-go="kalite/${p.id}"><td data-l="Parti"><b>${esc(p.no)}</b><div class="small muted">${trDate(p.tarih)}</div></td><td data-l="Ürün">${esc(urun(p.uid).ad)}</td>
        <td data-l="Üretilen" class="r num">${nf(p.mik)}</td><td data-l="Kalan" class="r num">${nf(partiKalan(p))}</td>
        <td data-l="Gittiği yer" class="small">${[...new Set(svs.map(v => kurum(v.k).ad))].map(esc).join(', ') || '<span class="muted">Depoda</span>'}</td>
        <td class="r"><a class="linkbtn" href="belge.html?tip=analiz&id=${p.id}">Analiz raporu</a></td></tr>`; }))
    : tbl([['Parti'], ['Ürün'], ['Miktar', 'r'], ['Neden']], list.map(p => `<tr class="click" data-go="kalite/${p.id}"><td data-l="Parti"><b>${esc(p.no)}</b></td><td data-l="Ürün">${esc(urun(p.uid).ad)}</td><td data-l="Miktar" class="r num">${nf(p.mik)}</td><td data-l="Neden" class="small">${esc(p.kkNot)}</td></tr>`))}</div>`;
  bindTabs('kalite'); bindKol(); bindClicks();
};
function lotSpec(h) { return h.tur === 'hammadde' ? [{ k: 'saf', ad: h.id === 'h9' ? 'Aktif klor' : 'Aktif madde / saflık', bir: '%', min: h.saf[0], max: h.saf[1] }, { k: 'nem', ad: 'Nem', bir: '%', min: 0, max: h.nem }] : []; }
function lotSel(h) { return h.tur === 'hammadde' ? [['gorunum', 'Görünüm ve ambalaj bütünlüğü']] : [['olcu', 'Ölçü / hacim'], ['sizdirmazlik', 'Sızdırmazlık testi'], ['baski', 'Baskı ve renk']]; }
function lotForm(id) {
  const l = lot(id), h = hm(l.hid), sp = lotSpec(h), sel = lotSel(h), ed = l.durum === 'karantina';
  const out = (x, v) => v !== '' && v != null && !isNaN(v) && (v < x.min || v > x.max);
  view.innerHTML = `<a class="back" href="#kalite/${{ karantina: 'hm', kabul: 'hmkabul', red: 'hmred' }[l.durum]}">Hammadde giriş kontrolüne dön</a>
    <div class="hd"><div><h1>Lot ${esc(l.no)}, ${esc(h.ad)}</h1><p>${lotTag(l)} &nbsp; ${nf(l.mik)} ${h.birim}, ${esc(ted(l.tedId).ad)}, geliş ${trDate(l.tarih)}, ${esc(l.belge)}</p></div></div>
    <div class="card" style="max-width:820px"><h2>${ed ? 'Giriş kontrol formu' : 'Kontrol sonuçları'}</h2>
    ${tbl([['Kontrol'], ['Kabul kriteri'], ['Sonuç']], sp.map(x => `<tr><td data-l="Kontrol">${esc(x.ad)}</td><td data-l="Kriter" class="num">${x.k === 'nem' ? 'En çok ' + nf(x.max) + ' ' + x.bir : nf(x.min) + ' – ' + nf(x.max) + ' ' + x.bir}</td>
      <td data-l="Sonuç">${ed ? `<input class="inp sm" data-lk="${x.k}" inputmode="decimal" style="width:110px" aria-label="${esc(x.ad)}">` : `<b class="${out(x, l.olcum[x.k]) ? 'bad' : ''}">${nf(l.olcum[x.k])} ${x.bir}</b>`}</td></tr>`)
      .concat(sel.map(([k, ad]) => `<tr><td data-l="Kontrol">${ad}</td><td data-l="Kriter">Uygun</td><td data-l="Sonuç">${ed ? `<select class="inp sm" data-ls="${k}" aria-label="${ad}"><option>Uygun</option><option>Uygun değil</option></select>` : esc(l.olcum[k])}</td></tr>`))
      .concat(h.tur === 'hammadde' ? [`<tr><td data-l="Kontrol">Tedarikçi analiz sertifikası (CoA)</td><td data-l="Kriter">Lotla birlikte gelmeli</td><td data-l="Sonuç">${ed ? '<label class="chk"><input type="checkbox" id="coa" checked><span>Geldi</span></label>' : (l.olcum.coa ? 'Geldi' : 'Gelmedi')}</td></tr>`] : []))}
    ${ed ? `<label class="f" style="margin-top:12px"><span>Not</span><textarea class="inp" id="lnot" rows="2" placeholder="Ret nedeni veya gözlem"></textarea></label>
      <p class="small" id="lmsg" style="margin-bottom:10px"></p>
      <div class="acts"><button class="btn" id="lOnay" disabled>Kabul et, stoğa al</button><button class="btn danger" id="lRed">Reddet, tedarikçiye iade</button></div>`
    : `<p class="small muted" style="margin-top:10px">${l.durum === 'kabul' ? 'Kabul eden' : 'Reddeden'}: ${esc(l.kkKisi)}, ${trDate(l.kkTarih)}${l.kkNot ? '. Not: ' + esc(l.kkNot) : ''}</p>`}
    </div>`;
  if (!ed) return;
  const vals = () => { const o = {}; sp.forEach(x => { o[x.k] = numIn($(`[data-lk="${x.k}"]`).value); }); sel.forEach(([k]) => { o[k] = $(`[data-ls="${k}"]`).value; }); if ($('#coa')) o.coa = $('#coa').checked; return o; };
  const check = () => {
    const v = vals(); let bos = 0, dis = 0;
    sp.forEach(x => { const i = $(`[data-lk="${x.k}"]`), o = out(x, v[x.k]); i.classList.toggle('out', o); if (isNaN(v[x.k])) bos++; if (o) dis++; });
    sel.forEach(([k]) => { if (v[k] !== 'Uygun') dis++; }); if ($('#coa') && !v.coa) dis++;
    $('#lOnay').disabled = bos > 0 || dis > 0;
    $('#lmsg').innerHTML = dis ? `<span class="bad">${dis} kontrol kriter dışında; lot kabul edilemez.</span>` : bos ? '<span class="muted">Tüm ölçümleri girin.</span>' : '<span class="ok">Tüm kontroller uygun.</span>';
  };
  $$('[data-lk]').forEach(i => i.oninput = check); $$('[data-ls]').forEach(i => i.onchange = check); if ($('#coa')) $('#coa').onchange = check; check();
  const bitir = d => { l.olcum = vals(); l.durum = d; l.kkKisi = ME.ad; l.kkTarih = TODAY; l.kkNot = $('#lnot').value.trim(); };
  $('#lOnay').onclick = () => { bitir('kabul'); lotKabul(l); save(); toast(`Lot ${l.no} kabul edildi; ${nf(l.mik)} ${h.birim} stokta kullanılabilir.`); route(); };
  $('#lRed').onclick = () => { if (!$('#lnot').value.trim()) return toast('Ret nedenini not alanına yazın.'); bitir('red'); save(); toast('Lot reddedildi; stoğa girmedi, tedarikçiye iade edilecek.'); route(); };
}
function lotKabul(l) {
  const h = hm(l.hid), t = ted(l.tedId);
  h.stok = +(h.stok + l.mik).toFixed(3); h.fiyat = l.fiyat;
  S.hareketler.push({ id: 'hr' + (++S.seq.hrk), tarih: TODAY, hid: h.id, mik: l.mik, tip: 'Satın alma (kalite onaylı)', ack: t.ad + ', lot ' + l.no });
  S.alimlar.push({ id: 'al' + (++S.seq.alim), sir: l.sir, tedId: t.id, hid: h.id, mik: l.mik, fiyat: l.fiyat, tarih: TODAY, vade: addDays(TODAY, t.vade), tutar: Math.round(l.mik * l.fiyat * 1.2), belge: l.belge, odeme: [] });
}
function kaliteForm(id) {
  const p = parti(id), u = urun(p.uid), sp = SPEC[u.spec], ed = p.durum === 'kalite';
  const out = (x, v) => v !== '' && v != null && !isNaN(v) && (v < x.min || v > x.max);
  view.innerHTML = `<a class="back" href="#kalite${p.durum === 'kalite' ? '' : '/' + p.durum}">Üretim kalite kontrole dön</a>
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
    <div class="card">${tbl([['Sevkiyat'], ['Kurum / müşteri'], ['Tarih'], ['Nakliye'], ['Partiler'], ...(F ? [['Nakliye (oran)', 'r']] : []), ['Durum']],
      list.map(v => `<tr class="click" data-go="sevkiyat/${v.id}"><td data-l="Sevkiyat"><b>${esc(v.no)}</b><div class="small muted">${esc(soz(v.szId).no)}</div></td><td data-l="Kurum">${kurumAd(v.k)}${sirCol(v)}</td>
        <td data-l="Tarih" class="nowrap">${trDate(v.tarih)}</td><td data-l="Nakliye" class="small">${esc(v.nakliye.plaka || v.nakliye.takip || '')}<div class="muted">${esc(nakTipAd(v.nakliye))}</div></td>
        <td data-l="Partiler" class="small">${v.kalemler.map(l => esc(parti(l.partiId).no)).join(', ')}</td>${F ? `<td data-l="Nakliye" class="r num">${money0(v.nakliye.bedel)}<div class="small ${nakOran(v) > 0.1 ? 'bad' : 'muted'}">${pct(nakOran(v))}</div></td>` : ''}<td data-l="Durum">${svTag(v)}</td></tr>`))}</div>`;
  $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = b.dataset.tab === 'araclar' ? 'sevkiyat/araclar' : 'sevkiyat'; });
  bindClicks();
};
function sevkYeni(arg) {
  const [szId, tyArg] = (arg || '').split('~');
  const aktif = S.sozlesmeler.filter(z => inSir(z) && !sozBitti(z) && !z.kapanis);
  const z = soz(szId) || aktif[0];
  if (!z) { view.innerHTML = '<div class="noperm">Sevk edilecek aktif sözleşme yok.</div>'; return; }
  const dv = dagVar(z), tys = dv ? Object.keys(z.dagilim).map(tyBy) : S.teslimYerleri.filter(t => t.k === z.k);
  const ty = tys.find(t => t.id === tyArg) ? tyArg : (dv ? '' : (tys[0] || {}).id || '');
  const rows = z.kalemler.map(x => {
    const kalan = Math.max(0, x.mik - teslimEdilen(z, x.uid) - yoldaMik(z, x.uid));
    const kTy = dv && ty ? ((z.dagilim[ty] || {})[x.uid] || 0) - teslimEdilen(z, x.uid, ty) - yoldaTy(z, x.uid, ty) : null;
    const ps = S.partiler.filter(p => p.uid === x.uid && p.sir === z.sir && (p.durum !== 'onay' || partiKalan(p) > 0));
    return `<div class="skal" data-skal="${x.uid}" style="padding:10px 0;border-bottom:1px solid var(--line-2)">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">${kalemKart(x, { kisa: true })}
        <span class="small muted">Sözleşmede kalan: <b data-kalan="${x.uid}">${nf(kalan)}</b> adet${kTy != null ? `<br>Bu teslim yerine kalan: <b data-kalanty="${x.uid}">${nf(kTy)}</b>` : ''}</span></div>
      <label class="small" style="display:flex;gap:8px;align-items:center;margin:6px 0 0 54px;flex-wrap:wrap">Sevk edilen ürün / ambalaj <select class="inp sm" data-urun="${x.uid}" aria-label="Sevk edilen ürün">${S.urunler.map(u => `<option value="${u.id}" ${u.id === x.uid ? 'selected' : ''}>${esc(u.ad)}</option>`).join('')}</select></label>
      <p class="small bad hide" data-uyus="${x.uid}" style="margin:4px 0 0 54px"></p>
      ${ps.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0 0 54px;flex-wrap:wrap"><span class="small">${esc(p.no)}, ${p.durum === 'onay' ? 'depoda ' + nf(partiKalan(p)) + ' adet' : nf(p.mik) + ' adet'}</span>
        ${p.durum === 'onay' ? `<input class="inp sm" data-pid="${p.id}" data-u="${x.uid}" data-max="${partiKalan(p)}" inputmode="numeric" placeholder="Sevk adedi" style="width:120px" aria-label="${esc(p.no)} sevk adedi">` : (p.durum === 'red' ? '<span class="lock">Reddedildi</span>' : LOCK)}</div>`).join('') || '<p class="small muted" style="padding-left:54px">Bu ürünün depoda partisi yok; önce üretim emri verin.</p>'}</div>`;
  }).join('');
  view.innerHTML = `<a class="back" href="#sevkiyat">Sevkiyata dön</a><div class="hd"><div><h1>Yeni sevkiyat</h1><p>Yalnız kalite onaylı partiler seçilebilir. Hangi partinin hangi teslim yerine gittiği kayda geçer.</p></div></div>
    <div class="card" style="max-width:900px">
      <div class="fg"><label class="f"><span>Sözleşme / sipariş</span><select class="inp" id="ssz">${aktif.map(a => `<option value="${a.id}" ${a.id === z.id ? 'selected' : ''}>${esc(a.no)}, ${esc(kurum(a.k).ad)}</option>`).join('')}</select></label>
      <label class="f"><span>Sevk tarihi</span><input class="inp" type="date" id="star" value="${dayStr(1)}"></label>
      ${tys.length ? `<label class="f" style="grid-column:1/-1"><span>Teslim yeri${dv ? ' (dağılımdan)' : ''}</span><select class="inp" id="sty">${dv ? '<option value="">Teslim yeri seçin</option>' : ''}${tys.map(t => `<option value="${t.id}" ${t.id === ty ? 'selected' : ''}>${esc(t.ad)}</option>`).join('')}</select></label>` : ''}</div>
      ${ty ? notKutu(ty) : dv ? '<div class="note w">Bu sözleşmede teslim yerlerine dağılım var; önce teslim yerini seçin. Kalan miktarlar teslim yerine göre hesaplanır.</div>' : ''}
      <h3 style="margin-top:6px">Kalemler ve partiler</h3>${rows}
      <h3 style="margin-top:16px;margin-bottom:8px">Nakliye</h3>
      <div class="seg" id="ntip">${Object.entries(NAK_TUR).map(([k, ad], i) => `<button type="button" data-n="${k}" class="${i ? '' : 'on'}">${ad}</button>`).join('')}</div>
      <div data-nk="kendi" class="fg">
        <label class="f"><span>Araç</span><select class="inp" id="sarac">${S.araclar.map(a => `<option value="${a.id}">${esc(a.plaka)}, ${esc(a.tip)}, ${esc(per(a.sofor) ? per(a.sofor).ad : '')}</option>`).join('')}</select></label>
        <label class="f"><span>Gidiş-dönüş km</span><input class="inp" id="skm" value="${(KM_TAH[z.k] || 300)}" inputmode="numeric"></label>
      </div>
      <div data-nk="piyasa" class="fg hide">
        <label class="f"><span>Araç sahibi / firma</span><input class="inp" id="spf" placeholder="Örn. Selim Yıldız (kiralık tır)"></label>
        <label class="f"><span>Plaka</span><input class="inp" id="spp" placeholder="34 ABC 123"></label>
        <label class="f"><span>Şoför</span><input class="inp" id="sps"></label>
        <label class="f"><span>Kira / taşıma ücreti (₺)</span><input class="inp" id="spu" inputmode="decimal" placeholder="Örn. 18000"></label>
      </div>
      <div data-nk="ambar" class="fg hide">
        <label class="f"><span>Ambar firması</span><input class="inp" id="saf" value="Başkent Ambarı"></label>
        <label class="f"><span>Ambar takip / irsaliye no</span><input class="inp" id="sat" placeholder="BA-00000"></label>
        <label class="f"><span>Ambar ücreti (₺)</span><input class="inp" id="sau" inputmode="decimal" placeholder="Örn. 6500"></label>
      </div>
      <div class="fg">
        <label class="f"><span>Hamaliye (kurumda ödenen, ₺)</span><input class="inp" id="sham" inputmode="decimal" value="${ty && tyBy(ty) ? tyBy(ty).hamaliye || 0 : 0}"></label>
        <label class="f"><span>Forklift bedeli (kurumda ödenen, ₺)</span><input class="inp" id="sfork" inputmode="decimal" value="0"></label>
      </div>
      ${F ? '<p class="small" id="nmal" style="margin-bottom:12px"></p>' : ''}
      <p class="small bad hide" id="serr" style="margin-bottom:8px"></p>
      <div class="acts"><button class="btn" id="sok">Sevkiyatı oluştur</button><a class="btn alt" href="#sevkiyat">Vazgeç</a></div>
    </div>`;
  let ntip = 'kendi';
  const tasima = () => ntip === 'kendi' ? (num($('#skm').value) || 0) * arac($('#sarac').value).kmMaliyet : numIn(ntip === 'piyasa' ? $('#spu').value : $('#sau').value) || 0;
  const malBedeli = () => $$('[data-pid]').reduce((t, i) => t + (num(i.value) || 0) * z.kalemler.find(x => x.uid === i.dataset.u).fiyat, 0);
  const hesap = () => {
    if (!F) return; const ta = tasima(), ha = numIn($('#sham').value) || 0, fo = numIn($('#sfork').value) || 0, top = ta + ha + fo, mb = malBedeli();
    $('#nmal').innerHTML = `Toplam nakliye maliyeti: <b>${money0(top)}</b> (taşıma ${money0(ta)}${ntip === 'kendi' ? ', km × ' + money(arac($('#sarac').value).kmMaliyet) : ''} + hamaliye ${money0(ha)} + forklift ${money0(fo)}). ` +
      (mb ? `Ana fatura tutarı (KDV hariç) ${money0(mb)}, nakliye oranı <b id="nOran">${pct(top / mb)}</b>.` : 'Oran için sevk adedi girin.');
  };
  const uyus = () => { let bad = 0; z.kalemler.forEach(x => { const sel = $(`[data-urun="${x.uid}"]`), msg = uyusmaz(x, sel.value), p = $(`[data-uyus="${x.uid}"]`); p.textContent = msg; p.classList.toggle('hide', !msg); sel.classList.toggle('out', !!msg); if (msg) bad++; }); $('#sok').disabled = bad > 0; };
  $$('[data-urun]').forEach(s => s.onchange = uyus);
  $$('#ntip button').forEach(b => b.onclick = () => { ntip = b.dataset.n; $$('#ntip button').forEach(x => x.classList.toggle('on', x === b)); $$('[data-nk]').forEach(d => d.classList.toggle('hide', d.dataset.nk !== ntip)); hesap(); });
  $$('#skm,#sarac,#spu,#sau,#sham,#sfork,[data-pid]').forEach(i => { i.oninput = hesap; i.onchange = hesap; }); hesap();
  $('#ssz').onchange = e => { location.hash = 'sevkiyat/yeni-' + e.target.value; };
  if ($('#sty')) $('#sty').onchange = e => { location.hash = 'sevkiyat/yeni-' + z.id + '~' + e.target.value; };
  $('#sok').onclick = () => {
    const err = t => { $('#serr').textContent = t; $('#serr').classList.remove('hide'); };
    if (dv && !ty) return err('Teslim yerini seçin.');
    const lines = $$('[data-pid]').map(i => ({ partiId: i.dataset.pid, uid: i.dataset.u, mik: num(i.value) || 0, max: +i.dataset.max })).filter(l => l.mik > 0);
    if (!lines.length) return err('En az bir partiden sevk adedi girin.');
    const fazla = lines.find(l => l.mik > l.max); if (fazla) return err(parti(fazla.partiId).no + ' partisinde depoda ' + nf(fazla.max) + ' adet var.');
    for (const x of z.kalemler) {
      const top = lines.filter(l => l.uid === x.uid).reduce((t, l) => t + l.mik, 0), kal = x.mik - teslimEdilen(z, x.uid) - yoldaMik(z, x.uid);
      if (top > kal) return err(urun(x.uid).ad + ' için sözleşmede kalan ' + nf(kal) + ' adet.');
      if (dv && top) { const kt = ((z.dagilim[ty] || {})[x.uid] || 0) - teslimEdilen(z, x.uid, ty) - yoldaTy(z, x.uid, ty); if (top > kt) return err(`${urun(x.uid).ad} için ${tyBy(ty).ad} dağılımında kalan ${nf(kt)} adet.`); }
    }
    let n;
    if (ntip === 'kendi') { const a = arac($('#sarac').value), km = num($('#skm').value) || 0; n = { tip: 'kendi', aracId: a.id, plaka: a.plaka, sofor: per(a.sofor) ? per(a.sofor).ad : '', firma: '', km }; }
    else if (ntip === 'piyasa') { if (!$('#spp').value.trim() || !$('#spf').value.trim()) return err('Piyasa aracının sahibini ve plakasını girin.'); n = { tip: 'piyasa', firma: $('#spf').value.trim(), plaka: $('#spp').value.trim().toUpperCase(), sofor: $('#sps').value.trim(), km: 0 }; }
    else { if (!$('#saf').value.trim()) return err('Ambar firmasını girin.'); n = { tip: 'ambar', firma: $('#saf').value.trim(), takip: $('#sat').value.trim(), plaka: '', sofor: '', km: 0 }; }
    n.tasima = tasima(); n.hamaliye = numIn($('#sham').value) || 0; n.forklift = numIn($('#sfork').value) || 0; n.bedel = n.tasima + n.hamaliye + n.forklift;
    const v = { id: 'sv' + Date.now(), no: 'SV-2026-0' + (++S.seq.sevk), irsNo: 'CZI2026000000' + (++S.seq.irs), sir: z.sir, szId: z.id, k: z.k, tyId: ty || null, tarih: $('#star').value, durum: 'hazirlaniyor', kalemler: lines.map(l => ({ partiId: l.partiId, uid: l.uid, mik: l.mik, red: 0 })), nakliye: n, tutanak: null, faturaId: null };
    S.sevkiyatlar.push(v); save(); toast('Sevkiyat ' + v.no + ' oluşturuldu, irsaliye hazır.'); location.hash = 'sevkiyat/' + v.id;
  };
}
const KM_TAH = { k1: 680, k2: 230, k3: 30, k4: 680, k5: 690, k6: 1120, k7: 240, k8: 40, k9: 940 };
function sevkDetay(id) {
  const v = sevk(id), z = soz(v.szId), f = v.faturaId ? fatura(v.faturaId) : null, n = v.nakliye, t = tyBy(v.tyId);
  const acts = { hazirlaniyor: '<button class="btn" id="aYol">Yola çıktı</button>', yolda: '<button class="btn acc" id="aTes">Teslim edildi</button>', teslim: '' }[v.durum];
  view.innerHTML = `<a class="back" href="#sevkiyat">Sevkiyata dön</a>
    <div class="hd"><div><h1>${esc(v.no)}, ${kurumAd(v.k)}</h1><p>${svTag(v)} &nbsp; Sevk tarihi ${trDate(v.tarih)}, irsaliye ${esc(v.irsNo)}</p></div>
      <div class="acts">${acts}<a class="btn alt" href="belge.html?tip=irsaliye&id=${v.id}">İrsaliye</a></div></div>
    ${v.durum !== 'teslim' && t ? notKutu(t.id) : ''}
    <div class="meta"><div><small>Sözleşme / sipariş</small><b>${can('sozlesmeler') ? `<a href="#sozlesmeler/${z.id}">${esc(z.no)}</a>` : esc(z.no)}</b><div class="small muted">${esc(turAd(z.tur))}</div></div>
      <div><small>Teslim yeri</small><b>${t ? (can('kurumlar') ? `<a href="#kurumlar/ty-${t.id}">${esc(t.ad)}</a>` : esc(t.ad)) : 'Kurum adresi'}</b></div>
      <div><small>Nakliye</small><b>${esc(NAK_TUR[n.tip] || n.tip)}</b><div class="small muted">${n.tip === 'ambar' ? esc(n.firma) + (n.takip ? ', takip ' + esc(n.takip) : '') : esc(n.plaka) + (n.firma ? ', ' + esc(n.firma) : '') + (n.sofor ? ', ' + esc(n.sofor) : '')}</div></div>
      <div><small>Muayene ve kabul tutanağı</small><b>${v.tutanak ? esc(v.tutanak.no) + ', ' + trDate(v.tutanak.tarih) : 'Teslimde girilir'}</b></div>
      ${F && can('fatura') ? `<div><small>Fatura</small><b>${f ? `<a href="belge.html?tip=fatura&id=${f.id}">${esc(f.no)}</a>` : v.durum === 'teslim' ? '<a href="#fatura/kesilecek">Kesilecek</a>' : 'Teslimden sonra'}</b></div>` : ''}
    </div>
    ${F ? `<div class="card" style="margin-bottom:14px"><h2>Nakliye maliyeti</h2><div class="meta" style="border:0;padding:0;margin:0">
      <div><small>Taşıma${n.tip === 'kendi' && n.km ? ' (' + nf(n.km) + ' km)' : ''}</small><b class="num">${money0(n.tasima)}</b></div><div><small>Hamaliye</small><b class="num">${money0(n.hamaliye)}</b></div>
      <div><small>Forklift</small><b class="num">${money0(n.forklift)}</b></div><div><small>Toplam nakliye</small><b class="num">${money0(n.bedel)}</b></div>
      <div><small>Ana fatura tutarı (KDV hariç)</small><b class="num">${money0(svCiro(v))}</b></div><div><small>Nakliye / fatura</small><b class="num ${nakOran(v) > 0.1 ? 'bad' : ''}" id="svOran">${pct(nakOran(v))}</b></div>
    </div></div>` : ''}
    <div class="card"><h2>Sevk edilen kalemler ve muayene</h2>${tbl([['Ürün'], ['Parti'], ['Sevk edilen', 'r'], ['Muayene']], v.kalemler.map(l => { const p = parti(l.partiId), x = z.kalemler.find(k => k.uid === l.uid) || { uid: l.uid }; return `<tr><td data-l="Ürün"><div class="kk">${urunImg(l.uid, x.amb)}<div>${esc(urun(l.uid).ad)}<div class="small muted">${esc(x.amb || '')}</div></div></div></td>
      <td data-l="Parti">${can('kalite') ? `<a href="#kalite/${p.id}">${esc(p.no)}</a>` : esc(p.no)}</td><td data-l="Sevk" class="r num">${nf(l.mik)} adet</td>
      <td data-l="Muayene" class="small">${v.durum !== 'teslim' ? '<span class="muted">Teslimde yapılır</span>' : l.red ? `<span class="ok">Kabul ${nf(kabulMik(l))}</span>, <span class="bad">ret ${nf(l.red)}</span>${l.redNot ? '<br>' + esc(l.redNot) : ''}` : `<span class="ok">Tamamı kabul (${nf(l.mik)})</span>`}</td></tr>`; }))}</div>
    ${t ? `<div class="card" style="margin-top:14px"><h2>Teslim yerine not ekle</h2><p class="small muted" style="margin-bottom:8px">Bu not ${esc(t.ad)} kartına yazılır; sonraki sevkiyat ve fatura kesiminde sarı kutuda görünür.</p>
      <textarea class="inp" id="svNot" rows="2" placeholder="Örn. Forklift yoktu, 2 hamal çağrıldı"></textarea>
      <div class="acts" style="margin-top:8px"><label class="chk"><input type="checkbox" id="svUy" checked><span>Uyarı olarak işaretle</span></label><button class="btn sm" id="svNotEkle">Notu kaydet</button></div></div>` : ''}`;
  const on = (q, fn) => { const b = $(q); if (b) b.onclick = fn; };
  on('#svNotEkle', () => { const m = $('#svNot').value.trim(); if (!m) return toast('Not yazın.'); t.notlar.push({ tarih: TODAY, metin: m, kaynak: 'sevkiyat', uyari: $('#svUy').checked, kim: ME.ad }); save(); toast('Not ' + t.ad + ' kartına eklendi.'); route(); });
  on('#aYol', () => { v.durum = 'yolda'; save(); toast('Sevkiyat yolda.'); route(); });
  on('#aTes', () => modal('Teslim edildi, muayene ve kabul', `<p class="small muted" style="margin-bottom:12px">Kurumun muayene ve kabul komisyonu tutanağını girin. Reddedilen miktar teslim edilmiş sayılmaz ve faturalanmaz.</p>
    <div class="fg"><label class="f"><span>Tutanak no</span><input class="inp" id="tno" value="MKT-2026/${200 + S.seq.sevk}"></label><label class="f"><span>Tutanak tarihi</span><input class="inp" type="date" id="ttar" value="${TODAY}"></label></div>
    ${v.kalemler.map((l, i) => `<div class="fg" style="border-top:1px solid var(--line-2);padding-top:8px"><div style="grid-column:1/-1" class="small"><b>${esc(urun(l.uid).ad)}</b>, sevk ${nf(l.mik)} adet</div>
      <label class="f"><span>Muayenede reddedilen</span><input class="inp" data-red="${i}" value="0" inputmode="numeric"></label><label class="f"><span>Ret nedeni</span><input class="inp" data-rednot="${i}" placeholder="Örn. etiket hasarlı"></label></div>`).join('')}
    ${t ? '<label class="f"><span>Teslim yerine not (isteğe bağlı)</span><input class="inp" id="tnot" placeholder="Örn. Depo sorumlusu izindeydi, nöbetçi teslim aldı"></label>' : ''}
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="tok">Teslimi kaydet</button></div>`, m => {
    $('#tok', m).onclick = () => {
      if (!$('#tno', m).value.trim()) return toast('Tutanak numarası girin.');
      for (const [i, l] of v.kalemler.entries()) { const r = num($(`[data-red="${i}"]`, m).value) || 0; if (r < 0 || r > l.mik) return toast('Ret miktarı sevk miktarını geçemez.'); }
      v.kalemler.forEach((l, i) => { l.red = num($(`[data-red="${i}"]`, m).value) || 0; l.redNot = $(`[data-rednot="${i}"]`, m).value.trim(); });
      v.durum = 'teslim'; v.tutanak = { no: $('#tno', m).value.trim(), tarih: $('#ttar', m).value };
      if (t && $('#tnot', m).value.trim()) t.notlar.push({ tarih: TODAY, metin: $('#tnot', m).value.trim(), kaynak: 'sevkiyat', uyari: false, kim: ME.ad });
      save(); m.remove(); toast('Teslim kaydedildi; kabul edilen miktar sözleşmeye işlendi.'); route();
    };
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
  const tab = ['kesilecek', 'komisyon', 'kurum', 'tedarikci', 'vade'].includes(id) ? id : 'faturalar';
  const ft = S.faturalar.filter(inSir), kes = S.sevkiyatlar.filter(v => inSir(v) && v.durum === 'teslim' && !v.faturaId);
  const al = ft.reduce((t, f) => t + kalanF(f), 0), gec = ft.filter(gecikti).reduce((t, f) => t + kalanF(f), 0), borc = S.alimlar.filter(inSir).reduce((t, a) => t + alimKalan(a), 0);
  const gel30 = ft.filter(f => diffDays(f.tarih, TODAY) >= -30).reduce((t, f) => t + gelir(f), 0), emB = ft.reduce((t, f) => t + emanet(f), 0);
  const thB = f => f.tur === 'komisyon' ? `<button class="btn sm" data-th="${f.id}">Tahsilat gir</button>` : `<button class="btn sm" data-th="${f.id}">Tahsilat gir</button>`;
  let body = '';
  if (tab === 'faturalar') body = tbl([['Fatura'], ['Tür'], ['Kurum / müşteri'], ['Tarih'], ['Vade'], ['Toplam (KDV dahil)', 'r'], ['Gelir yazılan', 'r'], ['Kalan', 'r'], ['', 'r']],
    ft.slice().sort((a, b) => b.tarih.localeCompare(a.tarih)).map(f => `<tr class="${gecikti(f) ? 'crit' : ''}" data-fat="${f.id}"><td data-l="Fatura"><b>${esc(f.no)}</b>${sirCol(f)}</td><td data-l="Tür" class="small">${FATURA_TUR[f.tur]}</td>
      <td data-l="Kurum">${kurumAd(f.k)}${f.konu ? `<div class="small muted">${esc(f.konu)}</div>` : ''}</td><td data-l="Tarih">${trDate(f.tarih)}</td>
      <td data-l="Vade" class="${gecikti(f) ? 'bad' : ''}">${trDate(f.vade)}${gecikti(f) ? `<div class="small">${-diffDays(f.vade, TODAY)} gün gecikti</div>` : ''}</td>
      <td data-l="Toplam" class="r num">${money(f.toplam)}</td><td data-l="Gelir" class="r num">${money(gelir(f))}${f.tur === 'komisyon' ? '<div class="small muted">yalnız komisyon</div>' : ''}</td>
      <td data-l="Kalan" class="r num"><b class="${gecikti(f) ? 'bad' : ''}">${kalanF(f) > 0.5 ? money(kalanF(f)) : 'Kapandı'}</b></td>
      <td class="r"><div class="acts" style="justify-content:flex-end">${kalanF(f) > 0.5 ? thB(f) : ''}<a class="linkbtn" href="belge.html?tip=fatura&id=${f.id}">Fatura</a></div></td></tr>`));
  if (tab === 'kesilecek') body = tbl([['Sevkiyat'], ['Kurum / müşteri'], ['Fatura türü'], ['Teslim / tutanak'], ['Tutar (KDV hariç)', 'r'], ['', 'r']],
    kes.map(v => `<tr><td data-l="Sevkiyat"><b>${esc(v.no)}</b><div class="small muted">${esc(soz(v.szId).no)}</div></td><td data-l="Kurum">${kurumAd(v.k)}</td><td data-l="Tür" class="small">${FATURA_TUR[{ acik: 'ihale', dogrudan: 'dogrudan', piyasa: 'piyasa' }[soz(v.szId).tur || 'acik']]}</td><td data-l="Tutanak" class="small">${esc(v.tutanak.no)}, ${trDate(v.tutanak.tarih)}</td>
      <td data-l="Tutar" class="r num">${money(svCiro(v))}</td><td class="r"><button class="btn acc sm" data-fk="${v.id}">Fatura kes</button></td></tr>`), 'Faturası kesilecek teslimat yok. Kabul tutanağı girilen sevkiyatlar buraya düşer.');
  if (tab === 'komisyon') {
    const kl = ft.filter(f => f.tur === 'komisyon').sort((a, b) => b.tarih.localeCompare(a.tarih));
    body = `<div class="note"><b>Komisyon usulü iş nasıl işlenir:</b> Kuruma kesilen fatura bedeli şirketin geliri değildir; yalnız komisyon gelir yazılır. Fatura bedeli "aracılık / emanet hesabı"nda izlenir: kurum ödeyince tutar emanet hesabına girer, komisyon ayrıldıktan sonra kalan asıl tedarikçiye aktarılır ve hesap kapanır.</div>
      <div class="acts" style="margin-bottom:12px"><button class="btn" id="yKom">Yeni komisyon işi</button></div>` +
      tbl([['İş'], ['Kurum'], ['Asıl tedarikçi'], ['Fatura bedeli', 'r'], ['Komisyon (gelir)', 'r'], ['Kurumdan tahsil', 'r'], ['Emanette (aktarılacak)', 'r'], ['Aktarılan', 'r'], ['', 'r']],
        kl.map(f => `<tr data-kom="${f.id}"><td data-l="İş"><b>${esc(f.no)}</b><div class="small muted">${esc(f.konu)}</div></td><td data-l="Kurum">${kurumAd(f.k)}</td><td data-l="Tedarikçi" class="small">${esc(f.tedAd)}</td>
          <td data-l="Fatura bedeli" class="r num">${money0(f.toplam)}</td><td data-l="Komisyon" class="r num"><b>${money0(f.komisyon)}</b></td><td data-l="Tahsil" class="r num">${money0(tahsil(f))}</td>
          <td data-l="Emanette" class="r num" data-emanet="${f.id}">${emanet(f) > 0.5 ? `<b class="warn">${money0(emanet(f))}</b>` : money0(0)}</td><td data-l="Aktarılan" class="r num">${money0(aktarilan(f))}</td>
          <td class="r"><div class="acts" style="justify-content:flex-end">${kalanF(f) > 0.5 ? `<button class="btn sm" data-th="${f.id}">Tahsilat gir</button>` : ''}${emanet(f) > 0.5 ? `<button class="btn sm acc" data-ak="${f.id}">Tedarikçiye aktar</button>` : ''}${kalanF(f) < 0.5 && emanet(f) < 0.5 ? '<span class="small ok">Kapandı</span>' : ''}</div></td></tr>`), 'Komisyon işi yok.');
  }
  if (tab === 'kurum') body = tbl([['Kurum / müşteri'], ['Faturalanan', 'r'], ['Tahsil edilen', 'r'], ['Fatura bakiyesi', 'r'], ['Vadesi geçen', 'r'], ['Teminat alacağı', 'r'], ['', 'r']],
    S.kurumlar.map(k => { const fs = ft.filter(f => f.k === k.id), ta = teminatAlacak(k.id); if (!fs.length && !ta) return ''; const g = fs.filter(gecikti).reduce((t, f) => t + kalanF(f), 0);
      return `<tr data-kcari="${k.id}"><td data-l="Kurum"><b>${esc(k.ad)}</b></td><td data-l="Faturalanan" class="r num">${money0(fs.reduce((t, f) => t + f.toplam, 0))}</td><td data-l="Tahsil" class="r num">${money0(fs.reduce((t, f) => t + tahsil(f), 0))}</td>
        <td data-l="Bakiye" class="r num"><b>${money0(fs.reduce((t, f) => t + kalanF(f), 0))}</b></td><td data-l="Vadesi geçen" class="r num ${g ? 'bad' : ''}">${money0(g)}</td>
        <td data-l="Teminat alacağı" class="r num" data-tal="${k.id}">${money0(ta)}</td><td class="r"><a class="linkbtn" href="belge.html?tip=ekstre&id=${k.id}">Ekstre</a></td></tr>`; }).filter(Boolean))
    + '<p class="small muted" style="margin-top:8px">Teminat alacağı: kuruma verilen ve henüz iade alınmamış geçici ve kesin teminatlar. Ayrıntı "Verilen teminatlar" ekranında.</p>';
  if (tab === 'tedarikci') body = `<div class="acts" style="margin-bottom:10px"><span class="small muted">Kalite onayıyla stoğa giren hammadde lotları tedarikçi carisine borç yazar.</span></div>` + tbl([['Tedarikçi'], ['Alımlar (KDV dahil)', 'r'], ['Ödenen', 'r'], ['Borç', 'r'], ['En yakın vade'], ['', 'r']],
    S.tedarikciler.map(t => { const as = S.alimlar.filter(a => a.tedId === t.id && inSir(a)); if (!as.length) return ''; const acik = as.filter(a => alimKalan(a) > 0).sort((a, b) => a.vade.localeCompare(b.vade)), b = as.reduce((s, a) => s + alimKalan(a), 0);
      return `<tr><td data-l="Tedarikçi"><b>${esc(t.ad)}</b><div class="small muted">${esc(t.il)}, vade ${t.vade} gün</div></td><td data-l="Alımlar" class="r num">${money0(as.reduce((s, a) => s + a.tutar, 0))}</td><td data-l="Ödenen" class="r num">${money0(as.reduce((s, a) => s + alimOdenen(a), 0))}</td>
        <td data-l="Borç" class="r num"><b>${money0(b)}</b></td><td data-l="En yakın vade" class="${acik[0] && acik[0].vade < TODAY ? 'bad' : ''}">${acik[0] ? trDate(acik[0].vade) : '-'}</td><td class="r">${b > 0 ? `<button class="btn sm alt" data-od="${t.id}">Ödeme gir</button>` : ''}</td></tr>`; }).filter(Boolean));
  if (tab === 'vade') {
    const rows = ft.filter(f => kalanF(f) > 0.5).map(f => ({ v: f.vade, tur: 'Tahsilat', cari: kurum(f.k).ad, belge: f.no, tutar: kalanF(f) }))
      .concat(ft.filter(f => emanet(f) > 0.5).map(f => ({ v: TODAY, tur: 'Emanet', cari: f.tedAd, belge: f.no + ' (komisyon işi)', tutar: -emanet(f) })))
      .concat(S.alimlar.filter(a => inSir(a) && alimKalan(a) > 0).map(a => ({ v: a.vade, tur: 'Ödeme', cari: ted(a.tedId).ad, belge: a.belge, tutar: -alimKalan(a) }))).sort((a, b) => a.v.localeCompare(b.v));
    const grp = [['Vadesi geçenler', r => r.v < TODAY], ['Bu hafta', r => r.v >= TODAY && diffDays(r.v, TODAY) <= 7], ['8–30 gün', r => diffDays(r.v, TODAY) > 7 && diffDays(r.v, TODAY) <= 30], ['30 günden sonra', r => diffDays(r.v, TODAY) > 30]];
    body = `<div class="legend"><span style="--c:var(--ok)">Tahsil edilecek: ${money0(rows.filter(r => r.tutar > 0).reduce((t, r) => t + r.tutar, 0))}</span><span style="--c:var(--bad)">Ödenecek: ${money0(-rows.filter(r => r.tutar < 0).reduce((t, r) => t + r.tutar, 0))}</span></div>` +
      grp.map(([ad, fn]) => { const rs = rows.filter(fn); if (!rs.length) return ''; return `<h3 style="margin:14px 0 6px">${ad}</h3>` + tbl([['Vade'], ['Tür'], ['Cari'], ['Belge'], ['Tutar', 'r']],
        rs.map(r => `<tr class="${r.v < TODAY ? 'crit' : ''}"><td data-l="Vade">${trDate(r.v)}<div class="small muted">${gunTxt(r.v)}</div></td><td data-l="Tür">${r.tutar > 0 ? tag('Tahsilat', 'g') : r.tur === 'Emanet' ? tag('Emanet aktarımı', 'w') : tag('Ödeme', 'a')}</td><td data-l="Cari">${esc(r.cari)}</td><td data-l="Belge" class="small">${esc(r.belge)}</td><td data-l="Tutar" class="r num">${money0(Math.abs(r.tutar))}</td></tr>`)); }).join('');
  }
  view.innerHTML = `<div class="hd"><div><h1>Cari, fatura ve tahsilat</h1><p>Kurum ve müşteri alacakları, komisyon işleri, tedarikçi borçları ve vade takvimi.</p></div></div>
    <div class="kpis" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
      <div class="kpi"><div class="v" id="kpAlacak">${money0(al)}</div><div class="k">Fatura alacağı</div></div>
      <div class="kpi ${gec ? 'alert' : ''}"><div class="v">${money0(gec)}</div><div class="k">Vadesi geçen alacak</div></div>
      <div class="kpi"><div class="v" id="kpGelir">${money0(gel30)}</div><div class="k">Gelir, son 30 gün</div></div>
      <div class="kpi"><div class="v" id="kpEmanet">${money0(emB)}</div><div class="k">Emanette, tedarikçiye aktarılacak</div></div>
      <div class="kpi"><div class="v">${money0(borc)}</div><div class="k">Tedarikçilere borç</div></div>
      <div class="kpi"><div class="v">${kes.length}</div><div class="k">Faturası kesilecek teslimat</div></div></div>
    ${tabsHtml([['faturalar', 'Faturalar'], ['kesilecek', `Faturalanacak (${kes.length})`], ['komisyon', 'Komisyon işleri ve emanet'], ['kurum', 'Kurum ve müşteri carileri'], ['tedarikci', 'Tedarikçi carileri'], ['vade', 'Vade takvimi']], tab)}
    ${sirNote()}<div class="card">${body}</div>`;
  bindTabs('fatura');
  $$('[data-th]').forEach(b => b.onclick = () => { const f = fatura(b.dataset.th); modal('Tahsilat gir: ' + f.no, `<p class="small muted" style="margin-bottom:12px">${kurumAd(f.k)}, kalan ${money(kalanF(f))}. Kısmi tahsilat girilebilir.${f.tur === 'komisyon' ? ' Komisyon işi: tahsil edilen tutar emanet hesabına girer; komisyon payı gelir, kalanı asıl tedarikçiye aktarılır.' : ''}</p>
    <div class="fg"><label class="f"><span>Tutar (₺)</span><input class="inp" id="tt" value="${String(Math.round(kalanF(f) * 100) / 100).replace('.', ',')}" inputmode="decimal"></label><label class="f"><span>Tarih</span><input class="inp" type="date" id="td" value="${TODAY}"></label></div>
    <label class="f"><span>Açıklama</span><input class="inp" id="ta" value="Banka havalesi"></label>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="tok">Tahsilatı kaydet</button></div>`, m => {
    $('#tok', m).onclick = () => { const t = numIn($('#tt', m).value.replace(/\./g, '')); if (!(t > 0) || t > kalanF(f) + 0.01) return toast('Tutar 0 ile kalan arasında olmalı.'); f.tahsilat.push({ tarih: $('#td', m).value, tutar: t, ack: $('#ta', m).value }); save(); m.remove();
      toast(f.tur === 'komisyon' ? `Tahsilat emanet hesabına alındı: ${money0(emanet(f))} asıl tedarikçiye aktarılacak.` : kalanF(f) > 0.5 ? 'Kısmi tahsilat kaydedildi, kalan ' + money(kalanF(f)) : 'Fatura tamamen tahsil edildi.'); route(); };
  }); });
  $$('[data-ak]').forEach(b => b.onclick = () => { const f = fatura(b.dataset.ak); modal('Tedarikçiye aktar: ' + f.tedAd, `<p class="small muted" style="margin-bottom:12px">${esc(f.konu)}. Emanette ${money(emanet(f))} var. Aktarım gelir veya gider değildir; emanet hesabını kapatır.</p>
    <div class="fg"><label class="f"><span>Tutar (₺)</span><input class="inp" id="akt" value="${Math.round(emanet(f))}" inputmode="decimal"></label><label class="f"><span>Tarih</span><input class="inp" type="date" id="akd" value="${TODAY}"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="akok">Aktarımı kaydet</button></div>`, m => {
    $('#akok', m).onclick = () => { const t = numIn($('#akt', m).value); if (!(t > 0) || t > emanet(f) + 0.5) return toast('Tutar emanetteki tutarı geçemez.'); f.aktarim.push({ tarih: $('#akd', m).value, tutar: t }); save(); m.remove(); toast('Aktarım kaydedildi.'); route(); };
  }); });
  const yk = $('#yKom'); if (yk) yk.onclick = () => modal('Yeni komisyon işi', `<p class="small muted" style="margin-bottom:12px">Ürünü başka bir tedarikçi sağlar, fatura kuruma bizden kesilir; gelir yalnız komisyondur.</p>
    <label class="f"><span>Kurum / müşteri</span><select class="inp" id="kk">${S.kurumlar.map(k => `<option value="${k.id}">${esc(k.ad)}</option>`).join('')}</select></label>
    <label class="f"><span>İşin konusu</span><input class="inp" id="kkonu" placeholder="Örn. Temizlik ekipmanı temini"></label>
    <label class="f"><span>Asıl tedarikçi</span><input class="inp" id="kted" placeholder="Örn. Ege Temizlik Ekipmanları Ltd."></label>
    <div class="fg"><label class="f"><span>Fatura bedeli (₺, KDV dahil)</span><input class="inp" id="kbed" inputmode="decimal" placeholder="100000"></label><label class="f"><span>Komisyon (₺)</span><input class="inp" id="kkom" inputmode="decimal" placeholder="10000"></label>
    <label class="f"><span>Fatura tarihi</span><input class="inp" type="date" id="ktar" value="${TODAY}"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="kok">Faturayı kes</button></div>`, m => {
    $('#kok', m).onclick = () => { const bed = numIn($('#kbed', m).value), kom = numIn($('#kkom', m).value);
      if (!$('#kkonu', m).value.trim() || !$('#kted', m).value.trim()) return toast('Konu ve asıl tedarikçiyi girin.');
      if (!(bed > 0) || !(kom > 0) || kom >= bed) return toast('Komisyon, fatura bedelinden küçük olmalı.');
      const f = mkKomisyon(S, { sir: yeniSir(), k: $('#kk', m).value, konu: $('#kkonu', m).value.trim(), tedAd: $('#kted', m).value.trim(), bedel: bed, komisyon: kom, tarih: $('#ktar', m).value }); save(); m.remove();
      toast(`Komisyon faturası ${f.no} kesildi: ${money0(bed)} emanet hesabında, gelir ${money0(kom)}.`); route(); };
  });
  $$('[data-fk]').forEach(b => b.onclick = () => { const v = sevk(b.dataset.fk), z = soz(v.szId), mat = svCiro(v), k = kurum(v.k), t = tyBy(v.tyId); modal('Fatura kes: ' + v.no, `
    ${t ? notKutu(t.id, 'Fatura teslimi için hatırlatma') : ''}
    <div class="meta" style="margin-bottom:12px"><div><small>Matrah</small><b class="num">${money(mat)}</b></div><div><small>KDV %20</small><b class="num">${money(mat * 0.2)}</b></div><div><small>Toplam</small><b class="num">${money(mat * 1.2)}</b></div></div>
    <p class="small" style="font-weight:600;margin-bottom:4px">Fatura satırları (ihale kalemiyle karşılaştırılır)</p>
    ${v.kalemler.map((l, i) => { const x = z.kalemler.find(q => q.uid === l.uid); return `<div style="border:1px solid var(--line);border-radius:6px;padding:8px;margin-bottom:8px">${kalemKart(x, { kisa: true })}
      <label class="small" style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap">Faturadaki ürün <select class="inp sm" data-fu="${i}" aria-label="Faturadaki ürün">${S.urunler.map(u => `<option value="${u.id}" ${u.id === l.uid ? 'selected' : ''}>${esc(u.ad)}</option>`).join('')}</select> <span class="muted">${nf(kabulMik(l))} adet${l.red ? ' (ret ' + nf(l.red) + ' düşüldü)' : ''}</span></label>
      <p class="small bad hide" data-fuy="${i}" style="margin-top:4px"></p></div>`; }).join('')}
    <div class="fg"><label class="f"><span>Fatura tarihi</span><input class="inp" type="date" id="fd" value="${TODAY}"></label><label class="f"><span>Vade (${k.vade} gün)</span><input class="inp" type="date" id="fv" value="${addDays(TODAY, k.vade)}"></label></div>
    ${t ? '<label class="f"><span>Fatura teslim notu (teslim yeri kartına yazılır, isteğe bağlı)</span><input class="inp" id="fnot" placeholder="Örn. Fatura satın alma birimine elden verildi"></label>' : ''}
    <p class="small muted" style="margin-bottom:10px">Gerçek sistemde e-Fatura özel entegratör üzerinden kuruma iletilir.</p>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn acc" id="fok">Faturayı kes</button></div>`, m => {
    const chk = () => { let bad = 0; v.kalemler.forEach((l, i) => { const x = z.kalemler.find(q => q.uid === l.uid), sel = $(`[data-fu="${i}"]`, m), msg = uyusmaz(x, sel.value), pp = $(`[data-fuy="${i}"]`, m); pp.textContent = msg ? msg + ' Yanlış fatura kesilmemesi için fatura kesilemez.' : ''; pp.classList.toggle('hide', !msg); sel.classList.toggle('out', !!msg); if (msg) bad++; }); $('#fok', m).disabled = bad > 0; };
    $$('[data-fu]', m).forEach(s => s.onchange = chk);
    $('#fok', m).onclick = () => { const f = mkFatura(S, v, $('#fd', m).value); f.vade = $('#fv', m).value; if (t && $('#fnot', m).value.trim()) t.notlar.push({ tarih: TODAY, metin: $('#fnot', m).value.trim(), kaynak: 'fatura', uyari: false, kim: ME.ad }); save(); m.remove(); toast('Fatura ' + f.no + ' kesildi; alacaklara eklendi.'); location.hash = 'fatura/faturalar'; };
  }); });
  $$('[data-od]').forEach(b => b.onclick = () => { const t = ted(b.dataset.od), as = S.alimlar.filter(a => a.tedId === t.id && alimKalan(a) > 0 && inSir(a)).sort((a, c) => a.vade.localeCompare(c.vade)), top = as.reduce((s, a) => s + alimKalan(a), 0);
    modal('Ödeme gir: ' + t.ad, `<p class="small muted" style="margin-bottom:12px">Borç ${money(top)}. Ödeme en eski vadeli faturadan başlayarak kapatılır.</p>
      <div class="fg"><label class="f"><span>Tutar (₺)</span><input class="inp" id="ot" value="${Math.round(alimKalan(as[0]))}" inputmode="decimal"></label><label class="f"><span>Tarih</span><input class="inp" type="date" id="odt" value="${TODAY}"></label></div>
      <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="ook">Ödemeyi kaydet</button></div>`, m => {
      $('#ook', m).onclick = () => { let t2 = numIn($('#ot', m).value); if (!(t2 > 0) || t2 > top + 0.01) return toast('Tutar 0 ile borç arasında olmalı.'); as.forEach(a => { if (t2 <= 0) return; const k = Math.min(t2, alimKalan(a)); a.odeme.push({ tarih: $('#odt', m).value, tutar: k }); t2 -= k; }); save(); m.remove(); toast('Ödeme kaydedildi.'); route(); };
    }); });
};

/* ============ VERİLEN TEMİNATLAR ============ */
let tmQ = '';
ROUTES.teminat = function (id) {
  const tab = id === 'kesin' ? 'kesin' : 'gecici';
  const all = teminatlar().filter(inSir), list = all.filter(x => x.cins === tab && (!tmQ || x.ikn.toLowerCase().includes(tmQ.toLowerCase()) || (x.szNo || '').toLowerCase().includes(tmQ.toLowerCase())))
    .sort((a, b) => (b.unutuldu - a.unutuldu) || (a.t.iade - b.t.iade) || (b.bekleme - a.bekleme));
  const kurumda = all.filter(x => !x.t.iade), unut = all.filter(x => x.unutuldu);
  view.innerHTML = `<div class="hd"><div><h1>Verilen teminatlar</h1><p>Kurumlara verilen geçici ve kesin teminatlar. Kurumda bekleyen her teminat, kurumun cari hesabında alacak olarak durur.</p></div></div>
    <div class="kpis" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">
      <div class="kpi"><div class="v" id="kpTeminat">${F ? money0(kurumda.reduce((t, x) => t + x.t.tutar, 0)) : kurumda.length + ' adet'}</div><div class="k">Kurumda bekleyen toplam teminat</div></div>
      <div class="kpi ${unut.length ? 'alert' : ''}"><div class="v" id="kpUnutulan">${unut.length}</div><div class="k">İade edilebilir, 30+ gündür kurumda</div></div>
      ${F ? `<div class="kpi ${unut.length ? 'alert' : ''}"><div class="v">${money0(unut.reduce((t, x) => t + x.t.tutar, 0))}</div><div class="k">Unutulan teminat tutarı</div></div>` : ''}
    </div>
    ${unut.length ? `<div class="note w"><b>Unutulan teminat uyarısı:</b> ${unut.length} teminat iade edilebilir olduğu hâlde 30 günden uzun süredir kurumda bekliyor. Satırdaki "İade talep yazısı" ile kuruma hitaben yazı hazırlanır.</div>` : ''}
    ${tabsHtml([['gecici', `Geçici teminatlar (${all.filter(x => x.cins === 'gecici').length})`], ['kesin', `Kesin teminatlar (${all.filter(x => x.cins === 'kesin').length})`]], tab)}
    <div class="acts" style="margin-bottom:12px"><label class="small" for="tmq">İhale numarası (İKN) ile ara</label><input class="inp sm" id="tmq" value="${esc(tmQ)}" placeholder="Örn. 2026/1384521" style="min-width:220px" autocomplete="off"></div>
    <div class="card">${tbl([['İKN'], ['Kurum'], ['Tür'], ...(F ? [['Tutar', 'r']] : []), ['Banka / mektup no'], ['Veriliş'], ['İade edilebilir'], ['Durum'], ['', 'r']],
      list.map(x => `<tr class="${x.unutuldu ? 'crit' : ''}" data-tm="${x.id}"><td data-l="İKN"><b>${esc(x.ikn)}</b>${x.szNo ? `<div class="small muted">${esc(x.szNo)}</div>` : ''}</td><td data-l="Kurum">${kurumAd(x.k)}</td>
        <td data-l="Tür" class="small">${x.alt ? '<b>İş artışı teminatı</b><br>' : ''}${x.t.tur === 'nakit' ? 'Nakit' : 'Teminat mektubu'}</td>${F ? `<td data-l="Tutar" class="r num">${money0(x.t.tutar)}</td>` : ''}
        <td data-l="Banka" class="small">${x.t.tur === 'nakit' ? 'Kurum hesabına yatırıldı' : esc(x.t.banka) + '<br>' + esc(x.t.no)}</td><td data-l="Veriliş">${trDate(x.t.verilis)}</td>
        <td data-l="İade edilebilir" class="small">${x.iadeEd ? trDate(x.iadeEd) + (x.t.iade ? '' : `<div class="${x.unutuldu ? 'bad' : 'muted'}">${x.bekleme} gündür bekliyor</div>`) : `<span class="muted">${x.cins === 'gecici' ? 'İhale sonuçlanınca / sözleşmede' : 'İşin kabulünden sonra'}</span>`}</td>
        <td data-l="Durum">${x.t.iade ? tag('İade alındı, ' + trDate(x.t.iadeTarih), 'g') : x.t.talep ? tag('İade talep edildi', 'b') : x.unutuldu ? tag('Kurumda, unutulmuş', 'r') : tag('Kurumda', '')}</td>
        <td class="r"><div class="acts" style="justify-content:flex-end">${!x.t.iade && x.iadeEd ? `<a class="linkbtn" data-talep="${x.id}" href="belge.html?tip=iade&id=${x.id}">İade talep yazısı</a><button class="btn sm" data-iade="${x.id}">İade alındı</button>` : ''}</div></td></tr>`), tmQ ? 'Bu numarayla teminat bulunamadı.' : 'Kayıt yok.')}</div>
    <p class="small muted" style="margin-top:8px">İade edilebilir tarih: geçici teminatta ihale sonucu (kaybedilen ihale) veya sözleşme imzası; kesin teminatta son kabul tutanağı. Teminat iade alınınca kurum carisindeki teminat alacağı düşer.</p>`;
  bindTabs('teminat');
  const q = $('#tmq'); q.oninput = () => { tmQ = q.value; const pos = q.selectionStart; ROUTES.teminat(tab); const q2 = $('#tmq'); q2.focus(); q2.setSelectionRange(pos, pos); };
  $$('[data-talep]').forEach(a => a.onclick = () => { const x = teminatlar().find(t => t.id === a.dataset.talep); if (!x.t.talep) { x.t.talep = TODAY; save(); } });
  $$('[data-iade]').forEach(b => b.onclick = () => { const x = teminatlar().find(t => t.id === b.dataset.iade); x.t.iade = true; x.t.iadeTarih = TODAY; save(); toast(`Teminat iade alındı; ${kurum(x.k).ad} carisinden düşüldü.`); route(); });
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
  const kar = hid => S.lotlar.filter(l => l.hid === hid && l.durum === 'karantina').reduce((t, l) => t + l.mik, 0);
  let body;
  if (tab === 'hareket') body = tbl([['Tarih'], ['Malzeme'], ['Miktar', 'r'], ['Tür'], ['Açıklama']], S.hareketler.slice().sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id.localeCompare(a.id)).slice(0, 80).map(x => { const h = hm(x.hid);
    return `<tr><td data-l="Tarih">${trDate(x.tarih)}</td><td data-l="Malzeme">${esc(h.ad)}</td><td data-l="Miktar" class="r num ${x.mik < 0 ? 'bad' : 'ok'}">${x.mik > 0 ? '+' : ''}${nf(x.mik)} ${h.birim}</td><td data-l="Tür">${esc(x.tip)}</td><td data-l="Açıklama" class="small">${esc(x.ack)}</td></tr>`; }));
  else body = tbl([['Malzeme'], ['Kullanılabilir stok', 'r'], ['Karantinada', 'r'], ['Kritik seviye', 'r'], ['Durum'], ...(M || F ? [['Birim fiyat', 'r'], ['Stok değeri', 'r']] : []), ['Tedarikçi'], ['Son hareket']],
    S.hammaddeler.filter(h => h.tur === tab).map(h => { const s = son(h.id), k = h.stok < h.kritik, q = kar(h.id); return `<tr class="${k ? 'crit' : ''}"><td data-l="Malzeme"><b>${esc(h.ad)}</b></td><td data-l="Kullanılabilir" class="r num" data-stok="${h.id}">${nf(h.stok)} ${h.birim}</td>
      <td data-l="Karantinada" class="r num" data-kar="${h.id}">${q ? `<span class="warn">${nf(q)} ${h.birim}</span>` : '<span class="muted">-</span>'}</td><td data-l="Kritik" class="r num">${nf(h.kritik)} ${h.birim}</td>
      <td data-l="Durum">${k ? tag('Kritik', 'r') : h.stok < h.kritik * 1.4 ? tag('Azalıyor', 'w') : tag('Yeterli', 'g')}</td>${M || F ? `<td data-l="Birim fiyat" class="r num">${money(h.fiyat)}</td><td data-l="Değer" class="r num">${money0(h.stok * h.fiyat)}</td>` : ''}
      <td data-l="Tedarikçi" class="small">${esc(ted(h.ted).ad)}</td><td data-l="Son hareket" class="small">${s ? trDate(s.tarih) + ', ' + esc(s.tip) : '-'}</td></tr>`; }));
  view.innerHTML = `<div class="hd"><div><h1>Hammadde ve stok</h1><p>Gelen malzeme önce karantinaya alınır; hammadde giriş kontrolü onaylayınca kullanılabilir stoğa geçer ve tedarikçi carisine borç yazılır. Üretimde reçeteye göre düşer.</p></div><button class="btn" id="sa">Mal kabul (satın alma girişi)</button></div>
    ${tabsHtml([['hammadde', 'Hammaddeler'], ['ambalaj', 'Ambalaj'], ['hareket', 'Stok hareketleri']], tab)}
    ${S.lotlar.some(l => l.durum === 'karantina') ? `<div class="note">${S.lotlar.filter(l => l.durum === 'karantina').length} lot karantinada kalite onayı bekliyor; bu miktarlar üretimde kullanılamaz.${can('kalite') ? ' <a href="#kalite/hm">Giriş kontrolüne git</a>' : ''}</div>` : ''}
    <div class="card">${body}</div>`;
  bindTabs('stok');
  $('#sa').onclick = () => modal('Mal kabul (satın alma girişi)', `<p class="small muted" style="margin-bottom:12px">Gelen lot karantinaya alınır, kalite onayından sonra stoğa girer.</p>
    <label class="f"><span>Malzeme</span><select class="inp" id="sh">${S.hammaddeler.map(h => `<option value="${h.id}">${esc(h.ad)} (${h.birim})</option>`).join('')}</select></label>
    <div class="fg"><label class="f"><span>Miktar</span><input class="inp" id="sm" inputmode="decimal" placeholder="Örn. 1000"></label>
    ${F || M ? '<label class="f"><span>Birim fiyat (₺, KDV hariç)</span><input class="inp" id="sf" inputmode="decimal"></label>' : ''}
    <label class="f"><span>Tedarikçi</span><select class="inp" id="st">${S.tedarikciler.map(t => `<option value="${t.id}">${esc(t.ad)}</option>`).join('')}</select></label>
    <label class="f"><span>İrsaliye / fatura no</span><input class="inp" id="sb" value="İrs. ${5600 + S.seq.lot}"></label></div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="sok">Karantinaya al</button></div>`, m => {
    const sync = () => { const h = hm($('#sh', m).value); $('#st', m).value = h.ted; if ($('#sf', m)) $('#sf', m).value = String(h.fiyat).replace('.', ','); };
    $('#sh', m).onchange = sync; sync();
    $('#sok', m).onclick = () => { const h = hm($('#sh', m).value), mik = numIn($('#sm', m).value), fy = $('#sf', m) ? numIn($('#sf', m).value) || h.fiyat : h.fiyat;
      if (!(mik > 0)) return toast('Miktar girin.');
      const l = { id: 'lt' + (++S.seq.lot) + 'n', no: nextNo(S, 'HL', TODAY), sir: yeniSir(), hid: h.id, mik, tedId: $('#st', m).value, fiyat: fy, tarih: TODAY, belge: $('#sb', m).value, durum: 'karantina', olcum: null, kkKisi: null, kkTarih: null, kkNot: '' };
      S.lotlar.push(l); save(); m.remove(); toast(`Lot ${l.no} karantinada; kalite onayından sonra stoğa girer.`); route(); };
  });
};

/* ============ PERSONEL ============ */
let puTarih = TODAY, isTarih = TODAY, bAy = addDays(TODAY.slice(0, 8) + '01', -1).slice(0, 7);
const canMaas = () => ME.rol === 'yonetici' || ME.rol === 'muhasebe';
const ayAd = ay => new Date(ay + '-15T12:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const ayListe = () => [...new Set(Object.keys(S.puantaj).map(t => t.slice(0, 7)).concat([TODAY.slice(0, 7)]))].sort().reverse();
ROUTES.personel = function (id) {
  if (id && id.startsWith('kart-')) return personelKart(id.slice(5));
  const cm = canMaas();
  const tab = ['isler', 'liste'].includes(id) || (id === 'bordro' && cm) ? id : 'puantaj';
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
  if (tab === 'liste') body = tbl([['Ad soyad'], ['Görev'], ['Çalışma yeri'], ['Ekip'], ['Şirket'], ...(cm ? [['Aylık net maaş', 'r']] : [])], ps.map(p => `<tr class="click" data-go="personel/kart-${p.id}"><td data-l="Ad"><b>${esc(p.ad)}</b></td><td data-l="Görev">${esc(p.gorev)}</td><td data-l="Yer">${p.tip}</td><td data-l="Ekip">${{ uretim: 'Üretim', sevkiyat: 'Sevkiyat', kalite: 'Kalite', ofis: 'Ofis' }[p.ekip]}</td><td data-l="Şirket" class="small">${esc(sirket(p.sir).kisa)}</td>${cm ? `<td data-l="Maaş" class="r num">${money0(p.maas || 0)}</td>` : ''}</tr>`))
    + '<div class="acts" style="margin-top:12px"><button class="btn" id="yper">Personel ekle</button></div>';
  if (tab === 'bordro') {
    const artiC = S.bordroCols.filter(c => c.tur === 'arti'), kesC = S.bordroCols.filter(c => c.tur === 'kesinti');
    const ns = ps.map(p => ({ p, n: netOdeme(p, bAy) })), sum = f => ns.reduce((t, x) => t + f(x), 0);
    const inp = (p, c, n) => `<td class="r"><input class="inp sm num" data-bc="${p.id}|${c.k}" value="${n.b[c.k] || ''}" placeholder="0" style="width:84px" aria-label="${esc(p.ad)} ${esc(c.ad)}"></td>`;
    body = `<div class="acts" style="margin-bottom:12px"><label class="small" for="bay">Ay</label><select class="inp sm" id="bay">${ayListe().map(a => `<option value="${a}" ${a === bAy ? 'selected' : ''}>${ayAd(a)}</option>`).join('')}</select>
        <button class="btn sm alt" id="bcol">Sütun ekle</button><button class="btn sm alt" id="bcsv">Excel'e aktar</button></div>
      <p class="small muted yatay" style="margin-bottom:6px">Tabloyu yana kaydırarak artı, kesinti ve net ödeme sütunlarını görün.</p>
      <div class="tw"><table class="t" id="bordro"><thead><tr><th>Personel</th><th class="r">Aylık net maaş</th><th class="r">Çalışılan gün</th><th class="r">İzin</th><th class="r">Rapor</th><th class="r">Devamsızlık</th><th class="r">F. mesai (sa)</th><th class="r">Maaş payı</th><th class="r ok">+ F. mesai ücreti</th>
        ${artiC.map(c => `<th class="r ok">+ ${esc(c.ad)}</th>`).join('')}${kesC.map(c => `<th class="r bad">− ${esc(c.ad)}</th>`).join('')}<th class="r">Net ödenecek</th></tr></thead><tbody>
        ${ns.map(({ p, n }) => `<tr><td class="nowrap"><a href="#personel/kart-${p.id}">${esc(p.ad)}</a><div class="small muted">${esc(p.gorev)}</div></td><td class="r num">${money0(p.maas)}</td>
          <td class="r">${n.o.ucretli} / ${n.o.ayGun}</td><td class="r">${n.o.izinli}</td><td class="r">${n.o.rapor}</td><td class="r ${n.o.gelmedi ? 'bad' : ''}">${n.o.gelmedi}</td><td class="r">${nf(n.o.mesai)}</td>
          <td class="r num">${money(n.maasPay)}</td><td class="r num">${money0(n.fm)}</td>${artiC.map(c => inp(p, c, n)).join('')}${kesC.map(c => inp(p, c, n)).join('')}
          <td class="r num"><b data-net="${p.id}">${money(n.net)}</b></td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Toplam (${ns.length} kişi)</td><td class="r num">${money0(sum(x => x.p.maas))}</td><td colspan="5"></td><td class="r num">${money0(sum(x => x.n.maasPay))}</td><td class="r num">${money0(sum(x => x.n.fm))}</td>
          ${artiC.concat(kesC).map(c => `<td class="r num">${money0(sum(x => x.n.b[c.k] || 0))}</td>`).join('')}<td class="r num" id="netTop">${money(sum(x => x.n.net))}</td></tr></tfoot></table></div>
      <p class="small muted" style="margin-top:8px"><b>Net ödeme hesabıdır; resmî SGK ve vergi bordrosu değildir.</b> Net ödenecek = maaş × (çalışılan gün / ay gün sayısı) + artılar − kesintiler. Çalışılan gün = ay gün sayısı − devamsızlık − rapor (hafta tatili ve yıllık izin ücretli sayılır). Fazla mesai ücreti = saat × (maaş / 225) × 1,5. Avans ve cezalar personel kartından da girilir.</p>`;
  }
  view.innerHTML = `<div class="hd"><div><h1>Personel ve puantaj</h1><p>${ME.ekip ? 'Ekibinizin' : 'Fabrika, ofis ve şoför personelinin'} günlük puantajı ve iş takibi${cm ? ', aylık net ödeme hesabı' : ''}.${ME.ekip ? ' Yalnız kendi ekibinizi görürsünüz.' : ''}</p></div></div>
    ${tabsHtml([['puantaj', 'Günlük puantaj'], ['isler', 'Günlük işler'], ['liste', 'Personel listesi'], ...(cm ? [['bordro', 'Aylık özet ve net ödeme']] : [])], tab)}<div class="card">${body}</div>`;
  bindTabs('personel'); bindClicks();
  const on = (q, f) => { const b = $(q); if (b) b.onclick = f; };
  if ($('#pt')) $('#pt').onchange = e => { puTarih = e.target.value; route(); };
  if ($('#it')) $('#it').onchange = e => { isTarih = e.target.value; route(); };
  if ($('#bay')) $('#bay').onchange = e => { bAy = e.target.value; route(); };
  $$('[data-bc]').forEach(i => i.onchange = () => { const [pid, k] = i.dataset.bc.split('|'); const b = S.bordro[bAy] = S.bordro[bAy] || {}; b[pid] = b[pid] || {}; b[pid][k] = numIn(i.value) || 0; save(); ROUTES.personel('bordro'); });
  on('#bcol', () => modal('Sütun ekle', `<label class="f"><span>Sütun adı</span><input class="inp" id="cad" placeholder="Örn. Yol yardımı"></label>
    <label class="f"><span>Tür</span><select class="inp" id="ctur"><option value="arti">Artı (ek ödeme)</option><option value="kesinti">Kesinti</option></select></label>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="cok">Ekle</button></div>`, m => {
    $('#cok', m).onclick = () => { const ad = $('#cad', m).value.trim(); if (!ad) return toast('Sütun adı girin.'); S.bordroCols.push({ k: 'c' + Date.now(), ad, tur: $('#ctur', m).value }); save(); m.remove(); toast('"' + ad + '" sütunu eklendi.'); route(); };
  }));
  on('#bcsv', () => { const cols = S.bordroCols; csvIndir('net-odeme-' + bAy, [['Personel', 'Görev', 'Aylık net maaş', 'Çalışılan gün', 'Ay gün', 'İzin', 'Rapor', 'Devamsızlık', 'Fazla mesai saat', 'Maaş payı', 'Fazla mesai ücreti', ...cols.map(c => (c.tur === 'arti' ? '+ ' : '- ') + c.ad), 'Net ödenecek'],
    ...ps.map(p => { const n = netOdeme(p, bAy); return [p.ad, p.gorev, p.maas, n.o.ucretli, n.o.ayGun, n.o.izinli, n.o.rapor, n.o.gelmedi, n.o.mesai, n.maasPay.toFixed(2).replace('.', ','), n.fm, ...cols.map(c => n.b[c.k] || 0), n.net.toFixed(2).replace('.', ',')]; })]); toast('Net ödeme tablosu CSV olarak indirildi.'); });
  on('#hepGeldi', () => $$('[data-pd]').forEach(s => { if (!s.value) s.value = 'geldi'; }));
  on('#puKaydet', () => { const pz = S.puantaj[puTarih] = S.puantaj[puTarih] || {}; $$('[data-pd]').forEach(s => { const pid = s.dataset.pd; if (s.value) pz[pid] = { d: s.value, mesai: numIn($(`[data-pm="${pid}"]`).value) || 0 }; else delete pz[pid]; }); save(); toast('Puantaj kaydedildi.'); route(); });
  $$('[data-is]').forEach(c => c.onchange = () => { S.isler.find(x => x.id === c.dataset.is).yapildi = c.checked; save(); route(); });
  on('#iadd', () => { const t = $('#ii').value.trim(); if (!t) return toast('İş tanımı girin.'); S.isler.push({ id: 'is' + (++S.seq.is), pid: $('#ip').value, is: t, tarih: isTarih, yapildi: false }); save(); toast('İş atandı.'); route(); });
  on('#yper', () => modal('Personel ekle', `<div class="fg"><label class="f"><span>Ad soyad</span><input class="inp" id="pa"></label><label class="f"><span>Görev</span><input class="inp" id="pg" value="Dolum hattı operatörü"></label>
    <label class="f"><span>Çalışma yeri</span><select class="inp" id="py"><option>Fabrika</option><option>Ofis</option><option>Şoför</option></select></label>
    <label class="f"><span>Ekip</span><select class="inp" id="pe"><option value="uretim">Üretim</option><option value="sevkiyat">Sevkiyat</option><option value="kalite">Kalite</option><option value="ofis">Ofis</option></select></label>
    <label class="f"><span>Şirket</span><select class="inp" id="ps">${S.sirketler.filter(s => ME.sirketler.includes(s.id)).map(s => `<option value="${s.id}">${esc(s.kisa)}</option>`).join('')}</select></label>
    ${cm ? '<label class="f"><span>Aylık net maaş (₺)</span><input class="inp" id="pm" inputmode="decimal" value="32000"></label>' : ''}</div>
    <div class="foot"><button class="btn alt" data-close>Vazgeç</button><button class="btn" id="pok">Kaydet</button></div>`, m => {
    if (ME.ekip) { $('#pe', m).value = ME.ekip; $('#pe', m).disabled = true; }
    $('#pok', m).onclick = () => { const ad = $('#pa', m).value.trim(); if (!ad) return toast('Ad soyad girin.'); S.personel.push({ id: 'pr' + (++S.seq.per), ad, gorev: $('#pg', m).value, tip: $('#py', m).value, ekip: $('#pe', m).value, sir: $('#ps', m).value, aktif: true, maas: $('#pm', m) ? numIn($('#pm', m).value) || 0 : 0 }); save(); m.remove(); toast(ad + ' personel listesine eklendi.'); route(); };
  }));
};
function personelKart(pid) {
  const p = per(pid), cm = canMaas();
  if (!p || (ME.ekip && p.ekip !== ME.ekip)) { view.innerHTML = '<div class="noperm"><h2>Bu personel kartını göremezsiniz</h2></div>'; return; }
  const aylar = ayListe().slice(0, 2), n = cm ? netOdeme(p, bAy) : null;
  const logs = S.bordroLog.filter(x => x.pid === p.id).sort((a, b) => b.tarih.localeCompare(a.tarih));
  view.innerHTML = `<a class="back" href="#personel/liste">Personel listesine dön</a>
    <div class="hd"><div><h1>${esc(p.ad)}</h1><p>${esc(p.gorev)}, ${p.tip}, ${esc(sirket(p.sir).kisa)}</p></div></div>
    <div class="meta"><div><small>Ekip</small><b>${{ uretim: 'Üretim', sevkiyat: 'Sevkiyat', kalite: 'Kalite', ofis: 'Ofis' }[p.ekip]}</b></div><div><small>Çalışma yeri</small><b>${p.tip}</b></div>
      ${cm ? `<div><small>Aylık net maaş</small><div class="acts"><input class="inp sm num" id="kmaas" value="${p.maas || 0}" style="width:110px" aria-label="Aylık net maaş"><button class="btn sm alt" id="kmk">Kaydet</button></div></div>` : ''}</div>
    <div class="grid2e">
      <div class="card"><h2>Puantaj özeti</h2>${tbl([['Ay'], ['Çalışılan gün', 'r'], ['İzin', 'r'], ['Rapor', 'r'], ['Devamsızlık', 'r'], ['F. mesai', 'r']], aylar.map(a => { const o = puantajOzet(p.id, a); return `<tr><td data-l="Ay">${ayAd(a)}</td><td data-l="Çalışılan" class="r">${o.ucretli} / ${o.ayGun}</td><td data-l="İzin" class="r">${o.izinli}</td><td data-l="Rapor" class="r">${o.rapor}</td><td data-l="Devamsızlık" class="r ${o.gelmedi ? 'bad' : ''}">${o.gelmedi}</td><td data-l="F. mesai" class="r">${nf(o.mesai)} sa</td></tr>`; }))}</div>
      ${cm ? `<div class="card"><h2>Net ödeme, ${ayAd(bAy)}</h2>
        <div class="uy"><span>Maaş payı (${n.o.ucretli} / ${n.o.ayGun} gün)</span><b class="num">${money(n.maasPay)}</b></div>
        <div class="uy"><span>+ Fazla mesai ücreti (${nf(n.o.mesai)} sa)</span><b class="num">${money0(n.fm)}</b></div>
        ${S.bordroCols.filter(c => n.b[c.k]).map(c => `<div class="uy"><span>${c.tur === 'arti' ? '+' : '−'} ${esc(c.ad)}</span><b class="num ${c.tur === 'arti' ? '' : 'bad'}">${money0(n.b[c.k])}</b></div>`).join('')}
        <div class="uy"><span><b>Net ödenecek</b></span><b class="num" id="kartNet">${money(n.net)}</b></div>
        <h3 style="margin:14px 0 8px">Avans, ceza veya ek ödeme ekle</h3>
        <div class="fg"><label class="f"><span>Ay</span><select class="inp" id="kay">${ayListe().map(a => `<option value="${a}" ${a === bAy ? 'selected' : ''}>${ayAd(a)}</option>`).join('')}</select></label>
          <label class="f"><span>Kalem</span><select class="inp" id="kk">${S.bordroCols.map(c => `<option value="${c.k}">${c.tur === 'arti' ? '+ ' : '− '}${esc(c.ad)}</option>`).join('')}</select></label>
          <label class="f"><span>Tutar (₺)</span><input class="inp" id="kt" inputmode="decimal"></label><label class="f"><span>Açıklama</span><input class="inp" id="ka" placeholder="Örn. Ev kirası için avans"></label></div>
        <button class="btn" id="kekle">Ekle</button></div>` : ''}
    </div>
    ${cm ? `<div class="card" style="margin-top:14px"><h2>Avans, ceza ve ek ödeme geçmişi</h2>${logs.map(x => { const c = S.bordroCols.find(c => c.k === x.k) || { ad: x.k, tur: 'arti' }; return `<div class="uy"><span>${trDate(x.tarih)}, ${esc(c.ad)}${x.ack ? ', ' + esc(x.ack) : ''} <span class="small muted">(${ayAd(x.ay)} hesabına)</span></span><b class="num ${c.tur === 'arti' ? '' : 'bad'}">${c.tur === 'arti' ? '+' : '−'}${money0(x.tutar)}</b></div>`; }).join('') || '<p class="empty">Kayıt yok.</p>'}</div>` : ''}`;
  if (!cm) return;
  $('#kmk').onclick = () => { p.maas = numIn($('#kmaas').value) || 0; save(); toast('Maaş güncellendi.'); route(); };
  $('#kekle').onclick = () => { const t = numIn($('#kt').value); if (!(t > 0)) return toast('Tutar girin.'); const ay = $('#kay').value, k = $('#kk').value;
    const b = S.bordro[ay] = S.bordro[ay] || {}; b[p.id] = b[p.id] || {}; b[p.id][k] = (b[p.id][k] || 0) + t;
    S.bordroLog.push({ id: 'bl' + Date.now(), pid: p.id, ay, k, tutar: t, tarih: TODAY, ack: $('#ka').value.trim() }); bAy = ay; save(); toast('Kaydedildi; net ödeme hesabına işlendi.'); route(); };
}

/* ============ RAPORLAR ============ */
let rapG = 'tur';
ROUTES.raporlar = function (id) {
  const R = [['ihale', 'İhale başarı oranı', true], ['teslim', 'Sözleşme teslim durumu', true], ['gelir', 'Gelir (fatura türüne göre)', F], ['nakliye', 'Nakliye maliyet oranı', F], ['teminat', 'Teminat durumu', F], ['maliyet', 'Ürün ve parti maliyeti', M], ['tuketim', 'Hammadde tüketimi', true], ['yaslandirma', 'Alacak yaşlandırma', F], ['karlilik', 'Sözleşme kârlılığı', M]].filter(r => r[2]);
  const tab = R.some(r => r[0] === id) ? id : R[0][0];
  const bar = (o, c) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, o * 100)).toFixed(1)}%;${c ? 'background:' + c : ''}"></i></div>`;
  let head = [], rows = [], viz = '';
  const gSeg = opts => `<div class="seg" id="rgSeg">${opts.map(([k, ad]) => `<button data-rg="${k}" class="${rapG === k ? 'on' : ''}">${ad}</button>`).join('')}</div>`;
  if (tab === 'ihale' && rapG === 'sozlesme') rapG = 'tur';
  if (tab === 'ihale' && rapG === 'tur') {
    const ih = S.ihaleler.filter(inSir);
    head = ['İş türü', 'Katılınan', 'Kazanılan', 'Kaybedilen', 'Sonuç bekleyen', 'Başarı oranı %', ...(F ? ['Kazanılan tutar ₺'] : [])];
    rows = Object.entries(TUR).map(([t, ad]) => { const l = ih.filter(i => i.tur === t && i.durum !== 'hazirlaniyor'); const kz = l.filter(i => i.durum === 'kazanildi'), ky = l.filter(i => i.durum === 'kaybedildi');
      return [ad, l.length, kz.length, ky.length, l.length - kz.length - ky.length, kz.length + ky.length ? Math.round(kz.length / (kz.length + ky.length) * 100) : 0, ...(F ? [Math.round(kz.reduce((a, i) => a + ihaleTutar(i), 0))] : [])]; });
    viz = gSeg([['tur', 'Türe göre'], ['kurum', 'Kuruma göre']]) + `<div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span>${bar(r[5] / 100, 'var(--ok)')}<span class="num">%${r[5]}</span>`).join('')}</div>`;
  } else if (tab === 'ihale') {
    const ih = S.ihaleler.filter(inSir);
    head = ['Kurum', 'Katılınan', 'Kazanılan', 'Kaybedilen', 'Sonuç bekleyen', 'Başarı oranı %', ...(F ? ['Kazanılan tutar ₺'] : [])];
    rows = S.kurumlar.map(k => { const l = ih.filter(i => i.k === k.id && i.durum !== 'hazirlaniyor'); if (!l.length) return null; const kz = l.filter(i => i.durum === 'kazanildi'), ky = l.filter(i => i.durum === 'kaybedildi');
      return [k.ad, l.length, kz.length, ky.length, l.length - kz.length - ky.length, kz.length + ky.length ? Math.round(kz.length / (kz.length + ky.length) * 100) : 0, ...(F ? [Math.round(kz.reduce((t, i) => t + ihaleTutar(i), 0))] : [])]; }).filter(Boolean);
    const kz = ih.filter(i => i.durum === 'kazanildi').length, ky = ih.filter(i => i.durum === 'kaybedildi').length;
    viz = gSeg([['tur', 'Türe göre'], ['kurum', 'Kuruma göre']]) + `<p style="margin-bottom:10px">Sonuçlanan ${kz + ky} ihalenin <b>${kz}</b> tanesi kazanıldı: başarı oranı <b>%${kz + ky ? Math.round(kz / (kz + ky) * 100) : 0}</b>.</p><div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span>${bar(r[5] / 100, 'var(--ok)')}<span class="num">%${r[5]}</span>`).join('')}</div>`;
  }
  if (tab === 'teslim') {
    head = ['Sözleşme', 'Kurum', 'Teslim %', 'Sonraki teslim', 'Tür', 'Kesin teminat'];
    rows = S.sozlesmeler.filter(inSir).map(z => { const nx = z.plan.find(p => p.tarih >= TODAY); return [z.no, kurum(z.k).ad, Math.round(sozOran(z) * 100), sozBitti(z) ? 'Tamamlandı' : nx ? trDate(nx.tarih) : 'Takvim geçti', turAd(z.tur), !z.kesin ? 'Yok' : z.kesin.iade ? 'İade alındı' : 'Kurumda']; });
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
    head = ['Sözleşme', 'Kurum', 'Teslim edilen ₺', 'Ürün maliyeti ₺', 'Nakliye ₺', 'İhale giderleri ₺', 'Brüt kâr ₺', 'Marj %'];
    rows = S.sozlesmeler.filter(inSir).map(z => { const svs = S.sevkiyatlar.filter(v => v.szId === z.id), t = svs.filter(v => v.durum === 'teslim'); const c = t.reduce((a, v) => a + svCiro(v), 0), um = t.reduce((a, v) => a + svUrunMaliyet(v), 0), nk = svs.reduce((a, v) => a + v.nakliye.bedel, 0);
      const ig = ihGider(ihale(z.ihId)); return [z.no, kurum(z.k).ad, Math.round(c), Math.round(um), Math.round(nk), Math.round(ig), Math.round(c - um - nk - ig), c ? Math.round((c - um - nk - ig) / c * 100) : 0]; });
    viz = `<div class="hbar">${rows.map(r => `<span>${esc(r[0])}<span class="small muted"> ${esc(r[1])}</span></span>${bar(Math.max(0, r[7]) / 100, 'var(--ok)')}<span class="num">%${r[7]}</span>`).join('')}</div>`;
  }
  if (tab === 'gelir') {
    const ft = S.faturalar.filter(inSir);
    head = ['Fatura türü', 'Fatura sayısı', 'Fatura toplamı (KDV dahil) ₺', 'Gelir yazılan (KDV hariç) ₺', 'Açıklama'];
    rows = Object.entries(FATURA_TUR).map(([t, ad]) => { const l = ft.filter(f => f.tur === t); return [ad, l.length, Math.round(l.reduce((a, f) => a + f.toplam, 0)), Math.round(l.reduce((a, f) => a + gelir(f), 0)), t === 'komisyon' ? 'Fatura bedeli emanettir; yalnız komisyon gelir' : 'Matrah (KDV hariç)']; });
    const top = rows.reduce((a, r) => a + r[3], 0), mx = Math.max(...rows.map(r => r[2]), 1);
    viz = `<p style="margin-bottom:10px">Toplam gelir <b>${money0(top)}</b>. Komisyon işlerinde kuruma kesilen fatura tutarı gelire eklenmez.</p>
      <div class="legend"><span style="--c:var(--line-2)">Fatura toplamı</span><span style="--c:var(--pet)">Gelir yazılan</span></div>
      <div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span><div class="bar" style="width:${(r[2] / mx * 100).toFixed(1)}%"><i style="width:${r[2] ? (r[3] / r[2] * 100).toFixed(1) : 0}%"></i></div><span class="num">${money0(r[3])}</span>`).join('')}</div>`;
  }
  if (tab === 'nakliye') {
    if (!['tur', 'kurum', 'sozlesme'].includes(rapG)) rapG = 'tur';
    const svs = S.sevkiyatlar.filter(inSir), key = { tur: v => turAd(soz(v.szId).tur), kurum: v => kurum(v.k).ad, sozlesme: v => soz(v.szId).no }[rapG];
    const g = {}; svs.forEach(v => { const k = key(v); g[k] = g[k] || [0, 0, 0, 0, 0]; g[k][0]++; g[k][1] += svCiro(v); g[k][2] += v.nakliye.tasima || 0; g[k][3] += v.nakliye.hamaliye || 0; g[k][4] += v.nakliye.forklift || 0; });
    head = [{ tur: 'İş türü', kurum: 'Kurum / müşteri', sozlesme: 'Sözleşme' }[rapG], 'Sevkiyat', 'Ana fatura tutarı ₺', 'Taşıma ₺', 'Hamaliye ₺', 'Forklift ₺', 'Toplam nakliye ₺', 'Oran %'];
    rows = Object.entries(g).map(([k, a]) => { const t = a[2] + a[3] + a[4]; return [k, a[0], Math.round(a[1]), Math.round(a[2]), Math.round(a[3]), Math.round(a[4]), Math.round(t), a[1] ? Math.round(t / a[1] * 1000) / 10 : 0]; }).sort((a, b) => b[7] - a[7]);
    const mx = Math.max(...rows.map(r => r[7]), 1);
    viz = gSeg([['tur', 'Türe göre'], ['kurum', 'Kuruma göre'], ['sozlesme', 'Sözleşmeye göre']]) + `<p class="small muted" style="margin-bottom:8px">Oran = (taşıma + hamaliye + forklift) / ana fatura tutarı (KDV hariç). Hazırlanan ve yoldaki sevkiyatlar dahil.</p>
      <div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span>${bar(r[7] / mx * 0.95, r[7] > 10 ? 'var(--bad)' : '')}<span class="num">%${nf(r[7], 1)}</span>`).join('')}</div>`;
  }
  if (tab === 'teminat') {
    const tl = teminatlar().filter(x => inSir(x) && !x.t.iade);
    head = ['Kurum', 'Kurumdaki teminat sayısı', 'Kurumda bekleyen ₺', 'İade edilebilir ₺', 'Unutulan (30+ gün) ₺', 'En eski bekleme (gün)'];
    rows = S.kurumlar.map(k => { const l = tl.filter(x => x.k === k.id); if (!l.length) return null; const ie = l.filter(x => x.iadeEd), un = l.filter(x => x.unutuldu);
      return [k.ad, l.length, Math.round(l.reduce((a, x) => a + x.t.tutar, 0)), Math.round(ie.reduce((a, x) => a + x.t.tutar, 0)), Math.round(un.reduce((a, x) => a + x.t.tutar, 0)), ie.length ? Math.max(...ie.map(x => x.bekleme)) : 0]; }).filter(Boolean).sort((a, b) => b[5] - a[5]);
    const mx = Math.max(...rows.map(r => r[2]), 1);
    viz = `<p style="margin-bottom:10px">Kurumlarda bekleyen toplam teminat <b>${money0(rows.reduce((a, r) => a + r[2], 0))}</b>; bunun <b class="bad">${money0(rows.reduce((a, r) => a + r[4], 0))}</b> kadarı iade edilebilir olduğu hâlde 30 günden uzun süredir bekliyor.</p>
      <div class="legend"><span style="--c:var(--pet)">Kurumda bekleyen</span><span style="--c:var(--bad)">Unutulan</span></div>
      <div class="hbar">${rows.map(r => `<span>${esc(r[0])}</span><div class="stack" style="width:${(r[2] / mx * 100).toFixed(1)}%"><i style="width:${((r[2] - r[4]) / r[2] * 100).toFixed(1)}%;background:var(--pet)"></i><i style="width:${(r[4] / r[2] * 100).toFixed(1)}%;background:var(--bad)"></i></div><span class="num">${money0(r[2])}</span>`).join('')}</div>`;
  }
  const fmt = (v, i) => typeof v === 'number' && i > 0 ? (/₺/.test(head[i]) ? money0(v) : /%/.test(head[i]) ? nf(v, 1) : nf(v)) : esc(v);
  view.innerHTML = `<div class="hd"><div><h1>Raporlar</h1><p>${aktifSir() === 'hepsi' ? 'Tüm şirketler, konsolide.' : esc(sirket(aktifSir()).ad) + (sirket(aktifSir()).ad.endsWith('.') ? '' : '.')} Her rapor Excel'e aktarılabilir.</p></div><button class="btn alt" id="csv">Excel'e aktar</button></div>
    ${tabsHtml(R.map(r => [r[0], r[1]]), tab)}
    <div class="card"><h2>${R.find(r => r[0] === tab)[1]}</h2>${viz}</div>
    <div class="card">${tbl(head.map((h, i) => [h, i > 0 && rows[0] && typeof rows[0][i] === 'number' ? 'r' : '']), rows.map(r => `<tr>${r.map((v, i) => `<td data-l="${esc(head[i])}" class="${typeof v === 'number' && i > 0 ? 'r num' : ''}">${fmt(v, i)}</td>`).join('')}</tr>`))}</div>`;
  bindTabs('raporlar');
  $$('[data-rg]').forEach(b => b.onclick = () => { rapG = b.dataset.rg; route(); });
  $('#csv').onclick = () => { csvIndir('cozum-grup-' + tab + '-' + TODAY, [head, ...rows.map(r => r.map(v => typeof v === 'number' ? String(v).replace('.', ',') : v))]); toast('Rapor CSV olarak indirildi; Excel ile açılır.'); };
};

if (ME) route();
