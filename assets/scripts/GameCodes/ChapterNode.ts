// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { Chapter } from "../Global/DiceHandUtil";
import ChapterPanel from "../Panels/ChapterPanel";
import MainPanel from "../Panels/MainPanel";
import { UIManager } from "../UIManager/UIManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ChapterNode extends cc.Component {
    nodeData:Chapter = null!;
    private originScale:number = 1;

    init(_nodedata:Chapter){
        this.nodeData = _nodedata;
        this.originScale = this.node.scale;
        this.playClickGuideAnim();
        this.node.on(cc.Node.EventType.TOUCH_END,this.onEnterChapterStage,this)
    }

    private onEnterChapterStage() {
        cc.Tween.stopAllByTarget(this.node);
        this.node.scale = this.originScale;
        if (this.nodeData.type === "battle" || this.nodeData.type === "elite" || this.nodeData.type === "boss") {
            MainPanel.instance.openBattle(this.nodeData);
        } else if (this.nodeData.type === "shop") {// 这个shop是购买给当前章节使用的各种东西
            MainPanel.instance.openShop(this.nodeData)
        } else if (this.nodeData.type === "event") {
            // 这里其实是三选一，但是我已经放在一场游戏结束后
        } else if (this.nodeData.type === "rest") {
            // 休整节点：可以加血或者加金币（可配置）
            MainPanel.instance.openRest(this.nodeData);
        } else if (this.nodeData.type === "treasure") {
            // 获得一个宝箱
            MainPanel.instance.openTreasure(this.nodeData);
        }
        UIManager.getInstance().closeUI(ChapterPanel);
    }

    /**
     * 播放章节节点可点击引导动画。
     * 只做轻微呼吸，不改变节点数据和进入关卡逻辑。
     */
    private playClickGuideAnim(){
        cc.Tween.stopAllByTarget(this.node);
        this.node.scale = this.originScale;
        cc.tween(this.node)
            .repeatForever(
                cc.tween()
                    .to(0.45, { scale: this.originScale * 1.04 })
                    .to(0.45, { scale: this.originScale })
                    .delay(0.25)
            )
            .start();
    }

    protected onDestroy(): void {
        cc.Tween.stopAllByTarget(this.node);
    }
}
