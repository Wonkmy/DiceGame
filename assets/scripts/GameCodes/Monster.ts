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
    private lowHpEffectPlaying:boolean = false;
    private lowHpFlashCallback:Function = null!;
    private monsterViewOriginColor:cc.Color = null!;
    private hpSliderOriginOpacity:number = 255;
    private readonly LOW_HP_WARNING_RATE:number = 0.25;
    private monsterViewOriginScale:number = 1;
    private monsterIntentOriginScale:number = 1;
    private monsterIntentOriginColor:cc.Color = null!;

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
        this.stopLowHpFeedback();
    }

    beHurt(v:number){
        let finalDamage:number = v - this.shiled;
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
        this.refreshLowHpFeedback();
        if(this.curHp <= 0){
            this.scheduleOnce(this.onDie,1);
        }
    }

    private onDie(){
        this.stopLowHpFeedback();
        let _view = this.node.getChildByName("view");
        cc.tween(_view)
            .to(1.0,{opacity:0})
            .call(()=>{
                MainPanel.instance.disposeMonster(this);
            })
            .start()
    }

    doAttackAction(){
        let _view = this.node.getChildByName("view");
        this.playAttackWarningAnim();
        GameMain.instance.player.playBeforeHurtWarning(this.getCurAttack());
        cc.tween(_view)
            .delay(0.35)
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
                            this.attack += this.monsterData.behaviorData.bValue;
                        }else if(this.monsterData.behaviorData.type == "attack-shiled"){
                            this.attack += this.monsterData.behaviorData.bValue;
                            this.shiled += this.monsterData.behaviorData.bValue;
                        }
                        this.refreshInfo()
                    }
                })
                .start()
            })
            .start()
    }

    /**
     * 播放怪物攻击前预警动画。
     * 只提示“怪物马上反击”，不改变攻击力、不扣血，保持和战斗结算解耦。
     */
    private playAttackWarningAnim(){
        let viewNode:cc.Node = this.node.getChildByName("view");
        let intentNode:cc.Node = this.node.getChildByName("monster_intent_bg");

        if(viewNode && cc.isValid(viewNode)){
            this.monsterViewOriginScale = viewNode.scale;
            this.saveLowHpOriginState(viewNode);
            this.playNodePulse(viewNode, this.monsterViewOriginScale, 1.18);
            this.playNodeFlash(viewNode, cc.color(255, 90, 90, 255), this.monsterViewOriginColor || cc.Color.WHITE);
        }

        if(intentNode && cc.isValid(intentNode)){
            this.monsterIntentOriginScale = intentNode.scale;
            if(!this.monsterIntentOriginColor){
                this.monsterIntentOriginColor = cc.color(intentNode.color.r, intentNode.color.g, intentNode.color.b, intentNode.color.a);
            }
            this.playNodePulse(intentNode, this.monsterIntentOriginScale, 1.22);
            this.playNodeFlash(intentNode, cc.color(255, 80, 80, 255), this.monsterIntentOriginColor);
        }
    }

    /**
     * 播放节点缩放提示动画。
     * 这个小函数只负责原地弹一下，后续怪物或 UI 节点需要类似反馈时可以直接复用。
     */
    private playNodePulse(target:cc.Node, originScale:number, targetScale:number){
        if(!target || !cc.isValid(target))return;

        cc.Tween.stopAllByTarget(target);
        target.scale = originScale;
        cc.tween(target)
            .to(0.1, { scale: originScale * targetScale }, { easing: "backOut" })
            .to(0.08, { scale: originScale })
            .start();
    }

    /**
     * 播放节点颜色闪烁提示动画。
     * 只临时改变颜色，动画结束后恢复原色，避免污染预制体原始表现。
     */
    private playNodeFlash(target:cc.Node, flashColor:cc.Color, originColor:cc.Color){
        if(!target || !cc.isValid(target))return;

        target.color = flashColor;
        this.scheduleOnce(() => {
            if(!target || !cc.isValid(target))return;
            target.color = originColor;
            this.refreshLowHpFeedback();
        }, 0.18);
    }

    private refreshHP_Slider(){
        this.hpSlider.width = this.maxValue * (this.curHp / this.totalHp);
        if(this.hpSlider.width <=0){
            this.hpSlider.width = 0;
        }
        this.hpText.string = `${this.curHp}/${this.totalHp}`;
    }

    /**
     * 根据当前血量刷新怪物残血表现。
     * 怪物血量低于指定比例时开启红闪和血条闪烁，血量归零或离开残血时关闭。
     */
    private refreshLowHpFeedback(){
        if(this.totalHp <= 0)return;

        let needShow:boolean = this.curHp > 0 && this.curHp <= this.totalHp * this.LOW_HP_WARNING_RATE;
        if(needShow){
            this.startLowHpFeedback();
        }else{
            this.stopLowHpFeedback();
        }
    }

    /**
     * 开启怪物残血反馈。
     * 只改颜色和透明度，不改怪物位置，避免和攻击/受击位移动画冲突。
     */
    private startLowHpFeedback(){
        if(this.lowHpEffectPlaying)return;

        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode))return;

        this.lowHpEffectPlaying = true;
        this.saveLowHpOriginState(viewNode);

        if(!this.lowHpFlashCallback){
            this.lowHpFlashCallback = () => {
                this.playMonsterRedFlash();
            };
        }

        this.playMonsterRedFlash();
        this.schedule(this.lowHpFlashCallback, 0.55);
        this.playHpSliderBlink();
    }

    /**
     * 关闭怪物残血反馈并恢复原始状态。
     * 死亡、销毁、血量不再处于残血状态时都会调用。
     */
    private stopLowHpFeedback(){
        if(this.lowHpFlashCallback){
            this.unschedule(this.lowHpFlashCallback);
        }

        this.lowHpEffectPlaying = false;

        let viewNode:cc.Node = this.node.getChildByName("view");
        if(viewNode && cc.isValid(viewNode) && this.monsterViewOriginColor){
            viewNode.color = this.monsterViewOriginColor;
        }

        if(this.hpSlider && cc.isValid(this.hpSlider)){
            cc.Tween.stopAllByTarget(this.hpSlider);
            this.hpSlider.opacity = this.hpSliderOriginOpacity;
        }
    }

    /**
     * 保存残血反馈前的原始颜色和透明度。
     * 这样停止残血效果时可以恢复到预制体本来的表现。
     */
    private saveLowHpOriginState(viewNode:cc.Node){
        if(!this.monsterViewOriginColor){
            this.monsterViewOriginColor = cc.color(viewNode.color.r, viewNode.color.g, viewNode.color.b, viewNode.color.a);
        }

        this.hpSliderOriginOpacity = this.hpSlider ? this.hpSlider.opacity : 255;
    }

    /**
     * 播放一次怪物身体红闪。
     * 用 schedule 触发短促闪烁，不使用永久 tween，避免打断怪物攻击位移动画。
     */
    private playMonsterRedFlash(){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode) || !this.lowHpEffectPlaying)return;

        viewNode.color = cc.color(255, 105, 105, 255);
        this.scheduleOnce(() => {
            if(!viewNode || !cc.isValid(viewNode) || !this.lowHpEffectPlaying)return;
            viewNode.color = this.monsterViewOriginColor || cc.Color.WHITE;
        }, 0.12);
    }

    /**
     * 播放血条残血闪烁。
     * 只作用在血条前景节点上，不影响血量宽度计算。
     */
    private playHpSliderBlink(){
        if(!this.hpSlider || !cc.isValid(this.hpSlider))return;

        cc.Tween.stopAllByTarget(this.hpSlider);
        cc.tween(this.hpSlider)
            .repeatForever(
                cc.tween()
                    .to(0.25, { opacity: 90 })
                    .to(0.25, { opacity: this.hpSliderOriginOpacity })
            )
            .start();
    }

    /**
     * 判断本次攻击是否可以直接击杀怪物。
     * 这里复用怪物自己的护盾扣减规则，避免 MainPanel 重复理解怪物受伤逻辑。
     */
    canBeKilledByAttack(v:number){
        if(this.curHp <= 0)return false;

        let finalDamage:number = v - this.shiled;
        if(finalDamage <= 0){
            finalDamage = 1;
        }
        return finalDamage >= this.curHp;
    }

    /**
     * 播放一次斩杀预告闪烁。
     * 这个效果只在最终伤害已经算出来后触发，用来提示“这一击会秒杀”。
     */
    playKillReadyFeedbackOnce(){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode))return;

        this.saveLowHpOriginState(viewNode);
        viewNode.color = cc.color(255, 50, 50, 255);
        if(this.hpSlider && cc.isValid(this.hpSlider)){
            cc.Tween.stopAllByTarget(this.hpSlider);
            this.hpSlider.opacity = 255;
            cc.tween(this.hpSlider)
                .to(0.08, { opacity: 50 })
                .to(0.08, { opacity: 255 })
                .to(0.08, { opacity: 50 })
                .to(0.08, { opacity: this.hpSliderOriginOpacity })
                .start();
        }

        this.scheduleOnce(() => {
            if(!viewNode || !cc.isValid(viewNode))return;
            viewNode.color = this.monsterViewOriginColor || cc.Color.WHITE;
            this.refreshLowHpFeedback();
        }, 0.32);
    }

    /**
     * 刷新可斩杀状态下的怪物提示。
     * 可斩杀时复用怪物闪烁表现；取消可斩杀时重新回到残血判断。
     */
    refreshKillReadyFeedback(show:boolean){
        if(show){
            this.startLowHpFeedback();
        }else{
            this.refreshLowHpFeedback();
        }
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

    getCurShield(){
        return this.shiled;
    }

    protected onDestroy(): void {
        this.stopLowHpFeedback();
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
