import GameMain from "../GameMain";
import { ConstValue } from "../Global/ConstValue";

declare const wx:any;

export default class ArenaManager {
    private static pageManager:any = null;

    /**
     * 打开微信「擂台赛组件」。
     * 客户端只负责调起后台配置好的组件，不参与擂台赛规则和后台活动配置。
     */
    static openArena(){
        if(!this.canUseArena()){
            GameMain.instance.showTip("请在微信内打开擂台赛");
            return;
        }

        if(!ConstValue.ARENA_OPEN_LINK || ConstValue.ARENA_OPEN_LINK.length <= 0){
            GameMain.instance.showTip("请先配置擂台赛跳转ID");
            return;
        }

        try{
            if(!this.pageManager){
                this.pageManager = wx.createPageManager();
            }

            let loadResult:any = this.pageManager.load({
                openlink: ConstValue.ARENA_OPEN_LINK,
            });
            if(loadResult && loadResult.then){
                loadResult
                    .then(() => {
                        this.showArena();
                    })
                    .catch((err:any) => {
                        console.error("擂台赛加载失败:", err);
                        GameMain.instance.showTip("擂台赛暂不可用");
                    });
                return;
            }

            this.showArena();
        }catch(e){
            console.error("擂台赛打开异常:", e);
            GameMain.instance.showTip("擂台赛暂不可用");
        }
    }

    /**
     * 显示已加载的擂台赛页面。
     * 单独拆出，避免同步和异步 load 分支重复写 show。
     */
    private static showArena(){
        if(!this.pageManager || !this.pageManager.show)return;

        let showResult:any = this.pageManager.show();
        if(showResult && showResult.catch){
            showResult.catch((err:any) => {
                console.error("擂台赛显示失败:", err);
                GameMain.instance.showTip("擂台赛暂不可用");
            });
        }
    }

    /**
     * 判断当前环境是否支持擂台赛组件。
     * 非微信小游戏、基础库不支持或本地浏览器调试时直接不调用 wx。
     */
    private static canUseArena():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.createPageManager;
    }
}
