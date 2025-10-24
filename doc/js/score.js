// score.js
// スコア算出＆スコアフッター（data-show-scores と state.step で可視制御）
// - クイズ中(step===1)かつ <body data-show-scores="true"> のときだけ表示
// - 結果画面では app.js 側が applyFooterVisibility(false) を呼ぶ

(function(){
  // ---- utils ----
  const $ = s => document.querySelector(s);

  function baseScore(){
    return {SOUL:0,BOLD:0,PURE:0,VIBE:0,CALM:0,WILD:0};
  }

  // ---- DOM構築 ----
  function initFooter(){
    const scoreGrid = $('#scoreGrid');
    if(!scoreGrid) return;
    scoreGrid.innerHTML = '';
    ['SOUL','BOLD','PURE','VIBE','CALM','WILD'].forEach(code=>{
      const item = document.createElement('div');
      item.className = 'score-item';
      item.innerHTML = `
        <div class="score-label">${code}</div>
        <div class="score-bar"><div class="score-fill" data-code="${code}"></div></div>
        <div class="score-num" data-num="${code}">0</div>`;
      scoreGrid.appendChild(item);
    });
  }

  // ---- 表示/非表示（boolean専用） ----
  function applyFooterVisibility(show){
    const footer = document.getElementById('score-footer');
    if(!footer) return;
    footer.classList.toggle('hidden', !show);
  }

  // ---- 表示可否の判定 ----
  function computeShouldShow(state){
    // HTML属性の真偽
    const attr = (document.body?.dataset?.showScores || 'false') === 'true';
    // state が渡っていない/不正なら安全側で false
    if(!state || typeof state.step !== 'number') return false;
    // クイズ中だけ true
    return Boolean(attr && state.step === 1);
  }

  // ---- 可視性更新（state または boolean どちらでもOKにしておく）----
  function updateFooterVisibility(arg){
    // 後方互換：true/false 直接渡されたらその値で表示
    if(typeof arg === 'boolean'){
      applyFooterVisibility(arg);
      return;
    }
    // 通常運用：state を受け取り判定
    const state = arg;
    applyFooterVisibility( computeShouldShow(state) );
  }

  // ---- スコア計算 ----
  function computeScores(state, DATA, partial=false){
    const {QUESTIONS, TWEAKS} = DATA;
    const score = baseScore();
    const lastIdx = partial ? state.qi : (QUESTIONS.length - 1);

    // 質問スコア
    state.answers.forEach((ans, i)=>{
      if(ans===null || i>lastIdx) return;
      QUESTIONS[i].options[ans].scores.forEach(k=> score[k]=(score[k]||0)+1 );
    });

    // プロフィール補正
    const {age, gender, likes=[]} = state.profile;
    if(age && TWEAKS?.age?.[age]) Object.entries(TWEAKS.age[age]).forEach(([k,v])=>score[k]+=v);
    if(gender && TWEAKS?.gender?.[gender]) Object.entries(TWEAKS.gender[gender]).forEach(([k,v])=>score[k]+=v);
    likes.forEach(l=>{ if(TWEAKS?.likes?.[l]) Object.entries(TWEAKS.likes[l]).forEach(([k,v])=>score[k]+=v); });

    return score;
  }

  // ---- スコアバー更新 ----
  function updateFooter(score){
    const codes = Object.keys(baseScore());
    const vals = codes.map(c=>score[c]||0);
    const max = Math.max(1, ...vals);
    codes.forEach(c=>{
      const v = score[c]||0;
      const w = Math.round(v/max*100);
      const bar = document.querySelector(`.score-fill[data-code="${c}"]`);
      const num = document.querySelector(`.score-num[data-num="${c}"]`);
      if(bar) bar.style.width = w + '%';
      if(num) num.textContent = v;
    });
  }

  // ---- 公開API ----
  window.Score = {
    initFooter,
    applyFooterVisibility,   // boolean専用
    updateFooterVisibility,  // state(推奨) or boolean(互換)
    computeScores,
    updateFooter
  };
})();
