import GameMain from "../GameMain";
import { CharmData, DiceType } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";
import ResultPanel from "../Panels/ResultPanel";
import TipPanel from "../Panels/TipPanel";
import { UIManager } from "./UIManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class RewardItem extends cc.Component {
    charmData:CharmData = null!;

    protected onLoad(): void {

    }
    init(_charmData:CharmData){
        this.node.on(cc.Node.EventType.TOUCH_END,this.onProcessClick,this)
        let _view = this.node.getChildByName("view");
        let oldScaleX = _view.scaleX;
        _view.scaleX = 0;
        cc.tween(_view)
            .to(0.35,{scaleX:oldScaleX},{easing:"backInOut"})
            .start()
        this.charmData = _charmData;
        GameMain.instance.bundle.load("arts/charms/" + this.charmData.icon, cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
            let sprite: cc.Sprite = _view.getComponent(cc.Sprite);
            sprite.spriteFrame = sf;
        })
        this.node.getChildByName("des").getComponent(cc.Label).string = String(this.charmData.desc);
    }

    setOnlyClick(_charmData:CharmData){
        this.node.on(cc.Node.EventType.TOUCH_END,this.onClick,this)
        this.charmData = _charmData;
        this.node.getChildByName("des").getComponent(cc.Label).string = String(this.charmData.desc);
    }

    private onClick(){
        UIManager.getInstance().openUI(TipPanel, 0, (ui: TipPanel) => {
            ui.onShow();
            ui.showTip(this.charmData.desc,null)
        })
    }

    private onProcessClick(){
        if (this.charmData.useCount != -1) {// 有使用次数的，直接放到列表中
            GameMain.charmDatas.push(this.charmData);
        }
        else {
            let effect = this.charmData.effect;
            if (effect === "fire") {
                GameMain.instance.player.addDice(DiceType.fire);
            }
            if (effect === "mult") {
                GameMain.instance.player.addDice(DiceType.mult);
            }
            if (effect === "heal") {
                GameMain.instance.player.addDice(DiceType.heal);
            }
        }
        this.node.parent.destroyAllChildren();
        this.node.parent.active = false;
        UIManager.getInstance().closeUI(MainPanel);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END,this.onProcessClick,this)
        this.node.off(cc.Node.EventType.TOUCH_END,this.onClick,this)
    }
}
