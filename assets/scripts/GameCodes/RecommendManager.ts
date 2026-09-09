import GameMain from "../GameMain";
import { ConstValue } from "../Global/ConstValue";

declare const wx:any;

export default class RecommendManager {
    private static pageManager:any = null;
    private static loading:boolean = false;

    /**
     * 提前加载微信「评价与推荐」组件。
     * 只做平台和配置判断，不在本地开发环境强行兜底显示，避免调试时误导。
     */
    static preload(){
        if(!this.canUseRecommend() || !this.hasOpenLink() || this.pageManager || this.loading)return;

        this.loading = true;
        try{
            this.pageManager = wx.createPageManager();
            let loadResult:any = this.pageManager.load({
                openlink: ConstValue.RECOMMEND_OPEN_LINK,
            });
            if(loadResult && loadResult.then){
                loadResult
                    .then(() => {
                        this.loading = false;
                    })
                    .catch((err:any) => {
                        this.loading = false;
                        this.pageManager = null;
                        console.error("评价与推荐预加载失败:", err);
                    });
            }else{
                this.loading = false;
            }
        }catch(e){
            this.loading = false;
            this.pageManager = null;
            console.error("评价与推荐预加载异常:", e);
        }
    }

    /**
     * 打开微信「评价与推荐」组件。
     * 按钮入口统一调用这里，失败只提示，不影响挑战、结算、排行榜等主流程。
     */
    static openRecommend(){
        if(!this.canUseRecommend()){
            GameMain.instance.showTip("请在微信内打开推荐");
            return;
        }

        if(!this.hasOpenLink()){
            GameMain.instance.showTip("推荐组件配置缺失");
            return;
        }

        try{
            if(!this.pageManager){
                this.pageManager = wx.createPageManager();
            }

            let loadResult:any = this.pageManager.load({
                openlink: ConstValue.RECOMMEND_OPEN_LINK,
            });
            if(loadResult && loadResult.then){
                loadResult
                    .then(() => {
                        this.showLoadedRecommend();
                    })
                    .catch((err:any) => {
                        console.error("评价与推荐加载失败:", err);
                        GameMain.instance.showTip("推荐暂不可用");
                    });
                return;
            }

            this.showLoadedRecommend();
        }catch(e){
            console.error("评价与推荐打开异常:", e);
            GameMain.instance.showTip("推荐暂不可用");
        }
    }

    /**
     * 显示已加载完成的推荐页。
     * 单独拆出，避免 load 的 Promise 分支和同步分支重复写 show 逻辑。
     */
    private static showLoadedRecommend(){
        if(!this.pageManager || !this.pageManager.show)return;

        let showResult:any = this.pageManager.show({
            // 官方文档要求 show 时也传入推荐组件 OPENLINK。
            openlink: ConstValue.RECOMMEND_OPEN_LINK,
        });
        if(showResult && showResult.catch){
            showResult.catch((err:any) => {
                console.error("评价与推荐显示失败:", err);
                GameMain.instance.showTip("推荐暂不可用");
            });
        }
    }

    private static canUseRecommend():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.createPageManager;
    }

    private static hasOpenLink():boolean{
        return !!ConstValue.RECOMMEND_OPEN_LINK && ConstValue.RECOMMEND_OPEN_LINK.length > 0;
    }
}
