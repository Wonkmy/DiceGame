import GameMain from "../GameMain";
import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { CalculateData, Chapter, CharmData, CreateChapter, DiceHandResult, DiceHandType, DiceNodePoint, DiceType, GameChapter, GetCalculateMultiple, getNoOverlapDicePositions, MonsterData, randomInt } from "../Global/DiceHandUtil";
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

const {ccclass, property} = cc._decorator;

@ccclass
export default class MainPanel extends BaseUI {
    public static instance:MainPanel = null!;
    protected static className = "MainPanel";

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
        [2, 2, 1, 4, 6],
        [1, 1, 2, 4, 6],
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

    @property({type:cc.Node, displayName:"低血量警告特效", tooltip:"玩家血量较低时显示，建议放在血量图标附近"})
    lowHpWarningNode:cc.Node = null!;



    onRollling:boolean = false;

    @property({type:cc.Node})
    btn_start:cc.Node = null!;

    @property({type:cc.Label})
    NumPointsText:cc.Label= null!;
    @property({type:cc.Label})
    NumMultipleText:cc.Label= null!;
    @property({type:cc.Label})
    TotalText:cc.Label= null!;
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

    private homeBtn:cc.Node = null!;
    private firstGuideTextOriginPos:cc.Vec2 = null!;
    private killReadyEffectOriginScale:number = null!;
    private lowHpWarningOriginScale:number = null!;

    onLoad(): void {
        MainPanel.instance = this;
        this.unusePointCount = 5;
        this.hideBattleWarningEffects();
        this.loadData();
    }

    override onShow(): void {
        this.hideBattleWarningEffects();
        this.refreshAllUIText(0,0,0,null,true);
        this.refreshCurStageLabel();
        GameMain.instance.player.init();
        GameMain.gameFinished = false;// 重置游戏结束标志位
        this.loadGame();

        this.showCharmData();

        this.btn_start.on(cc.Node.EventType.TOUCH_END,this.onStartBattle,this)
        this.btn_openDicePackage.on(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this)
        this.createHomeBtn();
        if(CC_DEBUG){
            DebugTool.attach(this.node);
        }

        this.node.getChildByName("GamingContainer").opacity = 0;
        if(this.testip){
            let guideRoot:cc.Node = this.getGuideTipRoot();
            this.firstGuideTextOriginPos = new cc.Vec2(guideRoot.x, guideRoot.y);
        }

        cc.tween(this.testip.node)
            .repeatForever(
                cc.tween().by(0.3,{scale:0.1}).by(0.3,{scale:-0.1})
            )
            .start();
    }

