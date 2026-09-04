// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import GameMain from "../GameMain";
import { DiceHandType, DiceNodePoint, DiceType, GetCalculateMultiple, getDiceHandResult, GetTypeNameByType, randomInt } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Dice extends cc.Component {

    isSelected:boolean = false;
    finalIndex:number = 0;
    startDice:boolean = true;

    time:number = 0;
    totalTimer:number = 0.85;
    cTime:number = 0;
    curIndex:number = 0;

    diceType:DiceType = DiceType.normal;

    points:number[]=[]
    fixedPoint:number = 0;

    init(oldPos:cc.Vec2,targetPos:cc.Vec2,id:number,_diceType:DiceType, fixedPoint:number = 0){
        this.points.push(1,2,3,4,5,6)
        this.node.position = new cc.Vec3(oldPos.x,oldPos.y,0);
        this.diceType = _diceType;
        this.fixedPoint = fixedPoint;

        this.node.scale = 0;
        cc.tween(this.node)
            .delay(id * 0.03)
            .parallel(
                cc.tween().to(0.3,{scale:1},{easing:"backOut"}),
                cc.tween().to(0.3,{x:targetPos.x,y:targetPos.y},{easing:"backOut"})
            )
            .call(()=>{
                MainPanel.instance.testip.node.active = true;
                this.playLandingFeedback();
                this.doStartDice()
            })
            .start()


        this.node.on(cc.Node.EventType.TOUCH_END,this.onSelected,this)
    }

    private onSelected() {
        MainPanel.instance.testip.node.active = false;
        if (this.isSelected) {
            this.isSelected = false;
        } else {
            this.isSelected = true;
        }

        if (this.isSelected) {
            GameMain.instance.bundle.load("arts/dices/" + DiceType[this.diceType] + "/" + (this.finalIndex) + "_selected", cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
                let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
                sprite.spriteFrame = sf;
            })
            MainPanel.instance.selectedDicePoint.push(this.finalIndex)
            MainPanel.instance.selectedDice.push(this.node)
        } else {
            GameMain.instance.bundle.load("arts/dices/" + DiceType[this.diceType] + "/" + (this.finalIndex), cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
                let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
                sprite.spriteFrame = sf;
            })
            MainPanel.instance.selectedDicePoint.splice(MainPanel.instance.selectedDicePoint.indexOf(this.finalIndex), 1);
            MainPanel.instance.selectedDice.splice(MainPanel.instance.selectedDice.indexOf(this.node),1);
        }

        MainPanel.instance.curDiceHandResult = getDiceHandResult(MainPanel.instance.selectedDicePoint);
        console.log("当前选择的点数型是:" + GetTypeNameByType(MainPanel.instance.curDiceHandResult.type));
        MainPanel.instance.refreshFirstGuideAfterSelect();
        let _type = MainPanel.instance.curDiceHandResult.type;
        MainPanel.instance.switchHandType(DiceHandType[_type]);
        if (MainPanel.instance.curDiceHandResult.type > 0) {
            MainPanel.instance.NumPointsText.string = GetCalculateMultiple(MainPanel.instance.curDiceHandResult.type).totalPoints.toString();
            MainPanel.instance.NumMultipleText.string = GetCalculateMultiple(MainPanel.instance.curDiceHandResult.type).totalMultiple.toString();
        }else{
            MainPanel.instance.NumPointsText.string = "0";
            MainPanel.instance.NumMultipleText.string = "0";
        }
        MainPanel.instance.playHandFormFeedback();
    }
    async setDeSelected() {
    return new Promise<void>((resolve, reject) => {
        GameMain.instance.bundle.load("arts/dices/" + DiceType[this.diceType]+ "/" + (this.finalIndex), cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
            if (err) {
                reject(err);
                return;
            }

            if (this.node) {
                let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
                sprite.spriteFrame = sf;
                this.isSelected = false;
            }
            resolve();
        });
    });
}

    protected update(dt: number): void {
        if (this.startDice) {
            this.time += dt;
            if (this.time >= this.totalTimer) {
                this.time = 0;
                this.startDice = false;
                GameMain.instance.bundle.load("arts/dices/"+ DiceType[this.diceType]+ "/"  + (this.finalIndex), cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
                    let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
                    sprite.spriteFrame = sf;
                })
            } else {
                this.cTime += dt;
                if (this.cTime >= 0.3) {
                    this.changeDiceSp();
                }
            }
        }
    }

    private doStartDice(){
        if(this.fixedPoint >= 1 && this.fixedPoint <= 6){
            // 前几只教学怪使用固定点数，方便控制新手难度节奏
            this.finalIndex = this.fixedPoint;
        }else{
            let r:number = randomInt(0,this.points.length)
            // this.finalIndex = Math.round(Math.random() * 5 + 1)
            this.finalIndex = this.points[r]
        }
        var newDiceNode:DiceNodePoint = new DiceNodePoint();
        newDiceNode.dicePoint = this.finalIndex;
        newDiceNode.diceNode = this.node;
        newDiceNode.diceType = this.diceType;
        this.startDice = true;
    }

    /**
     * 播放骰子落点反馈。
     * 只做落地弹一下和短暂提亮，不改骰子点数、类型和生成规则。
     */
    private playLandingFeedback(){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode))return;

        cc.Tween.stopAllByTarget(viewNode);

        this.node.scale = 1;
        viewNode.scale = 1;
        viewNode.color = cc.color(255, 240, 150, 255);

        this.scheduleOnce(() => {
            if(!this.node || !cc.isValid(this.node))return;
            cc.tween(this.node)
                // 落地时先轻微压缩，再明显弹起，最后回到正常大小
                .to(0.06, { scale: 0.88 })
                .to(0.12, { scale: 1.22 }, { easing: "backOut" })
                .to(0.08, { scale: 0.98 })
                .to(0.06, { scale: 1 })
                .start();
        }, 0);

        cc.tween(viewNode)
            .delay(0.08)
            .to(0.16, { scale: 1.04 })
            .call(() => {
                if(!viewNode || !cc.isValid(viewNode))return;
                viewNode.color = cc.Color.WHITE;
                viewNode.scale = 1;
            })
            .start();
    }

    private changeDiceSp(){
        this.curIndex++;
        if (this.curIndex > 5) {
            this.curIndex = 0;
        }

        let _path = "arts/dices/" + DiceType[this.diceType]+ "/" + (this.curIndex + 1);

        GameMain.instance.bundle.load(_path, cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
            let sprite:cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
            sprite.spriteFrame = sf;
        })
    }
}
