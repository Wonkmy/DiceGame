declare const wx: any;

export class Advertise {
    private static videoAd: any = null;
    private static chaPingAd: any = null;

    // 广告位先留空，上线前替换成微信后台真实广告ID。
    private static readonly VIDEO_ID = "";
    private static readonly CHAPING_ID = "";

    static init() {
        this.initVideoAd();
        this.initChapingAd();
    }

    static initVideoAd() {
        if (!this.canUseWechatAd() || !this.VIDEO_ID || !wx.createRewardedVideoAd) {
            return;
        }

        try {
            this.videoAd = wx.createRewardedVideoAd({
                adUnitId: this.VIDEO_ID,
            });
            if(this.videoAd.onError){
                this.videoAd.onError((err: any) => {
                    console.log("视频广告拉取失败", err);
                });
            }
        } catch (e) {
            console.log("视频广告创建失败", e);
            this.videoAd = null;
        }
    }

    static initChapingAd() {
        if (!this.canUseWechatAd() || !this.CHAPING_ID || !wx.createInterstitialAd) {
            return;
        }

        try {
            this.chaPingAd = wx.createInterstitialAd({
                adUnitId: this.CHAPING_ID,
            });
            if(this.chaPingAd.onError){
                this.chaPingAd.onError((err: any) => {
                    console.log("插屏广告拉取失败", err);
                });
            }
        } catch (e) {
            console.log("插屏广告创建失败", e);
            this.chaPingAd = null;
        }
    }

    static showVideoAd(callback: Function) {
        if (!this.videoAd || !this.videoAd.show || !this.videoAd.onClose) {
            this.safeCallback(callback, 0);
            return;
        }

        try{
            if(this.videoAd.offClose){
                this.videoAd.offClose();
            }
            if(this.videoAd.onClose){
                this.videoAd.onClose((res: any) => {
                    if(this.videoAd && this.videoAd.offClose){
                        this.videoAd.offClose();
                    }
                    if ((res && res.isEnded) || res === undefined) {
                        this.safeCallback(callback, 1);
                    } else {
                        this.safeCallback(callback, 2);
                    }
                });
            }

            let showResult:any = this.videoAd.show();
            if(showResult && showResult.catch){
                showResult.catch(() => {
                    if(!this.videoAd || !this.videoAd.load){
                        this.safeCallback(callback, 0);
                        return;
                    }
                    let loadResult:any = this.videoAd.load();
                    if(loadResult && loadResult.then){
                        loadResult
                            .then(() => this.videoAd.show())
                            .catch(() => this.safeCallback(callback, 0));
                    }else{
                        this.safeCallback(callback, 0);
                    }
                });
            }
        }catch(e){
            console.log("视频广告展示异常", e);
            this.safeCallback(callback, 0);
        }
    }

    static showChapingAd() {
        if (!this.chaPingAd || !this.chaPingAd.show) {
            return;
        }

        try{
            let showResult:any = this.chaPingAd.show();
            if(showResult && showResult.catch){
                showResult.catch((err: any) => {
                    console.log("插屏广告展示失败", err);
                });
            }
        }catch(e){
            console.log("插屏广告展示异常", e);
        }
    }

    /**
     * 判断当前环境是否支持微信广告 API。
     * 不支持时直接跳过广告，保证结算和复活流程不被广告打断。
     */
    private static canUseWechatAd():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined";
    }

    /**
     * 安全执行广告结束回调。
     * 0 表示广告不可用/失败，1 表示完整观看，2 表示中途关闭。
     */
    private static safeCallback(callback:Function, result:number){
        if(!callback)return;

        try{
            callback(result);
        }catch(e){
            console.log("广告回调执行失败", e);
        }
    }
}
