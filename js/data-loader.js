// data-loader.js
// すべての JSON を読み込んで window.DATA に格納

(function(){
  async function loadJSON(path){
    const res = await fetch(path, {cache:'no-store'});
    if(!res.ok) throw new Error(`${path} 読み込み失敗 (${res.status})`);
    return res.json();
  }

  async function loadAll(){
    const base = './data';
    const [
      meta, profile, types, wines, questions, tweaks, themes
    ] = await Promise.all([
      loadJSON(`${base}/meta.json`),
      loadJSON(`${base}/profile.json`),
      loadJSON(`${base}/types.json`),
      loadJSON(`${base}/wines.json`),
      loadJSON(`${base}/questions.json`),
      loadJSON(`${base}/profileTweaks.json`),
      loadJSON(`${base}/themes.json`)
    ]);
    window.DATA = { META:meta, PROFILE:profile, TYPES:types, WINES:wines, QUESTIONS:questions, TWEAKS:tweaks, THEMES:themes };
    return window.DATA;
  }

  // グローバル公開
  window.loadAll = loadAll;
})();
