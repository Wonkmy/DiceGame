import DiceGameSave from "./DiceGameSave";
import { ConstValue } from "../Global/ConstValue";

declare const wx: any;

export default class ShareManager {
    static initShareMenu() {
        if (!this.canUseWechatShare()) {
            return;
        }

        try{
            if(wx.showShareMenu){
                wx.showShareMenu({
                    menus: ["shareAppMessage", "shareTimeline"],
                });
            }

            if(wx.onShareAppMessage){
                wx.onShareAppMessage(() => {
                    return this.getShareData("menu_share");
                });
            }

            if(wx.onShareTimeline){
                wx.onShareTimeline(() => {
                    let shareData:any = {
                        title: ConstValue.SHARE_TIMELINE_TITLE,
                        query: ConstValue.SHARE_TIMELINE_QUERY,
                    };
                    this.addShareImage(shareData);
                    return shareData;
                });
            }
        }catch(e){
            console.error("初始化微信分享菜单失败:", e);
        }
    }

    static shareBestDamage() {
        if (!this.canUseWechatShare()) {
            console.log("当前环境不支持微信分享，跳过分享战绩");
            return;
        }

        try{
            DiceGameSave.recordDailyShare();
            wx.shareAppMessage(this.getShareData("share"));
        }catch(e){
            console.error("分享最高伤害失败:", e);
        }
    }

    static shareHelp(stage:number, callback:Function) {
        let shareData:any = {
            title: this.format(ConstValue.SHARE_HELP_TITLE, "stage", String(stage)),
            query: this.format(ConstValue.SHARE_HELP_QUERY, "stage", String(stage)),
        };
        this.addShareImage(shareData);

        if (!this.canUseWechatShare()) {
            console.log("当前环境不支持微信分享，本地直接走求助回调");
            DiceGameSave.recordDailyShare();
            this.safeCallback(callback);
            return;
        }

        try{
            DiceGameSave.recordDailyShare();
            wx.shareAppMessage(shareData);
        }catch(e){
            console.error("分享求助失败:", e);
            this.safeCallback(callback);
            return;
        }
        // 微信分享回调不稳定，第一版按调起分享后给复活机会。
        setTimeout(() => {
            this.safeCallback(callback);
        }, 800);
    }

    static shareChallenge(callback:Function) {
        let shareData:any = {
            title: ConstValue.SHARE_CHALLENGE_TITLE,
            query: ConstValue.SHARE_CHALLENGE_QUERY,
        };
        this.addShareImage(shareData);

        if (!this.canUseWechatShare()) {
            console.log("当前环境不支持微信分享，本地直接走补次数回调");
            DiceGameSave.recordDailyShare();
            this.safeCallback(callback);
            return;
        }

        try{
            DiceGameSave.recordDailyShare();
            wx.shareAppMessage(shareData);
        }catch(e){
            console.error("分享挑战失败:", e);
            this.safeCallback(callback);
            return;
        }
        // 微信无法稳定确认是否真的分享成功，第一版按调起分享后给额外挑战机会。
        setTimeout(() => {
            this.safeCallback(callback);
        }, 800);
    }

    /**
     * 从指定界面主动分享游戏。
     * 只改 query 来源，方便后面在微信后台区分首页、战斗和结算分享。
     */
    static shareFromScene(scene:string) {
        if (!this.canUseWechatShare()) {
            console.log("当前环境不支持微信分享，跳过主动分享");
            return;
        }

        try{
            DiceGameSave.recordDailyShare();
            wx.shareAppMessage(this.getShareData(scene));
        }catch(e){
            console.error("主动分享失败:", e);
        }
    }

    /**
     * 判断当前环境是否可以调用微信分享 API。
     * 只做平台能力判断，避免浏览器/本地调试环境调用 wx 导致主流程中断。
     */
    private static canUseWechatShare():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.shareAppMessage;
    }

    /**
     * 安全执行分享后的业务回调。
     * 分享 API 失败不能阻断复活、补次数等主流程。
     */
    private static safeCallback(callback:Function){
        if(!callback)return;

        try{
            callback();
        }catch(e){
            console.error("分享回调执行失败:", e);
        }
    }

    private static getShareData(from:string = "share") {
        let damage = Math.max(DiceGameSave.currentMaxDamage, DiceGameSave.getBestDamage());
        let stage = Math.max(DiceGameSave.getTodayBestStage(), DiceGameSave.getBestStage());
        let percent = DiceGameSave.getRegionOvertakePercent(stage);
        let title = this.format(ConstValue.SHARE_RESULT_TITLE, "stage", String(stage));
        title = this.format(title, "percent", String(percent));
        let query = this.format(ConstValue.SHARE_RESULT_QUERY, "stage", String(stage));
        query = this.format(query, "damage", String(damage));
        query += "&scene=" + from;

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
        let imageUrl:string = this.getRandomShareImageUrl();
        if(imageUrl && imageUrl.length > 0){
            shareData.imageUrl = imageUrl;
        }
    }

    /**
     * 随机获取分享图。
     * 优先使用图片池；如果图片池为空，再兼容旧版单张分享图配置。
     */
    private static getRandomShareImageUrl():string{
        let urls:string[] = ConstValue.SHARE_CARD_IMAGE_URLS || [];
        if(urls.length > 0){
            let index:number = Math.floor(Math.random() * urls.length);
            return urls[index];
        }

        return ConstValue.SHARE_CARD_IMAGE_URL;
    }
}
