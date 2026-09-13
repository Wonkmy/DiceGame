import GameMain from "../GameMain";
import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { CalculateData, Chapter, CharmData, CreateChapter, DiceHandResult, DiceHandType, DiceNodePoint, DiceType, GameChapter, GetCalculateMultiple, getDiceHandResult, getNoOverlapDicePositions, MonsterData, randomInt } from "../Global/DiceHandUtil";
import Dice from "../GameCodes/Dice";
import Tip from "../GameCodes/Tip";
import Monster from "../GameCodes/Monster";
import Player from "../GameCodes/Player";
import { UIManager } from "../UIManager/UIManager";
import ResultPanel from "./ResultPanel";
import BagPanel from "./BagPanel";
import TipPanel from "./TipPanel";
import RewardItem from "../UIManager/RewardItem";
import ChapterPanel from "./ChapterPanel";
import DiceGameSave from "../GameCodes/DiceGameSave";
import { Advertise } from "../GameCodes/Advertise";
import HomePanel from "./HomePanel";
import DebugTool from "../GameCodes/DebugTool";
import ShareManager from "../GameCodes/ShareManager";
import RecommendManager from "../GameCodes/RecommendManager";
import { ConstValue } from "../Global/ConstValue";

const {ccclass, property} = cc._decorator;

type LightEventReward = {
    name:string;
    desc:string;
    effect:string;
    value:number;
    unlockStage:number;
}

@ccclass
export default class MainPanel extends BaseUI {
    public static instance:MainPanel = null!;
    protected static className = "MainPanel";
    private readonly MONSTER_LAYER_Y_OFFSET:number = 70;

    allDicesNodes:cc.Node[] = [];
    selectedDicePoint:number[]=[]
    selectedDice:cc.Node[]=[]

    calculateData:CalculateData = null!;
    curDiceHandResult:DiceHandResult = null!;
    unusePointCount:number = 0;

    allMonsterDatas:MonsterData[]=[]
    allCharmDatas:CharmData[]=[]
    monster:Monster = null!;
    currentNodeData:Chapter = null!;

    allCharmItems:cc.Node[] = [];// 所有的加成item显示列表

    battlleIn:boolean = false;

    // 前3个怪固定骰面：1教学、2有压力、3低输出高压力；第4个怪开始恢复随机
    private fixedDicePointsByMonster:number[][] = [
        [6, 6, 2, 4, 1],
        [3, 3, 1, 5, 6],
        // 顺子判定为3个连续点数即可成立，第3关固定骰面不能包含三连，避免直接打出高爆发。
        [1, 1, 3, 5, 6],
    ];
    private hasUsedFixedDicePoints:boolean = false;
    private firstGuideActive:boolean = false;

    @property({type:cc.Node})
    btn_onRoll:cc.Node = null!;// 重新扔出5个骰子，花费x金币

    @property({type:cc.Node})
    btn_openDicePackage:cc.Node = null!;// 打开所拥有的骰子界面

    @property({type:cc.Node})
    health2d:cc.Node = null!;

