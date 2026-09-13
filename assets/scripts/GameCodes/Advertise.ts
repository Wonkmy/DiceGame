declare const wx: any;
declare const require: any;

export class Advertise {
    private static videoAd: any = null;
    private static chaPingAd: any = null;
    private static geziAd: any = null;
    private static geziShowing:boolean = false;
    private static videoShowing:boolean = false;
    private static chapingShowing:boolean = false;
    private static pendingGeziAfterChaping:boolean = false;

    // 广告位先留空，上线前替换成微信后台真实广告ID。
    private static readonly VIDEO_ID = "adunit-e079c8ce1e917b06";// 激励视频
    private static readonly CHAPING_ID = "adunit-13ff17c64e71d75b";// 插屏广告
    private static readonly gezi_ID = "adunit-ec70bdeec82aff54";// 格子广告
    private static readonly NORMAL_PANEL_CHAPING_RATE:number = 0.65;
    private static readonly RESULT_WIN_BANNER_RATE:number = 0.5;
    private static readonly RESULT_WIN_CHAPING_RATE:number = 0.2;
    private static readonly RESULT_EARLY_WIN_CHAPING_RATE:number = 0.05;
    private static readonly RESULT_FAIL_CHAPING_RATE:number = 0.2;
    private static readonly BACK_HOME_CHAPING_RATE:number = 0.8;

    static init() {
        this.initVideoAd();
        this.initChapingAd();
        this.initGeziAd();
    }

    /**
     * 进入战斗主界面时统一隐藏横幅/格子广告。
     * MainPanel 是核心操作界面，第一版不让广告遮挡战斗手感。
     */
    static hideBattleBanner(){
        this.hideGeziAd();
    }

    /**
     * 非战斗界面 onShow 时展示广告。
     * 横幅和插屏互斥，避免同一界面同时压两个广告造成打扰。
     */
    static showBannerForNormalPanel(){
        if(this.shouldBlockNewUserEarlyAds()){
            this.hideGeziAd();
            return;
        }

        if(Math.random() < this.NORMAL_PANEL_CHAPING_RATE){
            this.hideGeziAd(() => {
                this.showChapingAd();
            });
        }else{
            this.showGeziAd();
        }
    }

    /**
     * 主流程界面只展示横幅/格子，不弹插屏。
     * 主页首屏和章节选择页都属于玩家继续挑战的关键路径，不能一出现就打断。
     */
    static showGeziOnlyForFlowPanel(){
        if(this.shouldBlockNewUserEarlyAds()){
            this.hideGeziAd();
            return;
        }

        this.showGeziAd();
    }

    /**
     * 结算页广告策略。
     * 胜利/通关保护连胜爽感，失败不展示横幅，减少挫败后的遮挡。
     */
    static showResultAdsByRate(resultType:string, stageScore:number){
        if(this.shouldBlockNewUserEarlyAds()){
            this.hideGeziAd();
            return;
        }

        if(resultType === "fail"){
            this.hideGeziAd();
            if(Math.random() < this.RESULT_FAIL_CHAPING_RATE){
                this.showChapingAd();
            }
            return;
        }

        let needBanner:boolean = Math.random() < this.RESULT_WIN_BANNER_RATE;
        let chapingRate:number = resultType === "stageWin" && stageScore <= 3 ? this.RESULT_EARLY_WIN_CHAPING_RATE : this.RESULT_WIN_CHAPING_RATE;
        let needChaping:boolean = Math.random() < chapingRate;

        if(needChaping){
            // 微信不允许横幅/格子广告和插屏同时展示；两个都命中时，先插屏，关闭后再补横幅。
            this.pendingGeziAfterChaping = needBanner;
            this.showChapingAd();
            return;
        }

        if(needBanner){
            this.showGeziAd();
        }else{
            this.hideGeziAd();
        }
    }

    /**
     * 从任意界面回到主页时，有概率展示插屏广告。
     * 这里只做概率调用，插屏失败时仍然静默，不阻断回主页流程。
     */
    static showBackHomeChapingByRate(){
        if(this.shouldBlockNewUserEarlyAds()){
            this.hideGeziAd();
            return;
        }

        if(Math.random() < this.BACK_HOME_CHAPING_RATE){
            this.showChapingAd();
        }
    }

    static initGeziAd() {
        if (!this.canUseWechatAd() || !this.gezi_ID || !wx.createCustomAd) {
            return;
        }

        try {
            let systemInfo:any = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null;
            let windowWidth:number = systemInfo ? systemInfo.windowWidth : 0;
            let windowHeight:number = systemInfo ? systemInfo.windowHeight : 0;
            let adWidth:number = Math.min(350, windowWidth || 350);

            this.geziAd = wx.createCustomAd({
                adUnitId: this.gezi_ID,
                adIntervals: 30,
                // 横幅/格子广告使用微信窗口像素坐标，不能直接用 Cocos 的 cc.winSize。
                style:{
                    left: Math.max(0, (windowWidth - adWidth) / 2),
                    top: Math.max(0, windowHeight - 100),
                    width: adWidth
                }
            });
            if(this.geziAd.onError){
                this.geziAd.onError((err: any) => {
                    console.log("格子广告拉取失败", err);
                });
            }
        } catch (e) {
            console.log("格子广告创建失败", e);
            this.geziAd = null;
        }
    }

    /**
     * 展示横幅/格子广告。
     * 这里只负责广告本身显隐，具体什么时候展示由业务界面决定。
     */
    static showGeziAd(){
        if(this.shouldBlockNewUserEarlyAds()){
            this.hideGeziAd();
            return;
        }

        if(!this.geziAd || !this.geziAd.show){
            return;
        }

        if(this.videoShowing || this.chapingShowing){
            return;
        }

        try{
            this.geziShowing = true;
            let showResult:any = this.geziAd.show();
            if(showResult && showResult.catch){
                showResult.catch((err:any) => {
                    this.geziShowing = false;
                    console.log("格子广告展示失败", err);
                });
            }
        }catch(e){
            console.log("格子广告展示异常", e);
        }
    }

