import DiceGameSave from "./DiceGameSave";

declare const wx: any;

export default class ShareManager {
    static initShareMenu() {
        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined") {
            return;
        }

        wx.showShareMenu({
            menus: ["shareAppMessage", "shareTimeline"],
        });

        wx.onShareAppMessage(() => {
            return this.getShareData();
        });

        wx.onShareTimeline(() => {
            return {
                title: "我在《就骰这亿把》打出了最高一剑，来挑战我！",
                query: "from=timeline",
            };
        });
    }

    static shareBestDamage() {
        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !wx.shareAppMessage) {
            return;
        }

        wx.shareAppMessage(this.getShareData());
    }

    private static getShareData() {
        let damage = Math.max(DiceGameSave.currentMaxDamage, DiceGameSave.getBestDamage());
        return {
            title: `我一剑打出${damage}伤害，你能超过吗？`,
            query: `from=share&damage=${damage}`,
        };
    }
}