    @property({type:cc.Node, displayName:"斩杀提示特效", tooltip:"当前攻击力足够击杀怪物时显示，建议放在攻击按钮或剑附近"})
    killReadyEffectNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"可斩杀艺术字", tooltip:"当前攻击力足够击杀怪物时显示，建议放在 MainPanel 中间偏上位置"})
    killReadyWordNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"低血量警告特效", tooltip:"玩家血量较低时显示，建议放在血量图标附近"})
    lowHpWarningNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"玩家受击全屏红闪节点", tooltip:"玩家被怪物攻击时快速闪红一下，建议放在Canvas下层级最高处，挂Sprite和白色SpriteFrame"})
    lowHpScreenWarningNode:cc.Node = null!;

    @property({type:cc.Material, displayName:"玩家受击全屏红闪材质", tooltip:"拖拽 shaders/low-hp-screen-vignette 材质"})
    lowHpScreenWarningMaterial:cc.Material = null!;

    @property({type:cc.Node, displayName:"剑狂热特效", tooltip:"凑到大牌型或高攻击力时显示，建议作为 sword 的子节点挂在剑背后"})
    swordFeverEffectNode:cc.Node = null!;

    @property({type:cc.Material, displayName:"剑狂热流光材质", tooltip:"拖拽 shaders/sword-fever-flow 材质，让剑气在图片内部流动"})
    swordFeverMaterial:cc.Material = null!;



    onRollling:boolean = false;

    @property({type:cc.Node})
    btn_start:cc.Node = null!;

    @property({type:cc.Node, displayName:"战斗分享按钮", tooltip:"战斗界面主动分享按钮；不拖拽则不启用"})
    btn_share:cc.Node = null!;

    @property({type:cc.Node, displayName:"战斗推荐评价按钮", tooltip:"战斗界面打开微信评价与推荐组件；不拖拽则不启用"})
    btn_recommend:cc.Node = null!;

    @property({type:cc.Label})
    NumPointsText:cc.Label= null!;
    @property({type:cc.Label})
    NumMultipleText:cc.Label= null!;
    @property({type:cc.Label})
    TotalText:cc.Label= null!;

    @property({type:cc.Label, displayName:"护盾抵消文本", tooltip:"怪物有护盾时显示，例如：护盾抵消 -2。不拖拽则不显示"})
    shieldDamageLabel:cc.Label = null!;

    @property({type:cc.Label, displayName:"临时加成文本", tooltip:"显示事件节点获得的下次攻击加成，例如：下次攻击 +8点。不拖拽则不显示"})
    tempBuffLabel:cc.Label = null!;

    @property({type:cc.Label})
    testip:cc.Label= null!;



    @property({type:cc.Label})
    hpText:cc.Label = null!;

    @property({type:cc.Label})
    attackNum:cc.Label = null!;

    @property({type:cc.Node})
    attackbg:cc.Node = null!;

    @property({type:cc.Label, displayName:"当前关卡文本", tooltip:"显示当前挑战进度，例如：第3关"})
    curStageLabel:cc.Label = null!;

    @property({type:cc.Node, displayName:"关卡开场提示节点", tooltip:"进入战斗时显示，例如：第4关。可挂Label或艺术字节点"})
    stageStartTipNode:cc.Node = null!;

    @property({type:cc.Label, displayName:"关卡开场提示文本", tooltip:"关卡开场提示节点中的文本组件"})
    stageStartTipLabel:cc.Label = null!;

    @property({type:cc.Node, displayName:"难度飙升提示节点", tooltip:"进入关键压力关时显示，例如：难度飙升"})
    difficultyUpTipNode:cc.Node = null!;

    @property({type:cc.Label, displayName:"难度飙升提示文本", tooltip:"难度飙升提示节点中的文本组件；如果使用艺术字节点，可以不拖"})
    difficultyUpTipLabel:cc.Label = null!;
    @property({type:cc.Node, displayName:"回主页节点", tooltip:"回主页"})
    private homeBtn:cc.Node = null!;
    private firstGuideTextOriginPos:cc.Vec2 = null!;
    private killReadyEffectOriginScale:number = null!;
    private killReadyWordOriginScale:number = null!;
    private lowHpWarningOriginScale:number = null!;
    private attackBtnOriginScale:number = null!;
    private attackBtnOriginColor:cc.Color = null!;
    private attackBtnKillReadyPlaying:boolean = false;
    private attackBtnLocked:boolean = false;
    private totalTextOriginPos:cc.Vec2 = null!;
    private totalTextOriginScale:number = null!;
    private totalTextOriginWidth:number = null!;
    private swordOriginPos:cc.Vec2 = null!;
    private swordOriginScale:number = null!;
    private attackVisualPlaying:boolean = false;
    private swordFeverOriginScale:number = null!;
    private swordFeverOriginOpacity:number = null!;
    private swordFeverLevel:number = 0;
    private lowHpScreenWarningPlaying:boolean = false;
    private monsterDataLoaded:boolean = false;
    private waitingLoadChapter:boolean = false;
    private freeRerollUsed:boolean = false;
    private videoRerollUsed:boolean = false;
    private watchingRerollVideo:boolean = false;
    private diceReadyForFreeReroll:boolean = false;
    private rerollBtnOriginColor:cc.Color = null!;
    private storedHealValue:number = 0;
    private storedHealBtn:cc.Node = null!;
    private videoHealBtn:cc.Node = null!;
    private watchingHealVideo:boolean = false;
    private storedHealTipShown:boolean = false;
    private readonly FREE_REROLL_UNLOCK_STAGE:number = 4;
    private readonly STORED_HEAL_DAMAGE_RATE:number = 0.2;
    private readonly STORED_HEAL_MAX_HP_RATE:number = 0.3;
    private readonly VIDEO_HEAL_TARGET_HP_RATE:number = 0.85;
    private readonly ATTACK_LOCK_TIMEOUT:number = 8;
    private readonly forgeRewards:LightEventReward[] = [
        { name:"擦亮剑锋", desc:"下次攻击点数 +5", effect:"point", value:5, unlockStage:1 },
        { name:"淬一口火", desc:"下次攻击点数 +7", effect:"point", value:7, unlockStage:5 },
        { name:"骰火开刃", desc:"下次攻击点数 +9", effect:"point", value:9, unlockStage:11 },
    ];
    private readonly treasureRewards:LightEventReward[] = [
        { name:"小宝箱", desc:"下次最终伤害 +6%", effect:"damageRate", value:0.06, unlockStage:1 },
        { name:"亮晶宝箱", desc:"下次最终伤害 +8%", effect:"damageRate", value:0.08, unlockStage:5 },
        { name:"深渊宝箱", desc:"下次最终伤害 +10%", effect:"damageRate", value:0.1, unlockStage:11 },
    ];
    private readonly restRewards:LightEventReward[] = [
        { name:"短暂休整", desc:"恢复已损失生命 28%", effect:"healLost", value:0.28, unlockStage:1 },
        { name:"稳住气息", desc:"恢复已损失生命 33%", effect:"healLost", value:0.33, unlockStage:6 },
        { name:"回血一口", desc:"恢复已损失生命 38%", effect:"healLost", value:0.38, unlockStage:12 },
    ];

    onLoad(): void {
        MainPanel.instance = this;
        this.unusePointCount = 5;
        this.hideBattleWarningEffects();
        this.hideStageStartTips();
        this.applySwordFeverMaterial();
        this.applyLowHpScreenWarningMaterial();
        this.loadData();
    }

    override onShow(): void {
        GameMain.instance.playBattleBgm();
        Advertise.hideBattleBanner();
        this.clearRuntimeStateForPanelShow();
        GameMain.gameFinished = false;// 重置游戏结束标志位要在刷新血袋按钮前执行，否则下一关会误置灰
        this.hideBattleWarningEffects();
        this.hideStageStartTips();
        this.refreshAllUIText(0,0,0,null,true);
        this.refreshCurStageLabel();
        GameMain.instance.player.init();
        this.storedHealValue = GameMain.storedHealValue;
        this.storedHealTipShown = GameMain.storedHealTipShown;
        this.createBattleHealButtons();
        this.refreshBattleHealButtonsState();
        this.loadGame();

        this.showCharmData();

        if(this.btn_start){
            this.btn_start.off(cc.Node.EventType.TOUCH_END,this.onStartBattle,this);
            this.btn_start.on(cc.Node.EventType.TOUCH_END,this.onStartBattle,this);
        }
        // if(this.btn_openDicePackage){
        //     this.btn_openDicePackage.off(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this);
        //     this.btn_openDicePackage.on(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this);
        // }
        if(this.btn_onRoll){
            this.btn_onRoll.off(cc.Node.EventType.TOUCH_END,this.onReRoll,this);
            this.btn_onRoll.on(cc.Node.EventType.TOUCH_END,this.onReRoll,this);
            this.refreshFreeRerollBtnState();
        }
        if(this.btn_share){
            this.btn_share.off(cc.Node.EventType.TOUCH_END, this.onShareGame, this);
            this.btn_share.on(cc.Node.EventType.TOUCH_END, this.onShareGame, this);
        }
        if(this.btn_recommend){
            this.btn_recommend.off(cc.Node.EventType.TOUCH_END, this.onOpenRecommend, this);
            this.btn_recommend.on(cc.Node.EventType.TOUCH_END, this.onOpenRecommend, this);
        }
        // this.createHomeBtn();
        if(this.homeBtn){
            this.homeBtn.off(cc.Node.EventType.TOUCH_END, this.onBackHome, this);
            this.homeBtn.on(cc.Node.EventType.TOUCH_END, this.onBackHome, this);
        }
        if(CC_DEBUG){
            DebugTool.attach(this.node);
        }

        this.node.getChildByName("GamingContainer").opacity = 0;
        this.refreshAttackBtnState(false);
        if(this.testip){
            let guideRoot:cc.Node = this.getGuideTipRoot();
            this.firstGuideTextOriginPos = new cc.Vec2(guideRoot.x, guideRoot.y);
        }

        if(this.testip && cc.isValid(this.testip.node)){
            cc.Tween.stopAllByTarget(this.testip.node);
            cc.tween(this.testip.node)
                .repeatForever(
                    cc.tween().by(0.3,{scale:0.1}).by(0.3,{scale:-0.1})
                )
                .start();
        }
    }

    /**
     * 清理 MainPanel 运行期缓存。
     * 只清理界面临时状态，不改章节进度、玩家血量、每日次数等核心数据。
     */
    private clearRuntimeStateForPanelShow(){
        this.unscheduleAllCallbacks();
        this.selectedDicePoint = [];
        this.selectedDice = [];
        this.allDicesNodes = [];
        this.allCharmItems = [];
        this.calculateData = null!;
        this.curDiceHandResult = null!;
        this.monster = null!;
        this.currentNodeData = null!;
        this.battlleIn = false;
        this.onRollling = false;
        this.freeRerollUsed = false;
        this.videoRerollUsed = false;
        this.watchingRerollVideo = false;
        this.watchingHealVideo = false;
        this.storedHealValue = GameMain.storedHealValue;
        this.storedHealTipShown = GameMain.storedHealTipShown;
        this.diceReadyForFreeReroll = false;
        this.hasUsedFixedDicePoints = false;
        this.firstGuideActive = false;
        this.attackVisualPlaying = false;
        this.hideFirstGuideText();
        this.refreshTempBuffLabel();

        let gamingContainer:cc.Node = this.node.getChildByName("GamingContainer");
        if(!gamingContainer)return;

        this.cacheSwordOrigin(gamingContainer.getChildByName("sword"));
        this.restoreTotalAttackFocus();
        this.restoreSwordOrigin();
        this.setAttackBtnLocked(false);
        this.refreshFreeRerollBtnState();

        // 重新进入 MainPanel 时，清掉上一轮可能残留的骰子、怪物和 Buff 节点。
        for(let i = gamingContainer.children.length - 1; i >= 0; i--){
            let child:cc.Node = gamingContainer.children[i];
            if(child.getComponent(Dice) || child.getComponent(Monster)){
                child.destroy();
            }
        }

        let buffContainer:cc.Node = gamingContainer.getChildByName("buffContainer");
        if(buffContainer){
            buffContainer.destroyAllChildren();
        }
    }

    private showCharmData(){
        this.allCharmItems = [];
        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;

        let buffContainer:cc.Node = this.node.getChildByName("GamingContainer").getChildByName("buffContainer");
        if(buffContainer){
            buffContainer.destroyAllChildren();
        }else{
            console.error("buffContainer 节点不存在，无法显示道具状态");
            return;
        }

        for (let i = 0; i < GameMain.charmDatas.length; i++) {
            const c = GameMain.charmDatas[i];
            GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab, (err, prefab: cc.Prefab) => {
                if(!this.node || !cc.isValid(this.node) || !buffContainer || !cc.isValid(buffContainer))return;
                if(err || !prefab){
                    console.error("奖励道具预制体加载失败:", err);
                    return;
                }
                let newRewardItem: cc.Node = cc.instantiate(prefab);
                this.allCharmItems.push(newRewardItem);
                buffContainer.addChild(newRewardItem);
                newRewardItem.scale = 0.75;
                newRewardItem.getComponent(RewardItem).setOnlyClick(c);
                newRewardItem.y = 0;
                // 根据获得的下方"类buff"的构筑数据来增加初始点数或倍数。例如，下方有一个“下次攻击时，增加15额外点数”，那么这里就是在计算这些，然后存入额外点数数值中
                if(c.useCount > 0){
                    if(c.effect === "point"){
                        GameMain.extraPoint += c.num;
                    }
                }
            })
        }
    }

    private refreshCurStageLabel(){
        if(this.curStageLabel){
            this.curStageLabel.string = `第${GameMain.instance.getChallengeStageScore()}关`;
        }
    }

    /**
     * 隐藏关卡开场提示。
     * 预制体里节点可以默认显示，运行时统一由代码控制显隐。
     */
    private hideStageStartTips(){
        this.setStageTipNodeVisible(this.stageStartTipNode, false);
        this.setStageTipNodeVisible(this.difficultyUpTipNode, false);
    }

    /**
     * 播放进入战斗时的关卡提示。
     * 只做显示和动效，不改变章节、怪物和骰子规则。
     */
    private playStageStartTips(){
        let stageScore:number = GameMain.instance.getChallengeStageScore();
        if(this.stageStartTipLabel){
            this.stageStartTipLabel.string = `第${stageScore}关`;
        }

        if(this.shouldShowDifficultyUpTip(stageScore)){
            if(this.difficultyUpTipLabel){
                this.difficultyUpTipLabel.string = "难度飙升";
            }
            // 压力关先提示难度变化，再延迟显示当前关卡，避免两个提示抢主次。
            this.playStageTipAnim(this.difficultyUpTipNode, 0);
            this.playStageTipAnim(this.stageStartTipNode, 1.0);
        }else{
            this.setStageTipNodeVisible(this.difficultyUpTipNode, false);
            this.playStageTipAnim(this.stageStartTipNode, 0);
        }
    }

    /**
     * 判断是否显示“难度飙升”。
     * 第3关是首个压力点，第6关是中段压力点，第2章开始再次提醒。
     */
    private shouldShowDifficultyUpTip(stageScore:number):boolean{
        return stageScore === 3 || stageScore === 6 || stageScore === 11;
    }

    /**
     * 播放单个开场提示节点动画。
     * 节点位置完全由预制体决定，代码只处理缩放和透明度。
     */
    private playStageTipAnim(tipNode:cc.Node, delayTime:number){
        if(!tipNode || !cc.isValid(tipNode))return;

        cc.Tween.stopAllByTarget(tipNode);
        tipNode.active = true;
        tipNode.opacity = 0;
        tipNode.scale = 0.72;
        cc.tween(tipNode)
            .delay(delayTime)
            .to(0.14, { opacity: 255, scale: 1.18 }, { easing: "backOut" })
            .to(0.08, { scale: 1 })
            .delay(0.55)
            .to(0.18, { opacity: 0, scale: 0.92 })
            .call(() => {
                this.setStageTipNodeVisible(tipNode, false);
            })
            .start();
    }

    /**
     * 设置开场提示节点显隐，并在隐藏时恢复基础显示状态。
     */
    private setStageTipNodeVisible(tipNode:cc.Node, show:boolean){
        if(!tipNode || !cc.isValid(tipNode))return;

        cc.Tween.stopAllByTarget(tipNode);
        tipNode.active = show;
        if(!show){
            tipNode.opacity = 255;
            tipNode.scale = 1;
        }
    }

    // private createHomeBtn(){
    //     if(this.homeBtn)return;

    //     this.homeBtn = new cc.Node("btn_home");
    //     this.homeBtn.width = 110;
    //     this.homeBtn.height = 54;
    //     this.homeBtn.setPosition(-290, 570);
    //     this.node.addChild(this.homeBtn);

    //     let bg:cc.Graphics = this.homeBtn.addComponent(cc.Graphics);
    //     bg.fillColor = cc.color(80, 52, 112, 255);
    //     bg.strokeColor = cc.color(160, 125, 230, 255);
    //     bg.lineWidth = 4;
    //     bg.roundRect(-55, -27, 110, 54, 8);
    //     bg.fill();
    //     bg.stroke();

    //     let labelNode:cc.Node = new cc.Node();
    //     this.homeBtn.addChild(labelNode);
    //     let label:cc.Label = labelNode.addComponent(cc.Label);
    //     label.string = "主页";
    //     label.fontSize = 28;
    //     label.lineHeight = 34;
    //     label.node.color = cc.Color.WHITE;


    // }

    private onBackHome(){
        // 主动退出本局：已从主界面开始的挑战次数已经消耗；新用户首局不额外扣次数
        this.storedHealValue = 0;
        GameMain.storedHealValue = 0;
        GameMain.storedHealTipShown = false;
        GameMain.instance.reportTodayChallengeResult();
        GameMain.instance.resetRunData();
        Advertise.showBackHomeChapingByRate();
        UIManager.getInstance().closeUI(ChapterPanel);
        UIManager.getInstance().closeUI(MainPanel);
        GameMain.instance.scheduleOnce(() => {
            UIManager.getInstance().openUI(HomePanel, 0, (ui: HomePanel) => {
                ui.onShow();
            })
        }, 0.2);
    }

    private refreshAllCharmItems(){
        // 倒序移除，避免 splice 后跳过下一个道具。
        for (let i = this.allCharmItems.length - 1; i >= 0; i--){
            let charmNode:cc.Node = this.allCharmItems[i];
            if(!charmNode || !cc.isValid(charmNode)){
                this.allCharmItems.splice(i,1);
                continue;
            }

            let rewardItem:RewardItem = charmNode.getComponent(RewardItem);
            if(!rewardItem || !rewardItem.charmData)continue;

            rewardItem.charmData.useCount--;
            if (rewardItem.charmData.useCount <= 0) {
                let saveIndex:number = GameMain.charmDatas.indexOf(rewardItem.charmData);
                if(saveIndex >= 0){
                    GameMain.charmDatas.splice(saveIndex, 1);
                }
                charmNode.destroy();
                this.allCharmItems.splice(i,1);
            }
        }
    }

    private onOpenBagPanel(){
        if(GameMain.gameFinished)return;
        FaynUtils.PlayMusic("ui_button_click",false,1);
        UIManager.getInstance().openUI(BagPanel, 0, (ui: BagPanel) => {
            ui.onShow();
            ui.setInventoryData("bag");
        })
    }
    /**
     * 玩家主动弃骰重掷。
     * 第4关开始每只怪先给1次免费重掷；老玩家免费用完后，可看一次激励视频再重掷。
     */
    onReRoll(){
        FaynUtils.PlayMusic("ui_button_click",false,1);
        if(GameMain.gameFinished){
            UIManager.getInstance().openUI(TipPanel, GameMain.TIP_UI_Z_ORDER, (ui: TipPanel) => {
                ui.onShow();
                ui.showTip("当前战斗已结束",null)
            })
            return;
        }
        if(this.onRollling)return;

        if(this.canUseFreeReroll()){
            this.doRerollDices();
            return;
        }

        if(this.canUseVideoReroll()){
            this.tryVideoReroll();
            return;
        }

        let tip:string = this.getRerollDisableTip();
        GameMain.instance.showTip(tip);
        this.refreshFreeRerollBtnState();
    }

    /**
     * 执行一次真正的弃骰重掷。
     * 免费重掷和视频重掷都走这里，避免清理骰子状态的逻辑写两份。
     */
    private doRerollDices(){
        this.freeRerollUsed = true;
        this.clearCurrentDicesForReroll();
        this.rollDicesOnce(0.15, this.createBalancedRerollPoints());
    }

    /**
     * 激励视频重掷。
     * 视频成功后立刻消耗当天重掷视频次数，并执行本局第二次重掷。
     */
    private tryVideoReroll(){
        if(this.watchingRerollVideo)return;

        this.watchingRerollVideo = true;
        this.refreshFreeRerollBtnState();
        Advertise.showVideoAd((result:number) => {
            this.watchingRerollVideo = false;
            if(result !== 1){
                GameMain.instance.showTip(result === 2 ? "看完广告才能重掷" : "广告暂不可用");
                this.refreshFreeRerollBtnState();
                return;
            }

            if(!DiceGameSave.consumeDailyRerollVideoChance()){
                GameMain.instance.showTip("今日广告重掷已用完");
                this.refreshFreeRerollBtnState();
                return;
            }

            this.videoRerollUsed = true;
            this.doRerollDices();
        });
    }

    /**
     * 系统自动补骰。
     * 开局和怪物攻击后调用这里，不受“第4关才开放免费重掷”的限制。
     */
    public autoRollDices(delay:number = 1){
        if(GameMain.gameFinished || !this.monster)return;

        // 老玩家开局就可以启用每回合重发满骰；新手首局仍从第4关开始，避免破坏教学。
        if(ConstValue.ALWAYS_ROLL_FULL_DICES_EACH_TURN && !this.isNewUserRerollLocked() && this.allDicesNodes.length > 0){
            this.clearCurrentDicesForReroll();
        }
        this.rollDicesOnce(delay);
    }

    /**
     * 发出一轮骰子。
     * forcedPoints 只用于弃骰重掷的轻量控质，不改变普通发骰和固定教学骰面的规则。
     */
    private rollDicesOnce(delay:number = 1, forcedPoints:number[] = null!){
        if(this.onRollling)return;
        this.onRollling = true;
        this.diceReadyForFreeReroll = false;
        this.refreshFreeRerollBtnState();

        this.scheduleOnce(()=>{
            this.loadDices(GameMain.instance.player.curSelectedDiceType, forcedPoints);
        },delay);
    }

    /**
     * 判断当前是否允许免费弃骰重掷。
     * 只看关卡、次数和战斗状态，不掺杂骰子生成逻辑。
     */
    private canUseFreeReroll():boolean{
        if(GameMain.gameFinished || this.battlleIn || this.onRollling || !this.monster)return false;
        if(this.isNewUserRerollLocked())return false;
        if(this.freeRerollUsed)return false;
        if(!this.diceReadyForFreeReroll)return false;
        if(this.allDicesNodes.length < 5)return false;

        return true;
    }

    /**
     * 判断是否允许看激励视频重掷。
     * 新手首轮流程不开放，避免前期按钮规则过重；回主页成为老玩家后才开放。
     */
    private canUseVideoReroll():boolean{
        if(GameMain.gameFinished || this.battlleIn || this.onRollling || !this.monster)return false;
        // 老玩家从第1关开始，免费重掷用完后就可以看广告重掷；新手首局仍整轮不开放广告重掷。
        if(!this.freeRerollUsed || this.videoRerollUsed || this.watchingRerollVideo)return false;
        if(GameMain.isNewUserChapterNameFlow)return false;
        if(!this.diceReadyForFreeReroll)return false;
        if(this.allDicesNodes.length < 5)return false;
        if(DiceGameSave.getRemainDailyRerollVideoCount() <= 0)return false;

        return true;
    }

    /**
     * 获取重掷不可用时的提示文案。
     * 文案只说明当前最主要原因，避免给玩家堆太多规则。
     */
    private getRerollDisableTip():string{
        if(this.isNewUserRerollLocked())return "第4关开始可弃骰重掷";
        if(GameMain.isNewUserChapterNameFlow && this.freeRerollUsed)return "本关已重掷过";
        if(this.freeRerollUsed && this.videoRerollUsed)return "本关已重掷过";
        if(this.freeRerollUsed && DiceGameSave.getRemainDailyRerollVideoCount() <= 0)return "今日广告重掷已用完";
        if(!this.diceReadyForFreeReroll)return "骰子落定后才能重掷";
        return "本关已重掷过";
    }

    /**
     * 新手首局前3关保留教学限制；老玩家从第1关开始就允许免费重掷。
     */
    private isNewUserRerollLocked():boolean{
        return GameMain.isNewUserChapterNameFlow && GameMain.instance.getChallengeStageScore() < this.FREE_REROLL_UNLOCK_STAGE;
    }

    /**
     * 刷新弃骰重掷按钮置灰状态。
     * 新手首局前3关、已使用、结算中置灰；老玩家从第1关开始可用免费重掷。
     */
    private refreshFreeRerollBtnState(){
        if(!this.btn_onRoll || !cc.isValid(this.btn_onRoll))return;

        if(this.rerollBtnOriginColor === null){
            this.rerollBtnOriginColor = this.btn_onRoll.color;
        }

        let canReroll:boolean = this.canUseFreeReroll() || this.canUseVideoReroll();
        this.refreshRerollBtnLabel();
        this.refreshAdIconOnButton(this.btn_onRoll, this.canUseVideoReroll());
        let btnComp:cc.Button = this.btn_onRoll.getComponent(cc.Button);
        if(canReroll){
            this.btn_onRoll.opacity = 255;
            this.btn_onRoll.color = this.rerollBtnOriginColor;
            if(btnComp)btnComp.interactable = true;
        }else{
            this.btn_onRoll.opacity = 120;
            this.btn_onRoll.color = cc.color(135, 135, 135, 255);
            if(btnComp)btnComp.interactable = false;
        }
    }

    /**
     * 根据当前重掷状态刷新按钮文字。
     * 如果按钮没有 txt 文本节点，则只改置灰状态，不强依赖预制体结构。
     */
    private refreshRerollBtnLabel(){
        if(!this.btn_onRoll)return;

        let txtNode:cc.Node = this.btn_onRoll.getChildByName("txt");
        if(!txtNode || !txtNode.getComponent(cc.Label))return;

        if(this.canUseFreeReroll()){
            txtNode.getComponent(cc.Label).string = "重掷";
        }else if(this.canUseVideoReroll()){
            txtNode.getComponent(cc.Label).string = "看广告重掷";
        }else{
            txtNode.getComponent(cc.Label).string = "重掷";
        }
    }

    /**
     * 按钮下一次点击需要看广告时，动态挂一个视频图标。
     * 审核要求广告入口必须有明确标识，所以不要只靠文字说明。
     */
    private refreshAdIconOnButton(btn:cc.Node, show:boolean){
        if(!btn || !cc.isValid(btn))return;

        let iconNode:cc.Node = btn.getChildByName("ad_video_icon");
        let txtNode:cc.Node = btn.getChildByName("txt");
        this.refreshAdButtonTextLayout(btn, txtNode, show);
        if(!show){
            if(iconNode)iconNode.active = false;
            return;
        }

        if(!iconNode){
            iconNode = new cc.Node("ad_video_icon");
            let iconSize:number = btn.width <= 180 ? 36 : 44;
            iconNode.setContentSize(iconSize, iconSize);
            // 广告图标固定贴住按钮左侧内部，避免看起来像普通功能按钮。
            iconNode.x = -btn.width * 0.5 + (btn.width <= 180 ? 28 : 34);
            iconNode.y = 0;
            btn.addChild(iconNode, 20);
            iconNode.addComponent(cc.Sprite);
        }

        iconNode.active = true;
        let iconSize:number = btn.width <= 180 ? 36 : 44;
        iconNode.setContentSize(iconSize, iconSize);
        iconNode.x = -btn.width * 0.5 + (btn.width <= 180 ? 28 : 34);
        iconNode.y = 0;
        let sprite:cc.Sprite = iconNode.getComponent(cc.Sprite);
        if(sprite && !sprite.spriteFrame){
            GameMain.instance.bundle.load("arts/ui/Common/AdIcon", cc.SpriteFrame, (err, sp:cc.SpriteFrame) => {
                if(err || !sp || !iconNode || !cc.isValid(iconNode))return;
                sprite.spriteFrame = sp;
                iconNode.setContentSize(iconSize, iconSize);
            });
        }
    }

    private refreshAdButtonTextLayout(btn:cc.Node, txtNode:cc.Node, show:boolean){
        if(!btn || !txtNode || !cc.isValid(txtNode))return;

        let label:cc.Label = txtNode.getComponent(cc.Label);
        let anyTxt:any = txtNode as any;
        if(anyTxt._originAdIconX === undefined){
            anyTxt._originAdIconX = txtNode.x;
            anyTxt._originAdIconWidth = txtNode.width;
            anyTxt._originAdIconFontSize = label ? label.fontSize : 0;
        }

        if(!show){
            txtNode.x = anyTxt._originAdIconX;
            txtNode.width = anyTxt._originAdIconWidth;
            if(label && anyTxt._originAdIconFontSize > 0){
                label.fontSize = anyTxt._originAdIconFontSize;
            }
            return;
        }

        txtNode.x = anyTxt._originAdIconX + 18;
        txtNode.width = Math.max(72, btn.width - (btn.width <= 180 ? 68 : 78));
        if(label){
            label.overflow = cc.Label.Overflow.SHRINK;
            let maxFontSize:number = btn.width <= 180 ? 24 : 26;
            if(label.fontSize > maxFontSize){
                label.fontSize = maxFontSize;
            }
        }
    }

    /**
     * 战斗回血按钮运行时创建，避免为了小功能改预制体结构。
     * 两个按钮挂在血量图标同级，位置跟随血量图标。
     */
    private createBattleHealButtons(){
        if(!this.health2d || !cc.isValid(this.health2d))return;

        let parent:cc.Node = this.health2d;
        if(!this.storedHealBtn || !cc.isValid(this.storedHealBtn)){
            this.storedHealBtn = this.createSmallBattleButton("stored_heal_btn", "储血 +0");
            parent.addChild(this.storedHealBtn, 20);
            this.storedHealBtn.on(cc.Node.EventType.TOUCH_END, this.onUseStoredHeal, this);
        }
        if(!this.videoHealBtn || !cc.isValid(this.videoHealBtn)){
            this.videoHealBtn = this.createSmallBattleButton("video_heal_btn", "回到85%血");
            parent.addChild(this.videoHealBtn, 20);
            this.videoHealBtn.on(cc.Node.EventType.TOUCH_END, this.onUseVideoHeal, this);
        }

        // 回血按钮挂在血量节点下，和掉血文本同一套层级，坐标改为相对血量节点。
        this.storedHealBtn.setPosition(0, -86);
        this.videoHealBtn.setPosition(0, -154);
        this.refreshBattleHealLayer();
    }

    private createSmallBattleButton(name:string, txt:string):cc.Node{
        let btn:cc.Node = new cc.Node(name);
        btn.setContentSize(168, 54);

        let bg:cc.Graphics = btn.addComponent(cc.Graphics);
        bg.fillColor = cc.color(68, 48, 102, 230);
        bg.strokeColor = cc.color(210, 160, 70, 255);
        bg.lineWidth = 3;
        bg.roundRect(-84, -27, 168, 54, 8);
        bg.fill();
        bg.stroke();

        let labelNode:cc.Node = new cc.Node("txt");
        labelNode.setContentSize(148, 42);
        labelNode.y = 0;
        btn.addChild(labelNode);

        let label:cc.Label = labelNode.addComponent(cc.Label);
        label.string = txt;
        label.fontSize = 40;
        label.lineHeight = 40;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.overflow = cc.Label.Overflow.SHRINK;
        label.enableWrapText = true;
        labelNode.color = cc.Color.WHITE;

        btn.addComponent(cc.Button);
        return btn;
    }

    public refreshBattleHealButtonsState(){
        if(!this.health2d || !cc.isValid(this.health2d))return;
        this.createBattleHealButtons();
        this.refreshBattleHealLayer();

        let canUseHealFeature:boolean = this.canUseBattleHealFeature();
        if(this.storedHealBtn && cc.isValid(this.storedHealBtn)){
            this.storedHealBtn.active = canUseHealFeature;
        }
        if(this.videoHealBtn && cc.isValid(this.videoHealBtn)){
            this.videoHealBtn.active = canUseHealFeature;
        }
        if(!canUseHealFeature)return;

        let player:Player = GameMain.instance.player;
        let lostHp:number = player ? Math.max(player.totalHp - player.curHP, 0) : 0;
        this.refreshStoredHealBtn(lostHp);
        this.refreshVideoHealBtn(player, lostHp);
    }

    private refreshBattleHealLayer(){
        if(!this.health2d || !cc.isValid(this.health2d))return;

        // 回血按钮和掉血文本都挂在血量节点下；按钮低一些，掉血文本在 Player 里提到更高层。
        if(this.storedHealBtn && cc.isValid(this.storedHealBtn)){
            this.storedHealBtn.zIndex = 20;
            this.storedHealBtn.setSiblingIndex(20);
        }
        if(this.videoHealBtn && cc.isValid(this.videoHealBtn)){
            this.videoHealBtn.zIndex = 20;
            this.videoHealBtn.setSiblingIndex(20);
        }
    }

    private canUseBattleHealFeature():boolean{
        // 新手首次自动进入的前3关不开放血袋和广告回血；第4关开始开放。
        if(GameMain.isNewUserChapterNameFlow && GameMain.instance.getChallengeStageScore() < this.FREE_REROLL_UNLOCK_STAGE){
            return false;
        }

        return true;
    }

    private refreshStoredHealBtn(lostHp:number){
        if(!this.storedHealBtn || !cc.isValid(this.storedHealBtn))return;

        let label:cc.Label = this.getButtonLabel(this.storedHealBtn);
        if(label){
            label.string = this.storedHealValue > 0 ? `血袋 +${this.storedHealValue}` : "血袋为空";
        }

        // 有储血但满血时不清零，只提示生命已满。
        let canUse:boolean = this.storedHealValue > 0 && !GameMain.gameFinished && !this.watchingHealVideo;
        // 没有储血时必须立刻置灰，避免玩家误以为还能点击回血。
        this.setSmallBattleButtonState(this.storedHealBtn, canUse, canUse && lostHp > 0);
    }

    private refreshVideoHealBtn(player:Player, lostHp:number){
        if(!this.videoHealBtn || !cc.isValid(this.videoHealBtn))return;

        let targetHp:number = player ? Math.ceil(player.totalHp * this.VIDEO_HEAL_TARGET_HP_RATE) : 0;
        let canUse:boolean = !!player && player.curHP < targetHp && lostHp > 0 && !GameMain.gameFinished && !this.watchingHealVideo;
        this.setSmallBattleButtonState(this.videoHealBtn, canUse, canUse);
        // 广告回血按钮本身就是广告入口，置灰时也保留视频 icon。
        this.refreshAdIconOnButton(this.videoHealBtn, true);
    }

    private setSmallBattleButtonState(btn:cc.Node, interactable:boolean, bright:boolean){
        if(!btn || !cc.isValid(btn))return;

        btn.opacity = bright ? 255 : 120;
        let button:cc.Button = btn.getComponent(cc.Button);
        if(button){
            button.interactable = interactable;
        }
    }

    private getButtonLabel(btn:cc.Node):cc.Label{
        if(!btn || !cc.isValid(btn))return null!;
        let txtNode:cc.Node = btn.getChildByName("txt");
        return txtNode ? txtNode.getComponent(cc.Label) : null!;
    }

    private showHealTip(txt:string, delayTime:number = 1.5){
        UIManager.getInstance().openUI(TipPanel, GameMain.TIP_UI_Z_ORDER, (ui:TipPanel) => {
            ui.onShow();
            ui.showTip(txt, null, false, delayTime);
        });
    }

    private onUseStoredHeal(){
        if(!this.canUseBattleHealFeature())return;
        if(GameMain.gameFinished)return;
        if(this.storedHealValue <= 0){
            this.showHealTip("攻击未击杀怪物时，会储存少量回血");
            return;
        }

        let player:Player = GameMain.instance.player;
        let lostHp:number = Math.max(player.totalHp - player.curHP, 0);
        if(lostHp <= 0){
            GameMain.instance.showTip("生命已满");
            return;
        }

        let healValue:number = Math.min(this.storedHealValue, lostHp);
        this.storedHealValue = 0;
        GameMain.storedHealValue = 0;
        player.addHp(healValue);
        this.showHealTip(`血袋恢复了 ${healValue} 点生命`);
        this.refreshBattleHealButtonsState();
    }

    private onUseVideoHeal(){
        if(!this.canUseBattleHealFeature())return;
        if(GameMain.gameFinished || this.watchingHealVideo)return;

        let player:Player = GameMain.instance.player;
        let targetHp:number = Math.ceil(player.totalHp * this.VIDEO_HEAL_TARGET_HP_RATE);
        if(player.curHP >= targetHp){
            GameMain.instance.showTip("血量已高于85%");
            this.refreshBattleHealButtonsState();
            return;
        }

        this.watchingHealVideo = true;
        this.refreshBattleHealButtonsState();
        Advertise.showVideoAd((result:number) => {
            this.watchingHealVideo = false;
            if(result !== 1){
                GameMain.instance.showTip(result === 2 ? "看完广告才能回血" : "广告暂不可用");
                this.refreshBattleHealButtonsState();
                return;
            }

            let curPlayer:Player = GameMain.instance.player;
            let curTargetHp:number = Math.ceil(curPlayer.totalHp * this.VIDEO_HEAL_TARGET_HP_RATE);
            let healValue:number = Math.max(curTargetHp - curPlayer.curHP, 0);
            if(healValue <= 0){
                GameMain.instance.showTip("血量已高于85%");
                this.refreshBattleHealButtonsState();
                return;
            }

            curPlayer.addHp(healValue);
            GameMain.instance.showTip(`恢复了 ${healValue} 点生命`);
            this.refreshBattleHealButtonsState();
        });
    }

    private addStoredHealByDamage(realDamage:number){
        if(!this.canUseBattleHealFeature())return;
        if(realDamage <= 0 || GameMain.gameFinished)return;

        let player:Player = GameMain.instance.player;
        let maxStored:number = Math.floor(player.totalHp * this.STORED_HEAL_MAX_HP_RATE);
        if(maxStored <= 0)return;

        let addValue:number = Math.floor(realDamage * this.STORED_HEAL_DAMAGE_RATE);
        if(addValue <= 0){
            addValue = 1;
        }

        let oldStoredHealValue:number = this.storedHealValue;
        this.storedHealValue = Math.min(maxStored, this.storedHealValue + addValue);
        GameMain.storedHealValue = this.storedHealValue;
        let realAddValue:number = this.storedHealValue - oldStoredHealValue;
        if(realAddValue <= 0){
            this.refreshBattleHealButtonsState();
            return;
        }
        this.refreshBattleHealButtonsState();
        if(!this.storedHealTipShown){
            this.storedHealTipShown = true;
            GameMain.storedHealTipShown = true;
            this.showHealTip(`血袋储存了 ${realAddValue} 点回血，可在危险时使用`, 3);
        }
    }

    /**
     * 弃骰重掷前清理当前桌面骰子和选择反馈。
     * 所有数组重新赋值，避免旧骰子节点销毁后还被后续计算引用。
     */
    private clearCurrentDicesForReroll(){
        for(let i = 0; i < this.allDicesNodes.length; i++){
            let diceNode:cc.Node = this.allDicesNodes[i];
            if(!diceNode || !cc.isValid(diceNode))continue;

            cc.Tween.stopAllByTarget(diceNode);
            let viewNode:cc.Node = diceNode.getChildByName("view");
            if(viewNode)cc.Tween.stopAllByTarget(viewNode);
            diceNode.destroy();
        }

        this.allDicesNodes = [];
        this.selectedDicePoint = [];
        this.selectedDice = [];
        this.curDiceHandResult = null!;
        this.calculateData = null!;
        this.unusePointCount = 5;
        this.refreshAllUIText(0, 0, 0, null, true);
        this.refreshShieldDamageTip(0, 0);
        this.hideBattleWarningEffects();

        let handWordNode:cc.Node = this.node.getChildByName("GamingContainer").getChildByName("handwords");
        if(handWordNode){
            cc.Tween.stopAllByTarget(handWordNode);
            handWordNode.active = false;
            let sp:cc.Sprite = handWordNode.getComponent(cc.Sprite);
            if(sp)sp.spriteFrame = null!;
        }
    }

    /**
     * 生成一组中等强度的弃骰点数。
     * 目标是避免“完全没牌型”和“直接大爆发”，让重掷像一次补救机会，不像系统送赢。
     */
    private createBalancedRerollPoints():number[]{
        let fallback:number[] = [2, 2, 4, 5, 1];

        for(let i = 0; i < 24; i++){
            let points:number[] = [];
            for(let j = 0; j < 5; j++){
                points.push(randomInt(1, 7));
            }

            let result:DiceHandResult = getDiceHandResult(points);
            if(result.type === DiceHandType.Pair || result.type === DiceHandType.Three){
                return points.slice();
            }
        }

        return fallback.slice();
    }

    private onStartBattle() {
        if(this.attackBtnLocked)return;

        if(this.selectedDice.length<=0){
            UIManager.getInstance().openUI(TipPanel, GameMain.TIP_UI_Z_ORDER, (ui: TipPanel) => {
                ui.onShow();
                ui.showTip("请选择至少一个骰子",null)
            })
            return;
        }
        if(this.firstGuideActive && this.curDiceHandResult.type !== DiceHandType.Pair){
            GameMain.instance.showTip("先凑成对子，再点击攻击");
            return;
        }
        if (this.battlleIn) return;
        FaynUtils.PlayMusic("ui_button_click",false,1);
        this.battlleIn = true;
        this.resetDiceHandFeedback();
        this.setAttackBtnLocked(true);
        this.refreshBattleWarningEffects();
        if(this.testip){
            this.getGuideTipRoot().active = false;
        }
        let data = GetCalculateMultiple(this.curDiceHandResult.type);
        // 拷贝一份参与计算的点数，避免后续选择状态变化影响本次结算。
        let allPoint: number[] = this.curDiceHandResult.usedDicePoint.slice();
        let unusePoint: number[] = this.curDiceHandResult.unusedDicePoint.slice();
        let totalPoint = data.totalPoints;
        let totalMul = data.totalMultiple;

        this.calculateData.totalPoints = totalPoint + GameMain.extraPoint;
        this.calculateData.totalMultiple = totalMul + GameMain.extraMultiple;

        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        this.refreshTempBuffLabel();
        let totalAttack = 0;
        let processedDice = new Set<cc.Node>();
        for (let i = 0; i < allPoint.length; i++) {
            const element = allPoint[i];
            // 下面的判断是参与战斗的骰子是不是三选一的特殊骰子，是的话，直接按照类型以及对应的逻辑增加各种值
            this.selectedDice.forEach((d: cc.Node) => {
                if (d.getComponent(Dice).finalIndex === element && !processedDice.has(d)) {
                    processedDice.add(d);
                    this.calculateData.totalPoints += element;
                    let diceTipPos:cc.Vec2 = this.getNodeTopTipPos(d, this.node, 25);
                    this.loadTip(diceTipPos, element,cc.Color.WHITE,this.node);
                    if (d.getComponent(Dice).diceType === DiceType.fire) {
                        totalAttack += 3;
                        this.loadTip(diceTipPos, 3,cc.Color.RED,this.node);
                    }
                    if(d.getComponent(Dice).diceType === DiceType.mult){
                        this.calculateData.totalMultiple += 1
                    }
                    if(d.getComponent(Dice).diceType === DiceType.heal){
                        GameMain.instance.player.addHp(5);
                    }
                }
            });
        }

        this.allCharmItems.forEach((charm)=>{
            let cData:CharmData = charm.getComponent(RewardItem).charmData;
            if(cData.useCount>0){
                this.loadTip(new cc.Vec2(0, (charm.height + 10) * charm.scale), cData.num,cc.Color.RED,charm);
            }
        })

        console.log("最终攻击力为:" + totalAttack);

        this.scheduleOnce(()=>{
            this.refreshAllUIText(this.calculateData.totalPoints, this.calculateData.totalMultiple,totalAttack, () => {
                let _sword = this.node.getChildByName("GamingContainer").getChildByName("sword")
                let oldIndex = _sword.getSiblingIndex();
                this.cacheSwordOrigin(_sword);
                let swordAttackY:number = this.swordOriginPos.y + 482.3;

                this.attackVisualPlaying = true;
                this.hideHandWordForAttack();
                this.hideSwordFeverForAttack();
                _sword.setSiblingIndex(999)
                FaynUtils.PlayMusic("sword_attack",false,1);
                // 宝剑攻击动画：从当前编辑器位置出发，攻击结束后回到记录的位置，避免 UI 调整后被旧坐标拉偏。
                cc.tween(_sword)
                    .parallel(
                        cc.tween().to(0.25, { y: swordAttackY }),
                        cc.tween().to(0.25, { scale: this.swordOriginScale * 1.05})
                    )
                    .call(() => {
                        // 剑先飞出，再突出最终攻击力，顺序上更像“本次攻击已经打出去”。
                        let rawAttack:number = this.getFinalAttackWithEventBonus(this.calculateData.totalPoints * this.calculateData.totalMultiple + totalAttack);
                        let realDamage:number = this.getRealDamageAfterShield(rawAttack);
                        this.refreshShieldDamageTip(rawAttack, realDamage);
                        this.playTotalAttackFocus(realDamage);
                    })
                    .to(0.15, { scale: this.swordOriginScale})
                    .delay(0.4)
                    .to(0.15, { angle: -30 })
                    .to(0.15, { angle: 80 })
                    .call(() => {
                        this.processAttackMonster(allPoint,totalAttack)// 处理攻击怪物逻辑
                    })
                    .to(0.15, { angle: 0 })
                    .delay(0.3)
                    .parallel(
                        cc.tween().to(0.15, { x: this.swordOriginPos.x, y: this.swordOriginPos.y }),
                        cc.tween().to(0.25, { scale: this.swordOriginScale * 1.05})
                    )
                    .to(0.15, { scale: this.swordOriginScale})
                    .call(() => {
                        _sword.setPosition(this.swordOriginPos);
                        _sword.scale = this.swordOriginScale;
                        _sword.angle = 0;
                        _sword.setSiblingIndex(oldIndex);
                        this.finishAttackUiAfterSwordBack();
                        if(this.monster && this.monster.getCurHp() > 0){
                            this.monster.doAttackAction();
                        }
                    })
                    .start()
            }, false);
        },0.2);

    }

    /**
     * 战斗界面主动分享。
     * 只触发微信分享，不改挑战次数、复活次数和战斗状态。
     */
    private onShareGame(){
        ShareManager.shareFromScene("battle_share");
    }

    /**
     * 战斗界面打开评价与推荐。
     * 微信能力判断在 RecommendManager 内部处理，避免战斗界面直接依赖 wx API。
     */
    private onOpenRecommend(){
        RecommendManager.openRecommend();
    }

    switchHandType(type:string){
        let _path = "arts/handwords/" + (type.toLowerCase());
        let handWordNode:cc.Node = this.node.getChildByName("GamingContainer").getChildByName("handwords");
        handWordNode.active = true;
        cc.Tween.stopAllByTarget(handWordNode);
        // 牌型成立时，艺术字原地弹一下，最后回到稍大的基础尺寸，避免显示太憋屈。
        let handWordBaseScale:number = 1.16;
        handWordNode.scale = handWordBaseScale;
        cc.tween(handWordNode)
            .to(0.12,{scale:handWordBaseScale * 1.28},{easing:"backOut"})
            .to(0.08,{scale:handWordBaseScale * 0.94})
            .to(0.08,{scale:handWordBaseScale})
            .start()
        GameMain.instance.bundle.load(_path, cc.SpriteFrame,(err,sp:cc.SpriteFrame)=>{
            handWordNode.getComponent(cc.Sprite).spriteFrame = sp;
        })
    }

    /**
     * 剑出击后隐藏牌型艺术字。
     * 牌型字用于选择反馈，进入攻击表现后应该让位给最终攻击力和剑动画。
     */
    private hideHandWordForAttack(){
        let gamingContainer:cc.Node = this.node.getChildByName("GamingContainer");
        if(!gamingContainer)return;

        let handWordNode:cc.Node = gamingContainer.getChildByName("handwords");
        if(!handWordNode || !cc.isValid(handWordNode))return;

        cc.Tween.stopAllByTarget(handWordNode);
        handWordNode.active = false;
    }

    /**
     * 剑开始攻击后隐藏剑狂热特效。
     * 攻击阶段的视觉重点交给宝剑、攻击按钮和可斩杀艺术字，避免特效抢主反馈。
     */
    private hideSwordFeverForAttack(){
        this.setSwordFeverVisible(0);
    }

    playHandFormFeedback(){
        this.resetDiceHandFeedback();

        if(!this.curDiceHandResult || this.curDiceHandResult.type <= DiceHandType.None){
            this.refreshAttackBtnState(false);
            this.refreshBattleWarningEffects();
            return;
        }

        this.refreshAttackBtnState(true);
        this.playUsedDiceFeedback();
        this.playAttackBtnReadyFeedback();
        this.refreshBattleWarningEffects();
    }

    private resetDiceHandFeedback(){
        for (let i = 0; i < this.allDicesNodes.length; i++) {
            let diceNode:cc.Node = this.allDicesNodes[i];
            if(!diceNode || !cc.isValid(diceNode))continue;

            cc.Tween.stopAllByTarget(diceNode);
            diceNode.scale = 1;

            let viewNode:cc.Node = diceNode.getChildByName("view");
            if(viewNode && cc.isValid(viewNode)){
                cc.Tween.stopAllByTarget(viewNode);
                viewNode.scale = 1;
                viewNode.color = cc.Color.WHITE;
            }
        }
    }

    private playUsedDiceFeedback(){
        let usedPoints:number[] = this.curDiceHandResult.usedDicePoint.slice();

        for (let i = 0; i < this.selectedDice.length; i++) {
            let diceNode:cc.Node = this.selectedDice[i];
            if(!diceNode || !cc.isValid(diceNode))continue;

            let dice:Dice = diceNode.getComponent(Dice);
            let usedIndex:number = usedPoints.indexOf(dice.finalIndex);
            if(usedIndex < 0)continue;

            usedPoints.splice(usedIndex, 1);
            // 只强化真正参与牌型的骰子，未参与的已选骰子不抢反馈。
            cc.tween(diceNode)
                .to(0.1, { scale: 1.18 }, { easing: "backOut" })
                .to(0.08, { scale: 1 })
                .start();

            let viewNode:cc.Node = diceNode.getChildByName("view");
            if(viewNode && cc.isValid(viewNode)){
                cc.tween(viewNode)
                    .to(0.08, { scale: 1.08 })
                    .call(() => {
                        viewNode.color = cc.color(255, 230, 120, 255);
                    })
                    .delay(0.12)
                    .call(() => {
                        viewNode.color = cc.Color.WHITE;
                    })
                    .to(0.08, { scale: 1 })
                    .start();
            }
        }
    }

    private playAttackBtnReadyFeedback(){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;

        if(this.attackBtnOriginScale === null){
            this.attackBtnOriginScale = this.btn_start.scale;
        }

        cc.Tween.stopAllByTarget(this.btn_start);
        this.btn_start.scale = this.attackBtnOriginScale;
        cc.tween(this.btn_start)
            .to(0.1, { scale: this.attackBtnOriginScale * 1.12 }, { easing: "backOut" })
            .to(0.08, { scale: this.attackBtnOriginScale })
            .start();
    }

    private resetAttackBtnFeedback(){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;

        cc.Tween.stopAllByTarget(this.btn_start);
        this.attackBtnKillReadyPlaying = false;
        if(this.attackBtnOriginScale !== null){
            this.btn_start.scale = this.attackBtnOriginScale;
        }
    }

    private refreshAttackBtnState(canAttack:boolean){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;
        if(this.attackBtnLocked)return;

        if(this.attackBtnOriginScale === null){
            this.attackBtnOriginScale = this.btn_start.scale;
        }
        if(this.attackBtnOriginColor === null){
            this.attackBtnOriginColor = this.btn_start.color;
        }

        this.resetAttackBtnFeedback();
        if(canAttack){
            this.btn_start.opacity = 255;
            this.btn_start.color = this.attackBtnOriginColor;
        }else{
            // 无有效牌型时只做视觉置灰，不禁止点击，保留原来的提示逻辑。
            this.btn_start.opacity = 145;
            this.btn_start.color = cc.color(150, 150, 150, 255);
        }
    }

    /**
     * 设置攻击按钮结算锁定态。
     * 只在有效攻击已经开始后禁用触摸，避免玩家在剑动画和结算期间重复点击。
     */
    private setAttackBtnLocked(locked:boolean){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;
        if(this.attackBtnLocked === locked)return;

        this.attackBtnLocked = locked;
        let btnComp:cc.Button = this.btn_start.getComponent(cc.Button);

        if(locked){
            this.unschedule(this.unlockAttackBtnWhenStuck);
            this.resetAttackBtnFeedback();
            this.btn_start.opacity = 120;
            this.btn_start.color = cc.color(120, 120, 120, 255);
            this.btn_start.pauseSystemEvents(true);
            if(btnComp){
                btnComp.interactable = false;
            }
            // 只防真正卡死：正常攻击结算远小于这个时间，不会干扰本地开发的正常延迟。
            this.scheduleOnce(this.unlockAttackBtnWhenStuck, this.ATTACK_LOCK_TIMEOUT);
        }else{
            this.unschedule(this.unlockAttackBtnWhenStuck);
            this.btn_start.resumeSystemEvents(true);
            if(btnComp){
                btnComp.interactable = true;
            }
        }
    }

    /**
     * 攻击结算异常卡住时自动恢复按钮。
     * 正常流程会主动解锁，这里只作为长时间无响应的兜底。
     */
    private unlockAttackBtnWhenStuck(){
        if(!this.attackBtnLocked || GameMain.gameFinished)return;

        this.attackBtnLocked = false;
        this.battlleIn = false;
        this.onRollling = false;
        this.attackVisualPlaying = false;
        this.restoreTotalAttackFocus();
        this.restoreSwordOrigin();
        this.refreshAttackBtnState(false);
        GameMain.instance.showTip("攻击结算异常，已恢复操作");
    }

    /**
     * 控制可斩杀状态下的攻击按钮循环弹动。
     * 只改按钮缩放，不影响按钮点击、伤害计算和原有攻击流程。
     */
    private setAttackBtnKillReadyAnim(show:boolean){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;

        if(this.attackBtnOriginScale === null){
            this.attackBtnOriginScale = this.btn_start.scale;
        }

        if(show){
            if(this.attackBtnKillReadyPlaying)return;

            this.attackBtnKillReadyPlaying = true;
            cc.Tween.stopAllByTarget(this.btn_start);
            this.btn_start.scale = this.attackBtnOriginScale;
            cc.tween(this.btn_start)
                .repeatForever(
                    cc.tween()
                        .to(0.12, { scale: this.attackBtnOriginScale * 1.16 }, { easing: "backOut" })
                        .to(0.08, { scale: this.attackBtnOriginScale * 0.98 })
                        .to(0.08, { scale: this.attackBtnOriginScale })
                        .delay(0.45)
                )
                .start();
        }else{
            if(!this.attackBtnKillReadyPlaying)return;

            this.attackBtnKillReadyPlaying = false;
            cc.Tween.stopAllByTarget(this.btn_start);
            this.btn_start.scale = this.attackBtnOriginScale;
        }
    }
    private cameraShake(h:number){
        let _cam = cc.find("Canvas/MainCamera").getComponent(cc.Camera);
        cc.tween(_cam)
            .to(0.15, { zoomRatio: h })
            .call(() => {
                _cam.zoomRatio = 1;
            })
            .start()
    }
    private processAttackMonster(allPoint: number[], calculatorAttack: number) {
        let totalAttack: number = this.calculateData.totalPoints * this.calculateData.totalMultiple;
        console.log("开始攻击，攻击力为" + totalAttack);
        let finalAttack = this.getFinalAttackWithEventBonus(totalAttack + calculatorAttack);
        let realDamage:number = this.getRealDamageAfterShield(finalAttack);
        GameMain.extraDamageRate = 0;
        this.refreshTempBuffLabel();
        console.log("最终真实准备造成的伤害" + realDamage);
        DiceGameSave.recordDamage(realDamage);
        GameMain.instance.reportBestDamage(DiceGameSave.getBestDamage());
        this.applyAttackDamageAndCleanup(allPoint, finalAttack, realDamage);
    }

    /**
     * 真正执行扣血、震屏、移除骰子和重置战斗状态。
     * 斩杀预告会延迟调用这里，普通攻击会立即调用这里。
     */
    private applyAttackDamageAndCleanup(allPoint: number[], finalAttack:number, realDamage:number){
        // 只要本次造成了真实伤害，就进入血袋；斩杀怪物也应该给玩家留下本次挑战资源。
        this.addStoredHealByDamage(realDamage);
        this.monster.beHurt(finalAttack);

        let finalScale = Math.min((1.0 + (realDamage * 0.03 / 10)),1.2)
        this.cameraShake(finalScale);

        for (let i = 0; i < this.selectedDice.length; i++) {
            const d = this.selectedDice[i];// 已选择的所有骰子
            const point = d.getComponent(Dice).finalIndex;// 已选择的那个骰子的点数
            if(allPoint.includes(point)){// 已选择的那个骰子的点数是否在已参与战斗的骰子点数列表中
                d.destroy();
                let diceIndex:number = this.allDicesNodes.indexOf(d);
                if(diceIndex >= 0){
                    this.allDicesNodes.splice(diceIndex,1)// 移除这个骰子
                }
            }else {
                d.getComponent(Dice).setDeSelected();
            }
        }

        // 重置选中的骰子点数
        this.selectedDicePoint = [];
        this.selectedDice=[];
        this.curDiceHandResult = null!;
        this.calculateData = null!;
        this.refreshBattleWarningEffects();
        this.refreshAllCharmItems();// 移除底部所有已使用的charm
        this.unusePointCount = 5 - this.allDicesNodes.length;
        this.node.getChildByName("GamingContainer").getChildByName("handwords").getComponent(cc.Sprite).spriteFrame = null!;
        if(!this.attackVisualPlaying){
            this.finishAttackUiAfterSwordBack();
        }
    }

    /**
     * 播放一次攻击按钮附近的斩杀特效。
     * 只作为点击攻击后的瞬间反馈，不再提前常驻显示，避免半成品伤害导致误判。
     */
    private playKillReadyEffectOnce(){
        if(!this.killReadyEffectNode || !cc.isValid(this.killReadyEffectNode))return;

        cc.Tween.stopAllByTarget(this.killReadyEffectNode);
        let originScale:number = this.killReadyEffectOriginScale !== null ? this.killReadyEffectOriginScale : this.killReadyEffectNode.scale;
        this.killReadyEffectOriginScale = originScale;
        this.killReadyEffectNode.active = true;
        this.killReadyEffectNode.opacity = 255;
        this.killReadyEffectNode.scale = originScale * 0.75;
        cc.tween(this.killReadyEffectNode)
            .to(0.12, { scale: originScale * 1.35, opacity: 255 }, { easing: "backOut" })
            .to(0.12, { scale: originScale, opacity: 120 })
            .to(0.08, { opacity: 0 })
            .call(() => {
                if(!this.killReadyEffectNode || !cc.isValid(this.killReadyEffectNode))return;
                this.killReadyEffectNode.active = false;
            })
            .start();
    }

    private loadGame() {
        this.waitingLoadChapter = true;
        this.tryLoadChapterAfterDataReady();
    }

    loadData(){
        this.allMonsterDatas = [];
        this.allCharmDatas = [];
        this.monsterDataLoaded = false;
        CreateChapter.init();

        GameMain.instance.bundle.load("datas/monster", cc.JsonAsset, (err, json) => {
            if(!this.node || !cc.isValid(this.node))return;
            if(err || !json || !json.json || !json.json.monster){
                console.error("怪物数据加载失败:", err);
                GameMain.instance.showTip("怪物数据加载失败，请稍后重试");
                return;
            }

            let _json = json.json;
            for (let i = 0; i < _json.monster.length; i++) {
                let permonsterData = _json.monster[i];
                let newMonsterData: MonsterData = new MonsterData();
                newMonsterData.id = permonsterData.id;
                newMonsterData.name = permonsterData.name;
                newMonsterData.stage = permonsterData.stage;
                newMonsterData.hp = permonsterData.hp;
                newMonsterData.shiled = permonsterData.shiled;
                newMonsterData.attack = permonsterData.attack;
                newMonsterData.gold = permonsterData.gold;
                newMonsterData.asset = permonsterData.asset;
                if(permonsterData.behaviorData != null && permonsterData.behaviorData != undefined){
                    newMonsterData.behaviorData = permonsterData.behaviorData;
                }
                this.allMonsterDatas.push(newMonsterData);
            }
            this.monsterDataLoaded = true;
            this.tryLoadChapterAfterDataReady();
        })
        GameMain.instance.bundle.load("datas/charm", cc.JsonAsset, (err, json) => {
            if(!this.node || !cc.isValid(this.node))return;
            if(err || !json || !json.json || !json.json.charms){
                console.error("道具数据加载失败:", err);
                GameMain.instance.showTip("道具数据加载失败，部分奖励暂不可用");
                return;
            }

            let _json = json.json;
            for (let i = 0; i < _json.charms.length; i++) {
                let percharmData = _json.charms[i];
                let newCharmData: CharmData = new CharmData();
                newCharmData.id = percharmData.id;
                newCharmData.name = percharmData.name;
                newCharmData.type = percharmData.type;
                newCharmData.desc = percharmData.desc;
                newCharmData.effect = percharmData.effect;
                newCharmData.num = percharmData.num;
                newCharmData.icon = percharmData.icon;
                newCharmData.useCount = percharmData.useCount;
                this.allCharmDatas.push(newCharmData);
            }
        })
    }

    /**
     * 等怪物数据加载完成后再打开章节选择。
     * 手机扫码真机加载比浏览器慢，不能用固定延迟，否则第2关卡片会拿不到怪物数据。
     */
    private tryLoadChapterAfterDataReady(){
        if(!this.waitingLoadChapter)return;
        if(!this.monsterDataLoaded)return;

        this.waitingLoadChapter = false;
        this.loadChapter();
    }

    loadDices(dTypes:DiceType[], forcedDicePoints:number[] = null!) {
        if(!dTypes || dTypes.length <= 0){
            this.onRollling = false;
            this.diceReadyForFreeReroll = false;
            this.refreshFreeRerollBtnState();
            GameMain.instance.showTip("骰子数据为空，请重新进入");
            return;
        }

        GameMain.instance.bundle.load("prefab/dice", cc.Prefab, (err, prefab: cc.Prefab) => {
            if(!this.node || !cc.isValid(this.node))return;
            if (err || !prefab) {
                console.error("骰子预制体加载失败:", err);
                this.onRollling = false;
                this.diceReadyForFreeReroll = false;
                this.refreshFreeRerollBtnState();
                GameMain.instance.showTip("骰子加载失败，请重试");
                return;
            }
            let oldPoionts: cc.Vec2[] = []
            this.allDicesNodes.forEach(d => {
                oldPoionts.push(new cc.Vec2(d.x, d.y))
            })
            let points: cc.Vec2[] = getNoOverlapDicePositions(
                this.unusePointCount,
                {
                    minX: -192,
                    maxX: 192,
                    minY: -33,
                    maxY: 220,
                },
                80,
                300,
                oldPoionts
            );
            if(this.unusePointCount > 0 && points.length <= 0){
                this.onRollling = false;
                this.diceReadyForFreeReroll = false;
                this.refreshFreeRerollBtnState();
                GameMain.instance.showTip("骰子落点生成失败，请重试");
                return;
            }

            let createCount:number = Math.min(this.unusePointCount, points.length);
            this.playDiceRollSoundByCount(createCount);
            for (let i = 0; i < createCount; i++) {
                let btn_openDicePackagePos = this.node.getChildByName("GamingContainer").getChildByName("btn_openDicePackage");
                // 固定点数要在tween回调前先取好，否则标记位提前变化会导致首轮也变随机
                let fixedPoint:number = forcedDicePoints && forcedDicePoints[i] ? forcedDicePoints[i] : this.getFixedDicePoint(i);
                cc.tween(btn_openDicePackagePos)
                    .delay(i * 0.2)
                    .to(0.2, { scale: 1.2 })
                    .call(() => {
                        btn_openDicePackagePos.scale = 1;
                        let random: number = randomInt(0, dTypes.length)
                        let newDice: cc.Node = cc.instantiate(prefab)
                        this.node.getChildByName("GamingContainer").addChild(newDice);
                        this.allDicesNodes.push(newDice);
                        const diceComp = newDice.getComponent(Dice);
                        if (diceComp) {
                            diceComp.init(new cc.Vec2(btn_openDicePackagePos.x, btn_openDicePackagePos.y), points[i], i, dTypes[random], fixedPoint);
                        } else {
                            console.error(`第${i + 1}个骰子组件获取失败`);
                        }
                    })
                    .start()
            }

            // 等最后一颗骰子落地并结束滚动后再释放，避免玩家在点数未稳定时再次重掷。
            let unlockDelay:number = createCount > 0 ? (createCount - 1) * 0.2 + 1.25 : 0;
            this.scheduleOnce(() => {
                this.onRollling = false;
                this.diceReadyForFreeReroll = createCount > 0;
                this.refreshFreeRerollBtnState();
            }, unlockDelay);

            if(this.getCurBattleFixedDicePoints().length > 0 && this.hasUsedFixedDicePoints == false){
                this.hasUsedFixedDicePoints = true;
                this.tryStartFirstGuide();
            }
            this.refreshFreeRerollBtnState();
        })
    }

    /**
     * 一轮发骰只播放一次滚动音效。
     * 时长按最后一颗骰子飞入并完成滚动计算，不按骰子数量简单相乘，避免5颗骰子拖到4秒多。
     */
    private playDiceRollSoundByCount(createCount:number){
        if(createCount <= 0)return;

        let diceCreateGap:number = 0.2;
        let diceFlyTime:number = 0.3;
        let diceRollTime:number = 0.85;
        let soundDuration:number = (createCount - 1) * diceCreateGap + diceFlyTime + diceRollTime;
        soundDuration = Math.min(soundDuration, 2.0);
        FaynUtils.PlayMusicForDuration("dice_roll", soundDuration, 1);
    }

    private tryStartFirstGuide(){
        if(DiceGameSave.hasFinishFirstGuide())return;
        if(!GameMain.isNewUserFirstPlay)return;
        if(GameMain.curChapterIndex !== 0 || GameMain.curStageIndex !== 0)return;

        this.firstGuideActive = true;
        this.showFirstGuideText("点选两个6点骰子，凑成对子", false);
    }

    private showFirstGuideText(text:string, nearAttackBtn:boolean = false){
        if(!this.testip)return;

        let guideRoot:cc.Node = this.getGuideTipRoot();
        guideRoot.active = true;
        guideRoot.opacity = 255;
        guideRoot.zIndex = 999;
        this.testip.node.active = true;
        this.testip.node.opacity = 255;
        this.testip.node.zIndex = 1;
        this.testip.string = text;
        this.testip.fontSize = 30;
        if(nearAttackBtn){
            this.moveGuideTextToAttackBtnBottom();
        }else{
            this.resetGuideTextPos();
        }
    }

    /**
     * 隐藏新手引导提示。
     * 重新进 MainPanel、失败、回主页时都要清掉，避免上一次提示残留到老玩家流程。
     */
    public hideFirstGuideText(){
        if(!this.testip)return;

        let guideRoot:cc.Node = this.getGuideTipRoot();
        if(guideRoot && cc.isValid(guideRoot)){
            cc.Tween.stopAllByTarget(guideRoot);
            guideRoot.active = false;
            guideRoot.opacity = 255;
        }
        if(this.testip.node && cc.isValid(this.testip.node)){
            cc.Tween.stopAllByTarget(this.testip.node);
            this.testip.node.active = false;
            this.testip.node.opacity = 255;
        }
    }

    private resetGuideTextPos(){
        if(!this.testip || !this.firstGuideTextOriginPos)return;
        this.getGuideTipRoot().setPosition(this.firstGuideTextOriginPos);
    }

    private moveGuideTextToAttackBtnBottom(){
        if(!this.testip || !this.btn_start || !this.btn_start.parent)return;

        // 攻击按钮和提示文本可能不在同一父节点下，先转世界坐标，再转回提示文本父节点坐标。
        let guideRoot:cc.Node = this.getGuideTipRoot();
        if(!guideRoot.parent)return;
        let btnWorldPos:cc.Vec2 = this.btn_start.parent.convertToWorldSpaceAR(this.btn_start.position);
        let worldPos:cc.Vec2 = new cc.Vec2(btnWorldPos.x, btnWorldPos.y - 52);
        let localPos:cc.Vec2 = guideRoot.parent.convertToNodeSpaceAR(worldPos);
        guideRoot.setPosition(localPos);
    }

    private getGuideTipRoot():cc.Node{
        if(this.testip && this.testip.node.parent && this.testip.node.parent.name === "TipBg"){
            return this.testip.node.parent;
        }

        return this.testip.node;
    }

    refreshFirstGuideAfterSelect(){
        if(!this.firstGuideActive)return;

        if(!this.curDiceHandResult || this.selectedDice.length <= 0){
            this.showFirstGuideText("点选两个6点骰子，凑成对子", false);
            return;
        }

        if(this.curDiceHandResult.type === DiceHandType.Pair){
            this.showFirstGuideText("对子已组成，点击攻击↑", true);
            this.playGuideAttackBtnTip();
        }else{
            this.showFirstGuideText("继续点另一个相同点数骰子", false);
        }
    }

    private playGuideAttackBtnTip(){
        if(!this.btn_start)return;

        // 只做一次轻微缩放提示，不改变按钮原始缩放值。
        let oldScale:number = this.btn_start.scale;
        cc.tween(this.btn_start)
            .to(0.12, { scale: oldScale * 1.08 })
            .to(0.12, { scale: oldScale })
            .start();
    }

    private getFixedDicePoint(index:number):number{
        if(this.hasUsedFixedDicePoints){
            return 0;
        }

        let fixedPoints:number[] = this.getCurBattleFixedDicePoints();
        if(index < 0 || index >= fixedPoints.length){
            return 0;
        }

        return fixedPoints[index];
    }

    private getCurBattleFixedDicePoints():number[]{
        // 固定骰只服务新手首局教学；老玩家再次挑战前3关也要随机，避免重复感太强。
        if(!GameMain.isNewUserFirstPlay){
            return [];
        }

        if(!this.currentNodeData || !this.currentNodeData.eventData){
            return [];
        }

        let monsterId:number = this.currentNodeData.eventData.monsterIds;
        if(monsterId < 0 || monsterId >= this.fixedDicePointsByMonster.length){
            return [];
        }

        return this.fixedDicePointsByMonster[monsterId];
    }

    loadChapter() {
        let count:number = CreateChapter.getChapter(GameMain.curChapterIndex).chapter.length;// 当前关卡/章节有多少关
        if(GameMain.curStageIndex>=count){
            console.log(`当前${GameMain.curChapterIndex}章节已通关`);
            GameMain.gameFinished = true;
            GameMain.gameResultType = "chapterWin";
            this.openResultPanel();
            return;
        }
        // 事件节点会在不重开 MainPanel 的情况下推进关卡，这里同步顶部关卡文本。
        this.refreshCurStageLabel();
        // let nodeDatas: Chapter[] = CreateChapter.getChapter(GameMain.curChapterIndex).chapter[GameMain.curStageIndex];
        // UIManager.getInstance().openUI(ChapterPanel, 1, (ui: ChapterPanel) => {
        //     ui.onShow();
        //     ui.setChapterNode(nodeDatas)
        // })
        let nodeGameDatas: GameChapter = CreateChapter.getChapter(GameMain.curChapterIndex);
        UIManager.getInstance().openUI(ChapterPanel, 1, (ui: ChapterPanel) => {
            ui.onShow();
            ui.setChapterNode(nodeGameDatas)
        })
    }

    openShop(nodeData:Chapter){
        // shop 类型改成“铸骰台”补给，不打开商店界面，只给轻量数值变化。
        this.applyLightEventReward(this.forgeRewards);
    }

    openRest(nodeData:Chapter){
        // 休息只恢复一部分已损失生命，避免直接回满导致后续压力被抹平。
        this.applyLightEventReward(this.restRewards);
    }

    openTreasure(nodeData:Chapter){
        // 宝箱只给下次攻击的小幅百分比增伤，反馈明确但不引入构筑选择。
        this.applyLightEventReward(this.treasureRewards);
    }

    /**
     * 执行轻量事件奖励。
     * 事件节点不进入新界面，点完立刻给数值变化并推进到下一关，保持微信小游戏短节奏。
     */
    private applyLightEventReward(rewards:LightEventReward[]){
        let reward:LightEventReward = this.getRandomLightEventReward(rewards);
        if(!reward)return;

        let tipText:string = this.applyLightEventRewardValue(reward);
        GameMain.instance.showTip(tipText);
        GameMain.curStageIndex++;
        this.scheduleOnce(() => {
            this.loadChapter();
        }, 0.25);
    }

    /**
     * 从已解锁奖励里随机一个。
     * unlockStage 用今日总关卡控制强度，避免前期直接随机到过强补给。
     */
    private getRandomLightEventReward(rewards:LightEventReward[]):LightEventReward{
        let stageScore:number = GameMain.instance.getChallengeStageScore();
        let canUseRewards:LightEventReward[] = rewards.filter((reward:LightEventReward) => {
            return reward.unlockStage <= stageScore;
        });
        if(canUseRewards.length <= 0){
            return rewards[0];
        }

        return canUseRewards[randomInt(0, canUseRewards.length)];
    }

    /**
     * 应用事件奖励的具体数值。
     * 所有奖励都只影响玩家血量或下一次攻击，不增加长期养成压力。
     */
    private applyLightEventRewardValue(reward:LightEventReward):string{
        if(reward.effect === "point"){
            GameMain.extraPoint += reward.value;
            this.refreshTempBuffLabel();
            return `${reward.name}\n${reward.desc}`;
        }

        if(reward.effect === "damageRate"){
            GameMain.extraDamageRate += reward.value;
            this.refreshTempBuffLabel();
            return `${reward.name}\n${reward.desc}`;
        }

        if(reward.effect === "healLost"){
            let player:Player = GameMain.instance.player;
            let lostHp:number = Math.max(player.totalHp - player.curHP, 0);
            let healValue:number = Math.ceil(lostHp * reward.value);
            if(lostHp > 0 && healValue < 8){
                healValue = Math.min(8, lostHp);
            }
            player.addHp(healValue);
            this.refreshTempBuffLabel();
            return `${reward.name}\n恢复 ${healValue} 生命`;
        }

        this.refreshTempBuffLabel();
        return `${reward.name}\n${reward.desc}`;
    }

    openBattle(nodeData:Chapter){
        Advertise.hideBattleBanner();
        this.currentNodeData = nodeData;
        // 从宝箱/休息等事件节点进入下一场战斗时，MainPanel 没有重新 onShow，必须主动刷新。
        this.refreshCurStageLabel();
        this.hasUsedFixedDicePoints = false;
        this.freeRerollUsed = false;
        this.videoRerollUsed = false;
        this.watchingRerollVideo = false;
        this.diceReadyForFreeReroll = false;
        this.refreshFreeRerollBtnState();
        // 进入新战斗先清掉上一关的危险提示，等新怪物加载完成后再按当前怪物重新判断。
        this.setLoopEffectVisible(this.lowHpWarningNode, false, "lowHp");
        this.playStageStartTips();
        GameMain.instance.bundle.load("prefab/monster", cc.Prefab, (err, prefab: cc.Prefab) => {
            if(err || !prefab){
                console.error("怪物预制体加载失败:", err);
                GameMain.instance.showTip("怪物加载失败，请重新选择");
                return;
            }

            let md: MonsterData = this.allMonsterDatas[nodeData.eventData.monsterIds];
            if(!md){
                console.error("怪物数据不存在:", nodeData.eventData.monsterIds);
                GameMain.instance.showTip("怪物配置异常，请重新选择");
                return;
            }

            let newMonster: cc.Node = cc.instantiate(prefab);
            let gamingContainer:cc.Node = this.node.getChildByName("GamingContainer");
            gamingContainer.addChild(newMonster);
            this.moveMonsterUnderBattleTable(newMonster, gamingContainer);
            let monsterComp:Monster = newMonster.getComponent(Monster);
            monsterComp.init(md);
            monsterComp.prepareEnterHidden();
            this.monster = monsterComp;
            this.refreshBattleWarningEffects();
            // 进入战斗后先停一拍，再播放怪物登场，节奏上更像正式开战。
            this.scheduleOnce(() => {
                if(!this.node || !cc.isValid(this.node) || this.monster !== monsterComp || GameMain.gameFinished)return;
                monsterComp.playEnterAnim(() => {
                    if(!this.node || !cc.isValid(this.node) || this.monster !== monsterComp || GameMain.gameFinished)return;
                    this.autoRollDices();
                });
            }, 0.35);
        })
        cc.tween(this.node.getChildByName("GamingContainer"))
            .to(0.25, { opacity: 255 })
            .start()
    }

    /**
     * 怪物放大后需要被桌面边缘压住，所以把怪物节点移到桌面图层下方。
     * 坐标先从 GamingContainer 转到 MainPanel，避免层级变化导致怪物位置偏移。
     */
    private moveMonsterUnderBattleTable(monsterNode:cc.Node, oldParent:cc.Node){
        if(!monsterNode || !cc.isValid(monsterNode) || !oldParent || !cc.isValid(oldParent))return;

        let worldPos:cc.Vec2 = oldParent.convertToWorldSpaceAR(monsterNode.position);
        let localPos:cc.Vec2 = this.node.convertToNodeSpaceAR(worldPos);
        monsterNode.removeFromParent(false);
        this.node.addChild(monsterNode);
        // 怪物放到桌面下方后会被边框遮住一部分，整体上移一点保留压迫感。
        monsterNode.setPosition(localPos.x, localPos.y + this.MONSTER_LAYER_Y_OFFSET);

        let battleTableNode:cc.Node = this.node.getChildByName("battle_table_empty");
        if(battleTableNode && cc.isValid(battleTableNode)){
            monsterNode.setSiblingIndex(battleTableNode.getSiblingIndex());
        }
    }

    disposeMonster(monster:Monster){
        GameMain.gameFinished = true;
        DiceGameSave.recordKill();
        DiceGameSave.recordStage(GameMain.instance.getChallengeStageScore());
        GameMain.instance.reportBestStage(DiceGameSave.getBestStage());
        GameMain.instance.reportChallengeRank(DiceGameSave.getTodayBestStage());
        GameMain.gameResultType = this.currentNodeData && this.currentNodeData.type === "boss" ? "chapterWin" : "stageWin";
        if(GameMain.gameResultType === "chapterWin" && GameMain.curChapterIndex < 1){
            // 击杀章节 Boss 时立即解锁下一章，避免玩家不点下一关直接回主页导致进度没保存。
            DiceGameSave.unlockChapter(GameMain.curChapterIndex + 1);
        }
        GameMain.instance.addWinStreak();
        if(this.firstGuideActive){
            // 首局第一个怪击杀后结束引导，之后不再反复打扰玩家。
            this.firstGuideActive = false;
            GameMain.isNewUserFirstPlay = false;
            DiceGameSave.markFirstGuideDone();
        }
        this.monster = null!;
        monster.node.destroy();
        // 旧逻辑：击杀怪物后必出插屏。
        // Advertise.showChapingAd();
        // 现在改为 ResultPanel.onShow 里按结算广告策略独立随机横幅和插屏。

        this.openResultPanel();
    }

    openResultPanel(){
        this.hideBattleWarningEffects();
        UIManager.getInstance().openUI(ResultPanel, 0, (ui: ResultPanel) => {
            ui.onShow();
        })
    }

    loadTip(pos:cc.Vec2,num:number,_color:cc.Color,parent:cc.Node){
        GameMain.instance.bundle.load("prefab/tip", cc.Prefab,(err,prefab:cc.Prefab)=>{
            if(err || !prefab){
                console.error("战斗飘字预制体加载失败:", err);
                return;
            }

            let newTip: cc.Node = cc.instantiate(prefab);
            parent.addChild(newTip);
            newTip.getComponent(Tip).init(pos,num,_color);
        })
    }

    /**
     * 获取某个节点顶部的飘字坐标。
     * target 和 parent 可能不在同一个父节点下，所以这里统一做世界坐标转换。
     */
    private getNodeTopTipPos(target:cc.Node, parent:cc.Node, yOffset:number = 0):cc.Vec2{
        if(!target || !target.parent || !parent)return cc.v2(0,0);

        let worldPos:cc.Vec2 = target.parent.convertToWorldSpaceAR(target.position);
        let localPos:cc.Vec2 = parent.convertToNodeSpaceAR(worldPos);
        localPos.y += yOffset;
        return localPos;
    }

    refreshAllUIText(p: number, m: number, totalAttack: number = 0, callBack: any = null, immediate: boolean = true) {
        this.calculateData = new CalculateData(p, m);
        let rawShowAttack:number = this.getFinalAttackWithEventBonus(p * m + totalAttack);
        let finalShowAttack:number = this.getRealDamageAfterShield(rawShowAttack);
        if (immediate) {
            this.restoreTotalAttackFocus(!this.attackVisualPlaying);
            this.NumPointsText.string = p.toString();
            this.NumMultipleText.string = m.toString();
            this.TotalText.string = finalShowAttack.toString();
            this.refreshShieldDamageTip(rawShowAttack, finalShowAttack);
            this.refreshBattleWarningEffects();
        } else {
            setTimeout(() => {
                this.NumPointsText.string = p.toString();
                FaynUtils.PlayMusic("formula_pop",false,1);
                this.nodeScale(this.NumPointsText.node.parent)
                this.cameraShake(1.01);
                setTimeout(() => {
                    this.NumMultipleText.string = m.toString();
                    FaynUtils.PlayMusic("formula_pop",false,1);
                    this.nodeScale(this.NumMultipleText.node.parent)
                this.cameraShake(1.01);
                    setTimeout(() => {
                        if (totalAttack > 0) {
                            this.TotalText.string = (p * m).toString();
                            FaynUtils.PlayMusic("formula_pop",false,1);
                            this.nodeScale(this.TotalText.node)
                            this.cameraShake(1.06);
                            setTimeout(() => {
                                this.TotalText.string = finalShowAttack.toString()
                                FaynUtils.PlayMusic("formula_pop",false,1);
                                this.nodeScale(this.TotalText.node)
                                this.refreshShieldDamageTip(rawShowAttack, finalShowAttack);
                                this.refreshBattleWarningEffects();
                                this.NumPointsText.node.parent.active = false;
                                this.NumMultipleText.node.parent.active = false;
                                this.setFormulaSymbolsVisible(false);
                                setTimeout(() => {
                                    if (callBack != null && callBack != undefined) {
                                        callBack()
                                    }
                                }, 800);
                            }, 500);
                        }
                        else {
                            this.cameraShake(1.06);
                            this.TotalText.string = finalShowAttack.toString();
                            FaynUtils.PlayMusic("formula_pop",false,1);
                            this.nodeScale(this.TotalText.node)
                            this.refreshShieldDamageTip(rawShowAttack, finalShowAttack);
                            this.refreshBattleWarningEffects();
                            this.NumPointsText.node.parent.active = false;
                            this.NumMultipleText.node.parent.active = false;
                            this.setFormulaSymbolsVisible(false);
                            setTimeout(() => {
                                if (callBack != null && callBack != undefined) {
                                    callBack()
                                }
                            }, 800);
                        }
                    }, 500);
                }, 500);
            }, 500);
        }
    }

    /**
     * 攻击结算阶段突出最终攻击力。
     * 点数和倍数隐藏后，将 txt_total 改成“攻击力：数值”，再按文本真实宽度横向居中。
     */
    private playTotalAttackFocus(finalAttack:number){
        if(!this.TotalText || !this.TotalText.node || !cc.isValid(this.TotalText.node))return;

        let totalNode:cc.Node = this.TotalText.node;
        this.cacheTotalTextOrigin();
        this.TotalText.string = `攻击力：${finalAttack}`;
        FaynUtils.PlayMusic("total_attack_show",false,this.getTotalAttackSoundVolume(finalAttack));
        let targetScale:number = this.totalTextOriginScale * this.getTotalAttackFocusScale(finalAttack);
        let textWidth:number = this.getEstimatedLabelTextWidth(this.TotalText);
        // SHRINK 会受节点宽度限制，聚焦显示时临时扩宽，避免“攻击力：xx”被压成两行。
        totalNode.width = Math.max(this.totalTextOriginWidth, textWidth + 30);
        this.forceUpdateLabelRender(this.TotalText);

        let gamingContainer:cc.Node = this.node.getChildByName("GamingContainer");
        if(!gamingContainer || !totalNode.parent)return;

        let totalWorldPos:cc.Vec2 = totalNode.parent.convertToWorldSpaceAR(totalNode.position);
        let gamingCenterWorldPos:cc.Vec2 = gamingContainer.convertToWorldSpaceAR(cc.v2(0, 0));
        let centerLocalPos:cc.Vec2 = totalNode.parent.convertToNodeSpaceAR(cc.v2(gamingCenterWorldPos.x, totalWorldPos.y));
        let targetX:number = this.getLeftAlignLabelCenterX(this.TotalText, centerLocalPos.x, targetScale, textWidth);

        cc.Tween.stopAllByTarget(totalNode);
        cc.tween(totalNode)
            .to(0.16, { x: targetX, scale: targetScale }, { easing: "backOut" })
            .start();
    }

    /**
     * 根据最终攻击力决定聚焦文字大小。
     * 只影响攻击表现，不改变真实伤害数值。
     */
    private getTotalAttackFocusScale(finalAttack:number):number{
        if(finalAttack >= 80)return 2;
        if(finalAttack >= 40)return 1.5;
        return 1;
    }

    /**
     * 最终攻击力越高，弹出音效越响。
     * 和文本缩放保持同一套三档反馈，避免低伤害也吵、高伤害却没冲击力。
     */
    private getTotalAttackSoundVolume(finalAttack:number):number{
        if(finalAttack >= 80)return 1;
        if(finalAttack >= 40)return 0.78;
        return 0.55;
    }

    /**
     * 计算左对齐 Label 居中时的节点 x。
     * txt_total 是左对齐文本，节点坐标不等于文本视觉中心，所以需要按文本宽度修正。
     */
    private getLeftAlignLabelCenterX(label:cc.Label, centerX:number, targetScale:number, textWidth:number = -1):number{
        if(!label || !label.node)return centerX;

        if(textWidth <= 0){
            textWidth = this.getEstimatedLabelTextWidth(label);
        }
        let anchorOffsetX:number = (0.5 - label.node.anchorX) * textWidth * targetScale;
        return centerX - anchorOffsetX;
    }

    /**
     * 估算 Label 当前文本宽度。
     * txt_total 使用 SHRINK 时节点宽度不等于文本宽度，所以这里按字符估算并用于动态扩宽。
     */
    private getEstimatedLabelTextWidth(label:cc.Label):number{
        let estimatedWidth:number = 0;
        let fontSize:number = label.fontSize || 32;
        let text:string = label.string || "";
        for(let i = 0; i < text.length; i++){
            let code:number = text.charCodeAt(i);
            estimatedWidth += code <= 255 ? fontSize * 0.58 : fontSize;
        }
        return Math.max(estimatedWidth, 1);
    }

    /**
     * 主动刷新 Label 渲染数据。
     * Cocos 2.x 修改 string 后节点宽度可能下一帧才更新，这里用于立即计算居中位置。
     */
    private forceUpdateLabelRender(label:cc.Label){
        if(!label)return;

        let anyLabel:any = label as any;
        if(anyLabel._forceUpdateRenderData){
            anyLabel._forceUpdateRenderData(true);
        }
    }

    /**
     * 恢复最终攻击力文本的原始位置和大小。
     * 剑回到原位、重新打开界面、异常恢复时都会调用，避免 UI 状态残留。
     */
    private restoreTotalAttackFocus(restoreFormula:boolean = true){
        if(!this.TotalText || !this.TotalText.node || !cc.isValid(this.TotalText.node))return;

        let totalNode:cc.Node = this.TotalText.node;
        if(!this.totalTextOriginPos || this.totalTextOriginScale === null){
            this.cacheTotalTextOrigin();
            if(restoreFormula){
                this.setFormulaSymbolsVisible(true);
            }
            return;
        }

        cc.Tween.stopAllByTarget(totalNode);
        totalNode.setPosition(this.totalTextOriginPos);
        totalNode.scale = this.totalTextOriginScale;
        totalNode.width = this.totalTextOriginWidth;
        if(restoreFormula){
            this.setFormulaSymbolsVisible(true);
        }
    }

    /**
     * 缓存 txt_total 初始状态。
     * 只记录一次，后续所有攻击表现都回到这个位置和缩放。
     */
    private cacheTotalTextOrigin(){
        if(!this.TotalText || !this.TotalText.node || !cc.isValid(this.TotalText.node))return;
        if(!this.totalTextOriginPos){
            this.totalTextOriginPos = new cc.Vec2(this.TotalText.node.x, this.TotalText.node.y);
        }
        if(this.totalTextOriginScale === null){
            this.totalTextOriginScale = this.TotalText.node.scale;
        }
        if(this.totalTextOriginWidth === null){
            this.totalTextOriginWidth = this.TotalText.node.width;
        }
    }

    /**
     * 控制公式符号显隐。
     * 攻击结算阶段隐藏 x 和 =，让最终攻击力成为唯一视觉重点。
     */
    private setFormulaSymbolsVisible(show:boolean){
        let gamingContainer:cc.Node = this.node.getChildByName("GamingContainer");
        if(!gamingContainer)return;

        let xNode:cc.Node = gamingContainer.getChildByName("x");
        let equalNode:cc.Node = gamingContainer.getChildByName("=");
        if(xNode)xNode.active = show;
        if(equalNode)equalNode.active = show;
    }

    /**
     * 剑回到初始位置后，统一恢复攻击公式区域。
     * 这样 x、=、点数、倍数不会在怪物受击或血条刷新时提前显示。
     */
    private finishAttackUiAfterSwordBack(){
        this.attackVisualPlaying = false;
        this.battlleIn = false;
        this.onRollling = false;
        this.refreshAllUIText(0, 0, 0, null, true);

        if(this.NumPointsText && this.NumPointsText.node && this.NumPointsText.node.parent){
            this.NumPointsText.node.parent.active = true;
        }
        if(this.NumMultipleText && this.NumMultipleText.node && this.NumMultipleText.node.parent){
            this.NumMultipleText.node.parent.active = true;
        }

        this.setFormulaSymbolsVisible(true);
        this.restoreTotalAttackFocus(true);
        this.setAttackBtnLocked(false);
        this.refreshAttackBtnState(false);
        this.refreshFreeRerollBtnState();
    }

    /**
     * 缓存宝剑的编辑器初始位置。
     * 攻击动画结束必须回到这个位置，不能再使用旧版写死坐标。
     */
    private cacheSwordOrigin(swordNode:cc.Node){
        if(!swordNode || !cc.isValid(swordNode))return;

        if(!this.swordOriginPos){
            this.swordOriginPos = new cc.Vec2(swordNode.x, swordNode.y);
        }
        if(this.swordOriginScale === null){
            this.swordOriginScale = swordNode.scale;
        }
    }

    /**
     * 恢复宝剑到编辑器初始位置。
     * 用于重新打开界面或攻击异常恢复，避免上一段动画状态残留。
     */
    private restoreSwordOrigin(){
        if(!this.swordOriginPos || this.swordOriginScale === null)return;

        let gamingContainer:cc.Node = this.node.getChildByName("GamingContainer");
        if(!gamingContainer)return;

        let swordNode:cc.Node = gamingContainer.getChildByName("sword");
        if(!swordNode || !cc.isValid(swordNode))return;

        cc.Tween.stopAllByTarget(swordNode);
        swordNode.setPosition(this.swordOriginPos);
        swordNode.scale = this.swordOriginScale;
        swordNode.angle = 0;
    }

    nodeScale(target:cc.Node,callBack:any = null){
        cc.tween(target)
        .to(0.2,{scale:1.8})
        .call(()=>{
            target.scale = 1.428;
            if(callBack != null){
                callBack()
            }
        })
        .start()
    }

    refreshBattleWarningEffects(){
        this.refreshKillReadyEffect();
        this.refreshLowHpWarningEffect();
        this.refreshSwordFeverEffect();
    }

    private hideBattleWarningEffects(){
        this.setLoopEffectVisible(this.killReadyEffectNode, false, "kill");
        this.setKillReadyWordVisible(false);
        this.setAttackBtnKillReadyAnim(false);
        this.setLoopEffectVisible(this.lowHpWarningNode, false, "lowHp");
        this.setLowHpScreenWarningVisible(false);
        this.setSwordFeverVisible(0);
    }

    /**
     * 给低血量全屏红闪节点应用暗角 shader。
     * 具体渐变和闪烁由材质完成，节点只作为全屏渲染载体。
     */
    private applyLowHpScreenWarningMaterial(){
        if(!this.lowHpScreenWarningNode || !cc.isValid(this.lowHpScreenWarningNode) || !this.lowHpScreenWarningMaterial)return;

        let sprite:cc.Sprite = this.lowHpScreenWarningNode.getComponent(cc.Sprite);
        if(!sprite)return;

        sprite.setMaterial(0, this.lowHpScreenWarningMaterial);
    }

    /**
     * 给剑狂热特效应用流光材质。
     * 材质只影响 swordFeverEffectNode 自己，不改剑图片和真实攻击逻辑。
     */
    private applySwordFeverMaterial(){
        if(!this.swordFeverEffectNode || !cc.isValid(this.swordFeverEffectNode) || !this.swordFeverMaterial)return;

        let sprite:cc.Sprite = this.swordFeverEffectNode.getComponent(cc.Sprite);
        if(!sprite)return;

        sprite.setMaterial(0, this.swordFeverMaterial);
    }

    private refreshKillReadyEffect(){
        let show:boolean = false;
        if(!this.battlleIn && !GameMain.gameFinished && this.monster && this.selectedDice.length > 0 && this.curDiceHandResult && this.curDiceHandResult.type > DiceHandType.None){
            let previewAttack:number = this.getPreviewFinalAttack();
            show = previewAttack > 0 && this.monster.canBeKilledByAttack(previewAttack);
        }

        // 旧的 killReadyEffectNode 反馈已经被“可斩杀艺术字 + 怪物闪烁 + 攻击按钮弹动”替代，这里保持隐藏。
        this.setLoopEffectVisible(this.killReadyEffectNode, false, "kill");
        this.setKillReadyWordVisible(show);
        this.setAttackBtnKillReadyAnim(show);
        if(this.monster){
            this.monster.refreshKillReadyFeedback(show);
        }
    }

    /**
     * 刷新剑狂热特效。
     * 只读取当前牌型和预览攻击力，不参与真实伤害结算。
     */
    private refreshSwordFeverEffect(){
        let feverLevel:number = this.getSwordFeverLevel();
        this.setSwordFeverVisible(feverLevel);
    }

    /**
     * 根据牌型、预览攻击力、是否可斩杀综合计算剑狂热等级。
     * 0 不显示，1 轻微狂热，2 明显狂热，3 最高狂热。
     */
    private getSwordFeverLevel():number{
        if(GameMain.gameFinished || !this.monster || !this.curDiceHandResult || this.curDiceHandResult.type <= DiceHandType.None || this.selectedDice.length <= 0){
            return 0;
        }

        let previewAttack:number = this.getPreviewFinalAttack();
        let feverLevel:number = 0;

        if(this.curDiceHandResult.type >= DiceHandType.Three){
            feverLevel = 1;
        }
        if(this.curDiceHandResult.type >= DiceHandType.Four){
            feverLevel = 2;
        }
        if(this.curDiceHandResult.type >= DiceHandType.Straight){
            feverLevel = 3;
        }

        if(previewAttack >= 40){
            feverLevel = Math.max(feverLevel, 1);
        }
        if(previewAttack >= 65){
            feverLevel = Math.max(feverLevel, 2);
        }
        if(previewAttack >= 90 || this.monster.canBeKilledByAttack(previewAttack)){
            feverLevel = Math.max(feverLevel, 3);
        }

        return feverLevel;
    }

    /**
     * 控制剑狂热特效显隐和循环流光。
     * 建议节点挂在 sword 下面，这样剑攻击时火焰会跟着剑一起移动。
     */
    private setSwordFeverVisible(level:number){
        if(!this.swordFeverEffectNode || !cc.isValid(this.swordFeverEffectNode))return;

        this.applySwordFeverMaterial();

        if(this.swordFeverOriginScale === null){
            this.swordFeverOriginScale = this.swordFeverEffectNode.scale;
        }
        if(this.swordFeverOriginOpacity === null){
            this.swordFeverOriginOpacity = this.swordFeverEffectNode.opacity;
        }

        if(level <= 0){
            this.swordFeverLevel = 0;
            cc.Tween.stopAllByTarget(this.swordFeverEffectNode);
            this.swordFeverEffectNode.active = false;
            this.swordFeverEffectNode.angle = 0;
            this.swordFeverEffectNode.scale = this.swordFeverOriginScale;
            this.swordFeverEffectNode.opacity = this.swordFeverOriginOpacity;
            return;
        }

        if(this.swordFeverEffectNode.active && this.swordFeverLevel === level)return;

        this.swordFeverLevel = level;
        this.swordFeverEffectNode.active = true;
        this.swordFeverEffectNode.zIndex = -1;
        this.updateSwordFeverMaterialParams(level);
        this.playSwordFeverLoopAnim(level);
    }

    /**
     * 更新剑狂热材质参数。
     * 等级越高，内部流光速度和亮度越明显，但节点本身不旋转。
     */
    private updateSwordFeverMaterialParams(level:number){
        if(!this.swordFeverMaterial)return;

        let flowStrength:number = level === 3 ? 1.35 : (level === 2 ? 1.12 : 0.88);
        let lightStrength:number = level === 3 ? 0.95 : (level === 2 ? 0.78 : 0.58);
        let flowSpeed:number = level === 3 ? 1.65 : (level === 2 ? 1.35 : 1.05);
        this.swordFeverMaterial.setProperty("flowParams", cc.v4(flowStrength, lightStrength, flowSpeed, 0));
    }

    /**
     * 播放剑狂热循环表现。
     * 这里只做轻微呼吸和透明度变化，流动旋转交给 shader 内部完成。
     */
    private playSwordFeverLoopAnim(level:number){
        if(!this.swordFeverEffectNode || !cc.isValid(this.swordFeverEffectNode))return;

        let originScale:number = this.swordFeverOriginScale !== null ? this.swordFeverOriginScale : this.swordFeverEffectNode.scale;
        // 只弱化循环缩放幅度，透明度波动和 shader 流光保持原来的表现。
        let maxScale:number = originScale * (level === 3 ? 1.035 : (level === 2 ? 1.025 : 1.015));
        let minOpacity:number = level === 3 ? 210 : (level === 2 ? 175 : 135);
        let maxOpacity:number = level === 3 ? 255 : (level === 2 ? 225 : 185);

        cc.Tween.stopAllByTarget(this.swordFeverEffectNode);
        this.swordFeverEffectNode.angle = 0;
        this.swordFeverEffectNode.scale = originScale;
        this.swordFeverEffectNode.opacity = maxOpacity;

        cc.tween(this.swordFeverEffectNode)
            .repeatForever(
                cc.tween()
                    .to(0.22, { scale: maxScale, opacity: maxOpacity })
                    .to(0.28, { scale: originScale, opacity: minOpacity })
            )
            .start();
    }

    /**
     * 控制可斩杀艺术字显示。
     * 只负责艺术字节点自己的显隐和弹动，不参与伤害计算，降低和战斗逻辑的耦合。
     */
    private setKillReadyWordVisible(show:boolean){
        if(!this.killReadyWordNode || !cc.isValid(this.killReadyWordNode))return;

        if(show){
            if(this.killReadyWordNode.active)return;

            if(this.killReadyWordOriginScale === null){
                this.killReadyWordOriginScale = this.killReadyWordNode.scale;
            }
            FaynUtils.PlayMusic("kill_ready", false, 1);
            this.killReadyWordNode.active = true;
            this.playKillReadyWordLoopAnim();
        }else{
            cc.Tween.stopAllByTarget(this.killReadyWordNode);
            this.killReadyWordNode.active = false;
            if(this.killReadyWordOriginScale !== null){
                this.killReadyWordNode.scale = this.killReadyWordOriginScale;
            }
            this.killReadyWordNode.opacity = 255;
        }
    }

    /**
     * 播放可斩杀艺术字循环弹动。
     * 节点位置完全由预制体决定，代码只改缩放和透明度，避免运行时错位。
     */
    private playKillReadyWordLoopAnim(){
        if(!this.killReadyWordNode || !cc.isValid(this.killReadyWordNode))return;

        let originScale:number = this.killReadyWordOriginScale !== null ? this.killReadyWordOriginScale : this.killReadyWordNode.scale;
        cc.Tween.stopAllByTarget(this.killReadyWordNode);
        this.killReadyWordNode.opacity = 255;
        this.killReadyWordNode.scale = originScale;
        cc.tween(this.killReadyWordNode)
            .repeatForever(
                cc.tween()
                    .to(0.12, { scale: originScale * 1.22 }, { easing: "backOut" })
                    .to(0.08, { scale: originScale * 0.94 })
                    .to(0.08, { scale: originScale })
                    .delay(0.55)
            )
            .start();
    }

    /**
     * 预估当前选中骰子真正点击攻击后会造成的最终伤害。
     * 这里只读当前数据，不清空加成、不回血、不生成飘字，避免影响正式攻击结算。
     */
    private getPreviewFinalAttack(){
        if(!this.curDiceHandResult || this.curDiceHandResult.type <= DiceHandType.None)return 0;

        let data:CalculateData = GetCalculateMultiple(this.curDiceHandResult.type);
        let previewPoints:number = data.totalPoints + GameMain.extraPoint;
        let previewMultiple:number = data.totalMultiple + GameMain.extraMultiple;
        let previewExtraAttack:number = 0;
        let usedPoints:number[] = this.curDiceHandResult.usedDicePoint.slice();

        for (let i = 0; i < this.selectedDice.length; i++) {
            let diceNode:cc.Node = this.selectedDice[i];
            if(!diceNode || !cc.isValid(diceNode))continue;

            let dice:Dice = diceNode.getComponent(Dice);
            let usedIndex:number = usedPoints.indexOf(dice.finalIndex);
            if(usedIndex < 0)continue;

            usedPoints.splice(usedIndex, 1);
            previewPoints += dice.finalIndex;
            if(dice.diceType === DiceType.fire){
                previewExtraAttack += 3;
            }
            if(dice.diceType === DiceType.mult){
                previewMultiple += 1;
            }
        }

        return this.getFinalAttackWithEventBonus(previewPoints * previewMultiple + previewExtraAttack);
    }

    /**
     * 计算事件百分比增伤后的最终攻击力。
     * 真实攻击和斩杀预览都走这里，避免预览和实际伤害不一致。
     */
    private getFinalAttackWithEventBonus(baseAttack:number):number{
        if(GameMain.extraDamageRate <= 0)return baseAttack;

        return Math.ceil(baseAttack * (1 + GameMain.extraDamageRate));
    }

    /**
     * 计算扣除怪物护盾后的实际伤害。
     * 攻击力文本和最高伤害记录都显示这个值，和怪物血条真实减少保持一致。
     */
    private getRealDamageAfterShield(rawAttack:number):number{
        if(!this.monster || rawAttack <= 0)return rawAttack;

        let realDamage:number = rawAttack - this.monster.getCurShield();
        if(realDamage <= 0){
            realDamage = 1;
        }
        return realDamage;
    }

    /**
     * 刷新护盾抵消说明。
     * 主攻击数字显示实际伤害，这里只补充护盾挡住的伤害，避免玩家误以为少算伤害。
     */
    private refreshShieldDamageTip(rawAttack:number, realDamage:number){
        if(!this.shieldDamageLabel || !this.shieldDamageLabel.node || !cc.isValid(this.shieldDamageLabel.node))return;

        let shieldValue:number = this.monster ? this.monster.getCurShield() : 0;
        let blockedDamage:number = Math.max(rawAttack - realDamage, 0);
        let show:boolean = rawAttack > 0 && shieldValue > 0 && blockedDamage > 0;
        this.shieldDamageLabel.node.active = show;
        if(!show)return;

        this.shieldDamageLabel.string = `护盾挡住 ${blockedDamage}点`;
    }

    /**
     * 刷新事件临时加成提示。
     * 只展示下一次攻击会吃到的轻量奖励，不参与真实伤害计算。
     */
    private refreshTempBuffLabel(){
        if(!this.tempBuffLabel || !this.tempBuffLabel.node || !cc.isValid(this.tempBuffLabel.node))return;

        let tips:string[] = [];
        if(GameMain.extraPoint > 0){
            tips.push(`下次攻击 +${GameMain.extraPoint}点`);
        }
        if(GameMain.extraMultiple > 0){
            tips.push(`下次倍率 +${GameMain.extraMultiple}`);
        }
        if(GameMain.extraDamageRate > 0){
            tips.push(`下次伤害 +${Math.round(GameMain.extraDamageRate * 100)}%`);
        }

        this.tempBuffLabel.node.active = tips.length > 0;
        if(tips.length <= 0)return;

        this.tempBuffLabel.string = tips.join("\n");
    }

    private refreshLowHpWarningEffect(){
        if(!this.lowHpWarningNode)return;

        let show:boolean = false;
        if(GameMain.instance && GameMain.instance.player && this.monster){
            let curHp:number = GameMain.instance.player.curHP;
            // 这个特效表示“当前怪物下一击会致死”，不再单纯按低血量显示，避免换关后误提示。
            show = !GameMain.gameFinished && curHp > 0 && this.monster.getCurAttack() >= curHp;
        }

        this.setLoopEffectVisible(this.lowHpWarningNode, show, "lowHp");
    }

    /**
     * 玩家被怪物攻击时快速闪红一下。
     * 不再作为低血量持续提示，低血量提示仍由血量节点附近的特效负责。
     */
    public playPlayerHurtScreenFlash(){
        if(!this.lowHpScreenWarningNode || !cc.isValid(this.lowHpScreenWarningNode))return;

        this.applyLowHpScreenWarningMaterial();
        this.refreshLowHpScreenWarningSize();

        cc.Tween.stopAllByTarget(this.lowHpScreenWarningNode);
        this.lowHpScreenWarningPlaying = true;
        this.lowHpScreenWarningNode.active = true;
        this.lowHpScreenWarningNode.opacity = 0;
        this.lowHpScreenWarningNode.zIndex = 998;
        cc.tween(this.lowHpScreenWarningNode)
            .to(0.05, { opacity: 255 })
            .to(0.22, { opacity: 0 })
            .call(() => {
                if(!this.lowHpScreenWarningNode || !cc.isValid(this.lowHpScreenWarningNode))return;
                this.lowHpScreenWarningPlaying = false;
                this.lowHpScreenWarningNode.active = false;
            })
            .start();
    }

    private setLowHpScreenWarningVisible(show:boolean){
        if(!this.lowHpScreenWarningNode || !cc.isValid(this.lowHpScreenWarningNode))return;
        if(show)return;

        cc.Tween.stopAllByTarget(this.lowHpScreenWarningNode);
        this.lowHpScreenWarningPlaying = false;
        this.lowHpScreenWarningNode.active = false;
    }

    private refreshLowHpScreenWarningSize(){
        if(!this.lowHpScreenWarningNode || !cc.isValid(this.lowHpScreenWarningNode))return;

        this.lowHpScreenWarningNode.setContentSize(cc.winSize.width, cc.winSize.height);
        this.lowHpScreenWarningNode.setPosition(0, 0);
    }

    private setLoopEffectVisible(effectNode:cc.Node, show:boolean, effectType:string){
        if(!effectNode || !cc.isValid(effectNode))return;

        if(show){
            if(effectNode.active)return;

            effectNode.active = true;
            effectNode.opacity = 0;
            if(effectType === "kill"){
                if(this.killReadyEffectOriginScale === null){
                    this.killReadyEffectOriginScale = effectNode.scale;
                }
                this.playLoopEffectAnim(effectNode, this.killReadyEffectOriginScale);
            }else{
                if(this.lowHpWarningOriginScale === null){
                    this.lowHpWarningOriginScale = effectNode.scale;
                }
                this.playLoopEffectAnim(effectNode, this.lowHpWarningOriginScale);
            }
        }else{
            cc.Tween.stopAllByTarget(effectNode);
            effectNode.active = false;
        }
    }

    private playLoopEffectAnim(effectNode:cc.Node, originScale:number){
        // 特效节点位置由预制体决定，这里只做原地呼吸，避免影响布局。
        effectNode.scale = originScale * 0.9;
        cc.tween(effectNode)
            .repeatForever(
                cc.tween()
                    .parallel(
                        cc.tween().to(0.35, { opacity: 220 }),
                        cc.tween().to(0.35, { scale: originScale * 1.08 })
                    )
                    .parallel(
                        cc.tween().to(0.35, { opacity: 110 }),
                        cc.tween().to(0.35, { scale: originScale * 0.94 })
                    )
            )
            .start();
    }

    override onDestroy(): void {
        // this.btn_onRoll.off(cc.Node.EventType.TOUCH_END,this.onReRoll,this)
        this.unscheduleAllCallbacks();
        this.setAttackBtnLocked(false);
        this.refreshAttackBtnState(true);
        MainPanel.instance = null!;
        if(this.killReadyEffectNode && cc.isValid(this.killReadyEffectNode)){
            cc.Tween.stopAllByTarget(this.killReadyEffectNode);
        }
        if(this.killReadyWordNode && cc.isValid(this.killReadyWordNode)){
            cc.Tween.stopAllByTarget(this.killReadyWordNode);
        }
        if(this.lowHpWarningNode && cc.isValid(this.lowHpWarningNode)){
            cc.Tween.stopAllByTarget(this.lowHpWarningNode);
        }
        if(this.lowHpScreenWarningNode && cc.isValid(this.lowHpScreenWarningNode)){
            cc.Tween.stopAllByTarget(this.lowHpScreenWarningNode);
            this.lowHpScreenWarningNode.active = false;
        }
        if(this.swordFeverEffectNode && cc.isValid(this.swordFeverEffectNode)){
            cc.Tween.stopAllByTarget(this.swordFeverEffectNode);
        }
        if(this.testip && cc.isValid(this.testip.node)){
            cc.Tween.stopAllByTarget(this.testip.node);
        }
        this.hideStageStartTips();
        this.hideBattleWarningEffects();
        if(this.btn_start){
            this.btn_start.off(cc.Node.EventType.TOUCH_END,this.onStartBattle,this);
        }
        if(this.btn_openDicePackage){
            this.btn_openDicePackage.off(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this);
        }
        if(this.btn_onRoll){
            this.btn_onRoll.off(cc.Node.EventType.TOUCH_END,this.onReRoll,this);
        }
        if(this.btn_share){
            this.btn_share.off(cc.Node.EventType.TOUCH_END, this.onShareGame, this);
        }
        if(this.btn_recommend){
            this.btn_recommend.off(cc.Node.EventType.TOUCH_END, this.onOpenRecommend, this);
        }
        this.calculateData = null!;
        this.selectedDicePoint = [];
        this.selectedDice = [];
        this.allDicesNodes = [];
        this.allCharmItems = [];
        MainPanel.instance = null!;
    }
}
