// lever-rotation.js
// URLパラメータ rotate=90/180/270 でレバー軸を回転（縦置きアケコン対応）
// 使用例: index.html?controller=fightingStickMini&rotate=270
// index.htmlのscriptタグでconfig.jsの前に読み込んでください

(function() {
    // FIGHTING_STICK_MINI_CONFIG と FIGHTING_STICK_SIMPLE_CONFIG の両方をチェック
    const configs = [];
    if (typeof FIGHTING_STICK_MINI_CONFIG !== 'undefined') {
        configs.push({ name: 'FIGHTING_STICK_MINI_CONFIG', config: FIGHTING_STICK_MINI_CONFIG });
    }
    if (typeof FIGHTING_STICK_SIMPLE_CONFIG !== 'undefined') {
        configs.push({ name: 'FIGHTING_STICK_SIMPLE_CONFIG', config: FIGHTING_STICK_SIMPLE_CONFIG });
    }
    
    if (configs.length === 0) {
        console.warn('[lever-rotation] Fighting Stick設定が未定義のため終了');
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
        
        // 両方の設定に対してレバー回転を適用
        configs.forEach(({ name, config }) => {
            const lever = config.sticks.find(s => s.id === 'Lever');
            
            if (lever) {
                lever.rotateAngle = angle;
                console.log(`[lever-rotation] ${name}: レバー軸を${angle}度回転します`);
            } else {
                console.warn(`[lever-rotation] ${name}: Leverスティックが見つかりません`);
            }
        });
    }
})();
