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
    totalTimer:number = 2;
    cTime:number = 0;
    curIndex:number = 0;

    diceType:DiceType = DiceType.normal;

    points:number[]=[]

    init(oldPos:cc.Vec2,targetPos:cc.Vec2,id:number,_diceType:DiceType){
        this.points.push(1,2,3,4,5,6)
        this.node.position = new cc.Vec3(oldPos.x,oldPos.y,0);
        this.diceType = _diceType;

        this.node.scale = 0;
        cc.tween(this.node)
            .delay(id * 0.03)
            .parallel(
                cc.tween().to(0.3,{scale:1},{easing:"backOut"}),
                cc.tween().to(0.3,{x:targetPos.x,y:targetPos.y},{easing:"backOut"})
            )
            .call(()=>{
                MainPanel.instance.testip.node.active = true;
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
        let _type = MainPanel.instance.curDiceHandResult.type;
        MainPanel.instance.switchHandType(DiceHandType[_type]);
        if (MainPanel.instance.curDiceHandResult.type > 0) {
            MainPanel.instance.NumPointsText.string = GetCalculateMultiple(MainPanel.instance.curDiceHandResult.type).totalPoints.toString();
            MainPanel.instance.NumMultipleText.string = GetCalculateMultiple(MainPanel.instance.curDiceHandResult.type).totalMultiple.toString();
        }else{
            MainPanel.instance.NumPointsText.string = "0";
            MainPanel.instance.NumMultipleText.string = "0";
        }
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
        let r:number = randomInt(0,this.points.length)
        // this.finalIndex = Math.round(Math.random() * 5 + 1)
        this.finalIndex = this.points[r]
        var newDiceNode:DiceNodePoint = new DiceNodePoint();
        newDiceNode.dicePoint = this.finalIndex;
        newDiceNode.diceNode = this.node;
        newDiceNode.diceType = this.diceType;
        this.startDice = true;
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
