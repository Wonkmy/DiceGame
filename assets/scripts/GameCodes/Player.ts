import GameMain from "../GameMain";
import { CharmData, DiceType } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Player extends cc.Component {
    curHP:number = 0;
    totalHp:number = 100;

    myDices:DiceType[] = []

    hpText:cc.Label = null!;

    attackNum:cc.Label = null!;
    attackbg:cc.Node = null!;

    public curSelectedDiceType:DiceType[] = [];

    init(){
        this.hpText = MainPanel.instance.hpText;
        this.attackNum = MainPanel.instance.attackNum;
        this.attackbg = MainPanel.instance.attackbg;

        this.attackNum.node.active = false;
        this.attackbg.active = false;
        this.hpText.string = String(this.curHP);
    }

    getDices(){
        // 默认只有一种类型（普通）的骰子
        this.myDices.push(DiceType.normal);
        this.curSelectedDiceType.push(DiceType.normal);

        this.curHP = this.totalHp;
        this.hpText.string = String(this.curHP);
    }
    /**
     * 添加一个骰子类型到已选择的列表中
     */
    addDice(dType:DiceType){
        let repeatmyDices:boolean = false;
        let repeatSeleDices:boolean = false;
        for (let i = 0; i < this.myDices.length; i++) {
            if(this.myDices[i] === dType){
                repeatmyDices = true;
            }
        }
        if(repeatmyDices == false){
            this.myDices.push(dType);
        }

        for (let i = 0; i < this.curSelectedDiceType.length; i++) {
            if(this.curSelectedDiceType[i] === dType){
                repeatSeleDices = true;
            }
        }
        if(repeatSeleDices == false){
            this.curSelectedDiceType.push(dType);
        }
    }

    brHurt(v:number){
        this.curHP -= v;

        this.attackNum.node.active = true;
        this.attackbg.active = true;

        this.attackNum.string = "-"+String(v)
        cc.tween(this.attackNum.node)
        .parallel(
            cc.tween().by(0.3,{y:-50}),
            cc.tween().to(0.3,{opacity:0})
        )
        .call(()=>{
            this.attackNum.node.active = false;
        })
        .start()

        cc.tween(this.attackbg)
        .parallel(
            cc.tween().by(0.3,{y:-50}),
            cc.tween().to(0.3,{opacity:0})
        )
        .call(()=>{
            this.attackbg.active = false;
        })
        .start()

        this.hpText.string = String(this.curHP);
        if(this.curHP <= 0){
            console.log("游戏结束");
        }
    }
}
