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
    private hpIconOriginScale:number = 1;
    private hpIconOriginColor:cc.Color = null!;
    private hpTextOriginColor:cc.Color = null!;

    public curSelectedDiceType:DiceType[] = [];

    init(){
        this.hpText = MainPanel.instance.hpText;
        this.attackNum = MainPanel.instance.attackNum;
        this.attackbg = MainPanel.instance.attackbg;

        this.attackNumStartX = this.attackNum.node.x;
        this.attackNumStartY = this.attackNum.node.y;
        this.attackBgStartX = this.attackbg.x;
        this.attackBgStartY = this.attackbg.y;
        if(MainPanel.instance.health2d){
            this.hpIconOriginScale = MainPanel.instance.health2d.scale;
            this.hpIconOriginColor = cc.color(MainPanel.instance.health2d.color.r, MainPanel.instance.health2d.color.g, MainPanel.instance.health2d.color.b, MainPanel.instance.health2d.color.a);
        }
        if(this.hpText){
            this.hpTextOriginColor = cc.color(this.hpText.node.color.r, this.hpText.node.color.g, this.hpText.node.color.b, this.hpText.node.color.a);
        }

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
     * 播放玩家受击前预警。
     * 怪物真正扣血前调用，只做血量区域的视觉提醒，不修改玩家血量。
     */
    playBeforeHurtWarning(nextDamage:number){
        let willDie:boolean = this.curHP > 0 && nextDamage >= this.curHP;
        let warnColor:cc.Color = willDie ? cc.color(255, 35, 35, 255) : cc.color(255, 120, 80, 255);
        let warnScale:number = willDie ? 1.28 : 1.16;

        this.playHpIconWarning(warnColor, warnScale);
        this.playHpTextWarning(warnColor, warnScale);
    }

    /**
     * 播放血量图标预警动画。
     * 只改图标缩放和颜色，动画结束后恢复原始状态。
     */
    private playHpIconWarning(warnColor:cc.Color, warnScale:number){
        let hpIcon:cc.Node = MainPanel.instance.health2d;
        if(!hpIcon || !cc.isValid(hpIcon))return;

        if(!this.hpIconOriginColor){
            this.hpIconOriginColor = cc.color(hpIcon.color.r, hpIcon.color.g, hpIcon.color.b, hpIcon.color.a);
        }

        cc.Tween.stopAllByTarget(hpIcon);
        hpIcon.scale = this.hpIconOriginScale;
        hpIcon.color = warnColor;
        cc.tween(hpIcon)
            .to(0.08, { scale: this.hpIconOriginScale * warnScale })
            .to(0.08, { scale: this.hpIconOriginScale * 0.96 })
            .to(0.08, { scale: this.hpIconOriginScale })
            .call(() => {
                if(!hpIcon || !cc.isValid(hpIcon))return;
                hpIcon.color = this.hpIconOriginColor;
            })
            .start();
    }

    /**
     * 播放血量数字预警动画。
     * 数字闪红用于提示即将扣血，尤其是致命伤害时更明显。
     */
    private playHpTextWarning(warnColor:cc.Color, warnScale:number){
        if(!this.hpText || !cc.isValid(this.hpText.node))return;

        if(!this.hpTextOriginColor){
            this.hpTextOriginColor = cc.color(this.hpText.node.color.r, this.hpText.node.color.g, this.hpText.node.color.b, this.hpText.node.color.a);
        }

        cc.Tween.stopAllByTarget(this.hpText.node);
        this.hpText.node.scale = 1;
        this.hpText.node.color = warnColor;
        cc.tween(this.hpText.node)
            .to(0.08, { scale: warnScale })
            .to(0.08, { scale: 1 })
            .delay(0.08)
            .call(() => {
                if(!this.hpText || !cc.isValid(this.hpText.node))return;
                this.hpText.node.color = this.hpTextOriginColor;
            })
            .start();
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
            // 挑战失败后，本次挑战连胜立即清空。
            GameMain.curWinStreak = 0;
            MainPanel.instance.openResultPanel();
        }
    }
}
