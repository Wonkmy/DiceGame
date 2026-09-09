const style = require('./style');
const RankEngine = require('./engine');

const env = GameGlobal.wx || GameGlobal.tt || GameGlobal.swan;

// rkstage 是微信小游戏后台申请的排行榜唯一 ID，主域会上报今日最好关卡到这个 key。
const DEFAULT_RANK_KEY = 'rkstage';

function reportHelpFriendInteractive(data) {
    if (!env || !env.modifyFriendInteractiveStorage) {
        console.log('[OpenData] modifyFriendInteractiveStorage not support');
        return;
    }

    try {
        env.modifyFriendInteractiveStorage({
            key: String(data.key || '1'),
            opNum: 1,
            operation: 'add',
            quiet: true,
            title: '好友助战成功，快回来再冲一把',
            success: function (res) {
                console.log('[OpenData] help interactive success:', res);
            },
            fail: function (err) {
                console.log('[OpenData] help interactive fail:', err);
            },
            complete: function (res) {
                console.log('[OpenData] help interactive complete:', res);
            },
        });
    } catch (e) {
        console.log('[OpenData] help interactive error:', e);
    }
}

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
            // 隐私声明未完成时这里会稳定失败，提审前不把错误暴露到控制台。
            // console.log('[OpenData] getFriendCloudStorage fail:', err);
            // 隐私声明或后台排行榜未配置时，接口会失败；直接显示开发中，避免玩家看到空白或报错。
            RankEngine.drawMessage('功能开发中', style);
        },
    });
}

env.onMessage(function (data) {
    if (!data) return;

    // 好友从助战分享卡片进入后，主域通知开放数据域写入互动数据，用于触发关系链互动提醒。
    if (data.type === 'interactive') {
        switch (data.event) {
            case 'helpFriend':
                reportHelpFriendInteractive(data);
                break;
            default:
                break;
        }
        return;
    }

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
