import GameMain from "../GameMain";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import MainPanel from "./MainPanel";
import SettingPanel from "./SettingPanel";
import ShareManager from "../GameCodes/ShareManager";
import DiceGameSave from "../GameCodes/DiceGameSave";
import DebugTool from "../GameCodes/DebugTool";
import RankPanel from "./RankPanel";
import GameCircleManager from "../GameCodes/GameCircleManager";
import RecommendManager from "../GameCodes/RecommendManager";
import ArenaManager from "../GameCodes/ArenaManager";
import { Advertise } from "../GameCodes/Advertise";
import SubscribeSystemMessageManager from "../GameCodes/SubscribeSystemMessageManager";
import { ConstValue } from "../Global/ConstValue";

const {ccclass, property} = cc._decorator;
declare const wx:any;

@ccclass
export default class HomePanel extends BaseUI {
    public static instance:HomePanel = null!;
    protected static className = "HomePanel";
    private isSharingChallenge:boolean = false;
    private startingChallenge:boolean = false;
    private watchingChallengeVideo:boolean = false;
    private startBtnOriginScale:number = 1;
    private tanShangRecommendOriginScale:number = 1;
    private tanShangRecommendOriginAngle:number = 0;

    // @property({type:cc.Label, displayName:"标题文本", tooltip:"主界面顶部显示的游戏标题文本"})
    // titleLabel:cc.Label = null!;

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

    @property({type:cc.Node, displayName:"游戏圈按钮", tooltip:"点击后打开微信游戏圈；仅微信小游戏环境有效"})
    btn_gameCircle:cc.Node = null!;

    @property({type:cc.Node, displayName:"推荐评价按钮", tooltip:"点击后打开微信评价与推荐组件；仅微信小游戏环境有效"})
    btn_recommend:cc.Node = null!;

    @property({type:cc.Node, displayName:"擂台赛按钮", tooltip:"点击后打开微信擂台赛组件；仅微信小游戏环境有效"})
    btn_arena:cc.Node = null!;

    @property({type:cc.Node, displayName:"摊上捡个宝推荐卡片", tooltip:"点击后跳转到《摊上捡个宝》；卡片样式和位置在编辑器里自行摆放"})
    btn_tanShangRecommend:cc.Node = null!;

    @property({type:cc.Node, displayName:"每日任务节点", tooltip:"可拖一个按钮或文本节点；完成任务后点击领取+1挑战次数"})
    dailyTaskNode:cc.Node = null!;

    @property({displayName:"摊上捡个宝AppId", tooltip:"填写《摊上捡个宝》微信小游戏 AppId"})
    tanShangAppId:string = "";

    @property({displayName:"摊上捡个宝路径", tooltip:"一般可以留空；需要指定页面或参数时再填"})
    tanShangPath:string = "";

    onLoad(): void {
        HomePanel.instance = this;
    }

    override onShow(): void {
        this.startingChallenge = false;
        this.watchingChallengeVideo = false;
        Advertise.showGeziOnlyForFlowPanel();
        this.bindHomeBtns();
        this.refreshStartView();
        this.startStartBtnBounce();
        this.startTanShangRecommendAnim();
        if(CC_DEBUG){
            DebugTool.attach(this.node);
        }
        GameMain.instance.playHomeBgm();
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

        if(this.btn_gameCircle){
            this.btn_gameCircle.off(cc.Node.EventType.TOUCH_END, this.openGameCircle, this);
            this.btn_gameCircle.on(cc.Node.EventType.TOUCH_END, this.openGameCircle, this);
        }

        if(this.btn_recommend){
            this.btn_recommend.off(cc.Node.EventType.TOUCH_END, this.openRecommend, this);
            this.btn_recommend.on(cc.Node.EventType.TOUCH_END, this.openRecommend, this);
        }

        if(this.btn_arena){
            this.btn_arena.off(cc.Node.EventType.TOUCH_END, this.openArena, this);
            this.btn_arena.on(cc.Node.EventType.TOUCH_END, this.openArena, this);
        }

        if(this.btn_tanShangRecommend){
            this.btn_tanShangRecommend.off(cc.Node.EventType.TOUCH_END, this.openTanShangRecommend, this);
            this.btn_tanShangRecommend.on(cc.Node.EventType.TOUCH_END, this.openTanShangRecommend, this);
        }

        if(this.dailyTaskNode){
            this.dailyTaskNode.off(cc.Node.EventType.TOUCH_END, this.onClickDailyTask, this);
            this.dailyTaskNode.on(cc.Node.EventType.TOUCH_END, this.onClickDailyTask, this);
        }

        // 旧版是按节点名自动查找和动态创建主界面内容；现在改为 Creator 面板拖拽变量。
    }

