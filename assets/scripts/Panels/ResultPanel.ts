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
const {ccclass, property} = cc._decorator;

@ccclass
export default class ResultPanel extends BaseUI{
    protected static className = "ResultPanel";

    @property({type:cc.Node})
    btn_next:cc.Node = null!;

    @property({type:cc.Node})
    threeChooseOneContainerNode:cc.Node = null!;

    private homeBtn:cc.Node = null!;

    override onShow(): void {
        this.btn_next.on(cc.Node.EventType.TOUCH_END,this.onNextTurn,this)
        this.refreshResultShow();

        // 之前这里会生成三选一Charm奖励。当前版本先弱化构筑，改成直接结算和进入下一关。
        // this.scheduleOnce(()=>{
        //     this.genThreeChooseRewardItem();
        // },0.2);
    }

    private refreshResultShow(){
        if(this.threeChooseOneContainerNode){
            this.threeChooseOneContainerNode.active = false;
        }

        let titleLabel = this.node.getChildByName("task").getComponent(cc.Label);
        let btnLabel = this.btn_next.getChildByName("nextLevel").getComponent(cc.Label);
        let resultText = "";

        if(GameMain.gameResultType === "fail"){
            resultText = "挑战失败";
            btnLabel.string = "重新挑战";
            this.showHomeBtn(true);
        }else if(GameMain.gameResultType === "chapterWin"){
            resultText = GameMain.curChapterIndex >= 1 ? "全部通关" : "章节通关";
            btnLabel.string = GameMain.curChapterIndex >= 1 ? "再来一局" : "下一章节";
            this.showHomeBtn(GameMain.curChapterIndex >= 1);
        }else{
            resultText = "胜利";
            btnLabel.string = "下一关";
            this.showHomeBtn(false);
        }

        titleLabel.fontSize = 34;
        titleLabel.lineHeight = 46;
        titleLabel.string = `${resultText}\n今日最好 ${DiceGameSave.getTodayBestStage()}关\n剩余挑战 ${DiceGameSave.getRemainDailyChallengeCount()}/${DiceGameSave.MAX_DAILY_CHALLENGE_COUNT}\n地区 ${DiceGameSave.getRegionName()}`;
        titleLabel.node.off(cc.Node.EventType.TOUCH_END, ShareManager.shareBestDamage, ShareManager);
        titleLabel.node.on(cc.Node.EventType.TOUCH_END, ShareManager.shareBestDamage, ShareManager);
    }

    private showHomeBtn(show:boolean){
        if(!show){
            if(this.homeBtn){
                this.homeBtn.active = false;
            }
            return;
        }

        if(!this.homeBtn){
            this.homeBtn = new cc.Node("btn_back_home");
            this.homeBtn.width = 260;
            this.homeBtn.height = 72;
            this.homeBtn.setPosition(0, -330);
            this.node.addChild(this.homeBtn);

            let bg:cc.Graphics = this.homeBtn.addComponent(cc.Graphics);
            bg.fillColor = cc.color(65, 50, 92, 255);
            bg.strokeColor = cc.color(160, 125, 230, 255);
            bg.lineWidth = 4;
            bg.roundRect(-130, -36, 260, 72, 8);
            bg.fill();
            bg.stroke();

            let labelNode:cc.Node = new cc.Node();
            this.homeBtn.addChild(labelNode);
            let label:cc.Label = labelNode.addComponent(cc.Label);
            label.string = "回到主界面";
            label.fontSize = 30;
            label.lineHeight = 38;
            label.node.color = cc.Color.WHITE;

            this.homeBtn.on(cc.Node.EventType.TOUCH_END, this.onBackHome, this);
        }

        this.homeBtn.active = true;
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
                GameMain.instance.showTip("今日挑战次数已用完，明天再来");
                return;
            }
            // 失败后重新挑战会消耗1次挑战次数；新用户首局本身没有扣次数
            GameMain.instance.resetRunData();
        }

        UIManager.getInstance().closeUI(MainPanel);
        UIManager.getInstance().closeUI(ResultPanel);
        UIManager.getInstance().openUI(MainPanel, 0, (ui: MainPanel) => {
            ui.onShow();
            if(GameMain.curStageIndex === 0){
                GameMain.instance.player.getDices();
            }
        })
    }

    private onBackHome(){
        // 回主界面不再额外扣次数，挑战次数统一在开局或重新挑战时扣
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
        this.btn_next.off(cc.Node.EventType.TOUCH_END,this.onNextTurn,this)
        let titleNode = this.node.getChildByName("task");
        if(titleNode){
            titleNode.off(cc.Node.EventType.TOUCH_END, ShareManager.shareBestDamage, ShareManager);
        }
        if(this.homeBtn){
            this.homeBtn.off(cc.Node.EventType.TOUCH_END, this.onBackHome, this);
        }
    }
}
