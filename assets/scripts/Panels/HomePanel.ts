import GameMain from "../GameMain";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import MainPanel from "./MainPanel";
import SettingPanel from "./SettingPanel";
import ShareManager from "../GameCodes/ShareManager";
import DiceGameSave from "../GameCodes/DiceGameSave";
import DebugTool from "../GameCodes/DebugTool";

const {ccclass, property} = cc._decorator;

@ccclass
export default class HomePanel extends BaseUI {
    public static instance:HomePanel = null!;
    protected static className = "HomePanel";

    @property({type:cc.Label, displayName:"标题文本", tooltip:"主界面顶部显示的游戏标题文本"})
    titleLabel:cc.Label = null!;

    @property({type:cc.Label, displayName:"剩余次数文本", tooltip:"显示今日剩余挑战次数的文本"})
    remainLabel:cc.Label = null!;

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
        this.bindHomeBtns();
        this.refreshStartView();
        if(CC_DEBUG){
            DebugTool.attach(this.node);
        }
    }

    private bindHomeBtns(){
        if(this.btn_start){
            // this.btn_start.off(cc.Node.EventType.TOUCH_END, this.onStartChallenge, this);
            this.btn_start.on(cc.Node.EventType.TOUCH_END, this.onStartChallenge, this);
        }

        if(this.btn_share){
            // this.btn_share.off(cc.Node.EventType.TOUCH_END);
            this.btn_share.on(cc.Node.EventType.TOUCH_END, () => {
                ShareManager.shareBestDamage();
            }, this);
        }

        if(this.btn_setting){
            // this.btn_setting.off(cc.Node.EventType.TOUCH_END);
            this.btn_setting.on(cc.Node.EventType.TOUCH_END, () => {
                UIManager.getInstance().openUI(SettingPanel, 1, (ui: SettingPanel) => {
                    ui.onShow();
                });
            }, this);
        }

        if(this.btn_rank){
            // this.btn_rank.off(cc.Node.EventType.TOUCH_END);
            this.btn_rank.on(cc.Node.EventType.TOUCH_END, () => {
                GameMain.instance.showTip("排行榜入口已预留，微信好友榜字段已上报");
            }, this);
        }

        // 旧版是按节点名自动查找和动态创建主界面内容；现在改为 Creator 面板拖拽变量。
    }

    private refreshStartView(){
        if(this.titleLabel){
            this.titleLabel.string = "就骰这亿把";
        }

        if(this.remainLabel){
            this.remainLabel.string = `今日剩余挑战 ${DiceGameSave.getRemainDailyChallengeCount()}/${DiceGameSave.MAX_DAILY_CHALLENGE_COUNT}`;
        }
    }

    private onStartChallenge(){
        if(!DiceGameSave.consumeDailyChallengeChance()){
            this.refreshStartView();
            GameMain.instance.showTip("今日挑战次数已用完，明天再来");
            return;
        }

        this.startGame();
    }

    private startGame(){
        UIManager.getInstance().closeUI(HomePanel);
        UIManager.getInstance().openUI(MainPanel,0,(ui:MainPanel)=>{
            ui.onShow();
            GameMain.instance.resetRunData();
            GameMain.instance.player.getDices();
            GameMain.instance.playMarketBgmOnce();
        })
    }

    override onDestroy(): void {
        if(this.btn_start){
            this.btn_start.off(cc.Node.EventType.TOUCH_END, this.onStartChallenge, this);
        }

        if(this.btn_share){
            this.btn_share.off(cc.Node.EventType.TOUCH_END);
        }

        if(this.btn_setting){
            this.btn_setting.off(cc.Node.EventType.TOUCH_END);
        }

        if(this.btn_rank){
            this.btn_rank.off(cc.Node.EventType.TOUCH_END);
        }
    }
}