    /**
     * 隐藏横幅/格子广告。
     * 离开需要展示广告的界面时调用，避免广告遮挡战斗主流程。
     */
    static hideGeziAd(callback:Function = null!){
        if(!this.geziAd || !this.geziAd.hide){
            this.geziShowing = false;
            if(callback)callback();
            return;
        }

        try{
            let hideResult:any = this.geziAd.hide();
            if(hideResult && hideResult.catch){
                hideResult
                    .then(() => {
                        this.geziShowing = false;
                        if(callback)callback();
                    })
                    .catch((err:any) => {
                        this.geziShowing = false;
                        console.log("格子广告隐藏失败", err);
                        if(callback)callback();
                    });
            }else{
                this.geziShowing = false;
                if(callback)callback();
            }
        }catch(e){
            this.geziShowing = false;
            console.log("格子广告隐藏异常", e);
            if(callback)callback();
        }
    }

    /**
     * 兼容以前 banner/横幅广告的调用命名。
     */
    static showHengfuAd(){
        this.showGeziAd();
    }

    /**
     * 兼容以前 banner/横幅广告的隐藏命名。
     */
    static hideHengfuAd(){
        this.hideGeziAd();
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
                    this.chapingShowing = false;
                    console.log("插屏广告拉取失败", err);
                    this.tryShowPendingGezi();
                });
            }
            if(this.chaPingAd.onClose){
                this.chaPingAd.onClose(() => {
                    this.chapingShowing = false;
                    this.tryShowPendingGezi();
                });
            }
        } catch (e) {
            console.log("插屏广告创建失败", e);
            this.chaPingAd = null;
        }
    }

    static showVideoAd(callback: Function, retryOnConflict:boolean = true) {
        if(this.shouldBlockNewUserEarlyAds()){
            this.safeCallback(callback, 0);
            return;
        }

        if(this.geziShowing){
            this.hideGeziAd(() => {
                setTimeout(() => {
                    this.showVideoAd(callback);
                }, 200);
            });
            return;
        }

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
                    this.videoShowing = false;
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

            this.videoShowing = true;
            let showResult:any = this.videoAd.show();
            if(showResult && showResult.catch){
                showResult.catch((err:any) => {
                    if(retryOnConflict && this.isAdConflictError(err)){
                        this.videoShowing = false;
                        this.hideGeziAd(() => {
                            setTimeout(() => {
                                this.showVideoAd(callback, false);
                            }, 200);
                        });
                        return;
                    }

                    if(!this.videoAd || !this.videoAd.load){
                        this.videoShowing = false;
                        this.safeCallback(callback, 0);
                        return;
                    }
                    let loadResult:any = this.videoAd.load();
                    if(loadResult && loadResult.then){
                        loadResult
                            .then(() => this.videoAd.show())
                            .catch(() => {
                                this.videoShowing = false;
                                this.safeCallback(callback, 0);
                            });
                    }else{
                        this.videoShowing = false;
                        this.safeCallback(callback, 0);
                    }
                });
            }
        }catch(e){
            this.videoShowing = false;
            console.log("视频广告展示异常", e);
            this.safeCallback(callback, 0);
        }
    }

    static showChapingAd(retryOnConflict:boolean = true) {
        if(this.shouldBlockNewUserEarlyAds()){
            return;
        }

        if(this.videoShowing || this.chapingShowing){
            return;
        }

        if(this.geziShowing){
            this.hideGeziAd(() => {
                setTimeout(() => {
                    this.showChapingAd(retryOnConflict);
                }, 200);
            });
            return;
        }

        if (!this.chaPingAd || !this.chaPingAd.show) {
            this.tryShowPendingGezi();
            return;
        }

        try{
            this.chapingShowing = true;
            let showResult:any = this.chaPingAd.show();
            if(showResult && showResult.catch){
                showResult.catch((err: any) => {
                    this.chapingShowing = false;
                    if(retryOnConflict && this.isAdConflictError(err)){
                        // 微信返回广告互斥错误时，先关旧横幅/格子，再重试一次插屏。
                        this.hideGeziAd(() => {
                            setTimeout(() => {
                                this.showChapingAd(false);
                            }, 200);
                        });
                        return;
                    }

                    console.log("插屏广告展示失败", err);
                    this.tryShowPendingGezi();
                });
            }
        }catch(e){
            this.chapingShowing = false;
            console.log("插屏广告展示异常", e);
            this.tryShowPendingGezi();
        }
    }

    private static tryShowPendingGezi(){
        if(!this.pendingGeziAfterChaping)return;

        this.pendingGeziAfterChaping = false;
        this.showGeziAd();
    }

    private static isAdConflictError(err:any):boolean{
        return !!err && Number(err.errCode) === 2003;
    }

    /**
     * 判断当前环境是否支持微信广告 API。
     * 不支持时直接跳过广告，保证结算和复活流程不被广告打断。
     */
    private static canUseWechatAd():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined";
    }

    /**
     * 新玩家前3关不展示任何广告。
     * 只挡展示入口，不影响广告对象初始化；第4关开始会自动恢复原广告策略。
     */
    private static shouldBlockNewUserEarlyAds():boolean{
        try{
            let GameMain:any = require("../GameMain").default;
            return !!GameMain.isNewUserChapterNameFlow && GameMain.curChapterIndex === 0 && GameMain.curStageIndex < 3;
        }catch(e){
            return false;
        }
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
