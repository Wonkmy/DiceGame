import DiceGameSave from "./DiceGameSave";
import { ConstValue } from "../Global/ConstValue";

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
                title: ConstValue.SHARE_TIMELINE_TITLE,
                query: ConstValue.SHARE_TIMELINE_QUERY,
            };
        });
    }

    static shareBestDamage() {
        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !wx.shareAppMessage) {
            return;
        }

        wx.shareAppMessage(this.getShareData());
    }

    static shareHelp(stage:number, callback:Function) {
        let shareData = {
            title: this.format(ConstValue.SHARE_HELP_TITLE, "stage", String(stage)),
            query: this.format(ConstValue.SHARE_HELP_QUERY, "stage", String(stage)),
        };

        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !wx.shareAppMessage) {
            callback && callback();
            return;
        }

        wx.shareAppMessage(shareData);
        // 微信分享回调不稳定，第一版按调起分享后给复活机会。
        setTimeout(() => {
            callback && callback();
        }, 800);
    }

    private static getShareData() {
        let damage = Math.max(DiceGameSave.currentMaxDamage, DiceGameSave.getBestDamage());
        return {
            title: this.format(ConstValue.SHARE_DAMAGE_TITLE, "damage", String(damage)),
            query: this.format(ConstValue.SHARE_DAMAGE_QUERY, "damage", String(damage)),
        };
    }

    private static format(content:string, key:string, value:string):string{
        return content.split("{" + key + "}").join(value);
    }
}
