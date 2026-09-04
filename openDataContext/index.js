const style = require('./style');
const RankEngine = require('./engine');

const env = GameGlobal.wx || GameGlobal.tt || GameGlobal.swan;

// rkstage 是微信小游戏后台申请的排行榜唯一 ID，主域会上报今日最好关卡到这个 key。
const DEFAULT_RANK_KEY = 'rkstage';

function showRankList(key, page) {
    const rankKey = key || DEFAULT_RANK_KEY;
    const rankPage = Math.max(1, Number(page || 1));
    console.log('[OpenData] show rank:', rankKey, 'page:', rankPage);

    env.getFriendCloudStorage({
        keyList: [rankKey],
        success: function (res) {
            const rankData = RankEngine.normalizeRankData(res.data || [], rankKey);
            RankEngine.drawLeaderboard(rankData, style, rankPage);
        },
        fail: function (err) {
            console.log('[OpenData] getFriendCloudStorage fail:', err);
            RankEngine.clear();
        },
    });
}

env.onMessage(function (data) {
    if (!data) return;

    // 保留旧协议：RankPanel 里当前发送的是 { type:'engine', event:'level' }
    if (data.type !== 'engine' && data.type !== 'rank') {
        return;
    }
	console.log(data.event);
    switch (data.event || data.command) {
        case 'viewport':
            RankEngine.setViewPort(data);
            RankEngine.redraw();
            break;

        case 'level':
        case 'show':
        case 'showRank':
        case 'page':
            showRankList(data.key || DEFAULT_RANK_KEY, data.page || 1);
            break;

        case 'clear':
            RankEngine.clear();
            console.log("清理榜单");
            break;

        default:
            showRankList(DEFAULT_RANK_KEY, data.page || 1);
            break;
    }
});
