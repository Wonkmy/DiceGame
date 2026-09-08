import GameMain from "../GameMain";
import { ConstValue } from "../Global/ConstValue";

declare const wx:any;

export default class GameCircleManager {
    private static pageManager:any = null;

    /**
     * 打开微信游戏圈。
     * 只负责平台能力判断和异常保护，失败时提示玩家，不影响游戏主流程。
     */
    static openGameCircle(){
        if(!this.canUseGameCircle()){
            GameMain.instance.showTip("请在微信内查看游戏圈");
            return;
        }
        if(!ConstValue.GAME_CIRCLE_OPEN_LINK || ConstValue.GAME_CIRCLE_OPEN_LINK.length <= 0){
            GameMain.instance.showTip("请先配置游戏圈跳转ID");
            return;
        }

        try{
            if(!this.pageManager){
                this.pageManager = wx.createPageManager();
            }

            this.pageManager.load({
                openlink: ConstValue.GAME_CIRCLE_OPEN_LINK,
            }).then(() => {
                this.pageManager.show();
            }).catch((err:any) => {
                console.error("游戏圈加载失败:", err);
                GameMain.instance.showTip("游戏圈加载失败，请稍后再试");
            });
        }catch(e){
            console.error("游戏圈打开异常:", e);
            GameMain.instance.showTip("游戏圈暂不可用");
        }
    }

    /**
     * 判断当前环境是否支持游戏圈 PageManager。
     * 浏览器、本地预览或基础库不支持时直接返回 false。
     */
    private static canUseGameCircle():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.createPageManager;
    }
}
