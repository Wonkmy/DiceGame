import GameMain from "../GameMain";
import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { CalculateData, chapterNodeConfig, CharmData, DiceHandResult, DiceNodePoint, DiceType, GetCalculateMultiple, getNoOverlapDicePositions, MonsterData, randomInt } from "../Global/DiceHandUtil";
import Dice from "../GameCodes/Dice";
import Tip from "../GameCodes/Tip";
import Monster from "../GameCodes/Monster";
import Player from "../GameCodes/Player";
import { UIManager } from "../UIManager/UIManager";
import ResultPanel from "./ResultPanel";
import BagPanel from "./BagPanel";
import TipPanel from "./TipPanel";
import RewardItem from "../UIManager/RewardItem";

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

    allCharmItems:cc.Node[] = [];// 所有的加成item显示列表

    battlleIn:boolean = false;

    @property({type:cc.Node})
    btn_onRoll:cc.Node = null!;// 重新扔出5个骰子，花费x金币

    @property({type:cc.Node})
    btn_openDicePackage:cc.Node = null!;// 打开所拥有的骰子界面

    @property({type:cc.Node})
    health2d:cc.Node = null!;



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

    onLoad(): void {
        MainPanel.instance = this;
        this.unusePointCount = 5;
    }

    override onShow(): void {
        this.refreshAllUIText(0,0,0,null,true);
        GameMain.instance.player.init();
        GameMain.gameFinished = false;// 重置游戏结束标志位
        this.loadData();
        this.loadGame();

        this.showCharmData();

        console.log(chapterNodeConfig[0]);

        this.btn_start.on(cc.Node.EventType.TOUCH_END,this.onStartBattle,this)
        this.btn_openDicePackage.on(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this)

        cc.tween(this.testip.node)
            .repeatForever(
                cc.tween().by(0.3,{scale:0.1}).by(0.3,{scale:-0.1})
            )
            .start();

        this.onReRoll();
    }

    private showCharmData(){
        for (let i = 0; i < GameMain.charmDatas.length; i++) {
            const c = GameMain.charmDatas[i];
            GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab, (err, prefab: cc.Prefab) => {
                let newRewardItem: cc.Node = cc.instantiate(prefab);
                this.allCharmItems.push(newRewardItem);
                this.node.getChildByName("buffContainer").addChild(newRewardItem);
                newRewardItem.scale = 0.75;
                newRewardItem.getComponent(RewardItem).setOnlyClick(c);
                newRewardItem.y = 0;
                if(c.useCount > 0){
                    if(c.effect === "point"){
                        GameMain.extraPoint += c.num;
                    }
                }
            })
        }
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
        if (this.battlleIn) return;
        this.battlleIn = true;
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
                let _sword = this.node.getChildByName("sword")
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
                        this.node.getChildByName("x").active = true;
                    })
                    .start()
            }, false);
        },0.2);

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
                let btn_openDicePackagePos = this.node.getChildByName("btn_openDicePackage");
                cc.tween(btn_openDicePackagePos)
                    .delay(i * 0.2)
                    .to(0.2, { scale: 1.2 })
                    .call(() => {
                        btn_openDicePackagePos.scale = 1;
                        let random: number = randomInt(0, dTypes.length)
                        let newDice: cc.Node = cc.instantiate(prefab)
                        this.node.addChild(newDice);
                        this.allDicesNodes.push(newDice);
                        const diceComp = newDice.getComponent(Dice);
                        if (diceComp) {
                            diceComp.init(new cc.Vec2(btn_openDicePackagePos.x, btn_openDicePackagePos.y), points[i], i, dTypes[random]);
                        } else {
                            console.error(`第${i + 1}个骰子组件获取失败`);
                        }
                    })
                    .start()
            }
        })
    }

    loadChapter(){
        GameMain.instance.bundle.load("prefab/monster", cc.Prefab,(err,prefab:cc.Prefab)=>{
            let newMonster: cc.Node = cc.instantiate(prefab);
            this.node.addChild(newMonster);
            let nodeData = chapterNodeConfig[GameMain.curStage][0];
            if ((nodeData.type === "battle" || nodeData.type === "elite" || nodeData.type === "boss") && "monsterIds" in nodeData) {
                let md: MonsterData = this.allMonsterDatas[nodeData.monsterIds]
                newMonster.getComponent(Monster).init(md);
                this.monster = newMonster.getComponent(Monster);
            } else if (nodeData.type === "shop") {
                // this.openShop();
            } else if (nodeData.type === "event") {
                // this.openEvent();
            } else if (nodeData.type === "rest") {
                // this.openRest();
            } else if (nodeData.type === "treasure") {
                // this.openTreasure();
            }
        })
    }

    disposeMonster(monster:Monster){
        GameMain.gameFinished = true;
        this.monster = null!;
        monster.node.destroy();

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
                                this.NumPointsText.node.parent.active = false;
                                this.NumMultipleText.node.parent.active = false;
                                this.node.getChildByName("x").active = false;
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
                            this.NumPointsText.node.parent.active = false;
                            this.NumMultipleText.node.parent.active = false;
                            this.node.getChildByName("x").active = false;
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

    override onDestroy(): void {
        // this.btn_onRoll.off(cc.Node.EventType.TOUCH_END,this.onReRoll,this)
        this.btn_start.off(cc.Node.EventType.TOUCH_END,this.onStartBattle,this)
        this.btn_openDicePackage.off(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this)
        this.calculateData = null!;
    }
}
