import GameMain from "../GameMain";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import MainPanel from "./MainPanel";
import SettingPanel from "./SettingPanel";
import ShareManager from "../GameCodes/ShareManager";
import DiceGameSave from "../GameCodes/DiceGameSave";
import DebugTool from "../GameCodes/DebugTool";
import RankPanel from "./RankPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class HomePanel extends BaseUI {
    public static instance:HomePanel = null!;
    protected static className = "HomePanel";
    private isSharingChallenge:boolean = false;
    private startingChallenge:boolean = false;

    @property({type:cc.Label, displayName:"标题文本", tooltip:"主界面顶部显示的游戏标题文本"})
    titleLabel:cc.Label = null!;

    @property({type:cc.Label, displayName:"剩余次数文本", tooltip:"显示今日剩余挑战次数的文本"})
    remainLabel:cc.Label = null!;

    @property({type:cc.Label, displayName:"挑战进度文本", tooltip:"显示今日最好关卡和本次挑战起点"})
    stageLabel:cc.Label = null!;

    @property({type:cc.Node, displayName:"开始按钮", tooltip:"点击后消耗一次挑战次数并进入章节选择"})
    btn_start:cc.Node = null!;

    @property({type:cc.Node, displayName:"分享按钮", tooltip:"点击后触发微信分享"})
    btn_share:cc.Node = null!;

    @property({type:cc.Node, displayName:"设置按钮", tooltip:"点击后打开设置界面"})
    btn_setting:cc.Node = null!;

    @property({type:cc.Node, displayName:"排行榜按钮", tooltip:"点击后打开排行榜入口，当前版本先显示预留提示"})
    btn_rank:cc.Node = null!;

    onLoad(): void {
        HomePanel.instance = this;
    }

    override onShow(): void {
        this.startingChallenge = false;
        this.bindHomeBtns();
        this.refreshStartView();
        if(CC_DEBUG){
            DebugTool.attach(this.node);
        }
    }

    private bindHomeBtns(){
        if(this.btn_start){
            this.btn_start.off(cc.Node.EventType.TOUCH_END, this.onStartChallenge, this);
            this.btn_start.on(cc.Node.EventType.TOUCH_END, this.onStartChallenge, this);
        }

        if(this.btn_share){
            this.btn_share.off(cc.Node.EventType.TOUCH_END, this.onShareBestDamage, this);
            this.btn_share.on(cc.Node.EventType.TOUCH_END, this.onShareBestDamage, this);
        }

        if(this.btn_setting){
            this.btn_setting.off(cc.Node.EventType.TOUCH_END, this.onOpenSetting, this);
            this.btn_setting.on(cc.Node.EventType.TOUCH_END, this.onOpenSetting, this);
        }

        if(this.btn_rank){
            this.btn_rank.off(cc.Node.EventType.TOUCH_END);
            this.btn_rank.on(cc.Node.EventType.TOUCH_END, this.openRankPanel, this);
        }

        // 旧版是按节点名自动查找和动态创建主界面内容；现在改为 Creator 面板拖拽变量。
    }

    public refreshStartView(){
        if(this.titleLabel){
            this.titleLabel.string = "就骰这亿把";
        }

        if(this.remainLabel){
            this.remainLabel.string = `今日剩余挑战 ${DiceGameSave.getRemainDailyChallengeCount()}/${DiceGameSave.MAX_DAILY_CHALLENGE_COUNT}`;
        }

        this.refreshStartBtnText();
        this.refreshShareBtnText();

        let homeStageLabel:cc.Label = this.stageLabel;
        if(!homeStageLabel){
            let stageNode:cc.Node = this.findChildByName(this.node, "stageLabel");
            if(stageNode && stageNode.getComponent(cc.Label)){
                homeStageLabel = stageNode.getComponent(cc.Label);
            }
        }

        if(homeStageLabel){
            // 主界面只展示挑战进度，不开放选关，避免影响每日榜公平性。
            homeStageLabel.string = `今日最好 第${DiceGameSave.getTodayBestStage()}关`;
        }
    }

    private findChildByName(parent:cc.Node, name:string):cc.Node{
        if(!parent)return null!;
        if(parent.name === name)return parent;

        for(let i = 0;i < parent.children.length;i++){
            let child:cc.Node = this.findChildByName(parent.children[i], name);
            if(child)return child;
        }

        return null!;
    }

    private onStartChallenge(){
        if(this.startingChallenge)return;

        if(DiceGameSave.getRemainDailyChallengeCount() <= 0){
            if(DiceGameSave.getRemainDailyShareChallengeCount() > 0){
                this.shareAddChallenge();
            }else{
                ShareManager.shareBestDamage();
            }
            return;
        }

        if(!DiceGameSave.consumeDailyChallengeChance()){
            this.refreshStartView();
            GameMain.instance.showTip("今日挑战次数已用完，明日再战！");
            return;
        }

        this.startGame();
    }

    private shareAddChallenge(){
        if(this.isSharingChallenge)return;

        if(DiceGameSave.getRemainDailyShareChallengeCount() <= 0){
            this.refreshStartView();
            ShareManager.shareBestDamage();
            return;
        }

        this.isSharingChallenge = true;
        ShareManager.shareChallenge(() => {
            this.isSharingChallenge = false;
            if(!DiceGameSave.consumeDailyShareChallengeChance()){
                this.refreshStartView();
                GameMain.instance.showTip("今日助战机会已用完，明日再战！");
                return;
            }

            // 好友助战补 1 次，再立刻消耗这 1 次进入挑战。
            DiceGameSave.addDailyChallengeChance(1);
            if(!DiceGameSave.consumeDailyChallengeChance()){
                this.refreshStartView();
                GameMain.instance.showTip("今日挑战次数已用完，明日再战！");
                return;
            }

            this.refreshStartView();
            this.startGame();
        });
    }

    private refreshStartBtnText(){
        if(!this.btn_start)return;

        let txtNode:cc.Node = this.btn_start.getChildByName("txt");
        if(!txtNode)return;

        let label:cc.Label = txtNode.getComponent(cc.Label);
        if(!label)return;

        let remainChallenge:number = DiceGameSave.getRemainDailyChallengeCount();
        let remainShareChallenge:number = DiceGameSave.getRemainDailyShareChallengeCount();

        // 今日正常次数用完后，才显示好友助战入口；都用完后，引导玩家分享战绩。
        if(remainChallenge > 0){
            label.string = "开始挑战";
        }else if(remainShareChallenge > 0){
            label.string = "好友助战";
        }else{
            label.string = "分享战绩";
        }
    }

    private refreshShareBtnText(){
        if(!this.btn_share)return;

        let txtNode:cc.Node = this.btn_share.getChildByName("txt");
        if(!txtNode)return;

        let label:cc.Label = txtNode.getComponent(cc.Label);
        if(!label)return;

        label.string = "分享战绩";
    }

    private openRankPanel(){
        UIManager.getInstance().openUI(RankPanel, 2, (ui: RankPanel) => {
            ui.onShow();
        });
    }

    /**
     * 分享今日战绩。
     * 用具名函数绑定，避免 HomePanel 重复 onShow 时按钮事件叠加。
     */
    private onShareBestDamage(){
        ShareManager.shareBestDamage();
    }

    /**
     * 打开设置界面。
     * 用具名函数绑定，保证 onDestroy/off 能准确移除事件。
     */
    private onOpenSetting(){
        UIManager.getInstance().openUI(SettingPanel, 1, (ui: SettingPanel) => {
            ui.onShow();
        });
    }

    private startGame(){
        if(this.startingChallenge)return;

        this.startingChallenge = true;
        // 先重置挑战数据，再打开战斗界面，避免 MainPanel.onShow 读取到上一局残留关卡或状态。
        GameMain.instance.resetRunData();
        UIManager.getInstance().closeUI(HomePanel);
        UIManager.getInstance().openUI(MainPanel,0,(ui:MainPanel)=>{
            ui.onShow();
            GameMain.instance.player.getDices();
            GameMain.instance.playMarketBgmOnce();
        })
    }

    override onDestroy(): void {
        if(this.btn_start){
            this.btn_start.off(cc.Node.EventType.TOUCH_END, this.onStartChallenge, this);
        }

        if(this.btn_share){
            this.btn_share.off(cc.Node.EventType.TOUCH_END, this.onShareBestDamage, this);
        }

        if(this.btn_setting){
            this.btn_setting.off(cc.Node.EventType.TOUCH_END, this.onOpenSetting, this);
        }

        if(this.btn_rank){
            this.btn_rank.off(cc.Node.EventType.TOUCH_END, this.openRankPanel, this);
        }
        HomePanel.instance = null!;
    }
}
