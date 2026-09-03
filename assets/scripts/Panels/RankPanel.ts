import GameMain from "../GameMain";
import DiceGameSave from "../GameCodes/DiceGameSave";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";

declare const wx:any;
const {ccclass, property} = cc._decorator;

@ccclass
export default class RankPanel extends BaseUI {
    public static instance:RankPanel = null!;
    protected static className = "RankPanel";

    @property({type:cc.Node})
    close_btn:cc.Node = null!;

    @property({type:cc.Node})
    left_btn:cc.Node = null!;

    @property({type:cc.Node})
    right_btn:cc.Node = null!;

    @property({type:cc.Node})
    btn_singleRank:cc.Node = null!;

    @property({type:cc.Node})
    btn_total_friendRank:cc.Node = null!;

    @property({type:cc.Node})
    btn_total_GlobalRank:cc.Node = null!;

    @property({type:cc.Label})
    targetShowLabel:cc.Label = null!;

    @property({type:cc.Label})
    globalRankShowTargetTip:cc.Label = null!;

    private readonly rankKey:string = "rkstage";
    private currentPage:number = 1;
    private openContext:any = null;
    private rankBtnCooling:boolean = false;

    onLoad(): void {
        RankPanel.instance = this;
        this.bindBtns();
    }

    override onShow(): void {
        this.currentPage = 1;
        this.refreshPageText();
        this.refreshTopText();
        this.refreshBtnState();
        this.refreshRank();
    }

    private bindBtns(){
        if(this.close_btn)this.close_btn.on(cc.Node.EventType.TOUCH_END, this.closePanel, this);
        if(this.left_btn)this.left_btn.on(cc.Node.EventType.TOUCH_END, this.prevPage, this);
        if(this.right_btn)this.right_btn.on(cc.Node.EventType.TOUCH_END, this.nextPage, this);
        if(this.btn_singleRank)this.btn_singleRank.on(cc.Node.EventType.TOUCH_END, this.openTodayFriendRank, this);
        if(this.btn_total_friendRank)this.btn_total_friendRank.on(cc.Node.EventType.TOUCH_END, this.openTodayFriendRank, this);
        if(this.btn_total_GlobalRank)this.btn_total_GlobalRank.on(cc.Node.EventType.TOUCH_END, this.openTodayFriendRank, this);
    }

    private refreshTopText(){
        if(this.targetShowLabel){
            this.targetShowLabel.string = "关卡";
        }

        this.setBtnText(this.btn_singleRank, "今日榜");
        this.setBtnText(this.btn_total_friendRank, "好友榜");
        this.setBtnText(this.btn_total_GlobalRank, "好友榜");

        if(this.globalRankShowTargetTip){
            this.globalRankShowTargetTip.node.active = true;
            this.globalRankShowTargetTip.string = `今日最好 ${DiceGameSave.getTodayBestStage()}关，超过本地区 ${DiceGameSave.getRegionOvertakePercent()}% 玩家`;
        }

        let titleNode = this.node.getChildByName("title");
        if(titleNode && titleNode.getComponent(cc.Label)){
            titleNode.getComponent(cc.Label).string = "好友挑战榜";
        }

        let tipNode = this.node.getChildByName("tip");
        if(tipNode && tipNode.getComponent(cc.Label)){
            tipNode.getComponent(cc.Label).string = "每日挑战成绩会进入好友榜";
        }
    }

    private setBtnText(btn:cc.Node, text:string){
        if(!btn)return;
        let labelNode = btn.getChildByName("txt") || btn.getChildByName("Label");
        if(labelNode && labelNode.getComponent(cc.Label)){
            labelNode.getComponent(cc.Label).string = text;
        }
    }

    private refreshBtnState(){
        if(this.btn_singleRank)this.btn_singleRank.color = cc.Color.RED;
        if(this.btn_total_friendRank)this.btn_total_friendRank.color = cc.Color.WHITE;
        if(this.btn_total_GlobalRank)this.btn_total_GlobalRank.color = cc.Color.WHITE;
    }

    private openTodayFriendRank(){
        this.currentPage = 1;
        this.refreshPageText();
        this.refreshBtnState();
        this.refreshRank();
    }

    private prevPage(){
        if(this.rankBtnCooling || this.currentPage <= 1)return;
        this.currentPage--;
        this.refreshPageText();
        this.refreshRankWithCoolDown();
    }

    private nextPage(){
        if(this.rankBtnCooling)return;
        this.currentPage++;
        this.refreshPageText();
        this.refreshRankWithCoolDown();
    }

    private refreshRankWithCoolDown(){
        this.rankBtnCooling = true;
        this.refreshRank();
        this.scheduleOnce(() => {
            this.rankBtnCooling = false;
        }, 0.3);
    }

    private refreshPageText(){
        let pageNode = this.node.getChildByName("page");
        if(pageNode && pageNode.getComponent(cc.Label)){
            pageNode.getComponent(cc.Label).string = "第" + this.currentPage + "页";
        }
    }

    private refreshRank(){
        if(cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !wx.getOpenDataContext){
            this.showLocalTip();
            return;
        }

        this.openContext = wx.getOpenDataContext();
        if(!this.openContext)return;

        // 打开榜单时补上报一次，避免刚结算后的成绩没有同步到好友榜。
        GameMain.instance.reportChallengeRank(DiceGameSave.getTodayBestStage());

        this.openContext.postMessage({
            type: "engine",
            event: "level",
            key: this.rankKey,
            page: this.currentPage,
        });
    }

    private showLocalTip(){
        let topNode = this.node.getChildByName("top");
        let listNode = topNode ? topNode.getChildByName("list") : null;
        if(!listNode)return;

        listNode.removeAllChildren();
        let tipNode:cc.Node = new cc.Node("local_rank_tip");
        tipNode.width = 600;
        tipNode.height = 120;
        listNode.addChild(tipNode);

        let label:cc.Label = tipNode.addComponent(cc.Label);
        label.string = "好友榜需要在微信开发者工具中查看";
        label.fontSize = 28;
        label.lineHeight = 36;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.node.color = cc.Color.WHITE;
    }

    private closePanel(){
        this.clearOpenDataContext();
        UIManager.getInstance().closeUI(RankPanel);
    }

    private clearOpenDataContext(){
        if(!this.openContext)return;
        this.openContext.postMessage({
            type: "engine",
            event: "clear",
        });
    }

    override onDestroy(): void {
        this.clearOpenDataContext();
        if(this.close_btn)this.close_btn.off(cc.Node.EventType.TOUCH_END, this.closePanel, this);
        if(this.left_btn)this.left_btn.off(cc.Node.EventType.TOUCH_END, this.prevPage, this);
        if(this.right_btn)this.right_btn.off(cc.Node.EventType.TOUCH_END, this.nextPage, this);
        if(this.btn_singleRank)this.btn_singleRank.off(cc.Node.EventType.TOUCH_END, this.openTodayFriendRank, this);
        if(this.btn_total_friendRank)this.btn_total_friendRank.off(cc.Node.EventType.TOUCH_END, this.openTodayFriendRank, this);
        if(this.btn_total_GlobalRank)this.btn_total_GlobalRank.off(cc.Node.EventType.TOUCH_END, this.openTodayFriendRank, this);
    }
}
