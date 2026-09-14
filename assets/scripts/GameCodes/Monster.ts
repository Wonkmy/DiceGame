import GameMain from "../GameMain";
import { BehaviorData, MonsterData, randomInt } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";
import { FaynUtils } from "../Global/FaynUtils";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Monster extends cc.Component {
    @property({type:cc.Node})
    hpSlider:cc.Node = null!;
    @property({type:cc.Material, displayName:"怪物死亡白闪材质", tooltip:"拖拽 shaders/monster-white-flash 材质，死亡瞬间使用"})
    monsterWhiteFlashMaterial:cc.Material = null!;
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
    private monsterViewOriginY:number = 0;
    private monsterViewMaxWidth:number = 0;
    private monsterViewMaxHeight:number = 0;
    private readonly MONSTER_VIEW_TARGET_WIDTH:number = 250;
    private monsterIntentOriginScale:number = 1;
    private monsterIntentOriginColor:cc.Color = null!;

    protected onLoad(): void {
        this.hpSlider = this.node.getChildByName("hp_bg").getChildByName("hp_fg");
        this.hpText = this.node.getChildByName("hp_txt").getComponent(cc.Label);
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(viewNode && cc.isValid(viewNode)){
            // 记录预制体里怪物显示节点的最大显示范围，后面只等比缩放，不再强行拉伸。
            this.monsterViewMaxWidth = viewNode.width;
            this.monsterViewMaxHeight = viewNode.height;
        }
    }

    init(_monsterData:MonsterData){
        this.monsterData = _monsterData;
        this.totalHp = _monsterData.hp;
        this.curHp = this.totalHp;
        this.shiled = _monsterData.shiled;
        this.attack = _monsterData.attack;

        GameMain.instance.bundle.load("arts/monsters/" + this.monsterData.asset, cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
            if(!this.node || !cc.isValid(this.node))return;
            let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
            sprite.spriteFrame = sf;
            this.refreshMonsterViewSize(sf);
        })

        this.refreshHP_Slider();
        this.refreshInfo();
        this.stopLowHpFeedback();
        this.cacheEnterOriginState();
    }

    /**
     * 根据 SpriteFrame 裁剪后的真实尺寸等比刷新怪物显示。
     * 新怪物图虽然是 256x256，但开启 TrimType 后真正内容区域不是 256，所以这里用 rect 尺寸计算。
     */
    private refreshMonsterViewSize(spriteFrame:cc.SpriteFrame){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode) || !spriteFrame)return;

        let rect:cc.Rect = spriteFrame.getRect();
        let realWidth:number = rect && rect.width > 0 ? rect.width : spriteFrame.getOriginalSize().width;
        let realHeight:number = rect && rect.height > 0 ? rect.height : spriteFrame.getOriginalSize().height;
        if(realWidth <= 0 || realHeight <= 0)return;

        // 怪物需要明显压迫感，按固定目标宽度绘制，高度按 SpriteFrame 真实比例同步计算，不改节点 scale。
        let targetWidth:number = this.MONSTER_VIEW_TARGET_WIDTH;
        let targetHeight:number = realHeight * (targetWidth / realWidth);

        viewNode.width = targetWidth;
        viewNode.height = targetHeight;
    }

    /**
     * 登场前隐藏怪物和战斗信息。
     * MainPanel 延迟开场时先调用这个函数，避免怪物提前露出来。
     */
    public prepareEnterHidden(){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(viewNode && cc.isValid(viewNode)){
            this.cacheEnterOriginState();
            cc.Tween.stopAllByTarget(viewNode);
            viewNode.y = this.monsterViewOriginY + 90;
            viewNode.scale = this.monsterViewOriginScale * 0.86;
            viewNode.opacity = 0;
        }

        this.setBattleInfoVisible(false);
    }

    /**
     * 播放怪物登场动画。
     * MainPanel 只等待回调发骰子，具体表现留在怪物脚本里，避免开战流程耦合太重。
     */
    public playEnterAnim(callBack:Function = null!){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode)){
            if(callBack){
                callBack();
            }
            return;
        }

        if(viewNode.opacity > 0){
            this.cacheEnterOriginState();
        }
        this.setBattleInfoVisible(false);
        cc.Tween.stopAllByTarget(viewNode);
        FaynUtils.PlayMusic("monster_enter", false, 1);
        if(viewNode.opacity > 0){
            viewNode.y = this.monsterViewOriginY + 90;
            viewNode.scale = this.monsterViewOriginScale * 0.86;
            viewNode.opacity = 0;
        }

        cc.tween(viewNode)
            .parallel(
                cc.tween().to(0.22, { y:this.monsterViewOriginY, opacity:255 }, { easing:"cubicOut" }),
                cc.tween().to(0.22, { scale:this.monsterViewOriginScale * 1.12 }, { easing:"backOut" })
            )
            .to(0.08, { scale:this.monsterViewOriginScale * 0.96 })
            .to(0.08, { scale:this.monsterViewOriginScale })
            .call(() => {
                this.setBattleInfoVisible(true);
                this.playInfoEnterAnim();
                if(callBack){
                    callBack();
                }
            })
            .start();
    }

    /**
     * 记录怪物显示节点初始状态。
     * 后续攻击、受击、死亡都基于这个位置，不让登场动画污染节点坐标。
     */
    private cacheEnterOriginState(){
        let viewNode:cc.Node = this.node.getChildByName("view");
        if(!viewNode || !cc.isValid(viewNode))return;

        this.monsterViewOriginY = viewNode.y;
        this.monsterViewOriginScale = viewNode.scale;
    }

    /**
     * 控制血条、攻击意图等战斗信息显隐。
     * 登场时先藏，怪物落稳后再显示，开场节奏更清楚。
     */
    private setBattleInfoVisible(show:boolean){
        let nodeNames:string[] = ["hp_bg", "hp_txt", "monster_intent_bg", "mName"];
        for(let i = 0; i < nodeNames.length; i++){
            let target:cc.Node = this.node.getChildByName(nodeNames[i]);
            if(target && cc.isValid(target)){
                target.active = show;
            }
        }
    }

    /**
     * 战斗信息出现时轻微弹一下。
     * 只做显示反馈，不修改怪物攻击、护盾和血量。
     */
    private playInfoEnterAnim(){
        let intentNode:cc.Node = this.node.getChildByName("monster_intent_bg");
        let hpBgNode:cc.Node = this.node.getChildByName("hp_bg");
        this.playInfoNodeEnterAnim(intentNode);
        this.playInfoNodeEnterAnim(hpBgNode);
    }

    private playInfoNodeEnterAnim(target:cc.Node){
        if(!target || !cc.isValid(target))return;

        cc.Tween.stopAllByTarget(target);
        let originScale:number = target.scale;
        target.scale = originScale * 0.9;
        target.opacity = 0;
        cc.tween(target)
            .to(0.12, { scale:originScale * 1.06, opacity:255 }, { easing:"backOut" })
            .to(0.08, { scale:originScale })
            .start();
    }

    beHurt(v:number){
        FaynUtils.PlayMusic("monster_hurt", false, 1);
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
        this.refreshHP_Slider(false, () => {
            this.refreshLowHpFeedback();
        });
        if(this.curHp <= 0){
            this.scheduleOnce(this.onDie,1);
        }
    }

    private onDie(){
        this.stopLowHpFeedback();
        let _view = this.node.getChildByName("view");
        let originScale:number = _view.scale;
        let sprite:cc.Sprite = _view.getComponent(cc.Sprite);
        let originMaterial:cc.Material = sprite ? sprite.getMaterial(0) : null!;
        this.loadTip(new cc.Vec2(0,0), 1.8);
        if(sprite && this.monsterWhiteFlashMaterial){
            sprite.setMaterial(0, this.monsterWhiteFlashMaterial);
        }
        cc.tween(_view)
            // 死亡瞬间先给一个短促爆发，再快速缩小淡出，流程仍然走原来的回收。
            .to(0.08,{scale:originScale * 1.15})
            .call(()=>{
                if(sprite && originMaterial){
                    sprite.setMaterial(0, originMaterial);
                }
            })
            .parallel(
                cc.tween().to(0.24,{scale:originScale * 0.75},{easing:"cubicIn"}),
                cc.tween().to(0.24,{opacity:0})
            )
            .call(()=>{
                MainPanel.instance.disposeMonster(this);
            })
            .start()
    }

    doAttackAction(){
        let attackTimes:number = this.isDoubleAttackEnabled() ? 2 : 1;
        this.playMonsterAttackByTimes(attackTimes, () => {
            this.applyTurnBehaviors();
        });
    }

    /**
     * 按次数串行播放怪物攻击。
     * 双击不能合并成一次伤害，必须每次命中都单独扣血、音效和红闪。
     */
    private playMonsterAttackByTimes(leftTimes:number, finishCallBack:Function){
        if(leftTimes <= 0){
            if(finishCallBack){
                finishCallBack();
            }
            return;
        }

        this.playSingleAttackAction(() => {
            if(leftTimes > 1){
                this.scheduleOnce(() => {
                    this.playMonsterAttackByTimes(leftTimes - 1, finishCallBack);
                }, 0.28);
            }else if(finishCallBack){
                finishCallBack();
            }
        });
    }

    /**
     * 播放一次完整的怪物攻击动作。
     */
    private playSingleAttackAction(finishCallBack:Function){
        this.playSingleAttackActionWithDamage(this.getCurAttack(), finishCallBack);
    }

    /**
     * 播放一次指定伤害的怪物攻击动作，反击也复用这套表现。
     */
    private playSingleAttackActionWithDamage(damage:number, finishCallBack:Function){
        let _view = this.node.getChildByName("view");
        this.playAttackWarningAnim();
        GameMain.instance.player.playBeforeHurtWarning(damage);
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
                    FaynUtils.PlayMusic("player_hurt", false, 1);
                    MainPanel.instance.playPlayerHurtScreenFlash();
                    GameMain.instance.player.brHurt(damage);

                    if(finishCallBack){
                        finishCallBack();
                    }
                })
                .start()
            })
            .start()
    }

    private isDoubleAttackEnabled():boolean{
        return !!(this.monsterData && this.monsterData.behaviorData && this.monsterData.behaviorData.double_enable);
    }

    public tryCounterAttackAfterPlayerAttack(finishCallBack:Function = null!):boolean{
        if(!this.monsterData || !this.monsterData.behaviorData || this.curHp <= 0 || GameMain.gameFinished)return false;

        let counterAttack:number = this.monsterData.behaviorData.counterAttack || 0;
        if(counterAttack <= 0)return false;

        // 反击是玩家打中怪物后的额外伤害，播完后再继续原来的怪物回合。
        this.playSingleAttackActionWithDamage(counterAttack, finishCallBack);
        return true;
    }

    /**
     * 怪物每次完成攻击后触发行为。
     * behaviorData 仍然保持单对象，只是在一个对象里同时配置攻击、护盾、回血。
     */
    private applyTurnBehaviors(){
        if(!this.monsterData || !this.monsterData.behaviorData || this.curHp <= 0)return;

        let behavior:BehaviorData = this.monsterData.behaviorData;
        let attackAdd:number = behavior.attackValue || 0;
        let shiledAdd:number = behavior.shiledValue || 0;
        let healLostRate:number = behavior.healLostRate || 0;

        // 兼容旧配置：只写 type + bValue 时，仍然按旧逻辑生效。
        if(attackAdd == 0 && shiledAdd == 0 && healLostRate == 0){
            if(behavior.type == "attack"){
                attackAdd = behavior.bValue;
            }else if(behavior.type == "attack-shiled"){
                attackAdd = behavior.bValue;
                shiledAdd = behavior.bValue;
            }else if(behavior.type == "shield" || behavior.type == "shiled"){
                shiledAdd = behavior.bValue;
            }else if(behavior.type == "heal-lost"){
                healLostRate = behavior.bValue;
            }
        }

        this.attack += attackAdd;
        this.shiled += shiledAdd;
        this.healLostHpByRate(healLostRate);

        this.refreshInfo();
        this.refreshHP_Slider();
    }

    /**
     * 按已损生命百分比回血，bValue 用 0.06 表示恢复已损生命 6%。
     */
    private healLostHpByRate(rate:number){
        if(rate <= 0 || this.curHp >= this.totalHp)return;

        let lostHp:number = this.totalHp - this.curHp;
        let healValue:number = Math.ceil(lostHp * rate);
        if(healValue <= 0){
            healValue = 1;
        }

        this.curHp += healValue;
        if(this.curHp > this.totalHp){
            this.curHp = this.totalHp;
        }
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

    /**
     * 刷新怪物血条。
     * immediate 为 true 时直接刷新，受击时传 false 播放一次血条受击反馈。
     */
    private refreshHP_Slider(immediate:boolean = true, callBack:any = null){
        let targetWidth:number = this.maxValue * (this.curHp / this.totalHp);
        if(targetWidth <= 0){
            targetWidth = 0;
        }
        this.hpText.string = `${this.curHp}/${this.totalHp}`;

        if(immediate){
            this.hpSlider.width = targetWidth;
            if(callBack){
                callBack();
            }
            return;
        }

        this.playHpHurtFeedback(targetWidth, callBack);
    }

    /**
     * 播放怪物血条受击反馈。
     * 只处理血条的闪烁和轻微抖动，不参与伤害计算。
     */
    private playHpHurtFeedback(targetWidth:number, callBack:any = null){
        if(!this.hpSlider || !cc.isValid(this.hpSlider)){
            if(callBack){
                callBack();
            }
            return;
        }

        let hpBg:cc.Node = this.node.getChildByName("hp_bg");
        let oldX:number = hpBg ? hpBg.x : 0;

        cc.Tween.stopAllByTarget(this.hpSlider);
        // 先保证血条显示正确，再播反馈，避免动画异常时仍显示满血。
        this.hpSlider.width = targetWidth;
        this.hpSlider.opacity = 255;

        if(hpBg && cc.isValid(hpBg)){
            cc.Tween.stopAllByTarget(hpBg);
            hpBg.x = oldX;
            cc.tween(hpBg)
                .to(0.03, { x: oldX - 6 })
                .to(0.03, { x: oldX + 6 })
                .to(0.03, { x: oldX })
                .start();
        }

        cc.tween(this.hpSlider)
            .to(0.06, { opacity: 80 })
            .to(0.06, { opacity: 255 })
            .to(0.06, { opacity: 120 })
            .to(0.06, { opacity: 255 })
            .call(() => {
                this.hpSlider.opacity = this.hpSliderOriginOpacity;
                if(callBack){
                    callBack();
                }
            })
            .start();
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
        let btxt:cc.Label = this.node.getChildByName("monster_intent_bg").getChildByName("behavior").getComponent(cc.Label);
        if(this.monsterData.behaviorData && this.monsterData.behaviorData.des){
            btxt.string = this.monsterData.behaviorData.des;
        }else{
            btxt.string = "";
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

    private loadTip(pos: cc.Vec2, scale:number = 1) {
        GameMain.instance.bundle.load("prefab/hitfx", cc.Prefab, (err, prefab: cc.Prefab) => {
            let newTip: cc.Node = cc.instantiate(prefab);
            this.node.addChild(newTip);
            newTip.setPosition(pos);
            newTip.scale = scale;
            this.scheduleOnce(()=>{
                newTip.destroy();
            },0.5);
        })
    }
}
