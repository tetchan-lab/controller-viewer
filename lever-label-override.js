// lever-label-override.js
// URLパラメータでFIGHTING_STICK_MINI_CONFIGのレバー設定を一時的に上書きするスクリプト
// - lever12～15: buttons配列のlabelを変更
// - rotate: レバーの入力軸を回転（90, 180, 270）
// index.htmlのscriptタグでconfig.jsの直後に読み込んでください

(function() {
    console.log('[lever-label-override] スクリプト実行開始');
    console.log('[lever-label-override] URL:', location.href);
    
    if (typeof FIGHTING_STICK_MINI_CONFIG === 'undefined') {
        console.warn('[lever-label-override] FIGHTING_STICK_MINI_CONFIGが未定義のため終了');
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
    console.log('[lever-label-override] URLパラメータ:', params);
    
    // ── ラベル上書き ──────────────────────────────────────
    const leverIndexes = [12, 13, 14, 15];
    let overrideCount = 0;
    
    console.log('[lever-label-override] 上書き前のbuttons配列（index 12-15）:');
    FIGHTING_STICK_MINI_CONFIG.buttons.forEach(btn => {
        if (leverIndexes.includes(btn.index)) {
            console.log(`  index ${btn.index}: label="${btn.label}"`);
        }
    });
    
    FIGHTING_STICK_MINI_CONFIG.buttons.forEach(btn => {
        if (leverIndexes.includes(btn.index)) {
            const paramKey = 'lever' + btn.index;
            if (params[paramKey]) {
                const oldLabel = btn.label;
                btn.label = params[paramKey];
                console.log(`[lever-label-override] ✓ index ${btn.index}: "${oldLabel}" → "${btn.label}"`);
                overrideCount++;
            }
        }
    });
    
    console.log(`[lever-label-override] ${overrideCount}個のラベルを上書きしました`);
    
    // ── レバー軸の回転 ────────────────────────────────────
    if (params.rotate) {
        const angle = parseInt(params.rotate, 10);
        const lever = FIGHTING_STICK_MINI_CONFIG.sticks.find(s => s.id === 'Lever');
        
        if (lever) {
            console.log(`[lever-label-override] レバー軸を${angle}度回転します`);
            console.log(`[lever-label-override] 回転前: axisX=${lever.axisX}, axisY=${lever.axisY}`);
            
            // 元の軸インデックスを保存（後でscript.jsで使用）
            if (!lever.originalAxisX) lever.originalAxisX = lever.axisX;
            if (!lever.originalAxisY) lever.originalAxisY = lever.axisY;
            
            // 回転角度に応じて軸マッピングを変更
            // script.jsで実際の軸値を読み取るときに変換する必要があるため、
            // 回転情報をleverオブジェクトに保存
            lever.rotateAngle = angle;
            
            console.log(`[lever-label-override] 回転情報を保存: rotateAngle=${lever.rotateAngle}`);
        } else {
            console.warn('[lever-label-override] Leverスティックが見つかりません');
        }
    }
    
    console.log('[lever-label-override] 上書き後のbuttons配列（index 12-15）:');
    FIGHTING_STICK_MINI_CONFIG.buttons.forEach(btn => {
        if (leverIndexes.includes(btn.index)) {
            console.log(`  index ${btn.index}: label="${btn.label}"`);
        }
    });
})();
