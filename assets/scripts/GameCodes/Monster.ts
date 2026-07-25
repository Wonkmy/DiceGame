import GameMain from "../GameMain";
import { MonsterData, randomInt } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Monster extends cc.Component {
    @property({type:cc.Node})
    hpSlider:cc.Node = null!;
    hpText:cc.Label = null!;
    maxValue:number = 320;// 最大的血条宽度，后面血条的显示都基于这个宽度

    totalHp:number = 0;
    curHp:number = 0;
    shiled:number = 0;
    attack:number = 0;

    monsterData:MonsterData = null!;

    protected onLoad(): void {
        this.hpSlider = this.node.getChildByName("hp_bg").getChildByName("hp_fg");
        this.hpText = this.node.getChildByName("hp_txt").getComponent(cc.Label);
    }

    init(_monsterData:MonsterData){
        this.monsterData = _monsterData;
        this.totalHp = _monsterData.hp;
        this.curHp = this.totalHp;
        this.shiled = _monsterData.shiled;
        this.attack = _monsterData.attack;

        GameMain.instance.bundle.load("arts/monsters/" + this.monsterData.asset, cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
            let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
            sprite.spriteFrame = sf;
        })

        this.refreshHP_Slider();
        this.refreshInfo();
    }

    beHurt(v:number){
        let finalDamage:number = v - this.monsterData.shiled;
        if(finalDamage<=0){
            finalDamage = 1;
        }
        this.curHp -= finalDamage;
        let ntxt:cc.Label = this.node.getChildByName("dropedHp").getComponent(cc.Label);
        ntxt.node.active=true;
        ntxt.string = "-"+String(finalDamage);
        cc.tween(ntxt.node)
            .delay(0.45)
            .parallel(
                cc.tween().to(0.32,{x:109,y:-30}),
                cc.tween().to(0.32,{opacity:0})
            )
            .call(()=>{
                ntxt.node.x = 97;
                ntxt.node.y = 33;
                ntxt.node.opacity = 255;
                ntxt.node.active = false;
            })
            .start()

        this.loadTip(new cc.Vec2(0,0));// 释放一个被击打特效
        this.scaleAnim(this.node.getChildByName("view"))
        this.refreshHP_Slider();
        if(this.curHp <= 0){
            this.scheduleOnce(this.onDie,1);
        }
    }

    private onDie(){
        let _view = this.node.getChildByName("view");
        cc.tween(_view)
            .to(1.8,{opacity:0})
            .call(()=>{
                MainPanel.instance.disposeMonster(this);
            })
            .start()
    }

    doAttackAction(){
        let _view = this.node.getChildByName("view");
        cc.tween(_view)
            .delay(0.1)
            .to(0.15,{scale:1.5})
            .to(0.15,{y:-39},{easing:"backOut"})
            .call(()=>{

                this.scaleAnim(MainPanel.instance.health2d)
                cc.tween(_view)
                .delay(0.35)
                .to(0.15,{scale:1})
                .to(0.1,{y:-17},{easing:"backIn"})
                .call(()=>{
                    GameMain.instance.player.brHurt(this.getCurAttack());

                    if (this.monsterData.behaviorData) {
                        if (this.monsterData.behaviorData.type == "attack") {
                            console.log("进来计算");

                            this.attack += this.monsterData.behaviorData.bValue;
                        }
                        this.refreshInfo()
                    }
                })
                .start()
            })
            .start()
    }

    private refreshHP_Slider(){
        this.hpSlider.width = this.maxValue * (this.curHp / this.totalHp);
        if(this.hpSlider.width <=0){
            this.hpSlider.width = 0;
        }
        this.hpText.string = `${this.curHp}/${this.totalHp}`;
    }

    private scaleAnim(target:cc.Node){
        cc.tween(target)
            .to(0.2,{scaleY:1.5},{easing:"cubicOut"})
            .call(()=>{
                target.scaleY = 1.0
            })
            .start()
    }

    private refreshInfo(){
        let ltxt:cc.Label = this.node.getChildByName("monster_intent_bg").getChildByName("attack").getComponent(cc.Label);
        ltxt.string = String(this.attack);
        let stxt:cc.Label = this.node.getChildByName("monster_intent_bg").getChildByName("shiled").getComponent(cc.Label);
        stxt.string = String(this.shiled);
        let ntxt:cc.Label = this.node.getChildByName("mName").getComponent(cc.Label);
        ntxt.string = String(this.monsterData.name);
        if(this.monsterData.behaviorData && this.monsterData.behaviorData != undefined){
            let btxt:cc.Label = this.node.getChildByName("monster_intent_bg").getChildByName("behavior").getComponent(cc.Label);
            btxt.string = this.monsterData.behaviorData.des;
        }
    }
    getCurAttack(){
        return this.attack;
    }

    getCurHp(){
        return this.curHp;
    }

    private loadTip(pos: cc.Vec2) {
        GameMain.instance.bundle.load("prefab/hitfx", cc.Prefab, (err, prefab: cc.Prefab) => {
            let newTip: cc.Node = cc.instantiate(prefab);
            this.node.addChild(newTip);
            newTip.setPosition(pos);
            this.scheduleOnce(()=>{
                newTip.destroy();
            },0.5);
        })
    }
}
