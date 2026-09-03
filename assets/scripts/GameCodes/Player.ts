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

    private attackNumStartX:number = 0;
    private attackNumStartY:number = 0;
    private attackBgStartX:number = 0;
    private attackBgStartY:number = 0;

    public curSelectedDiceType:DiceType[] = [];

    init(){
        this.hpText = MainPanel.instance.hpText;
        this.attackNum = MainPanel.instance.attackNum;
        this.attackbg = MainPanel.instance.attackbg;

        this.attackNumStartX = this.attackNum.node.x;
        this.attackNumStartY = this.attackNum.node.y;
        this.attackBgStartX = this.attackbg.x;
        this.attackBgStartY = this.attackbg.y;

        this.attackNum.node.active = false;
        this.attackbg.active = false;
        this.hpText.string = String(this.curHP);
    }

    getDices(){
        this.myDices = [];
        this.curSelectedDiceType = [];
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

    addHp(v: number) {
        this.curHP += v;
        if (this.curHP >= this.totalHp) {
            this.curHP = this.totalHp;
        }

        this.hpText.string = String(this.curHP);
        MainPanel.instance.refreshBattleWarningEffects();
    }

    brHurt(v:number){
        this.curHP -= v;

        // 每次受伤前都重置掉血文字状态，否则第一次动画把节点移走/透明后，第二次可能看不到
        cc.Tween.stopAllByTarget(this.attackNum.node);
        cc.Tween.stopAllByTarget(this.attackbg);
        this.attackNum.node.x = this.attackNumStartX;
        this.attackNum.node.y = this.attackNumStartY;
        this.attackNum.node.opacity = 255;
        this.attackbg.x = this.attackBgStartX;
        this.attackbg.y = this.attackBgStartY;
        this.attackbg.opacity = 255;

        this.attackNum.node.active = true;
        this.attackbg.active = true;

        this.attackNum.node.color = cc.Color.RED;
        this.attackNum.string = "-"+String(v)
        cc.tween(this.attackNum.node)
        .parallel(
            cc.tween().by(0.5,{y:-50}),
            cc.tween().to(0.5,{opacity:0})
        )
        .call(()=>{
            this.attackNum.node.active = false;
        })
        .start()

        cc.tween(this.attackbg)
        .parallel(
            cc.tween().by(0.5,{y:-50}),
            cc.tween().to(0.5,{opacity:0})
        )
        .call(()=>{
            this.attackbg.active = false;
            MainPanel.instance.onReRoll();
        })
        .start()

        this.hpText.string = String(this.curHP);
        MainPanel.instance.refreshBattleWarningEffects();
        if(this.curHP <= 0){
            GameMain.gameFinished = true;
            GameMain.gameResultType = "fail";
            MainPanel.instance.openResultPanel();
        }
    }
}
