import GameMain from "../GameMain";
import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { CalculateData, CharmData, DiceHandResult, DiceNodePoint, DiceType, GetCalculateMultiple, getNoOverlapDicePositions, MonsterData, randomInt } from "../Global/DiceHandUtil";
import Dice from "../GameCodes/Dice";
import Tip from "../GameCodes/Tip";
import Monster from "../GameCodes/Monster";
import Player from "../GameCodes/Player";
import { UIManager } from "../UIManager/UIManager";
import ResultPanel from "./ResultPanel";
import BagPanel from "./BagPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class MainPanel extends BaseUI {
    public static instance:MainPanel = null!;
    protected static className = "MainPanel";

    dice_num_node:DiceNodePoint[] = [];
    selectedDicePoint:number[]=[]
    calculateData:CalculateData = null!;
    curDiceHandResult:DiceHandResult = null!;
    unusePointCount:number = 0;

    allMonsterDatas:MonsterData[]=[]
    allCharmDatas:CharmData[]=[]
    monster:Monster = null!;

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
        this.loadData();
        this.loadGame();
        this.btn_onRoll.on(cc.Node.EventType.TOUCH_END,this.onReRoll,this)
        this.btn_start.on(cc.Node.EventType.TOUCH_END,this.onStartBattle,this)
        this.btn_openDicePackage.on(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this)

        cc.tween(this.testip.node)
            .repeatForever(
                cc.tween().by(0.3,{scale:0.1}).by(0.3,{scale:-0.1})
            )
            .start();
    }

    private onOpenBagPanel(){
        UIManager.getInstance().openUI(BagPanel, 0, (ui: BagPanel) => {
            ui.onShow();
            ui.setInventoryData("bag");
        })
    }
    /**
     * 重新刷新当前店铺物品，需要花费高额预算（后期看广告的盈利点）
     */
    private onReRoll(){
        if(this.onRollling)return;
        this.onRollling = true;
        FaynUtils.PlayMusic("btnclick",false,1);
        this.loadDices(GameMain.instance.player.curSelectedDiceType);
    }

    private onStartBattle() {
        if (this.battlleIn) return;
        this.battlleIn = true;
        // let data = GetCalculateMultiple(this.curDiceHandResult.type);
        // let allPoint: number[] = this.curDiceHandResult.usedDicePoint;
        // let unusePoint: number[] = this.curDiceHandResult.unusedDicePoint;
        // let totalPoint = data.totalPoints;
        // let totalMul = data.totalMultiple;
        // this.calculateData.totalPoints = totalPoint;
        // this.calculateData.totalMultiple = totalMul;
        // let totalAttack = 0;
        // let processedDice = new Set<DiceNodePoint>();
        // for (let i = 0; i < allPoint.length; i++) {
        //     const element = allPoint[i];
        //     this.dice_num_node.forEach((d: DiceNodePoint) => {
        //         if (d.dicePoint === element && !processedDice.has(d)) {
        //             processedDice.add(d);
        //             this.calculateData.totalPoints += element;
        //             this.loadTip(new cc.Vec2(d.diceNode.x, d.diceNode.y), element,cc.Color.WHITE);
        //             if (d.diceType === DiceType.fire) {
        //                 totalAttack += 3;
        //                 this.loadTip(new cc.Vec2(d.diceNode.x, d.diceNode.y), 3,cc.Color.RED);
        //             }
        //             if(d.diceType === DiceType.mult){
        //                 this.calculateData.totalMultiple += 1
        //             }
        //         }
        //     });
        // }
        let data = GetCalculateMultiple(this.curDiceHandResult.type);
        let allPoint: number[] = this.curDiceHandResult.usedDicePoint;
        let totalPoint = data.totalPoints;
        let totalMul = data.totalMultiple;
        this.calculateData.totalPoints = totalPoint;
        this.calculateData.totalMultiple = totalMul;
        let totalAttack = 0;

        // 创建选中点数的计数映射
        let selectedPointCount = new Map<number, number>();
        for (let point of this.selectedDicePoint) {
            selectedPointCount.set(point, (selectedPointCount.get(point) || 0) + 1);
        }

        // 遍历所有骰子，匹配选中的点数
        for (let i = 0; i < this.dice_num_node.length; i++) {
            const d = this.dice_num_node[i];
            const point = d.dicePoint;

            // 检查这个点数的骰子是否还需要
            let remainingCount = selectedPointCount.get(point) || 0;
            if (remainingCount > 0) {
                // 标记已使用
                selectedPointCount.set(point, remainingCount - 1);

                // 执行计算
                this.calculateData.totalPoints += point;
                this.loadTip(new cc.Vec2(d.diceNode.x, d.diceNode.y), point, cc.Color.WHITE);

                if (d.diceType === DiceType.fire) {
                    totalAttack += 3;
                    this.loadTip(new cc.Vec2(d.diceNode.x, d.diceNode.y), 3, cc.Color.RED);
                }
                if (d.diceType === DiceType.mult) {
                    this.calculateData.totalMultiple += 1;
                }
            }
        }
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
                    .to(0.15, { scale: 1.2})
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
                    .to(0.15, { scale: 1.2})
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

        this.cameraShake(1.1);

        // 使用 selectedDicePoint 作为主要匹配依据
        let selectedPointCount = new Map<number, number>();
        for (let point of this.selectedDicePoint) {
            selectedPointCount.set(point, (selectedPointCount.get(point) || 0) + 1);
        }

        // 验证数据一致性（可选）
        if (allPoint.length !== this.selectedDicePoint.length) {
            console.warn(`数据不一致: allPoint长度=${allPoint.length}, selectedDicePoint长度=${this.selectedDicePoint.length}`);
            // 如果不一致，使用 allPoint 重新构建计数
            selectedPointCount = new Map<number, number>();
            for (let point of allPoint) {
                selectedPointCount.set(point, (selectedPointCount.get(point) || 0) + 1);
            }
        }

        let indicesToRemove: number[] = [];

        for (let i = 0; i < this.dice_num_node.length; i++) {
            const d = this.dice_num_node[i];
            const point = d.dicePoint;

            let remainingCount = selectedPointCount.get(point) || 0;
            if (remainingCount > 0) {
                indicesToRemove.push(i);
                selectedPointCount.set(point, remainingCount - 1);
            } else {
                d.diceNode.getComponent(Dice).setDeSelected();
            }
        }

        indicesToRemove.sort((a, b) => b - a);
        for (let index of indicesToRemove) {
            const d = this.dice_num_node[index];
            if (d && d.diceNode) {
                d.diceNode.destroy();
            }
            this.dice_num_node.splice(index, 1);
        }

        // 重置选中的骰子点数
        this.selectedDicePoint = [];
        this.calculateData = null!;
        this.refreshAllUIText(0, 0, 0, null, true);
        this.unusePointCount = 5 - this.dice_num_node.length;
        this.battlleIn = false;
        this.onRollling = false;
    }

    private loadGame() {
        setTimeout(() => {
            this.loadMonster()
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
                newCharmData.desc = percharmData.desc;
                newCharmData.effect = percharmData.effect;
                newCharmData.icon = percharmData.icon;
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
            this.dice_num_node.forEach(d => {
                oldPoionts.push(new cc.Vec2(d.diceNode.x, d.diceNode.y))
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
                    let random:number  = randomInt(0,dTypes.length)
                    let newDice: cc.Node = cc.instantiate(prefab)
                    if (!newDice) {
                        continue;
                    }
                    this.node.addChild(newDice);
                    const diceComp = newDice.getComponent(Dice);
                    if (diceComp) {
                        diceComp.init(new cc.Vec2(this.btn_onRoll.position.x,this.btn_onRoll.position.y), points[i],i,dTypes[random]);
                    } else {
                        console.error(`第${i + 1}个骰子组件获取失败`);
                    }
                }
        })
    }

    loadMonster(){
        GameMain.instance.bundle.load("prefab/monster", cc.Prefab,(err,prefab:cc.Prefab)=>{
            let newMonster: cc.Node = cc.instantiate(prefab);
            this.node.addChild(newMonster);
            let md:MonsterData = this.allMonsterDatas[GameMain.curStage]
            newMonster.getComponent(Monster).init(md);
            this.monster = newMonster.getComponent(Monster);
        })
    }

    disposeMonster(monster:Monster){
        this.monster = null!;
        monster.node.destroy();

        UIManager.getInstance().openUI(ResultPanel, 0, (ui: ResultPanel) => {
            ui.onShow();
        })
    }

    loadTip(pos:cc.Vec2,num:number,_color:cc.Color){
        GameMain.instance.bundle.load("prefab/tip", cc.Prefab,(err,prefab:cc.Prefab)=>{
            let newTip: cc.Node = cc.instantiate(prefab);
            this.node.addChild(newTip);
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

    nodeScale(target:cc.Node){
        cc.tween(target)
        .to(0.2,{scale:1.5})
        .call(()=>{
            target.scale = 1;
        })
        .start()
    }

    override onDestroy(): void {
        this.btn_onRoll.off(cc.Node.EventType.TOUCH_END,this.onReRoll,this)
        this.btn_start.off(cc.Node.EventType.TOUCH_END,this.onStartBattle,this)
        this.btn_openDicePackage.off(cc.Node.EventType.TOUCH_END,this.onOpenBagPanel,this)
        this.calculateData = null!;
    }
}
