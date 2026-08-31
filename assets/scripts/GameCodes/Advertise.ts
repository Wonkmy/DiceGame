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
        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !this.VIDEO_ID) {
            return;
        }

        try {
            this.videoAd = wx.createRewardedVideoAd({
                adUnitId: this.VIDEO_ID,
            });
            this.videoAd.onError((err: any) => {
                console.log("视频广告拉取失败", err);
            });
        } catch (e) {
            console.log("视频广告创建失败", e);
            this.videoAd = null;
        }
    }

    static initChapingAd() {
        if (cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !this.CHAPING_ID) {
            return;
        }

        try {
            this.chaPingAd = wx.createInterstitialAd({
                adUnitId: this.CHAPING_ID,
            });
            this.chaPingAd.onError((err: any) => {
                console.log("插屏广告拉取失败", err);
            });
        } catch (e) {
            console.log("插屏广告创建失败", e);
            this.chaPingAd = null;
        }
    }

    static showVideoAd(callback: Function) {
        if (!this.videoAd) {
            callback && callback(0);
            return;
        }

        this.videoAd.show()
            .catch(() => {
                this.videoAd.load()
                    .then(() => this.videoAd.show())
                    .catch(() => callback && callback(0));
            });

        this.videoAd.onClose((res: any) => {
            this.videoAd.offClose();
            if (res && res.isEnded || res === undefined) {
                callback && callback(1);
            } else {
                callback && callback(2);
            }
        });
    }

    static showChapingAd() {
        if (!this.chaPingAd) {
            return;
        }

        this.chaPingAd.show().catch((err: any) => {
            console.log("插屏广告展示失败", err);
        });
    }
}