    public refreshStartView(){
        // if(this.titleLabel){
        //     this.titleLabel.string = "就骰这亿把";
        // }

        if(this.remainLabel){
            this.remainLabel.string = `今日剩余挑战 ${DiceGameSave.getRemainDailyChallengeCount()}/${DiceGameSave.MAX_DAILY_CHALLENGE_COUNT}`;
        }

        this.refreshStartBtnText();
        this.refreshShareBtnText();
        this.refreshDailyTaskText();

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
            }else if(DiceGameSave.getRemainDailyVideoChallengeCount() > 0){
                this.videoAddChallenge();
            }else{
                GameMain.instance.showTip("今日机会已用完，明日再战！");
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
        }else if(DiceGameSave.getRemainDailyVideoChallengeCount() > 0){
            label.string = "看广告再战";
        }else{
            label.string = "明日再战";
        }

        this.refreshAdIconOnButton(this.btn_start, remainChallenge <= 0 && remainShareChallenge <= 0 && DiceGameSave.getRemainDailyVideoChallengeCount() > 0);
    }

    /**
     * 按钮下一次点击需要看广告时，动态挂一个视频图标。
     * 首页挑战入口会在邀请次数用完后切到激励视频，必须给玩家明确广告标识。
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
            iconNode.setContentSize(44, 44);
            // 广告图标固定贴住按钮左侧内部，避免看起来像普通功能按钮。
            iconNode.x = -btn.width * 0.5 + 34;
            iconNode.y = 0;
            btn.addChild(iconNode, 20);
            iconNode.addComponent(cc.Sprite);
        }

        iconNode.active = true;
        iconNode.x = -btn.width * 0.5 + 34;
        iconNode.y = 0;
        let sprite:cc.Sprite = iconNode.getComponent(cc.Sprite);
        if(sprite && !sprite.spriteFrame){
            GameMain.instance.bundle.load("arts/ui/Common/AdIcon", cc.SpriteFrame, (err, sp:cc.SpriteFrame) => {
                if(err || !sp || !iconNode || !cc.isValid(iconNode))return;
                sprite.spriteFrame = sp;
                iconNode.setContentSize(44, 44);
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
        txtNode.width = Math.max(90, btn.width - 78);
        if(label){
            label.overflow = cc.Label.Overflow.SHRINK;
            if(label.fontSize > 30){
                label.fontSize = 30;
            }
        }
    }

    /**
     * 普通次数和好友助战都用完后，通过激励视频补 1 次挑战。
     * 当天只允许一次，成功后立刻消耗这次机会进入挑战。
     */
    private videoAddChallenge(){
        if(this.watchingChallengeVideo)return;

        this.watchingChallengeVideo = true;
        Advertise.showVideoAd((result:number) => {
            this.watchingChallengeVideo = false;
            if(result !== 1){
                GameMain.instance.showTip(result === 2 ? "看完广告才能获得机会" : "广告暂不可用");
                this.refreshStartView();
                return;
            }

            if(!DiceGameSave.consumeDailyVideoChallengeChance()){
                GameMain.instance.showTip("今日广告机会已用完");
                this.refreshStartView();
                return;
            }

            DiceGameSave.addDailyChallengeChance(1);
            if(!DiceGameSave.consumeDailyChallengeChance()){
                GameMain.instance.showTip("今日挑战次数已用完，明日再战！");
                this.refreshStartView();
                return;
            }

            this.refreshStartView();
            this.startGame();
        });
    }

    private refreshShareBtnText(){
        if(!this.btn_share)return;

        let txtNode:cc.Node = this.btn_share.getChildByName("txt");
        if(!txtNode)return;

        let label:cc.Label = txtNode.getComponent(cc.Label);
        if(!label)return;

        label.string = "分享战绩";
    }

    private refreshDailyTaskText(){
        if(!this.dailyTaskNode || !cc.isValid(this.dailyTaskNode))return;

        let label:cc.Label = this.dailyTaskNode.getComponent(cc.Label);
        if(!label){
            let txtNode:cc.Node = this.dailyTaskNode.getChildByName("txt");
            if(txtNode){
                label = txtNode.getComponent(cc.Label);
            }
        }

        if(label){
            label.string = DiceGameSave.getDailyTaskText();
        }
    }

    private onClickDailyTask(){
        let rewardTask:string = DiceGameSave.claimDailyTaskReward();
        if(rewardTask && rewardTask.length > 0){
            GameMain.instance.showTip(`${rewardTask}完成，挑战次数+1`);
            this.refreshStartView();
        }else{
            GameMain.instance.showTip(DiceGameSave.getDailyTaskText());
        }
    }

    private openRankPanel(){
        if(!ConstValue.ENABLE_FRIEND_RANK){
            GameMain.instance.showTip("功能开发中");
            return;
        }

        // 玩家主动打开排行榜时，顺手订阅好友超越提醒；失败不影响排行榜本身。
        SubscribeSystemMessageManager.requestRankSubscribe();
        UIManager.getInstance().openUI(RankPanel, 2, (ui: RankPanel) => {
            ui.onShow();
        });
    }

    /**
     * 打开微信游戏圈。
     * 这里只作为主界面入口，具体微信 API 和失败提示统一放到 GameCircleManager。
     */
    private openGameCircle(){
        GameCircleManager.openGameCircle();
    }

    /**
     * 分享今日战绩。
     * 用具名函数绑定，避免 HomePanel 重复 onShow 时按钮事件叠加。
     */
    private onShareBestDamage(){
        ShareManager.shareFromScene("home_share");
        this.refreshDailyTaskText();
    }

    /**
     * 打开微信评价与推荐组件。
     * 这里只绑定主界面按钮，平台判断和异常处理统一放到 RecommendManager。
     */
    private openRecommend(){
        RecommendManager.openRecommend();
    }

    /**
     * 打开微信擂台赛组件。
     * 首页只负责入口，具体平台能力和后台 openlink 判断交给 ArenaManager。
     */
    private openArena(){
        ArenaManager.openArena();
    }

    /**
     * 自定义跳转到《摊上捡个宝》，不使用微信后台互推组件。
     */
    private openTanShangRecommend(){
        if(cc.sys.platform !== cc.sys.WECHAT_GAME || typeof wx === "undefined" || !wx.navigateToMiniProgram){
            GameMain.instance.showTip("请在微信内打开");
            return;
        }

        if(!this.tanShangAppId || this.tanShangAppId.length <= 0){
            GameMain.instance.showTip("请先配置推荐游戏AppId");
            return;
        }

        wx.navigateToMiniProgram({
            appId: this.tanShangAppId,
            path: this.tanShangPath || "",
            extraData: {
                from: "dice_rouge_home_card"
            },
            success: () => {
                console.log("跳转《摊上捡个宝》成功");
            },
            fail: (err:any) => {
                console.error("跳转《摊上捡个宝》失败:", err);
                GameMain.instance.showTip("暂时无法打开推荐游戏");
            }
        });
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
        this.stopStartBtnBounce();
        // 先重置挑战数据，再打开战斗界面，避免 MainPanel.onShow 读取到上一局残留关卡或状态。
        GameMain.instance.resetRunData();
        Advertise.hideBattleBanner();
        UIManager.getInstance().closeUI(HomePanel);
        GameMain.instance.scheduleOnce(() => {
            UIManager.getInstance().openUI(MainPanel,0,(ui:MainPanel)=>{
                ui.onShow();
                GameMain.instance.player.getDices();
            })
        }, 0.2);
    }

    /**
     * 开始按钮循环弹跳，提醒玩家点击。
     */
    private startStartBtnBounce(){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;

        this.startBtnOriginScale = this.btn_start.scale;
        cc.Tween.stopAllByTarget(this.btn_start);
        this.btn_start.scale = this.startBtnOriginScale;
        cc.tween(this.btn_start)
            .repeatForever(
                cc.tween()
                    .to(0.1, { scaleX: this.startBtnOriginScale * 1.12, scaleY: this.startBtnOriginScale * 0.92 }, { easing: "sineOut" })
                    .to(0.12, { scaleX: this.startBtnOriginScale * 0.96, scaleY: this.startBtnOriginScale * 1.14 }, { easing: "backOut" })
                    .to(0.08, { scaleX: this.startBtnOriginScale * 1.04, scaleY: this.startBtnOriginScale * 0.98 }, { easing: "sineOut" })
                    .to(0.08, { scaleX: this.startBtnOriginScale, scaleY: this.startBtnOriginScale }, { easing: "sineOut" })
                    .delay(0.55)
            )
            .start();
    }

    /**
     * 推荐卡片轻微抢眼动画：和开始按钮区分开，用小幅晃动+呼吸感提醒点击。
     */
    private startTanShangRecommendAnim(){
        if(!this.btn_tanShangRecommend || !cc.isValid(this.btn_tanShangRecommend))return;

        this.tanShangRecommendOriginScale = this.btn_tanShangRecommend.scale;
        this.tanShangRecommendOriginAngle = this.btn_tanShangRecommend.angle;
        cc.Tween.stopAllByTarget(this.btn_tanShangRecommend);
        this.btn_tanShangRecommend.scale = this.tanShangRecommendOriginScale;
        this.btn_tanShangRecommend.angle = this.tanShangRecommendOriginAngle;
        cc.tween(this.btn_tanShangRecommend)
            .repeatForever(
                cc.tween()
                    .to(0.16, { scale: this.tanShangRecommendOriginScale * 1.07, angle: this.tanShangRecommendOriginAngle - 4 }, { easing: "sineOut" })
                    .to(0.16, { scale: this.tanShangRecommendOriginScale * 1.03, angle: this.tanShangRecommendOriginAngle + 4 }, { easing: "sineInOut" })
                    .to(0.14, { scale: this.tanShangRecommendOriginScale * 1.06, angle: this.tanShangRecommendOriginAngle - 2 }, { easing: "sineInOut" })
                    .to(0.18, { scale: this.tanShangRecommendOriginScale, angle: this.tanShangRecommendOriginAngle }, { easing: "sineOut" })
                    .delay(0.85)
            )
            .start();
    }

    private stopStartBtnBounce(){
        if(!this.btn_start || !cc.isValid(this.btn_start))return;

        cc.Tween.stopAllByTarget(this.btn_start);
        this.btn_start.scaleX = this.startBtnOriginScale;
        this.btn_start.scaleY = this.startBtnOriginScale;
    }

    private stopTanShangRecommendAnim(){
        if(!this.btn_tanShangRecommend || !cc.isValid(this.btn_tanShangRecommend))return;

        cc.Tween.stopAllByTarget(this.btn_tanShangRecommend);
        this.btn_tanShangRecommend.scale = this.tanShangRecommendOriginScale;
        this.btn_tanShangRecommend.angle = this.tanShangRecommendOriginAngle;
    }

    override onDestroy(): void {
        this.stopStartBtnBounce();
        this.stopTanShangRecommendAnim();
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
        if(this.btn_gameCircle){
            this.btn_gameCircle.off(cc.Node.EventType.TOUCH_END, this.openGameCircle, this);
        }
        if(this.btn_recommend){
            this.btn_recommend.off(cc.Node.EventType.TOUCH_END, this.openRecommend, this);
        }
        if(this.btn_arena){
            this.btn_arena.off(cc.Node.EventType.TOUCH_END, this.openArena, this);
        }
        if(this.btn_tanShangRecommend){
            this.btn_tanShangRecommend.off(cc.Node.EventType.TOUCH_END, this.openTanShangRecommend, this);
        }
        if(this.dailyTaskNode){
            this.dailyTaskNode.off(cc.Node.EventType.TOUCH_END, this.onClickDailyTask, this);
        }
        HomePanel.instance = null!;
    }
}