    private showCharmData(){
        for (let i = 0; i < GameMain.charmDatas.length; i++) {
            const c = GameMain.charmDatas[i];
            GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab, (err, prefab: cc.Prefab) => {
                let newRewardItem: cc.Node = cc.instantiate(prefab);
                this.allCharmItems.push(newRewardItem);
                this.node.getChildByName("GamingContainer").getChildByName("buffContainer").addChild(newRewardItem);
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
            this.curStageLabel.string = `当前第${GameMain.instance.getChallengeStageScore()}关`;
        }
    }

    private createHomeBtn(){
        if(this.homeBtn)return;

        this.homeBtn = new cc.Node("btn_home");
        this.homeBtn.width = 110;
        this.homeBtn.height = 54;
        this.homeBtn.setPosition(-290, 570);
        this.node.addChild(this.homeBtn);

        let bg:cc.Graphics = this.homeBtn.addComponent(cc.Graphics);
        bg.fillColor = cc.color(80, 52, 112, 255);
        bg.strokeColor = cc.color(160, 125, 230, 255);
        bg.lineWidth = 4;
        bg.roundRect(-55, -27, 110, 54, 8);
        bg.fill();
        bg.stroke();

        let labelNode:cc.Node = new cc.Node();
        this.homeBtn.addChild(labelNode);
        let label:cc.Label = labelNode.addComponent(cc.Label);
        label.string = "主页";
        label.fontSize = 28;
        label.lineHeight = 34;
        label.node.color = cc.Color.WHITE;

        this.homeBtn.on(cc.Node.EventType.TOUCH_END, this.onBackHome, this);
    }

    private onBackHome(){
        // 主动退出本局：已从主界面开始的挑战次数已经消耗；新用户首局不额外扣次数
        GameMain.instance.reportTodayChallengeResult();
        GameMain.instance.resetRunData();
        UIManager.getInstance().closeUI(ChapterPanel);
        UIManager.getInstance().closeUI(MainPanel);
        UIManager.getInstance().openUI(HomePanel, 0, (ui: HomePanel) => {
            ui.onShow();
        })
    }

    private refreshAllCharmItems(){
        for (let i = 0; i < this.allCharmItems.length; i++){
            this.allCharmItems[i].getComponent(RewardItem).charmData.useCount--;
            if (this.allCharmItems[i].getComponent(RewardItem).charmData.useCount == 0) {
                GameMain.charmDatas.splice(i, 1);
                this.allCharmItems[i].destroy();
                this.allCharmItems.splice(i,1);
            }
        }
    }

    private onOpenBagPanel(){
        if(GameMain.gameFinished)return;
        UIManager.getInstance().openUI(BagPanel, 0, (ui: BagPanel) => {
            ui.onShow();
            ui.setInventoryData("bag");
        })
    }
    /**
     * 重新刷新当前店铺物品，需要花费高额预算（后期看广告的盈利点）
     */
    onReRoll(){
        if(GameMain.gameFinished){
            UIManager.getInstance().openUI(TipPanel, 0, (ui: TipPanel) => {
                ui.onShow();
                ui.showTip("当前战斗已结束",null)
            })
            return;
        }
        if(this.onRollling)return;
        this.onRollling = true;

        this.scheduleOnce(()=>{
            FaynUtils.PlayMusic("btnclick",false,1);
            this.loadDices(GameMain.instance.player.curSelectedDiceType);
        },1);
    }

    private onStartBattle() {
        if(this.selectedDice.length<=0){
            UIManager.getInstance().openUI(TipPanel, 0, (ui: TipPanel) => {
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
        this.battlleIn = true;
        if(this.testip){
            this.getGuideTipRoot().active = false;
        }
        let data = GetCalculateMultiple(this.curDiceHandResult.type);
        let allPoint: number[] = this.curDiceHandResult.usedDicePoint;
        let unusePoint: number[] = this.curDiceHandResult.unusedDicePoint;
        let totalPoint = data.totalPoints;
        let totalMul = data.totalMultiple;

        this.calculateData.totalPoints = totalPoint + GameMain.extraPoint;
        this.calculateData.totalMultiple = totalMul + GameMain.extraMultiple;

        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        let totalAttack = 0;
        let processedDice = new Set<cc.Node>();
        for (let i = 0; i < allPoint.length; i++) {
            const element = allPoint[i];
            // 下面的判断是参与战斗的骰子是不是三选一的特殊骰子，是的话，直接按照类型以及对应的逻辑增加各种值
            this.selectedDice.forEach((d: cc.Node) => {
                if (d.getComponent(Dice).finalIndex === element && !processedDice.has(d)) {
                    processedDice.add(d);
                    this.calculateData.totalPoints += element;
                    this.loadTip(new cc.Vec2(d.x, d.y), element,cc.Color.WHITE,this.node);
                    if (d.getComponent(Dice).diceType === DiceType.fire) {
                        totalAttack += 3;
                        this.loadTip(new cc.Vec2(d.x, d.y), 3,cc.Color.RED,this.node);
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

                _sword.setSiblingIndex(999)
                // 宝剑攻击动画：先移动到y值为0的位置并放大1.5倍，再缩小到正常大小，延迟0.3秒后。逆时针旋转到-30度，然后再转到顺时针80度，最后再归0度。紧接着延迟0.3秒，移动回原来的位置并放大到1.5倍，再缩小到正常值
                cc.tween(_sword)
                    .parallel(
                        cc.tween().to(0.25, { y: 274 }),
                        cc.tween().to(0.25, { scale: 1.5})
                    )
                    .to(0.15, { scale: 1.428})
                    .delay(0.4)
                    .to(0.15, { angle: -30 })
                    .to(0.15, { angle: 80 })
                    .call(() => {
                        this.processAttackMonster(allPoint,totalAttack)// 处理攻击怪物逻辑
                    })
                    .to(0.15, { angle: 0 })
                    .delay(0.3)
                    .parallel(
                        cc.tween().to(0.15, { y: -208.3 }),
                        cc.tween().to(0.25, { scale: 1.5})
                    )
                    .to(0.15, { scale: 1.428})
                    .call(() => {
                        _sword.setSiblingIndex(oldIndex);
                        if(this.monster.getCurHp() > 0){
                            this.monster.doAttackAction();
                        }
                        this.NumPointsText.node.parent.active = true;
                        this.NumMultipleText.node.parent.active = true;
                        this.node.getChildByName("GamingContainer").getChildByName("x").active = true;
                    })
                    .start()
            }, false);
        },0.2);

    }

    switchHandType(type:string){
        let _path = "arts/handwords/" + (type.toLowerCase());
        cc.tween(this.node.getChildByName("GamingContainer").getChildByName("handwords"))
            .to(0.2,{scale:1.15})
            .to(0.2,{scale:0.8})
            .start()
        GameMain.instance.bundle.load(_path, cc.SpriteFrame,(err,sp:cc.SpriteFrame)=>{
            this.node.getChildByName("GamingContainer").getChildByName("handwords").getComponent(cc.Sprite).spriteFrame = sp;
        })
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
        let finalAttack = totalAttack + calculatorAttack;
        console.log("最终真实准备造成的伤害" + finalAttack);
        DiceGameSave.recordDamage(finalAttack);
        GameMain.instance.reportBestDamage(DiceGameSave.getBestDamage());
        this.monster.beHurt(finalAttack);

        let finalScale = Math.min((1.0 + (finalAttack * 0.03 / 10)),1.2)
        this.cameraShake(finalScale);

        for (let i = 0; i < this.selectedDice.length; i++) {
            const d = this.selectedDice[i];// 已选择的所有骰子
            const point = d.getComponent(Dice).finalIndex;// 已选择的那个骰子的点数
            if(allPoint.includes(point)){// 已选择的那个骰子的点数是否在已参与战斗的骰子点数列表中
                d.destroy();
                this.allDicesNodes.splice(this.allDicesNodes.indexOf(d),1)// 移除这个骰子
            }else {
                d.getComponent(Dice).setDeSelected();
            }
        }

        // 重置选中的骰子点数
        this.selectedDicePoint = [];
        this.selectedDice=[];
        this.calculateData = null!;
        this.refreshAllUIText(0, 0, 0, null, true);
        this.refreshAllCharmItems();// 移除底部所有已使用的charm
        this.unusePointCount = 5 - this.allDicesNodes.length;
        this.battlleIn = false;
        this.onRollling = false;
        this.node.getChildByName("GamingContainer").getChildByName("handwords").getComponent(cc.Sprite).spriteFrame = null!;
    }

    private loadGame() {
        setTimeout(() => {
            this.loadChapter()
        }, 150);
    }

    loadData(){
        GameMain.instance.bundle.load("datas/monster", cc.JsonAsset, (err, json) => {
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
        })
        GameMain.instance.bundle.load("datas/charm", cc.JsonAsset, (err, json) => {
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
        CreateChapter.init();
    }

    loadDices(dTypes:DiceType[]) {
        GameMain.instance.bundle.load("prefab/dice", cc.Prefab, (err, prefab: cc.Prefab) => {
            if (err) {
                console.error("load itemCell prefab error:", err);
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
            for (let i = 0; i < Math.min(this.unusePointCount, points.length); i++) {
                let btn_openDicePackagePos = this.node.getChildByName("GamingContainer").getChildByName("btn_openDicePackage");
                // 固定点数要在tween回调前先取好，否则标记位提前变化会导致首轮也变随机
                let fixedPoint:number = this.getFixedDicePoint(i);
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

            if(this.getCurBattleFixedDicePoints().length > 0 && this.hasUsedFixedDicePoints == false){
                this.hasUsedFixedDicePoints = true;
                this.tryStartFirstGuide();
            }
        })
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
        // 当前轻量版先不接商店构筑，保留入口并给明确提示。
        GameMain.instance.showTip("商店功能后续开放");
        GameMain.curStageIndex++;
        this.scheduleOnce(() => {
            this.loadChapter();
        }, 0.1);
    }

    openRest(nodeData:Chapter){
        // 当前轻量版先不做休息养成，保留入口并给明确提示。
        GameMain.instance.player.addHp(25);
        GameMain.instance.showTip("休息恢复25生命");
        GameMain.curStageIndex++;
        this.scheduleOnce(() => {
            this.loadChapter();
        }, 0.1);
    }

    openTreasure(nodeData:Chapter){
        // 当前轻量版先不接宝箱构筑，保留入口并给明确提示。
        GameMain.instance.showTip("宝箱功能后续开放");
        GameMain.curStageIndex++;
        this.scheduleOnce(() => {
            this.loadChapter();
        }, 0.1);
    }

    openBattle(nodeData:Chapter){
        this.currentNodeData = nodeData;
        this.hasUsedFixedDicePoints = false;
        GameMain.instance.bundle.load("prefab/monster", cc.Prefab, (err, prefab: cc.Prefab) => {
            let newMonster: cc.Node = cc.instantiate(prefab);
            this.node.getChildByName("GamingContainer").addChild(newMonster);
            let md: MonsterData = this.allMonsterDatas[nodeData.eventData.monsterIds]
            newMonster.getComponent(Monster).init(md);
            this.monster = newMonster.getComponent(Monster);
            this.refreshBattleWarningEffects();
        })
        cc.tween(this.node.getChildByName("GamingContainer"))
            .to(0.25, { opacity: 255 })
            .start()
        this.onReRoll();
    }

    disposeMonster(monster:Monster){
        GameMain.gameFinished = true;
        DiceGameSave.recordKill();
        DiceGameSave.recordStage(GameMain.instance.getChallengeStageScore());
        GameMain.instance.reportBestStage(DiceGameSave.getBestStage());
        GameMain.instance.reportChallengeRank(DiceGameSave.getTodayBestStage());
        GameMain.gameResultType = this.currentNodeData && this.currentNodeData.type === "boss" ? "chapterWin" : "stageWin";
        if(this.firstGuideActive){
            // 首局第一个怪击杀后结束引导，之后不再反复打扰玩家。
            this.firstGuideActive = false;
            GameMain.isNewUserFirstPlay = false;
            DiceGameSave.markFirstGuideDone();
        }
        this.monster = null!;
        monster.node.destroy();
        Advertise.showChapingAd();

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
            let newTip: cc.Node = cc.instantiate(prefab);
            parent.addChild(newTip);
            newTip.getComponent(Tip).init(pos,num,_color);
        })
    }

    refreshAllUIText(p: number, m: number, totalAttack: number = 0, callBack: any = null, immediate: boolean = true) {
        this.calculateData = new CalculateData(p, m);
        if (immediate) {
            this.NumPointsText.string = p.toString();
            this.NumMultipleText.string = m.toString();
            this.TotalText.string = (p * m + totalAttack).toString();
            this.refreshBattleWarningEffects();
        } else {
            setTimeout(() => {
                this.NumPointsText.string = p.toString();
                this.nodeScale(this.NumPointsText.node.parent)
                this.cameraShake(1.01);
                setTimeout(() => {
                    this.NumMultipleText.string = m.toString();
                    this.nodeScale(this.NumMultipleText.node.parent)
                this.cameraShake(1.01);
                    setTimeout(() => {
                        if (totalAttack > 0) {
                            this.TotalText.string = (p * m).toString();
                            this.nodeScale(this.TotalText.node)
                            this.cameraShake(1.06);
                            setTimeout(() => {
                                this.TotalText.string = (p * m + totalAttack).toString()
                                this.nodeScale(this.TotalText.node)
                                this.refreshBattleWarningEffects();
                                this.NumPointsText.node.parent.active = false;
                                this.NumMultipleText.node.parent.active = false;
                                this.node.getChildByName("GamingContainer").getChildByName("x").active = false;
                                setTimeout(() => {
                                    if (callBack != null && callBack != undefined) {
                                        callBack()
                                    }
                                }, 800);
                            }, 500);
                        }
                        else {
                            this.cameraShake(1.06);
                            this.TotalText.string = (p * m).toString();
                            this.nodeScale(this.TotalText.node)
                            this.refreshBattleWarningEffects();
                            this.NumPointsText.node.parent.active = false;
                            this.NumMultipleText.node.parent.active = false;
                            this.node.getChildByName("GamingContainer").getChildByName("x").active = false;
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
    }

    private hideBattleWarningEffects(){
        this.setLoopEffectVisible(this.killReadyEffectNode, false, "kill");
        this.setLoopEffectVisible(this.lowHpWarningNode, false, "lowHp");
    }

    private refreshKillReadyEffect(){
        if(!this.killReadyEffectNode)return;

        let show:boolean = false;
        if(!GameMain.gameFinished && this.monster && this.calculateData){
            let curAttack:number = this.calculateData.totalPoints * this.calculateData.totalMultiple;
            // 怪物有护盾时，必须把护盾也算进去，避免提示“能杀”但实际杀不掉。
            show = curAttack >= this.monster.getCurHp() + this.monster.getCurShield();
        }

        this.setLoopEffectVisible(this.killReadyEffectNode, show, "kill");
    }

    private refreshLowHpWarningEffect(){
        if(!this.lowHpWarningNode)return;

        let show:boolean = false;
        if(GameMain.instance && GameMain.instance.player && GameMain.instance.player.totalHp > 0){
            show = !GameMain.gameFinished && GameMain.instance.player.curHP > 0 && GameMain.instance.player.curHP <= GameMain.instance.player.totalHp * 0.3;
        }

        this.setLoopEffectVisible(this.lowHpWarningNode, show, "lowHp");
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
        if(this.killReadyEffectNode && cc.isValid(this.killReadyEffectNode)){
            cc.Tween.stopAllByTarget(this.killReadyEffectNode);
        }
        if(this.lowHpWarningNode && cc.isValid(this.lowHpWarningNode)){
            cc.Tween.stopAllByTarget(this.lowHpWarningNode);
        }
        this.btn_start.off(cc.Node.EventType.TOUCH_END,this.onStartBattle,this)
        this.btn_openDicePackage.off(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this)
        this.calculateData = null!;
    }
}
