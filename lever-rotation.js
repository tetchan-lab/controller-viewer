// lever-rotation.js
// URLパラメータ rotate=90/180/270 でレバー軸を回転（縦置きアケコン対応）
// 使用例: index.html?controller=fightingStickMini&rotate=270
// index.htmlのscriptタグでconfig.jsの前に読み込んでください

(function() {
    if (typeof FIGHTING_STICK_MINI_CONFIG === 'undefined') {
        console.warn('[lever-rotation] FIGHTING_STICK_MINI_CONFIGが未定義のため終了');
        return;
    }
    
    function getQueryParams() {
        const params = {};
        location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(_, key, value) {
            params[key] = decodeURIComponent(value);
        });
        return params;
    }
    
    const params = getQueryParams();
    
    // レバー軸の回転
    if (params.rotate) {
        const angle = parseInt(params.rotate, 10);
        const lever = FIGHTING_STICK_MINI_CONFIG.sticks.find(s => s.id === 'Lever');
        
        if (lever) {
            lever.rotateAngle = angle;
            console.log(`[lever-rotation] レバー軸を${angle}度回転します`);
        } else {
            console.warn('[lever-rotation] Leverスティックが見つかりません');
        }
    }
})();
