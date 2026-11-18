/*!
 * Lịch Trình Pro – lịch làm việc, tài chính, lịch tập & sức khỏe.
 * Chạy trong WordPress (REST API) hoặc ở chế độ demo (lưu trong trình duyệt).
 */
(function () {
  'use strict';

  const CFG = Object.assign(
    { mode: 'demo', brand: 'Lichchup Workspace', user: { name: 'Bạn' }, logoutUrl: '#' },
    window.LichtrinhConfig || {}
  );
  const IS_DEMO = CFG.mode !== 'wp';

  /* ================================================================
   * Tiện ích ngày giờ, số, chuỗi
   * ================================================================ */
  const DAY = 864e5;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = (s) => {
    const p = String(s).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  };
  const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)); // Thứ 2
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const daysBetween = (a, b) => Math.round((b - a) / DAY);
  const isoWeek = (d) => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / DAY + 1) / 7);
  };
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const DOW_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const fmtDM = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const fmtDMY = (d) => `${fmtDM(d)}/${d.getFullYear()}`;

  const NF = new Intl.NumberFormat('vi-VN');
  const money = (n) => `${NF.format(Math.round(n || 0))} đ`;
  const dec1 = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  const shortMoney = (n) => {
    n = Math.round(n || 0);
    const a = Math.abs(n);
    if (a >= 1e9) return `${dec1(n / 1e9)} tỷ`;
    if (a >= 1e6) return `${dec1(n / 1e6)}tr`;
    if (a >= 1e3) return `${Math.round(n / 1e3)}k`;
    return String(n);
  };
  const fmtHours = (min) => `${dec1((min || 0) / 60)} giờ`;
  const fmtMin = (min) => {
    min = Math.round(min || 0);
    if (min < 60) return `${min} phút`;
    return `${Math.floor(min / 60)}h${min % 60 ? pad(min % 60) : ''}`;
  };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const changeHtml = (cur, prev) => {
    if (!prev) return cur ? '<span class="ltp-up">Mới</span>' : '+0%';
    const c = Math.round(((cur - prev) / prev) * 100);
    return `<span class="${c >= 0 ? 'ltp-up' : 'ltp-down'}">${c >= 0 ? '+' : ''}${c}%</span>`;
  };
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = (s) => Number(String(s == null ? '' : s).replace(/\D/g, '')) || 0;
  const initials = (name) => {
    const w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return ((w[0][0] || '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  };

  /* ================================================================
   * Danh mục
   * ================================================================ */
  const SPORTS = [
    { name: 'Gym', color: '#2e7a57' },
    { name: 'Chạy bộ', color: '#0f8584' },
    { name: 'Bóng đá', color: '#3d8a35' },
    { name: 'Cầu lông', color: '#3c6fb6' },
    { name: 'Bơi lội', color: '#1d87ab' },
    { name: 'Yoga', color: '#8a5cc2' },
    { name: 'Đạp xe', color: '#b4422a' },
    { name: 'Pickleball', color: '#cf6a1c' },
    { name: 'Tennis', color: '#7f9a14' },
    { name: 'Bóng rổ', color: '#c45a1d' },
    { name: 'Võ thuật', color: '#7a3b2e' },
    { name: 'Khác', color: '#6f6757' },
  ];
  const MUSCLES = ['Ngực', 'Lưng', 'Vai', 'Tay trước', 'Tay sau', 'Chân', 'Mông', 'Bụng', 'Cardio', 'Toàn thân'];
  const TEMPLATES = [
    { label: 'Push', sport: 'Gym', muscles: ['Ngực', 'Vai', 'Tay sau'], title: 'Push day', duration: 75 },
    { label: 'Pull', sport: 'Gym', muscles: ['Lưng', 'Tay trước'], title: 'Pull day', duration: 75 },
    { label: 'Legs', sport: 'Gym', muscles: ['Chân', 'Mông'], title: 'Leg day', duration: 75 },
    { label: 'Upper', sport: 'Gym', muscles: ['Ngực', 'Lưng', 'Vai', 'Tay trước', 'Tay sau'], title: 'Upper body', duration: 75 },
    { label: 'Full body', sport: 'Gym', muscles: ['Toàn thân'], title: 'Full body', duration: 60 },
    { label: 'Chạy 5 km', sport: 'Chạy bộ', muscles: ['Cardio'], title: 'Chạy 5 km', duration: 40 },
  ];
  const JOB_TYPES = ['Chụp cưới', 'Chụp kỷ yếu', 'Chụp sự kiện', 'Chụp sản phẩm', 'Chụp profile', 'Quay phim', 'Hậu kỳ', 'Khác'];
  const PALETTE = ['#c8930c', '#2e7a57', '#3c6fb6', '#b4422a', '#8a5cc2', '#1d87ab', '#6f6757', '#cf6a1c'];
  const sportColor = (name) => {
    const s = SPORTS.find((x) => x.name === name);
    if (s) return s.color;
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
  };

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    chart: '<path d="M3 21h18"/><path d="M6 17v-6"/><path d="M11 17V5"/><path d="M16 17v-9"/>',
    dumbbell: '<path d="M6.5 6.5v11"/><path d="M3.5 9v6"/><path d="M17.5 6.5v11"/><path d="M20.5 9v6"/><path d="M6.5 12h11"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.1C1.6 7.6 3.8 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.2 0 5.4 3.1 4.2 6.4C19.5 15.4 12 20 12 20z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
  };
  const icon = (n) => `<svg class="ltp-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`;

  /* ================================================================
   * Trang đăng nhập: chuyển tab, hiện/ẩn mật khẩu (dùng cho cả WP và demo)
   * ================================================================ */
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-auth-tab]');
    if (tab) {
      const wrap = tab.closest('.ltp-auth');
      if (wrap) wrap.dataset.tab = tab.dataset.authTab;
      return;
    }
    const tg = e.target.closest('[data-toggle-pass]');
    if (tg) {
      const input = tg.parentElement.querySelector('input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      tg.textContent = input.type === 'password' ? 'Hiện' : 'Ẩn';
    }
  });

  const root = document.getElementById('ltp-app');
  if (!root) return;

  /* ================================================================
   * Kết nối dữ liệu
   * ================================================================ */
  function wpApi() {
    const base = CFG.restUrl || '/wp-json/lichtrinh/v1/';
    const url = (path, params) => {
      let u = base + path;
      const qs = params ? new URLSearchParams(params).toString() : '';
      if (qs) u += (u.indexOf('?') >= 0 ? '&' : '?') + qs;
      return u;
    };
    async function req(method, path, body, params) {
      const headers = { 'X-WP-Nonce': CFG.nonce || '', Accept: 'application/json' };
      let httpMethod = method;
      // Một số hosting chặn PUT/DELETE: gửi POST kèm header ghi đè (WordPress hỗ trợ sẵn).
      if (method === 'PUT' || method === 'DELETE') {
        headers['X-HTTP-Method-Override'] = method;
        httpMethod = 'POST';
      }
      if (body) headers['Content-Type'] = 'application/json';
      let res;
      try {
        res = await fetch(url(path, params), {
          method: httpMethod,
          credentials: 'same-origin',
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
      }
      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        data = null;
      }
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Phiên đăng nhập đã hết hạn. Tải lại trang và đăng nhập lại.');
        }
        throw new Error((data && data.message) || `Máy chủ báo lỗi (${res.status}).`);
      }
      return data;
    }
    return {
      list: (type, from, to) => req('GET', type, null, { from, to }),
      create: (type, item) => req('POST', type, item),
      update: (type, id, item) => req('PUT', `${type}/${id}`, item),
      remove: (type, id) => req('DELETE', `${type}/${id}`),
      getSettings: () => req('GET', 'settings'),
      saveSettings: (s) => req('POST', 'settings', s),
    };
  }

  const storage = {
    get(k) {
      try { return window.localStorage.getItem(k); } catch (e) { return null; }
    },
    set(k, v) {
      try { window.localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ }
    },
  };

  function demoApi() {
    const KEY = 'ltp_demo_v1';
    let db = null;
    const load = () => {
      const raw = storage.get(KEY);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d && Array.isArray(d.jobs) && Array.isArray(d.workouts)) return d;
        } catch (e) { /* dữ liệu hỏng: tạo lại */ }
      }
      return seedDemo();
    };
    const save = () => storage.set(KEY, JSON.stringify(db));
    const data = () => {
      if (!db) {
        db = load();
        save();
      }
      return db;
    };
    const reply = (v) => new Promise((r) => setTimeout(() => r(JSON.parse(JSON.stringify(v))), 40));
    return {
      list(type, from, to) {
        return reply(data()[type].filter((i) => i.date >= from && i.date <= to));
      },
      create(type, item) {
        const d = data();
        const n = Math.max(1, Math.min(52, parseInt(item.repeat_weeks, 10) || 1));
        const base = parseYmd(item.date);
        const t = ymd(today());
        const out = [];
        for (let i = 0; i < n; i++) {
          const it = Object.assign({}, item, { id: ++d.seq, date: ymd(addDays(base, 7 * i)) });
          delete it.repeat_weeks;
          if (i > 0 && type === 'workouts' && it.date > t) it.status = 'planned';
          if (i > 0 && type === 'jobs') it.paid = 0;
          d[type].push(it);
          out.push(it);
        }
        save();
        return reply(out);
      },
      update(type, id, item) {
        const d = data();
        const i = d[type].findIndex((x) => x.id === +id);
        if (i < 0) return Promise.reject(new Error('Không tìm thấy mục này.'));
        d[type][i] = Object.assign({}, item, { id: +id });
        delete d[type][i].repeat_weeks;
        save();
        return reply(d[type][i]);
      },
      remove(type, id) {
        const d = data();
        d[type] = d[type].filter((x) => x.id !== +id);
        save();
        return reply({ deleted: true, id: +id });
      },
      getSettings: () => reply(data().settings),
      saveSettings(s) {
        data().settings = s;
        save();
        return reply(s);
      },
      reset() {
        db = seedDemo();
        save();
      },
    };
  }

  /** Dữ liệu mẫu cho bản demo: 10 tuần trước + 2 tuần tới. */
  function seedDemo() {
    let s = 20261118;
    const rnd = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const round100k = (n) => Math.round(n / 1e5) * 1e5;
    const t = today();
    const tStr = ymd(t);
    const cur = startOfWeek(t);
    const KINDS = [
      { type: 'Chụp cưới', titles: ['Chụp cưới phóng sự', 'Ảnh cưới ngoại cảnh', 'Lễ ăn hỏi'], min: 4e6, max: 9e6, hours: 6 },
      { type: 'Chụp kỷ yếu', titles: ['Kỷ yếu lớp 12A1', 'Kỷ yếu ngoại cảnh', 'Kỷ yếu concept'], min: 2.5e6, max: 5e6, hours: 4 },
      { type: 'Chụp sự kiện', titles: ['Ra mắt sản phẩm', 'Tiệc tất niên công ty', 'Hội thảo khách hàng'], min: 2e6, max: 4.5e6, hours: 4 },
      { type: 'Chụp sản phẩm', titles: ['Ảnh sản phẩm mỹ phẩm', 'Lookbook thời trang', 'Ảnh menu nhà hàng'], min: 1.2e6, max: 3e6, hours: 3 },
      { type: 'Chụp profile', titles: ['Ảnh profile doanh nhân', 'Chân dung cá nhân', 'Ảnh gia đình'], min: 8e5, max: 2e6, hours: 2 },
      { type: 'Hậu kỳ', titles: ['Chỉnh màu album cưới', 'Retouch ảnh sản phẩm'], min: 5e5, max: 1.5e6, hours: 3 },
    ];
    const PLACES = ['Studio Quận 3, TP.HCM', 'Nhà thờ Tân Định, Q.3', 'Phố đi bộ Nguyễn Huệ, Q.1', 'Thảo Điền, TP. Thủ Đức', 'Khách sạn Rex, Q.1', 'Trường THPT Lê Quý Đôn', 'Công viên Tao Đàn', 'Văn phòng khách hàng, Q.7'];
    const CLIENTS = ['Anh Tuấn & Chị Linh', 'Chị Hạnh', 'Lớp 12A1', 'Công ty Minh Phát', 'Shop Mây Decor', 'Anh Khoa', 'Chị Thu Trang', 'Nhà hàng Bếp Quê', 'Anh Đức'];
    const jobs = [];
    const workouts = [];
    let id = 0;

    for (let w = -10; w <= 2; w++) {
      const ws = addDays(cur, 7 * w);
      const days = [0, 1, 2, 3, 4, 5, 6];
      for (let i = days.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = days[i];
        days[i] = days[j];
        days[j] = tmp;
      }
      days.slice(0, 2 + Math.floor(rnd() * 4)).forEach((dIdx) => {
        const dStr = ymd(addDays(ws, dIdx));
        const k = pick(KINDS);
        const sh = 7 + Math.floor(rnd() * 8);
        const amount = round100k(k.min + rnd() * (k.max - k.min));
        let paid = 0;
        if (dStr < tStr) {
          const r = rnd();
          paid = r < 0.72 ? amount : r < 0.9 ? round100k(amount * 0.4) : 0;
        } else if (rnd() < 0.45) {
          paid = round100k(amount * 0.3);
        }
        jobs.push({
          id: ++id, date: dStr, start: `${pad(sh)}:00`, end: `${pad(Math.min(23, sh + k.hours))}:00`,
          title: pick(k.titles), type: k.type, client: pick(CLIENTS),
          location: k.type === 'Hậu kỳ' ? 'Làm tại nhà (online)' : pick(PLACES), amount, paid, note: '',
        });
      });
    }
    if (!jobs.some((j) => j.date === tStr)) {
      jobs.push({ id: ++id, date: tStr, start: '09:00', end: '11:30', title: 'Ảnh profile doanh nhân', type: 'Chụp profile', client: 'Anh Đức', location: 'Studio Quận 3, TP.HCM', amount: 1500000, paid: 500000, note: 'Mang thêm phông nền xám' });
    }

    const PLAN = [
      [0, 'Gym', 'Push day', ['Ngực', 'Vai', 'Tay sau'], '18:00', 75],
      [1, 'Gym', 'Pull day', ['Lưng', 'Tay trước'], '18:00', 70],
      [2, 'Cầu lông', 'Cầu lông với nhóm', ['Cardio'], '19:30', 90],
      [3, 'Gym', 'Leg day', ['Chân', 'Mông'], '18:00', 80],
      [4, 'Chạy bộ', 'Chạy 5 km', ['Cardio'], '06:00', 40],
      [5, 'Bóng đá', 'Đá bóng sân 7', ['Cardio', 'Chân'], '17:00', 90],
    ];
    for (let w = -10; w <= 2; w++) {
      const ws = addDays(cur, 7 * w);
      PLAN.forEach(([d, sport, title, muscles, start, dur]) => {
        const dStr = ymd(addDays(ws, d));
        let status = 'planned';
        if (dStr < tStr) status = rnd() < 0.8 ? 'done' : 'skipped';
        const jitter = status === 'done' ? Math.round(((rnd() - 0.5) * 20) / 5) * 5 : 0;
        workouts.push({ id: ++id, date: dStr, start, duration: Math.max(30, dur + jitter), sport, title, muscles: muscles.slice(), status, note: '' });
      });
    }
    return { seq: id, jobs, workouts, settings: { workout_goal_week: 5, income_goal_week: 8000000, income_goal_month: 32000000 } };
  }

  const api = IS_DEMO ? demoApi() : wpApi();

  /* ================================================================
   * Bộ nhớ đệm theo năm
   * ================================================================ */
  const normJob = (j) => ({
    id: +j.id, date: j.date, start: j.start || '', end: j.end || '', title: j.title || '',
    client: j.client || '', location: j.location || '', type: j.type || '',
    amount: Math.max(0, +j.amount || 0), paid: Math.max(0, +j.paid || 0), note: j.note || '',
  });
  const normWo = (w) => ({
    id: +w.id, date: w.date, start: w.start || '', duration: Math.max(0, +w.duration || 0),
    sport: w.sport || 'Khác',
    muscles: Array.isArray(w.muscles) ? w.muscles.filter(Boolean) : String(w.muscles || '').split(',').filter(Boolean),
    title: w.title || '', status: w.status || 'planned', note: w.note || '',
  });
  const NORM = { jobs: normJob, workouts: normWo };

  const store = { years: {}, pending: {} };

  function loadYear(y) {
    if (store.years[y]) return Promise.resolve();
    if (!store.pending[y]) {
      store.pending[y] = Promise.all([
        api.list('jobs', `${y}-01-01`, `${y}-12-31`),
        api.list('workouts', `${y}-01-01`, `${y}-12-31`),
      ])
        .then(([j, w]) => {
          store.years[y] = { jobs: (j || []).map(normJob), workouts: (w || []).map(normWo) };
        })
        .finally(() => {
          delete store.pending[y];
        });
    }
    return store.pending[y];
  }
  const ensureYears = (ys) => Promise.all(ys.map(loadYear));
  const byDateTime = (a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start || '').localeCompare(b.start || '') || a.id - b.id;

  function itemsIn(type, from, to) {
    const out = [];
    for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) {
      const Y = store.years[y];
      if (!Y) continue;
      for (const it of Y[type]) if (it.date >= from && it.date <= to) out.push(it);
    }
    return out.sort(byDateTime);
  }
  function allItems(type) {
    const out = [];
    Object.keys(store.years).forEach((y) => out.push(...store.years[y][type]));
    return out.sort(byDateTime);
  }
  function findItem(type, id) {
    for (const y of Object.keys(store.years)) {
      const f = store.years[y][type].find((x) => x.id === +id);
      if (f) return f;
    }
    return null;
  }
  function cacheRemove(type, id) {
    Object.keys(store.years).forEach((y) => {
      store.years[y][type] = store.years[y][type].filter((x) => x.id !== +id);
    });
  }
  function cacheAdd(type, items) {
    (items || []).forEach((raw) => {
      if (!raw) return;
      const it = NORM[type](raw);
      const Y = store.years[+it.date.slice(0, 4)];
      if (Y) Y[type].push(it);
    });
  }

  /* ================================================================
   * Thống kê
   * ================================================================ */
  function sumJobs(list) {
    const s = { total: 0, paid: 0, debt: 0, count: list.length, billable: 0, settled: 0, open: 0 };
    list.forEach((j) => {
      const paid = Math.min(j.paid, j.amount);
      s.total += j.amount;
      s.paid += paid;
      if (j.amount > 0) {
        s.billable++;
        if (paid >= j.amount) s.settled++;
        else s.open++;
      }
    });
    s.debt = s.total - s.paid;
    s.avg = s.count ? s.total / s.count : 0;
    return s;
  }

  function sumWorkouts(list) {
    const t = ymd(today());
    const done = list.filter((w) => w.status === 'done');
    const minutes = done.reduce((a, w) => a + w.duration, 0);
    const due = list.filter((w) => w.date < t || w.status !== 'planned').length;
    return {
      total: list.length,
      done: done.length,
      skipped: list.filter((w) => w.status === 'skipped').length,
      minutes,
      avgMin: done.length ? minutes / done.length : 0,
      rate: due ? pct(done.length, due) : null,
    };
  }

  /**
   * Trung bình mỗi tuần trong `nWeeks` tuần kết thúc ở tuần `endWeek`,
   * nhưng không tính các tuần trước khi có dữ liệu đầu tiên (để người mới không bị kéo thấp).
   * `items` phải được sắp theo ngày.
   */
  function weekWindowAvg(items, valueOf, endWeek, nWeeks) {
    const used = items.filter((i) => valueOf(i) > 0);
    const none = { avg: 0, weeks: 0, sum: 0, from: '', to: '' };
    if (!used.length) return none;
    let start = addDays(endWeek, -7 * (nWeeks - 1));
    const first = startOfWeek(parseYmd(used[0].date));
    if (first > start) start = first;
    if (start > endWeek) return none;
    const weeks = daysBetween(start, endWeek) / 7 + 1;
    const from = ymd(start);
    const to = ymd(addDays(endWeek, 6));
    const sum = used.filter((i) => i.date >= from && i.date <= to).reduce((a, i) => a + valueOf(i), 0);
    return { avg: sum / weeks, weeks, sum, from, to };
  }

  /** TB/tuần cho trang tổng quan: 12 tuần đã kết thúc gần nhất; chưa đủ dữ liệu thì dùng tuần này. */
  function recentWeeklyAvg(items, valueOf) {
    const cur = startOfWeek(today());
    const r = weekWindowAvg(items, valueOf, addDays(cur, -7), 12);
    if (r.weeks) return Object.assign(r, { current: false });
    return Object.assign(weekWindowAvg(items, valueOf, cur, 1), { current: true });
  }

  /** TB/tháng: tối đa 6 tháng đã kết thúc gần nhất, tính từ tháng có dữ liệu đầu tiên. */
  function recentMonthlyAvg(items, valueOf) {
    const cur = startOfMonth(today());
    const used = items.filter((i) => valueOf(i) > 0);
    if (!used.length) return { avg: 0, months: 0, current: false };
    let start = new Date(cur.getFullYear(), cur.getMonth() - 6, 1);
    const first = startOfMonth(parseYmd(used[0].date));
    if (first > start) start = first;
    let end;
    let months;
    let current = false;
    if (start >= cur) {
      start = cur;
      end = endOfMonth(cur);
      months = 1;
      current = true;
    } else {
      end = addDays(cur, -1);
      months = (cur.getFullYear() - start.getFullYear()) * 12 + cur.getMonth() - start.getMonth();
    }
    const from = ymd(start);
    const to = ymd(end);
    const sum = used.filter((i) => i.date >= from && i.date <= to).reduce((a, i) => a + valueOf(i), 0);
    return { avg: sum / months, months, current };
  }

  function groupBy(list, keyFn) {
    const m = new Map();
    list.forEach((i) => {
      const k = keyFn(i);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(i);
    });
    return [...m.entries()];
  }

  /* ================================================================
   * Trạng thái giao diện
   * ================================================================ */
  const TABS = [
    { id: 'home', hash: 'tong-quan', label: 'Tổng quan', short: 'Tổng quan', title: 'Tổng quan cá nhân', icon: 'home' },
    { id: 'work', hash: 'lich-lam-viec', label: 'Lịch làm việc', short: 'Lịch việc', title: 'Lịch làm việc', icon: 'work' },
    { id: 'finance', hash: 'tai-chinh', label: 'Tài chính', short: 'Tài chính', title: 'Báo cáo tài chính', icon: 'chart' },
    { id: 'training', hash: 'lich-tap', label: 'Lịch tập', short: 'Lịch tập', title: 'Lịch tập luyện', icon: 'dumbbell' },
    { id: 'health', hash: 'suc-khoe', label: 'Sức khỏe', short: 'Sức khỏe', title: 'Báo cáo sức khỏe', icon: 'heart' },
  ];

  const state = {
    tab: 'home',
    workWeek: startOfWeek(today()),
    trainWeek: startOfWeek(today()),
    fin: { mode: 'month', anchor: startOfMonth(today()) },
    health: { mode: 'week', anchor: startOfWeek(today()) },
    settings: { workout_goal_week: 4, income_goal_week: 0, income_goal_month: 0 },
  };

  function resetPeriods() {
    const t = today();
    state.workWeek = startOfWeek(t);
    state.trainWeek = startOfWeek(t);
    state.fin.anchor = state.fin.mode === 'week' ? startOfWeek(t) : startOfMonth(t);
    state.health.anchor = state.health.mode === 'week' ? startOfWeek(t) : startOfMonth(t);
  }

  function period(mode, anchor) {
    if (mode === 'week') {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      return { mode, start: s, end: e, from: ymd(s), to: ymd(e), title: `Tuần ${isoWeek(s)}`, range: `${fmtDM(s)} – ${fmtDMY(e)}`, unit: 'tuần' };
    }
    const s = startOfMonth(anchor);
    const e = endOfMonth(anchor);
    return { mode, start: s, end: e, from: ymd(s), to: ymd(e), title: `Tháng ${s.getMonth() + 1}/${s.getFullYear()}`, range: `${fmtDM(s)} – ${fmtDMY(e)}`, unit: 'tháng' };
  }
  const shiftAnchor = (mode, anchor, dir) =>
    mode === 'week' ? addDays(startOfWeek(anchor), 7 * dir) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);

  function neededYears() {
    const t = today();
    const ys = new Set();
    const span = (a, b) => {
      for (let y = a.getFullYear(); y <= b.getFullYear(); y++) ys.add(y);
    };
    if (state.tab === 'home') span(new Date(t.getFullYear() - 1, 0, 1), addDays(t, 8));
    if (state.tab === 'work') span(state.workWeek, addDays(state.workWeek, 6));
    if (state.tab === 'training') span(state.trainWeek, addDays(state.trainWeek, 6));
    if (state.tab === 'finance' || state.tab === 'health') {
      const cfg = state.tab === 'finance' ? state.fin : state.health;
      const p = period(cfg.mode, cfg.anchor);
      const prev = period(cfg.mode, shiftAnchor(cfg.mode, p.start, -1));
      span(prev.start, p.end);
      if (state.tab === 'health' && cfg.mode === 'week') span(addDays(p.start, -21), p.end);
    }
    return [...ys];
  }

  /* ================================================================
   * Khung ứng dụng
   * ================================================================ */
  const $ = (sel) => root.querySelector(sel);
  let clockTimer = null;
  let lastDay = ymd(today());

  function renderShell() {
    const name = (CFG.user && CFG.user.name) || 'Bạn';
    root.innerHTML = `
      <div class="ltp-shell">
        ${IS_DEMO ? `<div class="ltp-demo-bar"><span><b>Bản demo</b> · dữ liệu mẫu, chỉ lưu trong trình duyệt này.</span><div><button type="button" class="ltp-linkbtn" data-action="demo-reset">Đặt lại dữ liệu mẫu</button><button type="button" class="ltp-linkbtn" data-action="logout">Xem trang đăng nhập</button></div></div>` : ''}
        <header class="ltp-top">
          <div class="ltp-brand">
            <div class="ltp-eyebrow">${esc(CFG.brand)}</div>
            <h1 class="ltp-h1" id="ltp-h1"></h1>
          </div>
          <div class="ltp-clock"><span class="ltp-clock-dot"></span><div><small>Giờ Việt Nam</small><b id="ltp-clock">--:--:--</b></div></div>
          <div class="ltp-top-right">
            <button type="button" class="ltp-today-btn" data-action="go-today">Hôm nay</button>
            <div class="ltp-user">
              <span class="ltp-avatar" aria-hidden="true">${esc(initials(name))}</span>
              <span class="ltp-user-meta"><b>${esc(name)}</b><a href="${esc(CFG.logoutUrl)}" data-action="logout">Đăng xuất</a></span>
              <a class="ltp-logout-ic" href="${esc(CFG.logoutUrl)}" data-action="logout" aria-label="Đăng xuất">${icon('logout')}</a>
            </div>
          </div>
        </header>
        <nav class="ltp-tabs" aria-label="Các trang">
          ${TABS.map((t) => `<a href="#${t.hash}" class="ltp-tab" data-tab="${t.id}">${icon(t.icon)}<span class="l">${t.label}</span><span class="s">${t.short}</span></a>`).join('')}
        </nav>
        <main class="ltp-view" id="ltp-view"></main>
      </div>
      <div id="ltp-modal"></div>
      <div class="ltp-toast" id="ltp-toast" role="status" aria-live="polite"></div>`;
  }

  function startClock() {
    let fmt = null;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
      });
    } catch (e) {
      fmt = null;
    }
    const W = { Mon: 'Thứ 2', Tue: 'Thứ 3', Wed: 'Thứ 4', Thu: 'Thứ 5', Fri: 'Thứ 6', Sat: 'Thứ 7', Sun: 'Chủ nhật' };
    const tick = () => {
      const el = document.getElementById('ltp-clock');
      if (el) {
        const now = new Date();
        if (fmt) {
          const p = {};
          fmt.formatToParts(now).forEach((x) => { p[x.type] = x.value; });
          el.textContent = `${p.hour}:${p.minute}:${p.second} · ${W[p.weekday] || ''}, ${p.day}/${p.month}/${p.year}`;
        } else {
          el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} · ${DOW_LONG[now.getDay()]}, ${fmtDMY(now)}`;
        }
      }
      // Qua ngày mới thì vẽ lại để cập nhật "hôm nay".
      const d = ymd(today());
      if (d !== lastDay) {
        lastDay = d;
        if (document.getElementById('ltp-view') && !$('#ltp-modal').innerHTML) render();
      }
    };
    tick();
    clearInterval(clockTimer);
    clockTimer = setInterval(tick, 1000);
  }

  const tabByHash = (h) => {
    const t = TABS.find((x) => x.hash === h || x.id === h);
    return t ? t.id : null;
  };

  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    const tab = TABS.find((t) => t.id === state.tab) || TABS[0];
    const h1 = $('#ltp-h1');
    if (h1) h1.textContent = tab.title;
    root.querySelectorAll('.ltp-tab').forEach((a) => {
      const on = a.dataset.tab === state.tab;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const view = $('#ltp-view');
    if (!view) return;
    const years = neededYears();
    if (years.some((y) => !store.years[y])) {
      view.innerHTML = '<div class="ltp-loading">Đang tải dữ liệu…</div>';
      try {
        await ensureYears(years);
      } catch (err) {
        if (seq === renderSeq) {
          view.innerHTML = `<div class="ltp-error">${esc(err.message)}</div>`;
        }
        return;
      }
    }
    if (seq !== renderSeq) return;
    view.innerHTML = VIEWS[state.tab]();
  }

  /* ================================================================
   * Thành phần dùng chung
   * ================================================================ */
  const kpi = (label, value, sub, cls) =>
    `<div class="ltp-kpi ${cls || ''}"><div class="ltp-kpi-label">${label}</div><div class="ltp-kpi-value">${value}</div><div class="ltp-kpi-sub">${sub || '&nbsp;'}</div></div>`;
  const stat = (label, value, cls) => `<div class="ltp-stat ${cls || ''}"><span>${label}</span><b>${value}</b></div>`;

  function navBlock(scope, title, range) {
    return `<div class="ltp-nav">
      <button type="button" class="ltp-icon-btn" data-action="nav" data-scope="${scope}" data-dir="-1" aria-label="Kỳ trước">${icon('chevL')}</button>
      <div class="ltp-nav-label"><b>${esc(title)}</b><span>${esc(range)}</span></div>
      <button type="button" class="ltp-icon-btn" data-action="nav" data-scope="${scope}" data-dir="1" aria-label="Kỳ sau">${icon('chevR')}</button>
    </div>`;
  }

  function modeSeg(scope, mode) {
    return `<div class="ltp-seg" role="group" aria-label="Xem theo">
      <button type="button" class="${mode === 'week' ? 'is-on' : ''}" data-action="mode" data-scope="${scope}" data-mode="week">Theo tuần</button>
      <button type="button" class="${mode === 'month' ? 'is-on' : ''}" data-action="mode" data-scope="${scope}" data-mode="month">Theo tháng</button>
    </div>`;
  }

  /**
   * Biểu đồ cột. bars: [{label, short, sub, value, part, active, action, key, title}]
   * `part` là phần tô đậm ở chân cột (ví dụ: đã thu).
   */
  function barChart(bars, fmt, cls) {
    const max = Math.max(1, ...bars.map((b) => b.value));
    return `<div class="ltp-bars ${cls || ''}" style="--n:${bars.length}">${bars
      .map((b) => {
        const h = b.value ? Math.max(3, (b.value / max) * 100) : 0;
        const p = b.value && b.part ? Math.min(100, (b.part / b.value) * 100) : 0;
        const tag = b.action ? 'button' : 'div';
        const attrs = b.action ? ` type="button" data-action="${b.action}" data-key="${b.key}"` : '';
        return `<${tag} class="ltp-bar${b.active ? ' is-active' : ''}"${attrs} title="${esc(b.title || '')}">
          <span class="ltp-bar-val">${b.value ? esc(fmt(b.value)) : '–'}</span>
          <span class="ltp-bar-track"><span class="ltp-bar-fill" style="height:${h}%"><span class="ltp-bar-part" style="height:${p}%"></span></span></span>
          <span class="ltp-bar-label"><span class="lg">${esc(b.label)}</span><span class="sm">${esc(b.short || b.label)}</span></span>
          ${b.sub != null ? `<span class="ltp-bar-sub">${esc(b.sub)}</span>` : ''}
        </${tag}>`;
      })
      .join('')}</div>`;
  }

  function rankList(rows, fmt) {
    if (!rows.length) return '<p class="ltp-empty">Chưa có dữ liệu trong kỳ này.</p>';
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<ul class="ltp-rank">${rows
      .map(
        (r) => `<li>
        <div class="ltp-rank-top"><span class="ltp-rank-name"><i style="background:${r.color}"></i>${esc(r.name)}</span><b>${esc(fmt(r.value))}</b></div>
        <div class="ltp-rank-bar"><span style="width:${(r.value / max) * 100}%;background:${r.color}"></span></div>
        ${r.sub ? `<div class="ltp-rank-sub">${esc(r.sub)}</div>` : ''}
      </li>`
      )
      .join('')}</ul>`;
  }

  function payBadge(j) {
    if (!j.amount) return '';
    if (j.paid >= j.amount) return '<span class="ltp-pill ltp-pill--ok">Đã thu</span>';
    if (j.paid > 0) return `<span class="ltp-pill ltp-pill--warn">Cọc ${esc(shortMoney(j.paid))}</span>`;
    return '<span class="ltp-pill ltp-pill--due">Chưa thu</span>';
  }

  function statusPill(w) {
    if (w.status === 'done') return '<span class="ltp-pill ltp-pill--ok">Đã tập</span>';
    if (w.status === 'skipped') return '<span class="ltp-pill ltp-pill--due">Bỏ lỡ</span>';
    if (w.date < ymd(today())) return '<span class="ltp-pill ltp-pill--warn">Chưa đánh dấu</span>';
    return '<span class="ltp-pill ltp-pill--plan">Kế hoạch</span>';
  }

  const timeRange = (j) => (j.start ? `${j.start}${j.end ? ` – ${j.end}` : ''}` : 'Cả ngày');

  function agendaItem(entry, showDate) {
    const it = entry.it;
    const d = parseYmd(it.date);
    const when = showDate
      ? `${DOW[d.getDay()]} ${fmtDM(d)}<small>${it.start || 'Cả ngày'}</small>`
      : `${it.start || 'Cả ngày'}${entry.kind === 'job' && it.end ? `<small>${it.end}</small>` : entry.kind === 'wo' ? `<small>${fmtMin(it.duration)}</small>` : ''}`;
    if (entry.kind === 'job') {
      const meta = [it.location ? `${icon('pin')}${esc(it.location)}` : '', it.client ? esc(it.client) : ''].filter(Boolean).join(' · ');
      return `<div class="ltp-agenda" role="button" tabindex="0" data-action="edit-job" data-id="${it.id}">
        <span class="ltp-agenda-time">${when}</span>
        <span class="ltp-agenda-body"><b>${esc(it.title)}</b><small>${meta || esc(it.type || 'Công việc')}</small></span>
        <span class="ltp-agenda-side">${esc(money(it.amount))}${payBadge(it)}</span>
      </div>`;
    }
    return `<div class="ltp-agenda ltp-agenda--wo" style="--c:${sportColor(it.sport)}" role="button" tabindex="0" data-action="edit-workout" data-id="${it.id}">
      <span class="ltp-agenda-time">${when}</span>
      <span class="ltp-agenda-body"><b>${esc(it.title || it.sport)}</b><small>${esc(it.sport)}${it.muscles.length ? ' · ' + esc(it.muscles.join(', ')) : ''}</small></span>
      <span class="ltp-agenda-side">${statusPill(it)}</span>
    </div>`;
  }

  /* ================================================================
   * Trang: Tổng quan
   * ================================================================ */
  function viewHome() {
    const t = today();
    const tStr = ymd(t);
    const cur = startOfWeek(t);
    const jobsAll = allItems('jobs');
    const woAll = allItems('workouts');
    const isDone = (w) => (w.status === 'done' ? 1 : 0);

    const incW = recentWeeklyAvg(jobsAll, (j) => j.amount);
    const incM = recentMonthlyAvg(jobsAll, (j) => j.amount);
    const woW = recentWeeklyAvg(woAll, isDone);
    const woInWin = woW.from ? woAll.filter((w) => w.status === 'done' && w.date >= woW.from && w.date <= woW.to) : [];
    const avgMin = woInWin.length ? woInWin.reduce((a, w) => a + w.duration, 0) / woInWin.length : 0;

    const wkFrom = ymd(cur);
    const wkTo = ymd(addDays(cur, 6));
    const wkJobs = sumJobs(itemsIn('jobs', wkFrom, wkTo));
    const wkWo = sumWorkouts(itemsIn('workouts', wkFrom, wkTo));
    const mStart = startOfMonth(t);
    const mJobs = sumJobs(itemsIn('jobs', ymd(mStart), ymd(endOfMonth(t))));

    const tJobs = itemsIn('jobs', tStr, tStr);
    const tWo = itemsIn('workouts', tStr, tStr);
    const tIncome = tJobs.reduce((a, j) => a + j.amount, 0);

    const hour = new Date().getHours();
    const greet = hour < 4 ? 'Chào buổi tối' : hour < 11 ? 'Chào buổi sáng' : hour < 13 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    const name = (CFG.user && CFG.user.name) || '';
    let summary;
    if (!tJobs.length && !tWo.length) {
      summary = 'Hôm nay chưa có lịch. Thêm job hoặc buổi tập để bắt đầu.';
    } else {
      const parts = [];
      if (tJobs.length) parts.push(`<b>${tJobs.length} job</b>, dự kiến thu <b>${money(tIncome)}</b>`);
      if (tWo.length) parts.push(`<b>${tWo.length} buổi tập</b> (${esc(tWo.map((w) => w.title || w.sport).join(', '))})`);
      summary = `Hôm nay bạn có ${parts.join(' và ')}.`;
    }

    const weekSub = (r, unit) => (r.current ? 'Tính theo tuần này' : r.weeks ? `TB ${r.weeks} tuần gần nhất` : `Chưa có ${unit}`);

    // 8 tuần gần nhất
    const weeks8 = [];
    for (let i = 7; i >= 0; i--) {
      const ws = addDays(cur, -7 * i);
      const f = ymd(ws);
      const to = ymd(addDays(ws, 6));
      weeks8.push({ ws, j: sumJobs(itemsIn('jobs', f, to)), w: sumWorkouts(itemsIn('workouts', f, to)) });
    }
    const incomeBars = weeks8.map((x) => ({
      label: fmtDM(x.ws), value: x.j.total, part: x.j.paid, active: +x.ws === +cur,
      title: `Tuần ${isoWeek(x.ws)}: ${money(x.j.total)} · ${x.j.count} job · đã thu ${money(x.j.paid)}`,
    }));
    const woBars = weeks8.map((x) => ({
      label: fmtDM(x.ws), value: x.w.done, active: +x.ws === +cur,
      title: `Tuần ${isoWeek(x.ws)}: ${x.w.done} buổi · ${fmtHours(x.w.minutes)}`,
    }));

    // Sắp tới (7 ngày)
    const upFrom = ymd(addDays(t, 1));
    const upTo = ymd(addDays(t, 7));
    const upcoming = [
      ...itemsIn('jobs', upFrom, upTo).map((it) => ({ kind: 'job', it })),
      ...itemsIn('workouts', upFrom, upTo).filter((w) => w.status === 'planned').map((it) => ({ kind: 'wo', it })),
    ]
      .sort((a, b) => byDateTime(a.it, b.it))
      .slice(0, 8);

    const todayList = [...tJobs.map((it) => ({ kind: 'job', it })), ...tWo.map((it) => ({ kind: 'wo', it }))].sort((a, b) =>
      byDateTime(a.it, b.it)
    );

    const g = state.settings;
    const goalRow = (label, cur2, goal, fmt, green) => {
      if (!goal) return `<div class="ltp-goal"><div class="ltp-goal-top"><span>${label}</span><b>${fmt(cur2)}</b></div><div class="ltp-goal-sub">Chưa đặt mục tiêu</div></div>`;
      const p = Math.min(100, pct(cur2, goal));
      const left = goal - cur2;
      return `<div class="ltp-goal"><div class="ltp-goal-top"><span>${label}</span><b>${fmt(cur2)} / ${fmt(goal)}</b></div>
        <div class="ltp-progress${green ? ' ltp-progress--green' : ''}"><span style="width:${p}%"></span></div>
        <div class="ltp-goal-sub">${left > 0 ? `Còn ${fmt(left)} nữa · đạt ${pct(cur2, goal)}%` : 'Đã đạt mục tiêu'}</div></div>`;
    };

    return `
      <section class="ltp-hero">
        <div>
          <div class="ltp-hero-date">${DOW_LONG[t.getDay()]}, ${fmtDMY(t)} · Tuần ${isoWeek(t)}</div>
          <h2 class="ltp-hero-title">${greet}${name ? `, ${esc(name)}` : ''}</h2>
          <p class="ltp-hero-text">${summary}</p>
        </div>
        <div class="ltp-hero-actions">
          <button type="button" class="ltp-btn ltp-btn--dark" data-action="new-job" data-date="${tStr}">${icon('plus')} Thêm job</button>
          <button type="button" class="ltp-btn" data-action="new-workout" data-date="${tStr}">${icon('plus')} Buổi tập</button>
        </div>
      </section>

      <section class="ltp-kpis" aria-label="Chỉ số trung bình">
        ${kpi('Thu nhập TB / tuần', money(incW.avg), weekSub(incW, 'job'))}
        ${kpi('Thu nhập TB / tháng', money(incM.avg), incM.current ? 'Tính theo tháng này' : incM.months ? `TB ${incM.months} tháng gần nhất` : 'Chưa có job')}
        ${kpi('Buổi tập TB / tuần', `${dec1(woW.avg)} buổi`, woW.weeks ? `${weekSub(woW, 'buổi tập')} · ${fmtMin(avgMin)}/buổi` : 'Chưa có buổi tập', 'ltp-kpi--green')}
        ${kpi('Tuần này', money(wkJobs.total), `${wkJobs.count} job · ${wkWo.done} buổi tập`)}
      </section>

      <div class="ltp-grid-2">
        <section class="ltp-card">
          <div class="ltp-card-head"><div><div class="ltp-kicker">Hôm nay</div><h3 class="ltp-card-title">Lịch trong ngày</h3></div></div>
          ${todayList.length ? `<div class="ltp-agenda-list">${todayList.map((e) => agendaItem(e, false)).join('')}</div>
            ${tJobs.length ? `<div class="ltp-agenda-total"><span>Hôm nay kiếm</span><b>${money(tIncome)}</b></div>` : ''}`
            : '<p class="ltp-empty">Trống lịch. Một ngày để nghỉ ngơi hoặc tìm thêm khách.</p>'}
        </section>
        <section class="ltp-card">
          <div class="ltp-card-head">
            <div><div class="ltp-kicker">Mục tiêu</div><h3 class="ltp-card-title">Tiến độ tuần & tháng</h3></div>
            <button type="button" class="ltp-btn ltp-btn--sm" data-action="goals">${icon('target')} Đặt mục tiêu</button>
          </div>
          ${goalRow('Thu nhập tuần này', wkJobs.total, g.income_goal_week, shortMoney)}
          ${goalRow(`Thu nhập tháng ${t.getMonth() + 1}`, mJobs.total, g.income_goal_month, shortMoney)}
          ${goalRow('Buổi tập tuần này', wkWo.done, g.workout_goal_week, (n) => `${n} buổi`, true)}
        </section>
      </div>

      <div class="ltp-grid-2">
        <section class="ltp-card">
          <div class="ltp-card-head"><div><div class="ltp-kicker">Thu nhập</div><h3 class="ltp-card-title">8 tuần gần nhất</h3><p class="ltp-card-desc">Nhãn là ngày thứ 2 đầu tuần.</p></div></div>
          ${barChart(incomeBars, shortMoney)}
          <div class="ltp-legend"><span><i style="background:var(--ltp-gold)"></i>Đã thu</span><span><i style="background:var(--ltp-gold-soft)"></i>Chưa thu</span></div>
        </section>
        <section class="ltp-card">
          <div class="ltp-card-head"><div><div class="ltp-kicker ltp-kicker--green">Tập luyện</div><h3 class="ltp-card-title">Số buổi đã tập, 8 tuần</h3><p class="ltp-card-desc">Chỉ tính buổi đã đánh dấu “Đã tập”.</p></div></div>
          ${barChart(woBars, (n) => `${n}`, 'ltp-bars--green')}
        </section>
      </div>

      <section class="ltp-card">
        <div class="ltp-card-head"><div><div class="ltp-kicker">Sắp tới</div><h3 class="ltp-card-title">7 ngày tới</h3></div></div>
        ${upcoming.length ? `<div class="ltp-agenda-list">${upcoming.map((e) => agendaItem(e, true)).join('')}</div>` : '<p class="ltp-empty">Chưa có lịch trong 7 ngày tới.</p>'}
      </section>`;
  }

  /* ================================================================
   * Trang: Lịch làm việc (tuần)
   * ================================================================ */
  function jobCard(j) {
    return `<div class="ltp-job" role="button" tabindex="0" data-action="edit-job" data-id="${j.id}">
      <div class="ltp-job-time">${esc(timeRange(j))}</div>
      <div class="ltp-job-title">${esc(j.title)}</div>
      ${j.location ? `<div class="ltp-job-meta">${icon('pin')}<span>${esc(j.location)}</span></div>` : ''}
      ${j.client ? `<div class="ltp-job-meta">${icon('user')}<span>${esc(j.client)}</span></div>` : ''}
      <div class="ltp-job-foot"><b>${esc(money(j.amount))}</b>${payBadge(j)}</div>
    </div>`;
  }

  function dayColumn(d, items, cardFn, opts) {
    const dStr = ymd(d);
    const tStr = ymd(today());
    const cls = ['ltp-day', dStr === tStr ? 'is-today' : '', dStr < tStr ? 'is-past' : '', items.length ? '' : 'is-empty'].join(' ');
    return `<section class="${cls}" aria-label="${DOW_LONG[d.getDay()]} ${fmtDMY(d)}">
      <header class="ltp-day-head">
        <div class="ltp-day-date"><span class="ltp-day-dow">${dStr === tStr ? `Hôm nay · ${DOW[d.getDay()]}` : DOW_LONG[d.getDay()]}</span><span class="ltp-day-num">${d.getDate()}</span><span class="ltp-day-mon">/${pad(d.getMonth() + 1)}</span></div>
        ${items.length ? `<div class="ltp-day-total">${opts.total(items)}</div>` : `<span class="ltp-day-emptytag">${opts.emptyTag}</span>`}
      </header>
      <div class="ltp-day-body">${items.length ? items.map(cardFn).join('') : `<p class="ltp-day-empty">${opts.empty}</p>`}</div>
      <button type="button" class="ltp-day-add" data-action="${opts.addAction}" data-date="${dStr}">${icon('plus')} Thêm</button>
    </section>`;
  }

  function viewWork() {
    const ws = state.workWeek;
    const we = addDays(ws, 6);
    const jobs = itemsIn('jobs', ymd(ws), ymd(we));
    const s = sumJobs(jobs);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const dStr = ymd(d);
      days.push(
        dayColumn(d, jobs.filter((j) => j.date === dStr), jobCard, {
          total: (list) => `Kiếm <b>${money(list.reduce((a, j) => a + j.amount, 0))}</b>`,
          empty: 'Trống lịch',
          emptyTag: 'Trống lịch',
          addAction: 'new-job',
        })
      );
    }
    const busiest = jobs.length
      ? groupBy(jobs, (j) => j.date)
          .map(([d, l]) => ({ d, v: l.reduce((a, j) => a + j.amount, 0) }))
          .sort((a, b) => b.v - a.v)[0]
      : null;
    return `
      <div class="ltp-toolbar">
        <div class="ltp-toolbar-group">${navBlock('work', `Tuần ${isoWeek(ws)}`, `${fmtDM(ws)} – ${fmtDMY(we)}`)}</div>
        <div class="ltp-toolbar-group">
          <button type="button" class="ltp-btn" data-action="nav-today" data-scope="work">Tuần này</button>
          <button type="button" class="ltp-btn ltp-btn--dark" data-action="new-job" data-date="${ymd(ws) <= ymd(today()) && ymd(today()) <= ymd(we) ? ymd(today()) : ymd(ws)}">${icon('plus')} Thêm job</button>
        </div>
      </div>
      <div class="ltp-strip">
        ${stat('Tổng giá trị tuần', money(s.total), 'ltp-stat--gold')}
        ${stat('Đã thu', money(s.paid))}
        ${stat('Còn phải thu', money(s.debt))}
        ${stat('Số job', busiest ? `${s.count} job · cao nhất ${DOW[parseYmd(busiest.d).getDay()]}` : '0 job')}
      </div>
      <div class="ltp-week">${days.join('')}</div>`;
  }

  /* ================================================================
   * Trang: Tài chính
   * ================================================================ */
  function viewFinance() {
    const f = state.fin;
    const p = period(f.mode, f.anchor);
    const pp = period(f.mode, shiftAnchor(f.mode, p.start, -1));
    const jobs = itemsIn('jobs', p.from, p.to);
    const s = sumJobs(jobs);
    const ps = sumJobs(itemsIn('jobs', pp.from, pp.to));

    let bars;
    let chartTitle;
    let chartDesc;
    let dense = '';
    if (f.mode === 'month') {
      const y = p.start.getFullYear();
      chartTitle = `Giá trị job theo tháng · ${y}`;
      chartDesc = 'Bấm vào cột để xem báo cáo tháng đó.';
      dense = 'ltp-bars--dense';
      bars = [];
      for (let m = 0; m < 12; m++) {
        const ms = new Date(y, m, 1);
        const sm = sumJobs(itemsIn('jobs', ymd(ms), ymd(endOfMonth(ms))));
        bars.push({
          label: `Tháng ${m + 1}`, short: `T${m + 1}`, sub: `${sm.count} job`, value: sm.total, part: sm.paid,
          active: m === p.start.getMonth(), action: 'fin-month', key: m,
          title: `Tháng ${m + 1}/${y}: ${money(sm.total)} · đã thu ${money(sm.paid)} · còn ${money(sm.debt)}`,
        });
      }
    } else {
      chartTitle = 'Giá trị job theo ngày';
      chartDesc = 'Mỗi cột là một ngày trong tuần.';
      bars = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(p.start, i);
        const sd = sumJobs(jobs.filter((j) => j.date === ymd(d)));
        bars.push({
          label: DOW[d.getDay()], sub: fmtDM(d), value: sd.total, part: sd.paid, active: ymd(d) === ymd(today()),
          title: `${DOW_LONG[d.getDay()]} ${fmtDM(d)}: ${money(sd.total)} · ${sd.count} job`,
        });
      }
    }

    const byType = groupBy(jobs, (j) => j.type || 'Chưa phân loại')
      .map(([name, l], i) => {
        const x = sumJobs(l);
        return { name, value: x.total, sub: `${x.count} job · TB ${money(x.avg)}/job`, color: PALETTE[i % PALETTE.length] };
      })
      .sort((a, b) => b.value - a.value);
    byType.forEach((r, i) => { r.color = PALETTE[i % PALETTE.length]; });
    const byClient = groupBy(jobs, (j) => j.client || 'Khách lẻ')
      .map(([name, l]) => {
        const x = sumJobs(l);
        return { name, value: x.total, sub: `${x.count} job${x.debt ? ` · còn nợ ${money(x.debt)}` : ' · đã thu đủ'}`, color: 'var(--ltp-gold)' };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const rows = jobs
      .map((j) => {
        const d = parseYmd(j.date);
        const debt = Math.max(0, j.amount - j.paid);
        const meta = [j.client, j.location, j.type].filter(Boolean).map(esc).join(' · ');
        return `<div class="ltp-row" role="button" tabindex="0" data-action="edit-job" data-id="${j.id}">
          <div class="ltp-row-date">${fmtDM(d)}<small>${DOW[d.getDay()]}${j.start ? ` · ${j.start}` : ''}</small></div>
          <div class="ltp-row-main"><b>${esc(j.title)}</b><small>${meta || '&nbsp;'}</small></div>
          <div class="ltp-row-side">
            <div class="ltp-row-money"><b>${money(j.amount)}</b><small>${!j.amount ? 'Không tính phí' : debt ? `Còn ${money(debt)}` : 'Đã thu đủ'}</small></div>
            ${debt ? `<button type="button" class="ltp-btn ltp-btn--sm" data-action="mark-paid" data-id="${j.id}">${icon('check')} Thu đủ</button>` : payBadge(j)}
          </div>
        </div>`;
      })
      .join('');

    return `
      <div class="ltp-toolbar">
        <div class="ltp-toolbar-group">${modeSeg('fin', f.mode)}${navBlock('fin', p.title, p.range)}</div>
        <div class="ltp-toolbar-group">
          <button type="button" class="ltp-btn" data-action="export-jobs">${icon('download')} Excel (.xlsx)</button>
          <button type="button" class="ltp-btn ltp-btn--dark" data-action="print">${icon('print')} In / PDF</button>
        </div>
      </div>

      <section class="ltp-kpis">
        ${kpi('Tổng giá trị job', money(s.total), `${changeHtml(s.total, ps.total)} so với ${p.unit} trước`)}
        ${kpi('Đã ghi nhận thu', money(s.paid), `${pct(s.settled, s.billable)}% job đã thanh toán đủ`)}
        ${kpi('Công nợ còn lại', money(s.debt), s.open ? `${s.open} job chưa thu đủ` : 'Không còn công nợ')}
        ${kpi('Giá trị TB / job', money(s.avg), `${s.count} job trong ${p.unit}`)}
      </section>

      <section class="ltp-card">
        <div class="ltp-card-head">
          <div><div class="ltp-kicker">Biểu đồ doanh thu</div><h3 class="ltp-card-title">${chartTitle}</h3><p class="ltp-card-desc">${chartDesc}</p></div>
          <div class="ltp-compare">
            <div><span>${esc(p.title)}</span><b>${money(s.total)}</b></div>
            <div><span>${esc(pp.title)}</span><b>${money(ps.total)}</b></div>
            <div><span>Thay đổi</span><b>${changeHtml(s.total, ps.total)}</b></div>
          </div>
        </div>
        ${barChart(bars, shortMoney, dense)}
        <div class="ltp-legend"><span><span><i style="background:var(--ltp-gold)"></i>Đã thu</span>&nbsp;&nbsp;<span><i style="background:var(--ltp-gold-soft)"></i>Chưa thu</span></span><small>Cột = tổng giá trị job phát sinh</small></div>
      </section>

      <div class="ltp-grid-2">
        <section class="ltp-card">
          <div class="ltp-card-head"><div><h3 class="ltp-card-title">Hiệu suất theo loại job</h3><p class="ltp-card-desc">Xếp theo doanh thu trong ${p.unit} đang chọn.</p></div></div>
          ${rankList(byType, shortMoney)}
        </section>
        <section class="ltp-card">
          <div class="ltp-card-head"><div><h3 class="ltp-card-title">Top khách hàng</h3><p class="ltp-card-desc">Bấm vào job ở danh sách bên dưới để sửa.</p></div></div>
          ${rankList(byClient, shortMoney)}
        </section>
      </div>

      <section class="ltp-card">
        <div class="ltp-card-head">
          <div><h3 class="ltp-card-title">Danh sách job · ${esc(p.title)}</h3><p class="ltp-card-desc">${s.count} job · tổng ${money(s.total)} · còn phải thu ${money(s.debt)}</p></div>
          <button type="button" class="ltp-btn ltp-btn--sm" data-action="new-job" data-date="${p.from <= ymd(today()) && ymd(today()) <= p.to ? ymd(today()) : p.from}">${icon('plus')} Thêm job</button>
        </div>
        ${rows ? `<div class="ltp-list">${rows}</div>` : '<p class="ltp-empty">Chưa có job nào trong kỳ này.</p>'}
      </section>`;
  }

  /* ================================================================
   * Trang: Lịch tập (tuần)
   * ================================================================ */
  function woCard(w) {
    const done = w.status === 'done';
    return `<div class="ltp-wo${done ? ' is-done' : ''}${w.status === 'skipped' ? ' is-skipped' : ''}" style="--c:${sportColor(w.sport)}" role="button" tabindex="0" data-action="edit-workout" data-id="${w.id}">
      <div class="ltp-wo-top"><span class="ltp-wo-sport">${esc(w.sport)}</span>
        <button type="button" class="ltp-wo-check${done ? ' is-done' : ''}" data-action="toggle-done" data-id="${w.id}" aria-pressed="${done}" aria-label="${done ? 'Bỏ đánh dấu đã tập' : 'Đánh dấu đã tập'}">${icon('check')}</button>
      </div>
      <div class="ltp-wo-title">${esc(w.title || w.sport)}</div>
      <div class="ltp-wo-meta">${w.start ? `${esc(w.start)} · ` : ''}${fmtMin(w.duration)}${w.status === 'skipped' ? ' · bỏ lỡ' : ''}</div>
      ${w.muscles.length ? `<div class="ltp-mchips">${w.muscles.map((m) => `<span class="ltp-mchip">${esc(m)}</span>`).join('')}</div>` : ''}
    </div>`;
  }

  function viewTraining() {
    const ws = state.trainWeek;
    const we = addDays(ws, 6);
    const list = itemsIn('workouts', ymd(ws), ymd(we));
    const s = sumWorkouts(list);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const dStr = ymd(d);
      days.push(
        dayColumn(d, list.filter((w) => w.date === dStr), woCard, {
          total: (l) => `${l.length} buổi <b>${fmtMin(l.reduce((a, w) => a + w.duration, 0))}</b>`,
          empty: 'Nghỉ ngơi',
          emptyTag: 'Nghỉ ngơi',
          addAction: 'new-workout',
        })
      );
    }
    const muscles = [...new Set(list.filter((w) => w.status !== 'skipped').flatMap((w) => w.muscles))];
    const goal = state.settings.workout_goal_week;
    const tStr = ymd(today());
    return `
      <div class="ltp-toolbar">
        <div class="ltp-toolbar-group">${navBlock('train', `Tuần ${isoWeek(ws)}`, `${fmtDM(ws)} – ${fmtDMY(we)}`)}</div>
        <div class="ltp-toolbar-group">
          <button type="button" class="ltp-btn" data-action="nav-today" data-scope="train">Tuần này</button>
          <button type="button" class="ltp-btn ltp-btn--green" data-action="new-workout" data-date="${ymd(ws) <= tStr && tStr <= ymd(we) ? tStr : ymd(ws)}">${icon('plus')} Thêm buổi tập</button>
        </div>
      </div>
      <div class="ltp-strip">
        ${stat('Đã tập', `${s.done}/${s.total} buổi${goal ? ` · mục tiêu ${goal}` : ''}`, 'ltp-stat--green')}
        ${stat('Tổng thời gian', fmtHours(s.minutes))}
        ${stat('TB mỗi buổi', s.done ? fmtMin(s.avgMin) : '–')}
        ${stat('Nhóm cơ trong tuần', muscles.length ? esc(muscles.join(', ')) : '–')}
      </div>
      <div class="ltp-week ltp-week--green">${days.join('')}</div>`;
  }

  /* ================================================================
   * Trang: Sức khỏe
   * ================================================================ */
  function viewHealth() {
    const h = state.health;
    const p = period(h.mode, h.anchor);
    const pp = period(h.mode, shiftAnchor(h.mode, p.start, -1));
    const list = itemsIn('workouts', p.from, p.to);
    const s = sumWorkouts(list);
    const ps = sumWorkouts(itemsIn('workouts', pp.from, pp.to));
    const t = today();

    let perWeek;
    let perWeekSub;
    if (h.mode === 'month') {
      const end = p.end < t ? p.end : p.start <= t ? t : p.end;
      const days = Math.max(1, daysBetween(p.start, end) + 1);
      perWeek = s.done / (days / 7);
      perWeekSub = p.start <= t && t <= p.end ? `Tính đến hôm nay (${days} ngày)` : `Trong ${p.title.toLowerCase()}`;
    } else {
      const items = allItems('workouts');
      const r = weekWindowAvg(items, (w) => (w.status === 'done' ? 1 : 0), p.start, 4);
      perWeek = r.avg;
      perWeekSub = r.weeks ? `TB ${r.weeks} tuần gần nhất` : 'Chưa có dữ liệu';
    }

    let bars;
    let chartTitle;
    let dense = '';
    if (h.mode === 'month') {
      const y = p.start.getFullYear();
      chartTitle = `Giờ tập theo tháng · ${y}`;
      dense = 'ltp-bars--dense';
      bars = [];
      for (let m = 0; m < 12; m++) {
        const ms = new Date(y, m, 1);
        const sm = sumWorkouts(itemsIn('workouts', ymd(ms), ymd(endOfMonth(ms))));
        bars.push({
          label: `Tháng ${m + 1}`, short: `T${m + 1}`, sub: `${sm.done} buổi`, value: sm.minutes,
          active: m === p.start.getMonth(), action: 'health-month', key: m,
          title: `Tháng ${m + 1}/${y}: ${sm.done} buổi · ${fmtHours(sm.minutes)}`,
        });
      }
    } else {
      chartTitle = 'Phút tập theo ngày';
      bars = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(p.start, i);
        const sd = sumWorkouts(list.filter((w) => w.date === ymd(d)));
        bars.push({
          label: DOW[d.getDay()], sub: fmtDM(d), value: sd.minutes, active: ymd(d) === ymd(t),
          title: `${DOW_LONG[d.getDay()]} ${fmtDM(d)}: ${sd.done} buổi · ${fmtMin(sd.minutes)}`,
        });
      }
    }

    const done = list.filter((w) => w.status === 'done');
    const bySport = groupBy(done, (w) => w.sport)
      .map(([name, l]) => {
        const m = l.reduce((a, w) => a + w.duration, 0);
        return { name, value: m, sub: `${l.length} buổi · TB ${fmtMin(m / l.length)}/buổi`, color: sportColor(name) };
      })
      .sort((a, b) => b.value - a.value);
    const muscleCount = {};
    done.forEach((w) => w.muscles.forEach((m) => { muscleCount[m] = (muscleCount[m] || 0) + 1; }));
    const byMuscle = Object.keys(muscleCount)
      .map((name) => ({ name, value: muscleCount[name], sub: '', color: 'var(--ltp-green)' }))
      .sort((a, b) => b.value - a.value);
    const gymMuscles = MUSCLES.filter((m) => m !== 'Cardio' && m !== 'Toàn thân');
    const fullBody = (muscleCount['Toàn thân'] || 0) > 0;
    const missing = fullBody ? [] : gymMuscles.filter((m) => !muscleCount[m]);

    const logRows = list
      .slice()
      .reverse()
      .map((w) => {
        const d = parseYmd(w.date);
        return `<div class="ltp-row" role="button" tabindex="0" data-action="edit-workout" data-id="${w.id}">
          <div class="ltp-row-date">${fmtDM(d)}<small>${DOW[d.getDay()]}${w.start ? ` · ${w.start}` : ''}</small></div>
          <div class="ltp-row-main"><b><i class="ltp-dot" style="--c:${sportColor(w.sport)}"></i>${esc(w.title || w.sport)}</b><small>${esc(w.sport)}${w.muscles.length ? ` · ${esc(w.muscles.join(', '))}` : ''}</small></div>
          <div class="ltp-row-side"><div class="ltp-row-money"><b>${fmtMin(w.duration)}</b></div>${statusPill(w)}</div>
        </div>`;
      })
      .join('');

    return `
      <div class="ltp-toolbar">
        <div class="ltp-toolbar-group">${modeSeg('health', h.mode)}${navBlock('health', p.title, p.range)}</div>
        <div class="ltp-toolbar-group">
          <button type="button" class="ltp-btn" data-action="export-workouts">${icon('download')} Excel (.xlsx)</button>
          <button type="button" class="ltp-btn ltp-btn--dark" data-action="print">${icon('print')} In / PDF</button>
        </div>
      </div>

      <section class="ltp-kpis ltp-kpis--green">
        ${kpi('Số buổi đã tập', `${s.done} buổi`, `${s.total} buổi trong lịch${s.rate != null ? ` · hoàn thành ${s.rate}%` : ''}`)}
        ${kpi('TB buổi / tuần', `${dec1(perWeek)} buổi`, perWeekSub)}
        ${kpi('TB thời gian / buổi', s.done ? fmtMin(s.avgMin) : '–', s.done ? `≈ ${fmtHours(s.avgMin)} mỗi buổi` : 'Chưa có buổi đã tập')}
        ${kpi(`Tổng giờ tập trong ${p.unit}`, fmtHours(s.minutes), `${changeHtml(s.minutes, ps.minutes)} so với ${p.unit} trước`)}
      </section>

      <section class="ltp-card">
        <div class="ltp-card-head">
          <div><div class="ltp-kicker ltp-kicker--green">Thời gian tập</div><h3 class="ltp-card-title">${chartTitle}</h3><p class="ltp-card-desc">${h.mode === 'month' ? 'Bấm vào cột để xem tháng đó.' : 'Chỉ tính buổi đã tập.'}</p></div>
          <div class="ltp-compare">
            <div><span>${esc(p.title)}</span><b>${s.done} buổi</b></div>
            <div><span>${esc(pp.title)}</span><b>${ps.done} buổi</b></div>
            <div><span>Giờ tập</span><b>${changeHtml(s.minutes, ps.minutes)}</b></div>
          </div>
        </div>
        ${barChart(bars, h.mode === 'month' ? (m) => `${dec1(m / 60)}h` : (m) => `${m}′`, `ltp-bars--green ${dense}`)}
      </section>

      <div class="ltp-grid-2">
        <section class="ltp-card">
          <div class="ltp-card-head"><div><h3 class="ltp-card-title">Theo môn thể thao</h3><p class="ltp-card-desc">Tổng thời gian đã tập mỗi môn.</p></div></div>
          ${rankList(bySport, (m) => fmtHours(m))}
        </section>
        <section class="ltp-card">
          <div class="ltp-card-head"><div><h3 class="ltp-card-title">Nhóm cơ đã tập</h3><p class="ltp-card-desc">Số buổi có tập nhóm cơ đó.</p></div></div>
          ${rankList(byMuscle, (n) => `${n} buổi`)}
          ${done.length && missing.length ? `<p class="ltp-note"><b>Chưa tập trong ${p.unit} này:</b> ${esc(missing.join(', '))}.</p>` : ''}
        </section>
      </div>

      <section class="ltp-card">
        <div class="ltp-card-head">
          <div><h3 class="ltp-card-title">Nhật ký tập · ${esc(p.title)}</h3><p class="ltp-card-desc">${s.done} buổi đã tập · ${s.skipped} buổi bỏ lỡ · tổng ${fmtHours(s.minutes)}</p></div>
          <button type="button" class="ltp-btn ltp-btn--sm" data-action="new-workout" data-date="${p.from <= ymd(t) && ymd(t) <= p.to ? ymd(t) : p.from}">${icon('plus')} Thêm buổi tập</button>
        </div>
        ${logRows ? `<div class="ltp-list">${logRows}</div>` : '<p class="ltp-empty">Chưa có buổi tập nào trong kỳ này.</p>'}
      </section>`;
  }

  const VIEWS = { home: viewHome, work: viewWork, finance: viewFinance, training: viewTraining, health: viewHealth };

  /* ================================================================
   * Hộp thoại (thêm / sửa)
   * ================================================================ */
  function openModal(html) {
    const host = $('#ltp-modal');
    host.innerHTML = `<div class="ltp-overlay" data-action="overlay"><div class="ltp-modal" role="dialog" aria-modal="true" aria-labelledby="ltp-modal-title">${html}</div></div>`;
    document.body.classList.add('ltp-noscroll');
    const first = host.querySelector('[autofocus]') || host.querySelector('input:not([type=hidden]), select, textarea');
    if (first && window.matchMedia('(min-width: 761px)').matches) first.focus();
  }
  function closeModal() {
    const host = $('#ltp-modal');
    if (host) host.innerHTML = '';
    document.body.classList.remove('ltp-noscroll');
  }

  const modalHead = (title) =>
    `<header class="ltp-modal-head"><h3 id="ltp-modal-title">${title}</h3><button type="button" class="ltp-icon-btn" data-action="close" aria-label="Đóng">${icon('x')}</button></header>`;
  const modalFoot = (type, id, submitLabel, btnCls) =>
    `<p class="ltp-form-error" data-error hidden></p></div>
     <footer class="ltp-modal-foot">
       ${id ? `<button type="button" class="ltp-btn ltp-btn--danger" data-action="delete" data-type="${type}" data-id="${id}">Xóa</button>` : ''}
       <span class="sp"></span>
       <button type="button" class="ltp-btn" data-action="close">Hủy</button>
       <button type="submit" class="ltp-btn ${btnCls}">${submitLabel}</button>
     </footer>`;
  const repeatField = () => `<div class="ltp-field"><label for="f-repeat">Lặp lại hàng tuần</label>
      <select id="f-repeat" name="repeat"><option value="1">Không lặp lại</option><option value="4">Lặp 4 tuần</option><option value="8">Lặp 8 tuần</option><option value="12">Lặp 12 tuần</option><option value="26">Lặp 26 tuần</option></select></div>`;
  const moneyInput = (v) => (v ? NF.format(v) : '');

  function openJob(job) {
    const isNew = !job.id;
    const types = [...new Set([...JOB_TYPES, ...allItems('jobs').map((j) => j.type).filter(Boolean)])];
    openModal(`<form class="ltp-form" data-form="jobs" data-id="${job.id || ''}" novalidate>
      ${modalHead(isNew ? 'Thêm job' : 'Sửa job')}
      <div class="ltp-modal-body">
        <div class="ltp-field"><label for="f-title">Tên công việc *</label>
          <input id="f-title" name="title" maxlength="191" required value="${esc(job.title)}" placeholder="VD: Chụp ảnh cưới ngoại cảnh" autocomplete="off"></div>
        <div class="ltp-row3">
          <div class="ltp-field"><label for="f-date">Ngày *</label><input id="f-date" name="date" type="date" required value="${esc(job.date)}"></div>
          <div class="ltp-field"><label for="f-start">Bắt đầu</label><input id="f-start" name="start" type="time" value="${esc(job.start)}"></div>
          <div class="ltp-field"><label for="f-end">Kết thúc</label><input id="f-end" name="end" type="time" value="${esc(job.end)}"></div>
        </div>
        <div class="ltp-field"><label for="f-location">Địa điểm</label><input id="f-location" name="location" maxlength="255" value="${esc(job.location)}" placeholder="VD: Nhà thờ Tân Định, Q.3"></div>
        <div class="ltp-row2">
          <div class="ltp-field"><label for="f-client">Khách hàng</label><input id="f-client" name="client" maxlength="191" value="${esc(job.client)}" placeholder="Tên khách"></div>
          <div class="ltp-field"><label for="f-type">Loại job</label><input id="f-type" name="type" list="ltp-types" maxlength="100" value="${esc(job.type)}" placeholder="Chọn hoặc gõ"><datalist id="ltp-types">${types.map((x) => `<option value="${esc(x)}"></option>`).join('')}</datalist></div>
        </div>
        <div class="ltp-row2">
          <div class="ltp-field"><label for="f-amount">Giá trị job (đ)</label><input id="f-amount" name="amount" inputmode="numeric" data-money value="${moneyInput(job.amount)}" placeholder="0"></div>
          <div class="ltp-field"><label for="f-paid">Đã thu (đ)</label><input id="f-paid" name="paid" inputmode="numeric" data-money value="${moneyInput(job.paid)}" placeholder="0"></div>
        </div>
        <div class="ltp-picks" aria-label="Điền nhanh số đã thu">
          <button type="button" class="ltp-pick" data-action="paid-preset" data-v="0">Chưa thu</button>
          <button type="button" class="ltp-pick" data-action="paid-preset" data-v="30">Cọc 30%</button>
          <button type="button" class="ltp-pick" data-action="paid-preset" data-v="50">Cọc 50%</button>
          <button type="button" class="ltp-pick" data-action="paid-preset" data-v="100">Thu đủ</button>
        </div>
        ${isNew ? repeatField() : ''}
        <div class="ltp-field"><label for="f-note">Ghi chú</label><textarea id="f-note" name="note" maxlength="2000" placeholder="Đồ cần mang, liên hệ, yêu cầu của khách…">${esc(job.note)}</textarea></div>
      ${modalFoot('jobs', job.id, isNew ? 'Lưu job' : 'Lưu thay đổi', 'ltp-btn--dark')}
    </form>`);
  }

  function openWorkout(w) {
    const isNew = !w.id;
    const sports = SPORTS.slice();
    if (w.sport && !sports.some((s) => s.name === w.sport)) sports.splice(sports.length - 1, 0, { name: w.sport, color: sportColor(w.sport) });
    openModal(`<form class="ltp-form" data-form="workouts" data-id="${w.id || ''}" data-status-touched="${isNew ? '0' : '1'}" novalidate>
      ${modalHead(isNew ? 'Thêm buổi tập' : 'Sửa buổi tập')}
      <div class="ltp-modal-body">
        ${isNew ? `<div class="ltp-field"><span class="ltp-label">Mẫu nhanh</span><div class="ltp-picks">${TEMPLATES.map((tp, i) => `<button type="button" class="ltp-pick ltp-pick--tpl" data-action="wo-template" data-i="${i}">${esc(tp.label)}</button>`).join('')}</div></div>` : ''}
        <div class="ltp-field"><span class="ltp-label">Môn thể thao *</span>
          <input type="hidden" name="sport" value="${esc(w.sport)}">
          <div class="ltp-picks" data-picker="sport">${sports.map((s) => `<button type="button" class="ltp-pick" style="--c:${s.color}" data-action="pick-sport" data-v="${esc(s.name)}">${esc(s.name)}</button>`).join('')}</div>
        </div>
        <div class="ltp-field"><span class="ltp-label">Nhóm cơ / nội dung</span>
          <input type="hidden" name="muscles" value="${esc(w.muscles.join(','))}">
          <div class="ltp-picks" data-picker="muscles">${MUSCLES.map((m) => `<button type="button" class="ltp-pick" style="--c:var(--ltp-green)" data-action="pick-muscle" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div>
        </div>
        <div class="ltp-field"><label for="f-wtitle">Tên buổi tập / bài chính</label>
          <input id="f-wtitle" name="title" maxlength="191" value="${esc(w.title)}" placeholder="VD: Push day – Bench press 4×8" autocomplete="off"></div>
        <div class="ltp-row3">
          <div class="ltp-field"><label for="f-wdate">Ngày *</label><input id="f-wdate" name="date" type="date" required value="${esc(w.date)}"></div>
          <div class="ltp-field"><label for="f-wstart">Giờ bắt đầu</label><input id="f-wstart" name="start" type="time" value="${esc(w.start)}"></div>
          <div class="ltp-field"><label for="f-wdur">Thời lượng (phút)</label><input id="f-wdur" name="duration" type="number" min="1" max="1440" step="5" inputmode="numeric" value="${w.duration || ''}"></div>
        </div>
        <div class="ltp-picks" aria-label="Chọn nhanh thời lượng">${[30, 45, 60, 75, 90, 120].map((m) => `<button type="button" class="ltp-pick" data-action="pick-dur" data-v="${m}">${fmtMin(m)}</button>`).join('')}</div>
        <div class="ltp-field"><span class="ltp-label">Trạng thái</span>
          <input type="hidden" name="status" value="${esc(w.status)}">
          <div class="ltp-seg" data-picker="status" role="group">
            <button type="button" data-action="pick-status" data-v="planned">Kế hoạch</button>
            <button type="button" data-action="pick-status" data-v="done">Đã tập</button>
            <button type="button" data-action="pick-status" data-v="skipped">Bỏ lỡ</button>
          </div>
        </div>
        ${isNew ? repeatField() : ''}
        <div class="ltp-field"><label for="f-wnote">Ghi chú</label><textarea id="f-wnote" name="note" maxlength="2000" placeholder="Mức tạ, số hiệp, cảm nhận…">${esc(w.note)}</textarea></div>
      ${modalFoot('workouts', w.id, isNew ? 'Lưu buổi tập' : 'Lưu thay đổi', 'ltp-btn--green')}
    </form>`);
    syncPickers($('#ltp-modal form'));
  }

  function openGoals() {
    const g = state.settings;
    openModal(`<form class="ltp-form" data-form="settings" novalidate>
      ${modalHead('Đặt mục tiêu')}
      <div class="ltp-modal-body">
        <div class="ltp-field"><label for="g-wo">Số buổi tập mỗi tuần</label><input id="g-wo" name="workout_goal_week" type="number" min="0" max="21" inputmode="numeric" value="${g.workout_goal_week || 0}"></div>
        <div class="ltp-field"><label for="g-iw">Thu nhập mỗi tuần (đ)</label><input id="g-iw" name="income_goal_week" inputmode="numeric" data-money value="${moneyInput(g.income_goal_week)}" placeholder="0 = không đặt"></div>
        <div class="ltp-field"><label for="g-im">Thu nhập mỗi tháng (đ)</label><input id="g-im" name="income_goal_month" inputmode="numeric" data-money value="${moneyInput(g.income_goal_month)}" placeholder="0 = không đặt"></div>
        <p class="ltp-hint">Để 0 nếu không muốn theo dõi mục tiêu đó.</p>
      ${modalFoot('settings', 0, 'Lưu mục tiêu', 'ltp-btn--dark')}
    </form>`);
  }

  function syncPickers(form) {
    if (!form) return;
    const sport = form.elements.sport ? form.elements.sport.value : '';
    const muscles = form.elements.muscles ? form.elements.muscles.value.split(',').filter(Boolean) : [];
    const status = form.elements.status ? form.elements.status.value : '';
    const dur = form.elements.duration ? +form.elements.duration.value : 0;
    form.querySelectorAll('[data-action="pick-sport"]').forEach((b) => b.classList.toggle('is-on', b.dataset.v === sport));
    form.querySelectorAll('[data-action="pick-muscle"]').forEach((b) => b.classList.toggle('is-on', muscles.includes(b.dataset.v)));
    form.querySelectorAll('[data-action="pick-status"]').forEach((b) => b.classList.toggle('is-on', b.dataset.v === status));
    form.querySelectorAll('[data-action="pick-dur"]').forEach((b) => b.classList.toggle('is-on', +b.dataset.v === dur));
  }

  function newJobDefaults(date) {
    return { id: 0, date: date || ymd(today()), start: '08:00', end: '', title: '', client: '', location: '', type: '', amount: 0, paid: 0, note: '' };
  }
  function newWorkoutDefaults(date) {
    const d = date || ymd(today());
    return { id: 0, date: d, start: '18:00', duration: 60, sport: 'Gym', muscles: [], title: '', status: d < ymd(today()) ? 'done' : 'planned', note: '' };
  }

  /* ================================================================
   * Lưu dữ liệu
   * ================================================================ */
  function formError(form, msg) {
    const el = form.querySelector('[data-error]');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function readForm(form) {
    const fd = new FormData(form);
    const v = (k) => String(fd.get(k) || '').trim();
    const kind = form.dataset.form;
    if (kind === 'jobs') {
      return {
        title: v('title'), date: v('date'), start: v('start'), end: v('end'), location: v('location'),
        client: v('client'), type: v('type'), amount: digits(fd.get('amount')), paid: digits(fd.get('paid')),
        note: v('note'), repeat_weeks: +v('repeat') || 1,
      };
    }
    if (kind === 'workouts') {
      return {
        sport: v('sport'), muscles: v('muscles').split(',').filter(Boolean), title: v('title'), date: v('date'),
        start: v('start'), duration: Math.round(+v('duration') || 0), status: v('status') || 'planned',
        note: v('note'), repeat_weeks: +v('repeat') || 1,
      };
    }
    return {
      workout_goal_week: Math.max(0, Math.min(21, Math.round(+v('workout_goal_week') || 0))),
      income_goal_week: digits(fd.get('income_goal_week')),
      income_goal_month: digits(fd.get('income_goal_month')),
    };
  }

  function validate(kind, d) {
    if (kind === 'settings') return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return 'Vui lòng chọn ngày.';
    if (kind === 'jobs') {
      if (!d.title) return 'Vui lòng nhập tên công việc.';
      if (d.start && d.end && d.end < d.start) return 'Giờ kết thúc phải sau giờ bắt đầu.';
      if (d.paid > d.amount) return 'Số đã thu đang lớn hơn giá trị job.';
    }
    if (kind === 'workouts') {
      if (!d.sport) return 'Vui lòng chọn môn thể thao.';
      if (!d.duration || d.duration < 1 || d.duration > 1440) return 'Thời lượng cần từ 1 đến 1440 phút.';
    }
    return '';
  }

  async function submitForm(form) {
    const kind = form.dataset.form;
    const id = +form.dataset.id || 0;
    const data = readForm(form);
    const err = validate(kind, data);
    if (err) {
      formError(form, err);
      return;
    }
    formError(form, '');
    const btn = form.querySelector('[type="submit"]');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Đang lưu…';
    try {
      if (kind === 'settings') {
        const saved = await api.saveSettings(data);
        state.settings = Object.assign(state.settings, saved || data);
        closeModal();
        toast('Đã lưu mục tiêu');
      } else if (id) {
        delete data.repeat_weeks;
        const item = await api.update(kind, id, data);
        cacheRemove(kind, id);
        cacheAdd(kind, [item]);
        closeModal();
        toast('Đã lưu thay đổi');
        followDate(kind, data.date);
      } else {
        const items = await api.create(kind, data);
        cacheAdd(kind, items);
        closeModal();
        const n = (items || []).length;
        toast(n > 1 ? `Đã thêm ${n} ${kind === 'jobs' ? 'job' : 'buổi tập'} (lặp hàng tuần)` : kind === 'jobs' ? 'Đã thêm job' : 'Đã thêm buổi tập');
        followDate(kind, data.date);
      }
      render();
    } catch (e) {
      formError(form, e.message);
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  /** Sau khi lưu, chuyển lịch tuần tới tuần chứa mục vừa lưu để người dùng thấy ngay. */
  function followDate(kind, date) {
    const ws = startOfWeek(parseYmd(date));
    if (kind === 'jobs' && state.tab === 'work') state.workWeek = ws;
    if (kind === 'workouts' && state.tab === 'training') state.trainWeek = ws;
  }

  async function quickUpdate(kind, id, patch, msg) {
    const it = findItem(kind, id);
    if (!it) return;
    const payload = Object.assign({}, it, patch);
    delete payload.id;
    try {
      const saved = await api.update(kind, id, payload);
      cacheRemove(kind, id);
      cacheAdd(kind, [saved]);
      toast(msg);
      render();
    } catch (e) {
      toast(e.message);
    }
  }

  async function deleteItem(btn) {
    if (!btn.classList.contains('is-confirm')) {
      btn.classList.add('is-confirm');
      btn.textContent = 'Bấm lần nữa để xóa';
      setTimeout(() => {
        if (btn.isConnected) {
          btn.classList.remove('is-confirm');
          btn.textContent = 'Xóa';
        }
      }, 4000);
      return;
    }
    const kind = btn.dataset.type;
    const id = +btn.dataset.id;
    btn.disabled = true;
    try {
      await api.remove(kind, id);
      cacheRemove(kind, id);
      closeModal();
      toast('Đã xóa');
      render();
    } catch (e) {
      btn.disabled = false;
      const form = btn.closest('form');
      if (form) formError(form, e.message);
    }
  }

  /* ================================================================
   * Xuất Excel (.xlsx) – tự tạo file, không cần thư viện
   * ================================================================ */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  /** Tạo file ZIP (không nén) từ danh sách {name, text}. */
  function zipStore(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const chunks = [];
    const central = [];
    let offset = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name);
      const data = enc.encode(f.text);
      const crc = crc32(data);
      const head = new DataView(new ArrayBuffer(30));
      head.setUint32(0, 0x04034b50, true);
      head.setUint16(4, 20, true);
      head.setUint16(6, 0x0800, true);
      head.setUint16(8, 0, true);
      head.setUint16(10, dosTime, true);
      head.setUint16(12, dosDate, true);
      head.setUint32(14, crc, true);
      head.setUint32(18, data.length, true);
      head.setUint32(22, data.length, true);
      head.setUint16(26, name.length, true);
      head.setUint16(28, 0, true);
      chunks.push(new Uint8Array(head.buffer), name, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true);
      cd.setUint16(12, dosTime, true);
      cd.setUint16(14, dosDate, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint16(30, 0, true);
      cd.setUint16(32, 0, true);
      cd.setUint16(34, 0, true);
      cd.setUint16(36, 0, true);
      cd.setUint32(38, 0, true);
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    end.setUint16(20, 0, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  const xmlEsc = (s) =>
    String(s == null ? '' : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = (i) => {
    let s = '';
    i += 1;
    while (i > 0) {
      const m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  };

  /**
   * rows: mảng các dòng; ô là chuỗi hoặc số. Dòng 1 là tiêu đề (in đậm).
   * opts.boldRows: chỉ số các dòng in đậm thêm; opts.widths: độ rộng cột.
   */
  function buildXlsx(sheetName, rows, opts) {
    const bold = new Set([0].concat((opts && opts.boldRows) || []));
    const widths = (opts && opts.widths) || [];
    const sheetRows = rows
      .map((r, ri) => {
        const cells = r
          .map((v, ci) => {
            if (v === '' || v == null) return '';
            const ref = `${colName(ci)}${ri + 1}`;
            if (typeof v === 'number' && isFinite(v)) {
              return `<c r="${ref}" s="${bold.has(ri) ? 3 : 2}"><v>${v}</v></c>`;
            }
            return `<c r="${ref}" t="inlineStr"${bold.has(ri) ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
          })
          .join('');
        return `<row r="${ri + 1}">${cells}</row>`;
      })
      .join('');
    const cols = widths.length
      ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      : '';
    const NS = 'http://schemas.openxmlformats.org';
    const files = [
      {
        name: '[Content_Types].xml',
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      },
      {
        name: '_rels/.rels',
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      },
      {
        name: 'xl/workbook.xml',
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      },
      {
        name: 'xl/styles.xml',
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}/spreadsheetml/2006/main">${cols}<sheetData>${sheetRows}</sheetData></worksheet>`,
      },
    ];
    return zipStore(files);
  }

  function download(blob, filename) {
    if (IS_DEMO) {
      toast('Bản demo không tải được file. Trên WordPress nút này tải file Excel về máy.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  }

  function exportJobs() {
    const p = period(state.fin.mode, state.fin.anchor);
    const jobs = itemsIn('jobs', p.from, p.to);
    const s = sumJobs(jobs);
    const rows = [['Ngày', 'Thứ', 'Bắt đầu', 'Kết thúc', 'Công việc', 'Loại job', 'Khách hàng', 'Địa điểm', 'Giá trị (đ)', 'Đã thu (đ)', 'Còn nợ (đ)', 'Ghi chú']];
    jobs.forEach((j) => {
      const d = parseYmd(j.date);
      rows.push([fmtDMY(d), DOW_LONG[d.getDay()], j.start, j.end, j.title, j.type, j.client, j.location, j.amount, Math.min(j.paid, j.amount), Math.max(0, j.amount - j.paid), j.note]);
    });
    rows.push([]);
    rows.push([`Tổng ${p.title}`, '', '', '', `${s.count} job`, '', '', '', s.total, s.paid, s.debt, '']);
    const blob = buildXlsx('Tài chính', rows, { boldRows: [rows.length - 1], widths: [12, 10, 9, 9, 30, 16, 22, 28, 14, 14, 14, 30] });
    download(blob, `tai-chinh-${p.from}_${p.to}.xlsx`);
  }

  function exportWorkouts() {
    const p = period(state.health.mode, state.health.anchor);
    const list = itemsIn('workouts', p.from, p.to);
    const s = sumWorkouts(list);
    const label = { planned: 'Kế hoạch', done: 'Đã tập', skipped: 'Bỏ lỡ' };
    const rows = [['Ngày', 'Thứ', 'Bắt đầu', 'Môn', 'Buổi tập', 'Nhóm cơ', 'Thời lượng (phút)', 'Trạng thái', 'Ghi chú']];
    list.forEach((w) => {
      const d = parseYmd(w.date);
      rows.push([fmtDMY(d), DOW_LONG[d.getDay()], w.start, w.sport, w.title, w.muscles.join(', '), w.duration, label[w.status] || w.status, w.note]);
    });
    rows.push([]);
    rows.push([`Tổng ${p.title}`, '', '', '', `${s.done} buổi đã tập`, '', s.minutes, `${fmtHours(s.minutes)}`, '']);
    const blob = buildXlsx('Sức khỏe', rows, { boldRows: [rows.length - 1], widths: [12, 10, 9, 12, 26, 26, 16, 12, 30] });
    download(blob, `suc-khoe-${p.from}_${p.to}.xlsx`);
  }

  /* ================================================================
   * Thông báo nhỏ
   * ================================================================ */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#ltp-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2800);
  }

  /* ================================================================
   * Xử lý thao tác
   * ================================================================ */
  const ACTIONS = {
    overlay(el, e) {
      if (e.target === el) closeModal();
    },
    close: closeModal,
    'go-today'() {
      resetPeriods();
      render();
    },
    nav(el) {
      const dir = +el.dataset.dir;
      const sc = el.dataset.scope;
      if (sc === 'work') state.workWeek = addDays(state.workWeek, 7 * dir);
      if (sc === 'train') state.trainWeek = addDays(state.trainWeek, 7 * dir);
      if (sc === 'fin') state.fin.anchor = shiftAnchor(state.fin.mode, state.fin.anchor, dir);
      if (sc === 'health') state.health.anchor = shiftAnchor(state.health.mode, state.health.anchor, dir);
      render();
    },
    'nav-today'(el) {
      const ws = startOfWeek(today());
      if (el.dataset.scope === 'work') state.workWeek = ws;
      if (el.dataset.scope === 'train') state.trainWeek = ws;
      render();
    },
    mode(el) {
      const cfg = el.dataset.scope === 'fin' ? state.fin : state.health;
      const mode = el.dataset.mode;
      if (cfg.mode === mode) return;
      // Giữ kỳ đang xem: tháng → tuần đầu của tháng (hoặc tuần này nếu là tháng hiện tại).
      const t = today();
      if (mode === 'week') {
        const inMonth = cfg.anchor.getFullYear() === t.getFullYear() && cfg.anchor.getMonth() === t.getMonth();
        cfg.anchor = startOfWeek(inMonth ? t : cfg.anchor);
      } else {
        cfg.anchor = startOfMonth(cfg.anchor);
      }
      cfg.mode = mode;
      render();
    },
    'fin-month'(el) {
      state.fin.anchor = new Date(state.fin.anchor.getFullYear(), +el.dataset.key, 1);
      render();
    },
    'health-month'(el) {
      state.health.anchor = new Date(state.health.anchor.getFullYear(), +el.dataset.key, 1);
      render();
    },
    'new-job'(el) {
      openJob(newJobDefaults(el.dataset.date));
    },
    'new-workout'(el) {
      openWorkout(newWorkoutDefaults(el.dataset.date));
    },
    'edit-job'(el) {
      const it = findItem('jobs', el.dataset.id);
      if (it) openJob(Object.assign({}, it));
    },
    'edit-workout'(el) {
      const it = findItem('workouts', el.dataset.id);
      if (it) openWorkout(Object.assign({}, it, { muscles: it.muscles.slice() }));
    },
    'toggle-done'(el) {
      const it = findItem('workouts', el.dataset.id);
      if (!it) return;
      const done = it.status !== 'done';
      quickUpdate('workouts', it.id, { status: done ? 'done' : 'planned' }, done ? 'Đã đánh dấu: đã tập' : 'Đã chuyển về kế hoạch');
    },
    'mark-paid'(el) {
      const it = findItem('jobs', el.dataset.id);
      if (it) quickUpdate('jobs', it.id, { paid: it.amount }, `Đã ghi nhận thu đủ ${money(it.amount)}`);
    },
    goals: openGoals,
    delete: deleteItem,
    'paid-preset'(el) {
      const form = el.closest('form');
      const amount = digits(form.elements.amount.value);
      const v = Math.round((amount * +el.dataset.v) / 100);
      form.elements.paid.value = v ? NF.format(v) : '';
    },
    'pick-sport'(el) {
      const form = el.closest('form');
      form.elements.sport.value = el.dataset.v;
      syncPickers(form);
    },
    'pick-muscle'(el) {
      const form = el.closest('form');
      const set = new Set(form.elements.muscles.value.split(',').filter(Boolean));
      if (set.has(el.dataset.v)) set.delete(el.dataset.v);
      else set.add(el.dataset.v);
      form.elements.muscles.value = MUSCLES.filter((m) => set.has(m)).concat([...set].filter((m) => !MUSCLES.includes(m))).join(',');
      syncPickers(form);
    },
    'pick-status'(el) {
      const form = el.closest('form');
      form.elements.status.value = el.dataset.v;
      form.dataset.statusTouched = '1';
      syncPickers(form);
    },
    'pick-dur'(el) {
      const form = el.closest('form');
      form.elements.duration.value = el.dataset.v;
      syncPickers(form);
    },
    'wo-template'(el) {
      const form = el.closest('form');
      const tp = TEMPLATES[+el.dataset.i];
      if (!tp) return;
      form.elements.sport.value = tp.sport;
      form.elements.muscles.value = tp.muscles.join(',');
      form.elements.title.value = tp.title;
      form.elements.duration.value = tp.duration;
      syncPickers(form);
    },
    'export-jobs': exportJobs,
    'export-workouts': exportWorkouts,
    print() {
      if (IS_DEMO) {
        toast('Bản demo không in được. Trên WordPress nút này mở hộp thoại In / Lưu PDF.');
        return;
      }
      window.print();
    },
    logout(el, e) {
      if (!IS_DEMO) return; // WordPress: để link đăng xuất chạy bình thường.
      e.preventDefault();
      storage.set('ltp_demo_login', '0');
      demoLoggedIn = false;
      closeModal();
      renderDemoAuth();
    },
    'demo-reset'() {
      if (!api.reset) return;
      api.reset();
      store.years = {};
      api.getSettings().then((s) => {
        state.settings = Object.assign(state.settings, s);
        resetPeriods();
        render();
        toast('Đã đặt lại dữ liệu mẫu');
      });
    },
  };

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = ACTIONS[el.dataset.action];
    if (!fn) return;
    if (el.tagName === 'A' && el.dataset.action !== 'logout') e.preventDefault();
    fn(el, e);
  });

  root.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#ltp-modal') && $('#ltp-modal').innerHTML) closeModal();
  });

  root.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.matches('form[data-form]')) {
      e.preventDefault();
      submitForm(form);
    } else if (IS_DEMO && form.matches('.ltp-auth form')) {
      e.preventDefault();
      storage.set('ltp_demo_login', '1');
      demoLoggedIn = true;
      bootApp();
    }
  });

  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('input[data-money]')) {
      const n = digits(el.value);
      el.value = n ? NF.format(n) : '';
    }
    if (el.name === 'duration' && el.form && el.form.dataset.form === 'workouts') syncPickers(el.form);
  });

  root.addEventListener('change', (e) => {
    const el = e.target;
    const form = el.form;
    // Buổi tập mới: ngày đã qua → mặc định "Đã tập", hôm nay/tương lai → "Kế hoạch".
    if (form && form.dataset.form === 'workouts' && el.name === 'date' && form.dataset.statusTouched !== '1' && el.value) {
      form.elements.status.value = el.value < ymd(today()) ? 'done' : 'planned';
      syncPickers(form);
    }
  });

  window.addEventListener('hashchange', () => {
    const t = tabByHash((location.hash || '').slice(1));
    if (t && t !== state.tab && document.getElementById('ltp-view')) {
      state.tab = t;
      closeModal();
      render();
      window.scrollTo(0, 0);
    }
  });

  /* ================================================================
   * Khởi động
   * ================================================================ */
  let demoLoggedIn = storage.get('ltp_demo_login') !== '0';

  function renderDemoAuth() {
    clearInterval(clockTimer);
    const ic = (n) => icon(n);
    root.innerHTML = `<div class="ltp-auth" data-tab="login">
      <div class="ltp-auth-card">
        <aside class="ltp-auth-side">
          <div class="ltp-eyebrow">${esc(CFG.brand)}</div>
          <h2 class="ltp-auth-title">Lịch làm việc, thu nhập và lịch tập ở cùng một chỗ.</h2>
          <ul class="ltp-auth-points">
            <li><span class="ltp-auth-ic">${ic('work')}</span><div><b>Lịch làm việc theo tuần</b><span>Hôm nay làm ở đâu, mấy giờ, kiếm được bao nhiêu.</span></div></li>
            <li><span class="ltp-auth-ic">${ic('chart')}</span><div><b>Báo cáo tài chính</b><span>Tổng giá trị job, đã thu, công nợ theo tuần và tháng.</span></div></li>
            <li><span class="ltp-auth-ic">${ic('dumbbell')}</span><div><b>Lịch tập &amp; sức khỏe</b><span>Môn tập, nhóm cơ, số buổi và số giờ tập mỗi tuần.</span></div></li>
          </ul>
        </aside>
        <section class="ltp-auth-main">
          <p class="ltp-auth-notice">Bản demo: nhập gì cũng được, bấm Đăng nhập để vào.</p>
          <div class="ltp-seg ltp-auth-tabs" role="tablist">
            <button type="button" role="tab" data-auth-tab="login">Đăng nhập</button>
            <button type="button" role="tab" data-auth-tab="register">Đăng ký</button>
          </div>
          <form class="ltp-form ltp-auth-pane" data-pane="login">
            <div class="ltp-field"><label for="ltp-login-user">Email hoặc tên đăng nhập</label><input id="ltp-login-user" type="text" autocomplete="username" value="phuoc@example.com"></div>
            <div class="ltp-field"><label for="ltp-login-pass">Mật khẩu</label><div class="ltp-pass"><input id="ltp-login-pass" type="password" autocomplete="current-password" value="demo1234"><button type="button" class="ltp-pass-toggle" data-toggle-pass>Hiện</button></div></div>
            <div class="ltp-row-between"><label class="ltp-check"><input type="checkbox" checked> Ghi nhớ đăng nhập</label><a href="#tong-quan">Quên mật khẩu?</a></div>
            <button class="ltp-btn ltp-btn--dark ltp-btn--block" type="submit">Đăng nhập</button>
          </form>
          <form class="ltp-form ltp-auth-pane" data-pane="register">
            <div class="ltp-field"><label for="ltp-reg-name">Họ và tên</label><input id="ltp-reg-name" type="text" autocomplete="name" placeholder="VD: Lê Hữu Phước"></div>
            <div class="ltp-field"><label for="ltp-reg-email">Email</label><input id="ltp-reg-email" type="email" autocomplete="email"></div>
            <div class="ltp-field"><label for="ltp-reg-pass">Mật khẩu (ít nhất 6 ký tự)</label><div class="ltp-pass"><input id="ltp-reg-pass" type="password" autocomplete="new-password"><button type="button" class="ltp-pass-toggle" data-toggle-pass>Hiện</button></div></div>
            <button class="ltp-btn ltp-btn--dark ltp-btn--block" type="submit">Tạo tài khoản</button>
            <p class="ltp-auth-foot">Miễn phí. Dữ liệu của bạn chỉ mình bạn xem được.</p>
          </form>
        </section>
      </div>
    </div>`;
  }

  async function bootApp() {
    state.tab = tabByHash((location.hash || '').slice(1)) || tabByHash(root.dataset.tab || '') || 'home';
    renderShell();
    startClock();
    try {
      const s = await api.getSettings();
      state.settings = Object.assign(state.settings, s || {});
    } catch (e) {
      /* dùng mục tiêu mặc định */
    }
    render();
  }

  if (IS_DEMO && !demoLoggedIn) renderDemoAuth();
  else bootApp();
})();
