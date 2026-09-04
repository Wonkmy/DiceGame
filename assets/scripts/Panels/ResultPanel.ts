import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import GameMain from "../GameMain";
import MainPanel from "./MainPanel";
import RewardItem from "../UIManager/RewardItem";
import { CharmData, randomInt } from "../Global/DiceHandUtil";
import DiceGameSave from "../GameCodes/DiceGameSave";
import ShareManager from "../GameCodes/ShareManager";
import HomePanel from "./HomePanel";
import TipPanel from "./TipPanel";
const {ccclass, property} = cc._decorator;

@ccclass
export default class ResultPanel extends BaseUI{
    protected static className = "ResultPanel";

    @property({type:cc.Node})
    btn_next:cc.Node = null!;

    @property({type:cc.Node})
    threeChooseOneContainerNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"分享复活按钮", tooltip:"失败后点击分享，可获得一次额外重新挑战机会"})
    btn_shareHelp:cc.Node = null!;

    @property({type:cc.Node, displayName:"回主界面按钮", tooltip:"失败或全部通关后返回主界面"})
    btn_home:cc.Node = null!;

    @property({type:cc.Node, displayName:"查看详情按钮", tooltip:"点击后查看排名、次数、地区等详细结算信息"})
    btn_detail:cc.Node = null!;

    @property({type:cc.Node, displayName:"首胜艺术字节点", tooltip:"第1关胜利时显示的首胜艺术字图片节点"})
    firstWinArtNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"胜利艺术字节点", tooltip:"普通小关胜利时显示的胜利艺术字图片节点"})
    winArtNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"失败艺术字节点", tooltip:"挑战失败时显示的失败艺术字图片节点"})
    failArtNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"章节通关艺术字节点", tooltip:"第一章通关时显示的章节通关艺术字图片节点"})
    chapterWinArtNode:cc.Node = null!;

    @property({type:cc.Node, displayName:"失败复盘底框节点", tooltip:"失败时显示的一条短复盘提示底框"})
    failReviewNode:cc.Node = null!;

    @property({type:cc.Label, displayName:"失败复盘文本", tooltip:"失败复盘底框里的短提示文本"})
    failReviewLabel:cc.Label = null!;

    @property({type:cc.Label, displayName:"连胜文本", tooltip:"显示本次挑战内连续通关次数，例如：连胜 x3"})
    winStreakLabel:cc.Label = null!;

    @property({type:cc.Float, displayName:"求助按钮提示间隔", tooltip:"失败页求助再战按钮每隔多少秒播放一次提示动画"})
    shareHelpGuideInterval:number = 2.5;

    private sharingHelp:boolean = false;
    private showFirstFailHelpGuide:boolean = false;
    private failArtOriginY:number = null!;
    private chapterWinArtOriginY:number = null!;
    private nextBtnOriginScale:number = null!;
    private shareHelpBtnOriginScale:number = null!;
    private homeBtnOriginScale:number = null!;
    private failReviewOriginScale:number = null!;
    private winStreakLabelOriginScale:number = null!;
    private resultTextOriginY:number = null!;
    private shareHelpGuideCallback:Function = null!;
    private nextBtnGuideCallback:Function = null!;
    private resultDetailText:string = "";

    onLoad(): void {
        this.hideAllResultArt();
    }

    override onShow(): void {
        this.btn_next.off(cc.Node.EventType.TOUCH_END,this.onNextTurn,this);
        this.btn_next.on(cc.Node.EventType.TOUCH_END,this.onNextTurn,this)
        if(this.btn_shareHelp){
            this.btn_shareHelp.off(cc.Node.EventType.TOUCH_END,this.onShareHelp,this);
            this.btn_shareHelp.on(cc.Node.EventType.TOUCH_END,this.onShareHelp,this);
        }
        if(this.btn_home){
            this.btn_home.off(cc.Node.EventType.TOUCH_END,this.onBackHome,this);
            this.btn_home.on(cc.Node.EventType.TOUCH_END,this.onBackHome,this);
        }
        if(this.btn_detail){
            this.btn_detail.off(cc.Node.EventType.TOUCH_END,this.onShowDetail,this);
            this.btn_detail.on(cc.Node.EventType.TOUCH_END,this.onShowDetail,this);
        }
        this.refreshResultShow();

        // 之前这里会生成三选一Charm奖励。当前版本先弱化构筑，改成直接结算和进入下一关。
        // this.scheduleOnce(()=>{
        //     this.genThreeChooseRewardItem();
        // },0.2);
    }

    private refreshResultShow(){
        GameMain.instance.reportTodayChallengeResult();

        if(this.threeChooseOneContainerNode){
            this.threeChooseOneContainerNode.active = false;
        }

        let titleLabel = this.node.getChildByName("task").getComponent(cc.Label);
        let btnLabel = this.btn_next.getChildByName("nextLevel").getComponent(cc.Label);
        let resultText = "";
        let stageScore:number = GameMain.instance.getChallengeStageScore();
        let chapterName:string = GameMain.curChapterIndex <= 0 ? "新手章节" : "深渊章节";
        let todayBestStage:number = DiceGameSave.getTodayBestStage();
        let overtakePercent:number = DiceGameSave.getRegionOvertakePercent();
        this.resultDetailText = this.getResultDetailText(stageScore, chapterName, todayBestStage, overtakePercent);

        this.hideAllResultArt();
        this.stopNextBtnAnim();
        this.showWinStreak(false);
        this.showDetailBtn(true);

        if(GameMain.gameResultType === "fail"){
            this.showFailArt(true);
            this.showFirstFailHelpGuide = !DiceGameSave.hasShowFirstFailHelpGuide() && DiceGameSave.getRemainDailyShareHelpCount() > 0;
            if(this.showFirstFailHelpGuide){
                DiceGameSave.markFirstFailHelpGuideShow();
                resultText = `第${stageScore}关失败\n求助好友可再战`;
            }else{
                resultText = `第${stageScore}关失败\n差一点就过了`;
            }
            btnLabel.string = "再冲一次";
            this.showHomeBtn(true);
            this.showShareHelpBtn(true);
            this.showFailReview(true, this.getFailReviewText());
        }else if(GameMain.gameResultType === "chapterWin"){
            if(GameMain.curChapterIndex >= 1){
                resultText = "全部通关\n今日封顶";
                btnLabel.string = "再来一局";
            }else{
                resultText = "章节通关\n进入深渊";
                btnLabel.string = "进入深渊章节";
                this.showChapterWinArt(true);
                this.playNextBtnAnim();
            }
            this.showHomeBtn(GameMain.curChapterIndex >= 1);
            this.showShareHelpBtn(false);
            this.showFailReview(false);
            this.showWinStreak(GameMain.curWinStreak >= 2);
        }else{
            // 首胜艺术字只显示一次；后续再打第1关胜利，走普通胜利反馈。
            if(stageScore === 1 && !DiceGameSave.hasShowFirstWin()){
                DiceGameSave.markFirstWinShow();
                resultText = "首关突破\n已掌握对子攻击";
                this.showFirstWinArt(true);
            }else{
                resultText = `第${stageScore}关通过`;
                this.showWinArt(true);
            }
            btnLabel.string = "下一关";
            this.showHomeBtn(false);
            this.showShareHelpBtn(false);
            this.showFailReview(false);
            this.showWinStreak(GameMain.curWinStreak >= 2);
        }

        titleLabel.fontSize = 34;
        titleLabel.lineHeight = 46;
        // 旧版这里会把排名、地区、剩余次数全部塞进主结算文案；
        // 现在主区域只显示本局战报，其它信息统一放到“查看详情”。
        titleLabel.string = resultText;
        titleLabel.node.off(cc.Node.EventType.TOUCH_END, ShareManager.shareBestDamage, ShareManager);
        titleLabel.node.on(cc.Node.EventType.TOUCH_END, ShareManager.shareBestDamage, ShareManager);
        this.playResultFeedbackAnim(titleLabel.node);
    }

    private showShareHelpBtn(show:boolean){
        if(this.btn_shareHelp){
            this.stopShareHelpBtnGuideLoop();
            this.btn_shareHelp.active = show;
            if(show){
                this.setButtonLabel(this.btn_shareHelp, "求助再战");
                this.startShareHelpBtnGuideLoop();
            }
        }
    }

    private startShareHelpBtnGuideLoop(){
        if(!this.btn_shareHelp || !cc.isValid(this.btn_shareHelp))return;

        this.playShareHelpBtnGuide();
        // 失败页存在期间，持续提醒玩家可以求助再战。
        if(!this.shareHelpGuideCallback){
            this.shareHelpGuideCallback = () => {
                this.playShareHelpBtnGuide();
            };
        }
        this.schedule(this.shareHelpGuideCallback, Math.max(1, this.shareHelpGuideInterval));
    }

    private stopShareHelpBtnGuideLoop(){
        if(this.shareHelpGuideCallback){
            this.unschedule(this.shareHelpGuideCallback);
        }
        if(!this.btn_shareHelp || !cc.isValid(this.btn_shareHelp))return;

        cc.Tween.stopAllByTarget(this.btn_shareHelp);
        if(this.shareHelpBtnOriginScale !== null){
            this.btn_shareHelp.scale = this.shareHelpBtnOriginScale;
        }
    }

    private playShareHelpBtnGuide(){
        if(!this.btn_shareHelp || !cc.isValid(this.btn_shareHelp) || !this.btn_shareHelp.activeInHierarchy)return;

        if(this.shareHelpBtnOriginScale === null){
            this.shareHelpBtnOriginScale = this.btn_shareHelp.scale;
        }

        // 强调求助按钮，失败后优先引导玩家继续挑战。
        cc.Tween.stopAllByTarget(this.btn_shareHelp);
        this.btn_shareHelp.scale = this.shareHelpBtnOriginScale;
        cc.tween(this.btn_shareHelp)
            .repeat(3,
                cc.tween()
                    .to(0.13, { scale: this.shareHelpBtnOriginScale * 1.13 }, { easing: "backOut" })
                    .to(0.1, { scale: this.shareHelpBtnOriginScale })
            )
            .start();
    }

    private setButtonLabel(btn:cc.Node, text:string){
        if(!btn)return;

        let labels:cc.Label[] = btn.getComponentsInChildren(cc.Label);
        if(labels.length > 0){
            labels[0].string = text;
        }
    }

    /**
     * 控制查看详情按钮显示。
     * 主结算只保留短战报，排名、次数、地区等次级信息放到详情里。
     */
    private showDetailBtn(show:boolean){
        if(!this.btn_detail)return;

        this.btn_detail.active = show;
        this.setButtonLabel(this.btn_detail, "查看详情");
    }

    /**
     * 打开本次结算详情。
     * 第一版复用 TipPanel，不额外做复杂弹窗预制体。
     */
    private onShowDetail(){
        if(!this.resultDetailText || this.resultDetailText.length <= 0)return;

        UIManager.getInstance().openUI(TipPanel, 0, (ui:TipPanel) => {
            ui.onShow();
            ui.showTip(this.resultDetailText, null, false, 3.5);
        })
    }

    /**
     * 生成结算详情文案。
     * 这些信息不放在主结算上，避免玩家第一眼看到过多文字。
     */
    private getResultDetailText(stageScore:number, chapterName:string, todayBestStage:number, overtakePercent:number){
        return `本次关卡：第${stageScore}关\n当前章节：${chapterName}\n今日最好：${todayBestStage}关\n超过本地区：${overtakePercent}%玩家\n剩余挑战：${DiceGameSave.getRemainDailyChallengeCount()}/${DiceGameSave.MAX_DAILY_CHALLENGE_COUNT}\n分享复活：${DiceGameSave.getRemainDailyShareHelpCount()}/${DiceGameSave.MAX_DAILY_SHARE_HELP_COUNT}\n地区：${DiceGameSave.getRegionName()}`;
    }

    private showHomeBtn(show:boolean){
        if(this.btn_home){
            this.btn_home.active = show;
            if(this.homeBtnOriginScale === null){
                this.homeBtnOriginScale = this.btn_home.scale;
            }
            this.btn_home.scale = this.homeBtnOriginScale;
            this.btn_home.opacity = 255;
        }

        // 旧版这里会动态创建回主界面按钮；现在改为 Creator 面板拖拽 btn_home。
    }

    private hideAllResultArt(){
        // 共用一个结算预制体，先全部隐藏，再按结算类型显示对应艺术字。
        this.showFirstWinArt(false);
        this.showWinArt(false);
        this.showFailArt(false);
        this.showChapterWinArt(false);
        this.showFailReview(false);
    }

    private showFirstWinArt(show:boolean){
        if(!this.firstWinArtNode)return;

        cc.Tween.stopAllByTarget(this.firstWinArtNode);
        this.firstWinArtNode.active = show;

        if(show){
            // 首胜艺术字弹出反馈：淡入 + 放大回弹。
            this.firstWinArtNode.opacity = 0;
            this.firstWinArtNode.scale = 0.4;
            cc.tween(this.firstWinArtNode)
                .to(0.16, { opacity: 255, scale: 1.15 }, { easing: "backOut" })
                .to(0.08, { scale: 1 })
                .delay(0.05)
                .to(0.06, { angle: -4 })
                .to(0.06, { angle: 4 })
                .to(0.06, { angle: 0 })
                .start();
        }else{
            this.firstWinArtNode.opacity = 255;
            this.firstWinArtNode.scale = 1;
            this.firstWinArtNode.angle = 0;
        }
    }

    private showWinArt(show:boolean){
        if(!this.winArtNode)return;

        cc.Tween.stopAllByTarget(this.winArtNode);
        this.winArtNode.active = show;

        if(show){
            let power:number = this.getWinStreakAnimPower();
            // 普通胜利给明确正反馈，但强度弱于首胜和章节通关。
            this.winArtNode.opacity = 0;
            this.winArtNode.scale = 0.5;
            this.winArtNode.angle = 0;
            cc.tween(this.winArtNode)
                .to(0.16, { opacity: 255, scale: 1.08 + power * 0.03 }, { easing: "backOut" })
                .to(0.08, { scale: 1 })
                .start();
        }else{
            this.winArtNode.opacity = 255;
            this.winArtNode.scale = 1;
            this.winArtNode.angle = 0;
        }
    }

    private showFailArt(show:boolean){
        if(!this.failArtNode)return;

        cc.Tween.stopAllByTarget(this.failArtNode);
        if(this.failArtOriginY === null){
            this.failArtOriginY = this.failArtNode.y;
        }
        this.failArtNode.active = show;

        if(show){
            // 失败艺术字只做原地渐显和轻微抖动，避免改位置导致弹窗错位。
            this.failArtNode.opacity = 0;
            this.failArtOriginY = this.failArtNode.y;
            this.failArtNode.y = this.failArtOriginY;
            cc.tween(this.failArtNode)
                .to(0.22, { opacity: 255, y: this.failArtOriginY })
                .to(0.05, { angle: -3 })
                .to(0.05, { angle: 3 })
                .to(0.05, { angle: 0 })
                .start();
        }else{
            this.failArtNode.opacity = 255;
            if(this.failArtOriginY !== null){
                this.failArtNode.y = this.failArtOriginY;
            }
            this.failArtNode.angle = 0;
        }
    }

    private showChapterWinArt(show:boolean){
        if(!this.chapterWinArtNode)return;

        cc.Tween.stopAllByTarget(this.chapterWinArtNode);
        if(this.chapterWinArtOriginY === null){
            this.chapterWinArtOriginY = this.chapterWinArtNode.y;
        }
        this.chapterWinArtNode.active = show;

        if(show){
            let power:number = this.getWinStreakAnimPower();
            // 章节通关使用原地放大压下的强反馈，不移动节点位置。
            this.chapterWinArtNode.opacity = 0;
            this.chapterWinArtNode.scale = 1.8 + power * 0.06;
            this.chapterWinArtNode.angle = -8;
            this.chapterWinArtNode.y = this.chapterWinArtOriginY;
            cc.tween(this.chapterWinArtNode)
                .to(0.16, { opacity: 255, scale: 0.9, angle: 3 }, { easing: "cubicIn" })
                .to(0.08, { scale: 1.12, angle: -2 })
                .to(0.08, { scale: 1, angle: 0 })
                .start();
        }else{
            this.chapterWinArtNode.opacity = 255;
            this.chapterWinArtNode.scale = 1;
            this.chapterWinArtNode.angle = 0;
            if(this.chapterWinArtOriginY !== null){
                this.chapterWinArtNode.y = this.chapterWinArtOriginY;
            }
        }
    }

    /**
     * 控制连胜文本显示。
     * 只显示本次挑战内的连胜，不读写本地存储，失败或回主页后由 GameMain 清空。
     */
    private showWinStreak(show:boolean){
        if(!this.winStreakLabel)return;

        cc.Tween.stopAllByTarget(this.winStreakLabel.node);
        this.winStreakLabel.node.active = show;

        if(!show){
            this.winStreakLabel.node.opacity = 255;
            if(this.winStreakLabelOriginScale !== null){
                this.winStreakLabel.node.scale = this.winStreakLabelOriginScale;
            }
            return;
        }

        if(this.winStreakLabelOriginScale === null){
            this.winStreakLabelOriginScale = this.winStreakLabel.node.scale;
        }

        this.winStreakLabel.string = `连胜 x${GameMain.curWinStreak}`;
        this.playWinStreakAnim();
    }

    /**
     * 播放连胜文本弹入动画。
     * 连胜越高，弹出的幅度稍微越强，但仍然复用同一套动画。
     */
    private playWinStreakAnim(){
        if(!this.winStreakLabel || !cc.isValid(this.winStreakLabel.node))return;

        let power:number = this.getWinStreakAnimPower();
        let originScale:number = this.winStreakLabelOriginScale !== null ? this.winStreakLabelOriginScale : this.winStreakLabel.node.scale;
        this.winStreakLabel.node.opacity = 0;
        this.winStreakLabel.node.scale = originScale * 0.75;
        cc.tween(this.winStreakLabel.node)
            .delay(0.08)
            .to(0.16, { opacity: 255, scale: originScale * (1.12 + power * 0.03) }, { easing: "backOut" })
            .to(0.08, { scale: originScale })
            .start();
    }

    /**
     * 获取连胜动画强度。
     * 最高按 5 连胜计算，避免后期数值过大导致动画太夸张。
     */
    private getWinStreakAnimPower(){
        return Math.min(Math.max(GameMain.curWinStreak - 1, 0), 5);
    }

    private playNextBtnAnim(){
        if(!this.btn_next || !cc.isValid(this.btn_next))return;

        cc.Tween.stopAllByTarget(this.btn_next);
        if(this.nextBtnOriginScale === null){
            this.nextBtnOriginScale = this.btn_next.scale;
        }

        // 章节通关后强调“进入下一章”按钮。
        this.btn_next.opacity = 0;
        this.btn_next.scale = this.nextBtnOriginScale * 0.75;
        cc.tween(this.btn_next)
            .delay(0.18)
            .to(0.16, { opacity: 255, scale: this.nextBtnOriginScale * 1.12 }, { easing: "backOut" })
            .to(0.08, { scale: this.nextBtnOriginScale })
            .delay(0.3)
            .call(() => {
                if(!this.btn_next || !cc.isValid(this.btn_next))return;
                cc.tween(this.btn_next)
                    .repeatForever(
                        cc.tween()
                            .to(0.28, { scale: this.nextBtnOriginScale * 1.07 })
                            .to(0.28, { scale: this.nextBtnOriginScale })
                            .delay(0.45)
                    )
                    .start();
            })
            .start();
    }

    private stopNextBtnAnim(){
        if(this.nextBtnGuideCallback){
            this.unschedule(this.nextBtnGuideCallback);
        }
        if(!this.btn_next || !cc.isValid(this.btn_next))return;

        cc.Tween.stopAllByTarget(this.btn_next);
        this.btn_next.opacity = 255;
        if(this.nextBtnOriginScale !== null){
            this.btn_next.scale = this.nextBtnOriginScale;
        }
    }

    /**
     * 胜利时持续强化“下一关”按钮。
     * 只做轻量循环弹动，提示玩家继续，不抢胜利艺术字的主反馈。
     */
    private startNextBtnGuideLoop(){
        if(!this.btn_next || !cc.isValid(this.btn_next))return;

        if(this.nextBtnOriginScale === null){
            this.nextBtnOriginScale = this.btn_next.scale;
        }

        this.playNextBtnGuideOnce();
        if(!this.nextBtnGuideCallback){
            this.nextBtnGuideCallback = () => {
                this.playNextBtnGuideOnce();
            };
        }
        this.schedule(this.nextBtnGuideCallback, 1.6);
    }

    /**
     * 播放一次“下一关”按钮提示动画。
     * 拆成单次函数，方便循环调用，也方便后续复用到其它主按钮。
     */
    private playNextBtnGuideOnce(){
        if(!this.btn_next || !cc.isValid(this.btn_next) || !this.btn_next.activeInHierarchy)return;

        cc.Tween.stopAllByTarget(this.btn_next);
        let originScale:number = this.nextBtnOriginScale !== null ? this.nextBtnOriginScale : this.btn_next.scale;
        this.btn_next.scale = originScale;
        cc.tween(this.btn_next)
            .to(0.14, { scale: originScale * 1.1 }, { easing: "backOut" })
            .to(0.1, { scale: originScale })
            .start();
    }

    private stopResultFeedbackAnim(){
        let titleNode:cc.Node = this.node.getChildByName("task");
        if(titleNode && cc.isValid(titleNode)){
            cc.Tween.stopAllByTarget(titleNode);
            titleNode.opacity = 255;
            if(this.resultTextOriginY !== null){
                titleNode.y = this.resultTextOriginY;
            }
        }

        if(this.btn_home && cc.isValid(this.btn_home)){
            cc.Tween.stopAllByTarget(this.btn_home);
            this.btn_home.opacity = 255;
            if(this.homeBtnOriginScale !== null){
                this.btn_home.scale = this.homeBtnOriginScale;
            }
        }

        if(this.failReviewNode && cc.isValid(this.failReviewNode)){
            cc.Tween.stopAllByTarget(this.failReviewNode);
            this.failReviewNode.opacity = 255;
            if(this.failReviewOriginScale !== null){
                this.failReviewNode.scale = this.failReviewOriginScale;
            }
        }

        if(this.winStreakLabel && cc.isValid(this.winStreakLabel.node)){
            cc.Tween.stopAllByTarget(this.winStreakLabel.node);
            this.winStreakLabel.node.opacity = 255;
            if(this.winStreakLabelOriginScale !== null){
                this.winStreakLabel.node.scale = this.winStreakLabelOriginScale;
            }
        }
    }

    private playResultFeedbackAnim(titleNode:cc.Node){
        if(!titleNode || !cc.isValid(titleNode))return;

        this.playResultTextAnim(titleNode);

        if(GameMain.gameResultType === "fail"){
            this.playFailReviewAnim();
            this.playButtonEnterAnim(this.btn_shareHelp, 0.12, this.shareHelpBtnOriginScale);
            this.playButtonEnterAnim(this.btn_next, 0.22, this.nextBtnOriginScale);
            this.playButtonEnterAnim(this.btn_home, 0.32, this.homeBtnOriginScale);
        }else if(GameMain.gameResultType === "chapterWin"){
            this.playButtonEnterAnim(this.btn_home, 0.28, this.homeBtnOriginScale);
        }else{
            this.playButtonEnterAnim(this.btn_next, 0.15, this.nextBtnOriginScale);
            this.scheduleOnce(() => {
                this.startNextBtnGuideLoop();
            }, 0.45);
        }
    }

    private playResultTextAnim(titleNode:cc.Node){
        cc.Tween.stopAllByTarget(titleNode);
        if(this.resultTextOriginY === null){
            this.resultTextOriginY = titleNode.y;
        }

        // 结算说明文字只做原地淡入，避免移动文字导致弹窗看起来错位。
        titleNode.opacity = 0;
        titleNode.y = this.resultTextOriginY;
        cc.tween(titleNode)
            .delay(0.08)
            .to(0.22, { opacity: 255 }, { easing: "sineOut" })
            .start();
    }

    private playButtonEnterAnim(btn:cc.Node, delay:number, originScale:number){
        if(!btn || !cc.isValid(btn) || !btn.activeInHierarchy)return;

        cc.Tween.stopAllByTarget(btn);
        let scale:number = originScale !== null ? originScale : btn.scale;
        btn.opacity = 0;
        btn.scale = scale * 0.75;
        cc.tween(btn)
            .delay(delay)
            .to(0.16, { opacity: 255, scale: scale * 1.1 }, { easing: "backOut" })
            .to(0.08, { scale: scale })
            .start();
    }

    private showFailReview(show:boolean, text:string = ""){
        if(!this.failReviewNode)return;

        cc.Tween.stopAllByTarget(this.failReviewNode);
        this.failReviewNode.active = show;
        if(!show)return;

        if(this.failReviewOriginScale === null){
            this.failReviewOriginScale = this.failReviewNode.scale;
        }

        let label:cc.Label = this.failReviewLabel;
        if(!label){
            label = this.failReviewNode.getComponentInChildren(cc.Label);
        }
        if(label){
            label.string = text;
            label.fontSize = 24;
            label.lineHeight = 30;
        }

        this.failReviewNode.opacity = 255;
        this.failReviewNode.scale = this.failReviewOriginScale;
    }

    private playFailReviewAnim(){
        if(!this.failReviewNode || !cc.isValid(this.failReviewNode) || !this.failReviewNode.activeInHierarchy)return;

        if(this.failReviewOriginScale === null){
            this.failReviewOriginScale = this.failReviewNode.scale;
        }

        // 复盘条只做原地弹入，不移动位置，避免影响弹窗布局。
        cc.Tween.stopAllByTarget(this.failReviewNode);
        this.failReviewNode.opacity = 0;
        this.failReviewNode.scale = this.failReviewOriginScale * 0.86;
        cc.tween(this.failReviewNode)
            .delay(0.18)
            .to(0.16, { opacity: 255, scale: this.failReviewOriginScale * 1.05 }, { easing: "backOut" })
            .to(0.08, { scale: this.failReviewOriginScale })
            .start();
    }

    private getFailReviewText():string{
        let monster = MainPanel.instance ? MainPanel.instance.monster : null;
        if(monster && cc.isValid(monster.node)){
            let leftHp:number = Math.max(monster.getCurHp(), 0);
            if(leftHp > 0){
                return this.getMonsterLeftHpReview(leftHp, monster.totalHp, monster.getCurAttack());
            }
        }

        let stageScore:number = GameMain.instance.getChallengeStageScore();
        if(stageScore <= 3){
            return "前3关节奏很紧，优先凑对子和三条";
        }

        return "已经很接近了，下把优先凑高倍率牌型";
    }

    /**
     * 根据怪物剩余血量和攻击压力生成失败复盘。
     * 只负责结算文案，不影响战斗、复活和排行榜逻辑。
     */
    private getMonsterLeftHpReview(leftHp:number, totalHp:number, monsterAttack:number):string{
        if(this.isNearlyWin(leftHp, totalHp)){
            return `只差 ${leftHp} 血，下一把能过`;
        }

        if(monsterAttack >= 20){
            return "没扛住这次反击，求助后再冲一把";
        }

        let stageScore:number = GameMain.instance.getChallengeStageScore();
        if(stageScore <= 3){
            return "这关开始变紧了，优先凑稳定牌型";
        }

        return "这把牌型断了，下把先凑成型再出手";
    }

    /**
     * 判断是否属于“差一点就赢”的失败。
     * 同时看固定血量和剩余比例，避免高血怪只剩少量血时提示不够准确。
     */
    private isNearlyWin(leftHp:number, totalHp:number):boolean{
        if(leftHp <= 12)return true;
        if(totalHp > 0 && leftHp <= totalHp * 0.15)return true;
        return false;
    }

    private onShareHelp(){
        if(this.sharingHelp)return;

        if(!DiceGameSave.consumeDailyShareHelpChance()){
            GameMain.instance.showTip("今日分享复活次数已用完");
            return;
        }

        this.sharingHelp = true;
        ShareManager.shareHelp(GameMain.instance.getChallengeStageScore(), () => {
            this.sharingHelp = false;
            this.restartGame();
        });
    }

    private genThreeChooseRewardItem(){
        // for (let i = 0; i < 3; i++) {
        //     setTimeout(() => {
        //         GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab,(err,prefab:cc.Prefab)=>{
        //             let newRewardItem: cc.Node = cc.instantiate(prefab);
        //             this.threeChooseOneContainerNode.addChild(newRewardItem);
        //             let r = randomInt(0,MainPanel.instance.allCharmDatas.length);
        //             let cd:CharmData = MainPanel.instance.allCharmDatas[r]
        //             newRewardItem.getComponent(RewardItem).init(cd);
        //         })
        //     }, 100 * i);
        // }
        let usedIds: number[] = [];

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab, (err, prefab: cc.Prefab) => {
                    let newRewardItem: cc.Node = cc.instantiate(prefab);
                    this.threeChooseOneContainerNode.addChild(newRewardItem);

                    let cd: CharmData = this.getRandomRewardData(usedIds);

                    if (cd && cd.id) {
                        usedIds.push(cd.id);
                    }

                    newRewardItem.getComponent(RewardItem).init(cd);
                });
            }, 100 * i);
        }
    }

    private getRandomRewardData(usedIds: number[]): CharmData {
        let effect = this.getRandomRewardEffect();

        let list = MainPanel.instance.allCharmDatas.filter((data: CharmData) => {
            return data.effect === effect && usedIds.indexOf(data.id) < 0;
        });

        // 如果当前类型没有可用奖励，就退回到全部未使用奖励
        if (list.length <= 0) {
            list = MainPanel.instance.allCharmDatas.filter((data: CharmData) => {
                return usedIds.indexOf(data.id) < 0;
            });
        }

        // 极端情况下还没有，就允许重复
        if (list.length <= 0) {
            list = MainPanel.instance.allCharmDatas;
        }

        let r = randomInt(0, list.length - 1);
        return list[r];
    }

    private getRandomRewardEffect(): string {
        let r = randomInt(1, 100);
        if (r <= 30) {
            return "heal";
        }
        if (r <= 60) {
            return "mult";
        }

        if (r <= 85) {
            return "point";
        }

        if (r <= 95) {
            return "fire";
        }

        return "fire";
    }

    private onNextTurn(){
        FaynUtils.PlayMusic("btnclick",false,1);

        if(GameMain.gameResultType === "stageWin"){
            GameMain.curStageIndex++;
        }else if(GameMain.gameResultType === "chapterWin" && GameMain.curChapterIndex < 1){
            GameMain.curChapterIndex++;
            GameMain.curStageIndex = 0;
        }else{
            if(!DiceGameSave.consumeDailyChallengeChance()){
                GameMain.instance.showTip("今日挑战次数已用完，明日再战！");
                return;
            }
            // 失败后重新挑战会消耗1次挑战次数；新用户首局本身没有扣次数
            this.restartGame();
            return;
        }

        this.stopResultFeedbackAnim();
        this.stopShareHelpBtnGuideLoop();
        UIManager.getInstance().closeUI(MainPanel);
        UIManager.getInstance().closeUI(ResultPanel);
        UIManager.getInstance().openUI(MainPanel, 0, (ui: MainPanel) => {
            ui.onShow();
            if(GameMain.curStageIndex === 0){
                GameMain.instance.player.getDices();
            }
        })
    }

    private restartGame(){
        this.stopResultFeedbackAnim();
        this.stopShareHelpBtnGuideLoop();
        GameMain.instance.restartCurChapterRun();
        UIManager.getInstance().closeUI(MainPanel);
        UIManager.getInstance().closeUI(ResultPanel);
        UIManager.getInstance().openUI(MainPanel, 0, (ui: MainPanel) => {
            ui.onShow();
            GameMain.instance.player.getDices();
        })
    }

    private onBackHome(){
        this.stopResultFeedbackAnim();
        this.stopShareHelpBtnGuideLoop();
        // 回主界面不再额外扣次数，挑战次数统一在开局或重新挑战时扣
        GameMain.instance.reportTodayChallengeResult();
        GameMain.instance.resetRunData();
        UIManager.getInstance().closeUI(MainPanel);
        UIManager.getInstance().closeUI(ResultPanel);
        UIManager.getInstance().openUI(HomePanel, 0, (ui: HomePanel) => {
            ui.onShow();
        })
    }

    setOpenHoreBtnActive(active:boolean){
    }
    private onOpenHire(){
        FaynUtils.PlayMusic("btnclick",false,1);
    }

    override onDestroy(): void {
        if(this.btn_next && cc.isValid(this.btn_next)){
            this.btn_next.off(cc.Node.EventType.TOUCH_END,this.onNextTurn,this)
        }
        this.stopNextBtnAnim();
        this.stopShareHelpBtnGuideLoop();
        this.stopResultFeedbackAnim();
        let titleNode = this.node.getChildByName("task");
        if(titleNode && cc.isValid(titleNode)){
            titleNode.off(cc.Node.EventType.TOUCH_END, ShareManager.shareBestDamage, ShareManager);
        }
        if(this.btn_shareHelp && cc.isValid(this.btn_shareHelp)){
            this.btn_shareHelp.off(cc.Node.EventType.TOUCH_END, this.onShareHelp, this);
        }
        if(this.btn_home && cc.isValid(this.btn_home)){
            this.btn_home.off(cc.Node.EventType.TOUCH_END, this.onBackHome, this);
        }
        if(this.btn_detail && cc.isValid(this.btn_detail)){
            this.btn_detail.off(cc.Node.EventType.TOUCH_END, this.onShowDetail, this);
        }
    }
}
