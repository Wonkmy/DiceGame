import GameMain from "../GameMain";
import { CharmData, DiceType } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";
import ResultPanel from "../Panels/ResultPanel";
import { UIManager } from "./UIManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class RewardItem extends cc.Component {
    charmData:CharmData = null!;

    protected onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_END,this.onProcessClick,this)
    }
    init(_charmData:CharmData){
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

    private onProcessClick(){
        let effect = this.charmData.effect;
        if(effect === "fire"){
            GameMain.instance.player.addDice(DiceType.fire);
        }
        if(effect === "mult"){
            GameMain.instance.player.addDice(DiceType.mult);
        }
        this.node.parent.destroyAllChildren();
        this.node.parent.active = false;
        UIManager.getInstance().closeUI(MainPanel);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END,this.onProcessClick,this)
    }
}
