// ui.js
// 汎用UIユーティリティ（$,$$,on）と、プロフィール入力UI生成

(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function on(id, handler){
    const el = typeof id === 'string' ? $(id) : id;
    if(el) el.onclick = handler;
    return el;
  }

  function chipGroup(containerId, items, multi=false, onChange=()=>{}){
    const el = document.getElementById(containerId); if(!el) return;
    el.innerHTML = "";
    items.forEach(txt=>{
      const c = document.createElement('div');
      c.className = 'chip'; c.textContent = txt;
      c.onclick = ()=>{
        if(multi){ c.classList.toggle('active'); }
        else{ Array.from(el.querySelectorAll('.chip')).forEach(x=>x.classList.remove('active')); c.classList.add('active'); }
        onChange();
      };
      el.appendChild(c);
    });
  }

  function collectProfile(state){
    state.profile.nick = document.getElementById('nick')?.value.trim() || '';
    const g = document.querySelector('#gender-chips .chip.active');
    const a = document.querySelector('#age-chips .chip.active');
    const l = Array.from(document.querySelectorAll('#like-chips .chip.active'));
    state.profile.gender = g ? g.textContent : null;
    state.profile.age = a ? a.textContent : null;
    state.profile.likes = l.map(x=>x.textContent);
  }

  function renderQuestion(state, DATA){
    const q = DATA.QUESTIONS[state.qi];
    document.getElementById('qTitle').textContent = q.title;
    const opts = document.getElementById('opts'); opts.innerHTML = "";
    q.options.forEach((op, idx)=>{
      const d = document.createElement('div');
      d.className = 'opt' + (state.answers[state.qi]===idx ? ' active':'');
      d.textContent = op.label;
      d.onclick = ()=>{
        state.answers[state.qi]=idx; renderQuestion(state, DATA);
        const score = window.Score.computeScores(state, DATA, true);
        window.Score.updateFooter(score);
      };
      opts.appendChild(d);
    });
    const progress = (state.qi+1)/DATA.QUESTIONS.length*100;
    document.getElementById('bar').style.width = progress+'%';
    document.getElementById('progressText').textContent = `Q${state.qi+1} / ${DATA.QUESTIONS.length}`;
    document.getElementById('remain').textContent = (DATA.QUESTIONS.length - state.qi);
    document.getElementById('nextBtn').textContent = state.qi===DATA.QUESTIONS.length-1 ? "結果を見る" : "次へ";
  }

  // 公開
  window.$ = $;
  window.$$ = $$;
  window.onEl = on;
  window.UI = { chipGroup, collectProfile, renderQuestion };
})();
