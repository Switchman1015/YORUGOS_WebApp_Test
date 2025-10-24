// app.js
// フロー制御、テーマ適用、結果描画、フェイルオーバー、防御

// ---- Safety shim: Score が未定義でも落ちないように（本番保険） ----
(function(){
  if(!window.Score){
    console.warn('[Pairin] Score module not found. Using fallback shim. Check script order or path.');
    const noop = ()=>{};
    window.Score = {
      initFooter: noop,
      applyFooterVisibility: noop,
      updateFooterVisibility: noop,
      updateFooter: noop,
      computeScores: ()=>({SOUL:0,BOLD:0,PURE:0,VIBE:0,CALM:0,WILD:0})
    };
  }
})();

(function(){
  const $  = window.$;
  const on = window.onEl;

  // iOSダブルタップ拡大抑止
  document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});
  (function preventDoubleTap(){
    let last = 0;
    document.addEventListener('touchend', e=>{
      const now = Date.now();
      if(now - last <= 300){ e.preventDefault(); }
      last = now;
    }, {passive:false});
  })();

  // ステップ定義
  const STEP = { PROFILE:0, QUIZ:1, RESULT:2 };

  // アプリ状態
  const state = {
    profile:{ nick:"", gender:null, age:null, likes:[] },
    step: STEP.PROFILE,
    qi: 0,
    answers: []
  };
  // デバッグしやすいように
  window.state = state;

  /* =========================
     テーマ適用 & ユーティリティ
     ========================= */
  function applyResultTheme(typeCode, wine){
    const { THEMES } = window.DATA || {};
    const tTheme = THEMES?.types?.[typeCode] || {};
    const gTheme = THEMES?.groups?.[wine?.group] || {};
    const theme = { ...gTheme, ...tTheme };
    const root = document.documentElement;

    if(theme.accent)  root.style.setProperty('--accent', theme.accent);
    if(theme.accent2) root.style.setProperty('--accent2', theme.accent2);
    if(theme.brand)   root.style.setProperty('--brand', theme.brand);
    if(theme.bg)      document.body.style.background = theme.bg;

    const tag = document.getElementById('resultHeroTag');
    const sub = document.getElementById('resultHeroSub');
    if(tag) tag.textContent = `TYPE: ${typeCode || '—'}`;

    if(sub){
      // タイプの一言要約（types.json の one）を表示。なければ空。
      const t = Array.isArray(window.DATA?.TYPES)
        ? window.DATA.TYPES.find(x => x.code === typeCode)
        : null;
      sub.textContent = t?.one || '';
    }
  }

  function cleanName(name){ return (name||'').replace(/\s*（.*?）\s*$/,''); }

  /* ==============
     結果描画
     ============== */
  function renderResult(typeCode, wine){
    const { TYPES, META } = window.DATA || {};

    // ステップを結果へ
    state.step = STEP.RESULT;

    // 画面切替
    $('#step-loading')?.classList.add('hidden');
    $('#step-result')?.classList.remove('hidden');

    // 結果ではスコアフッターを必ず隠す
    window.Score.applyFooterVisibility(false);

    // テーマ
    applyResultTheme(typeCode, wine || null);

    // テキスト反映
    const t = Array.isArray(TYPES) ? TYPES.find(x=>x.code===typeCode) : null;
    $('#typeLine').textContent = `あなたのタイプ：${t?.code || '—'}（${t?.one || '好みに寄り添うタイプ'}）`;

    $('#wineFlag').textContent = wine?.flag || "🍷";
    $('#wineName').textContent = cleanName(wine?.name || 'おすすめのワイン');
    $('#wineCountryPill').textContent = wine?.country || '—';
    $('#wineGroupPill').textContent  = wine?.group || '—';
    $('#wineNotes').textContent = wine?.notes || '';
    $('#winePair').textContent  = wine?.pair || '';
    $('#wineScene').textContent = wine?.scene || '';

    const d = wine?.detail || {};
    const map = {
      detailRegion: d.region, detailCulture: d.culture, detailGrape: d.grape,
      detailMaking: d.making, detailServe: d.serve, detailStory: d.story
    };
    Object.entries(map).forEach(([id, txt])=>{
      const el = document.getElementById(id);
      if(el) el.textContent = txt || '';
    });

    // 詳細トグル
    const moreBtn = document.getElementById('moreBtn');
    const more    = document.getElementById('moreDetails');
    if(moreBtn && more){
      moreBtn.onclick = ()=>{
        const open = more.classList.toggle('hidden')===false;
        moreBtn.textContent = open ? '閉じる' : '詳しく見る';
      };
    }

    // 結果アクション（インライン案内ブロック）
    const resultBar = document.getElementById('result-bar');
    if(resultBar){
      resultBar.classList.remove('hidden');
      // 見落とし防止：初回6秒だけハイライト
      resultBar.classList.add('highlight');
      setTimeout(()=> resultBar.classList.remove('highlight'), 6000);
    }

    // 今すぐ買う（ワイン個別URL優先、なければ meta.buyBaseUrl → 既定）
    const buyBtn = document.getElementById('buyBtn');
    if(buyBtn){
      const url = (wine && wine.url) ? wine.url : (META?.buyBaseUrl || 'https://oinos.jp');
      buyBtn.setAttribute('href', url);
    }

    // リトライ
    on('#retry2', clickRetry);
  }

  /* ==============
     結果計算
     ============== */
  function failoverResult(reason){
    console.error('[Pairin] Result failover:', reason);
    const safeType = (window.DATA?.TYPES && window.DATA.TYPES[0]) ? window.DATA.TYPES[0].code : 'SOUL';
    const safeWine = (Array.isArray(window.DATA?.WINES) && window.DATA.WINES[0]) ? window.DATA.WINES[0] : {
      group: 'Light & Soft',
      covers: ['SOUL','PURE'],
      name: 'おすすめの白ワイン',
      country: 'ギリシャ',
      flag: '🇬🇷',
      notes: 'やさしく飲みやすいタイプ。',
      pair: '前菜・魚介',
      scene: 'リラックスした夜',
      detail:{region:'',culture:'',grape:'',making:'',serve:'',story:''}
    };
    try{
      renderResult(safeType, safeWine);
    }catch(e){
      console.error('[Pairin] renderResult failed in failover:', e);
      const loading = document.getElementById('step-loading');
      const result  = document.getElementById('step-result');
      if(loading) loading.classList.add('hidden');
      if(result)  result.classList.remove('hidden');
      const typeLine = document.getElementById('typeLine');
      if(typeLine) typeLine.textContent = '結果の表示に問題が発生しました（簡易表示）。もう一度お試しください。';
      const bar = document.getElementById('result-bar');
      if(bar) bar.classList.remove('hidden');
    }
  }

  function computeResult(){
    try{
      const score = window.Score.computeScores(state, window.DATA, false);
      const entries = Object.entries(score);
      const topType = entries.sort((a,b)=>b[1]-a[1])[0]?.[0];
      const wine = (Array.isArray(window.DATA.WINES) ? window.DATA.WINES.find(w=>Array.isArray(w.covers) && w.covers.includes(topType)) : null)
                || (Array.isArray(window.DATA.WINES) ? window.DATA.WINES[0] : null);

      if(!topType || !wine){
        throw new Error('topType or wine not resolved');
      }
      renderResult(topType, wine);
      window.Score.updateFooter(score);
    }catch(e){
      failoverResult(e);
    }
  }

  /* ==============
     リトライ
     ============== */
  function clickRetry(){
    state.step = STEP.PROFILE;
    state.qi   = 0;
    state.answers = Array(window.DATA.QUESTIONS.length).fill(null);

    document.getElementById('step-result')?.classList.add('hidden');
    document.getElementById('result-bar')?.classList.add('hidden');
    document.getElementById('step-profile-1')?.classList.remove('hidden');
    ['#gender-chips .chip.active','#age-chips .chip.active','#like-chips .chip.active'].forEach(sel=>{
      Array.from(document.querySelectorAll(sel)).forEach(x=>x.classList.remove('active'));
    });
    const nick = document.getElementById('nick'); if(nick) nick.value = '';

    // 背景を初期に戻す（テーマ解除）
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent2');
    document.documentElement.style.removeProperty('--brand');
    document.body.style.background = 'radial-gradient(1200px 800px at 70% -10%,#243042 0%, transparent 55%), var(--bg)';

    window.UI.collectProfile(state);

    // スコア更新＆可視性再計算（プロフィールなので非表示のはず）
    const partial = window.Score.computeScores(state, window.DATA, true);
    window.Score.updateFooter(partial);
    window.Score.updateFooterVisibility(true);

    document.getElementById('step-profile-2')?.classList.add('hidden');
    document.getElementById('step-profile-3')?.classList.add('hidden');
  }

  /* ==============
     ナビゲーション
     ============== */
  function bindNav(){
    // 入力変化
    const nick = document.getElementById('nick');
    if(nick) nick.addEventListener('input', ()=>{
      window.UI.collectProfile(state);
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#p1-next', ()=>{
      window.UI.collectProfile(state);
      document.getElementById('step-profile-1')?.classList.add('hidden');
      document.getElementById('step-profile-2')?.classList.remove('hidden');
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#p2-prev', ()=>{
      document.getElementById('step-profile-2')?.classList.add('hidden');
      document.getElementById('step-profile-1')?.classList.remove('hidden');
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#p2-next', ()=>{
      if(!state.profile.gender){
        document.getElementById('gender-chips')?.animate(
          [{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}],
          {duration:220}
        );
        return;
      }
      document.getElementById('step-profile-2')?.classList.add('hidden');
      document.getElementById('step-profile-3')?.classList.remove('hidden');
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#p3-prev', ()=>{
      document.getElementById('step-profile-3')?.classList.add('hidden');
      document.getElementById('step-profile-2')?.classList.remove('hidden');
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#to-quiz', ()=>{
      window.UI.collectProfile(state);
      if(!state.profile.age){
        document.getElementById('age-chips')?.animate(
          [{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}],
          {duration:220}
        );
        return;
      }
      document.getElementById('step-profile-3')?.classList.add('hidden');
      document.getElementById('step-quiz')?.classList.remove('hidden');

      state.step = STEP.QUIZ;
      state.qi   = 0;

      window.UI.renderQuestion(state, window.DATA);
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#prevBtn', ()=>{
      if(state.qi>0){
        state.qi--;
        window.UI.renderQuestion(state, window.DATA);
        const partial = window.Score.computeScores(state, window.DATA, true);
        window.Score.updateFooter(partial);
        window.Score.updateFooterVisibility(true);
      } else {
        document.getElementById('step-quiz')?.classList.add('hidden');
        document.getElementById('step-profile-3')?.classList.remove('hidden');
        state.step = STEP.PROFILE;
        const partial = window.Score.computeScores(state, window.DATA, true);
        window.Score.updateFooter(partial);
        window.Score.updateFooterVisibility(true);
      }
    });

    on('#toProfileBtn', ()=>{
      document.getElementById('step-quiz')?.classList.add('hidden');
      document.getElementById('step-profile-3')?.classList.remove('hidden');
      state.step = STEP.PROFILE;
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);
    });

    on('#nextBtn', ()=>{
      if(state.answers[state.qi]===null){
        document.getElementById('nextBtn')?.animate(
          [{transform:'scale(1)'},{transform:'scale(1.05)'},{transform:'scale(1)'}],
          {duration:220}
        );
        return;
      }
      if(state.qi < window.DATA.QUESTIONS.length-1){
        state.qi++;
        window.UI.renderQuestion(state, window.DATA);
        const partial = window.Score.computeScores(state, window.DATA, true);
        window.Score.updateFooter(partial);
        window.Score.updateFooterVisibility(true);
      }else{
        // 結果へ
        document.getElementById('step-quiz')?.classList.add('hidden');
        document.getElementById('step-loading')?.classList.remove('hidden');

        setTimeout(computeResult, 600);

        // 1.5秒で結果が出ない場合の保険
        setTimeout(()=>{
          const resultVisible = !document.getElementById('step-result')?.classList.contains('hidden');
          if(!resultVisible){ failoverResult('timeout fallback'); }
        }, 1500);
      }
    });

    on('#retry', clickRetry);
  }

  /* ==============
     初期化
     ============== */
  async function init(){
    try{
      // スコアフッター初期構築 & 可視性（プロフィールなので基本非表示）
      window.Score.initFooter();
      window.Score.updateFooterVisibility(true);

      // データ読込
      await window.loadAll();
      state.answers = Array((window.DATA.QUESTIONS||[]).length).fill(null);

      // チップ生成
      window.UI.chipGroup('gender-chips', window.DATA.PROFILE.genderOptions, false, ()=>{
        window.UI.collectProfile(state);
        const partial = window.Score.computeScores(state, window.DATA, true);
        window.Score.updateFooter(partial);
        window.Score.updateFooterVisibility(true);
      });
      window.UI.chipGroup('age-chips', window.DATA.PROFILE.ageOptions, false, ()=>{
        window.UI.collectProfile(state);
        const partial = window.Score.computeScores(state, window.DATA, true);
        window.Score.updateFooter(partial);
        window.Score.updateFooterVisibility(true);
      });
      window.UI.chipGroup('like-chips', window.DATA.PROFILE.likes, true, ()=>{
        window.UI.collectProfile(state);
        const partial = window.Score.computeScores(state, window.DATA, true);
        window.Score.updateFooter(partial);
        window.Score.updateFooterVisibility(true);
      });

      // 初期スコア更新
      window.UI.collectProfile(state);
      const partial = window.Score.computeScores(state, window.DATA, true);
      window.Score.updateFooter(partial);
      window.Score.updateFooterVisibility(true);

      // イベント束ね
      bindNav();

      // ウィンドウ復帰時の表示同期（属性×状態で再計算）
      window.addEventListener('focus', ()=>window.Score.updateFooterVisibility(true));
    }catch(e){
      alert(e.message || 'データ読み込みに失敗しました');
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
