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
        let shareData:any = {
            title: this.format(ConstValue.SHARE_HELP_TITLE, "stage", String(stage)),
            query: this.format(ConstValue.SHARE_HELP_QUERY, "stage", String(stage)),
        };
        this.addShareImage(shareData);

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

    static shareChallenge(callback:Function) {
        let shareData:any = {
            title: ConstValue.SHARE_CHALLENGE_TITLE,
            query: ConstValue.SHARE_CHALLENGE_QUERY,
        };
        this.addShareImage(shareData);

        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !wx.shareAppMessage) {
            callback && callback();
            return;
        }

        wx.shareAppMessage(shareData);
        // 微信无法稳定确认是否真的分享成功，第一版按调起分享后给额外挑战机会。
        setTimeout(() => {
            callback && callback();
        }, 800);
    }

    private static getShareData() {
        let damage = Math.max(DiceGameSave.currentMaxDamage, DiceGameSave.getBestDamage());
        let stage = Math.max(DiceGameSave.getTodayBestStage(), DiceGameSave.getBestStage());
        let percent = DiceGameSave.getRegionOvertakePercent(stage);
        let title = this.format(ConstValue.SHARE_RESULT_TITLE, "stage", String(stage));
        title = this.format(title, "percent", String(percent));
        let query = this.format(ConstValue.SHARE_RESULT_QUERY, "stage", String(stage));
        query = this.format(query, "damage", String(damage));

        let shareData:any = {
            title: title,
            query: query,
        };
        this.addShareImage(shareData);
        return shareData;
    }

    private static format(content:string, key:string, value:string):string{
        return content.split("{" + key + "}").join(value);
    }

    private static addShareImage(shareData:any){
        // 分享图统一从配置读取，后续换图不用改分享逻辑。
        if(ConstValue.SHARE_CARD_IMAGE_URL && ConstValue.SHARE_CARD_IMAGE_URL.length > 0){
            shareData.imageUrl = ConstValue.SHARE_CARD_IMAGE_URL;
        }
    }
}
