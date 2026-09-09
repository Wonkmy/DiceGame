import GameMain from "../GameMain";

declare const wx:any;

export default class SubscribeSystemMessageManager {
    private static readonly MSG_TYPE_INTERACTIVE:string = "SYS_MSG_TYPE_INTERACTIVE";
    private static readonly MSG_TYPE_RANK:string = "SYS_MSG_TYPE_RANK";
    private static readonly HELP_INTERACTIVE_KEY:string = "1";
    private static readonly HELP_INTERACTIVE_DONE_KEY:string = "dice_help_interactive_done_";

    /**
     * 订阅排行榜好友超越提醒。
     * 只在玩家主动点排行榜时调用，失败不影响排行榜展示。
     */
    static requestRankSubscribe(){
        this.requestSubscribe([this.MSG_TYPE_RANK], false);
    }

    /**
     * 订阅好友互动提醒。
     * 当前项目没有真正的好友互动存储接口，这里只在求助入口做轻量订阅，不阻断分享复活。
     */
    static requestInteractiveSubscribe(){
        this.requestSubscribe([this.MSG_TYPE_INTERACTIVE], false);
    }

    /**
     * 检查是否从好友助战分享卡片进入。
     * 如果是，则通知开放数据域写入一次好友互动数据，用于触发关系链互动提醒。
     */
    static tryReportHelpInteractiveFromLaunch(){
        if(!this.canUseOpenDataContext())return;

        let query:any = this.getWechatEnterQuery();
        if(!query || query.from !== "help")return;

        let stage:string = String(query.stage || "0");
        let doneKey:string = this.HELP_INTERACTIVE_DONE_KEY + stage;
        if(cc.sys.localStorage.getItem(doneKey) === "1")return;

        try{
            wx.getOpenDataContext().postMessage({
                type: "interactive",
                event: "helpFriend",
                key: this.HELP_INTERACTIVE_KEY,
                stage: stage,
            });
            // 同一次本地启动只上报一次，避免 onShow 反复触发导致重复弹确认。
            cc.sys.localStorage.setItem(doneKey, "1");
        }catch(e){
            console.log("通知开放数据域上报助战互动失败:", e);
        }
    }

    /**
     * 请求微信系统订阅消息。
     * 关系链提醒属于平台系统消息，订阅一次后长期有效；失败时只记录日志，不打断主流程。
     */
    private static requestSubscribe(msgTypeList:string[], showFailTip:boolean){
        if(!this.canUseSubscribeSystemMessage()){
            if(showFailTip && GameMain.instance){
                GameMain.instance.showTip("请在微信内订阅提醒");
            }
            return;
        }

        try{
            wx.requestSubscribeSystemMessage({
                msgTypeList: msgTypeList,
                success: (res:any) => {
                    console.log("系统订阅消息结果:", res);
                },
                fail: (err:any) => {
                    console.log("系统订阅消息失败:", err);
                    if(showFailTip && GameMain.instance){
                        GameMain.instance.showTip("提醒订阅失败");
                    }
                },
                complete: (res:any) => {
                    console.log("系统订阅消息完成:", res);
                }
            });
        }catch(e){
            console.log("系统订阅消息异常:", e);
            if(showFailTip && GameMain.instance){
                GameMain.instance.showTip("提醒暂不可用");
            }
        }
    }

    /**
     * 判断当前环境是否支持关系链系统订阅消息。
     * 浏览器、本地预览或低基础库直接跳过。
     */
    private static canUseSubscribeSystemMessage():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.requestSubscribeSystemMessage;
    }

    /**
     * 判断是否能向开放数据域发消息。
     */
    private static canUseOpenDataContext():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.getOpenDataContext;
    }

    /**
     * 获取本次进入小游戏的 query。
     * 优先取 getEnterOptionsSync，低版本再退回 getLaunchOptionsSync。
     */
    private static getWechatEnterQuery():any{
        if(typeof wx === "undefined")return null;

        try{
            if(wx.getEnterOptionsSync){
                let enterOptions:any = wx.getEnterOptionsSync();
                if(enterOptions && enterOptions.query)return enterOptions.query;
            }

            if(wx.getLaunchOptionsSync){
                let launchOptions:any = wx.getLaunchOptionsSync();
                if(launchOptions && launchOptions.query)return launchOptions.query;
            }
        }catch(e){
            console.log("读取微信进入参数失败:", e);
        }

        return null;
    }
}
