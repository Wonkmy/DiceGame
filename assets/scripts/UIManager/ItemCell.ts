// import { ItemDef, ItemInstance } from "../GameCodes/Datas/GameData";
import GameMain from "../GameMain";
import { DiceType } from "../Global/DiceHandUtil";
import MainPanel from "../Panels/MainPanel";
import TipPanel from "../Panels/TipPanel";
import { UIManager } from "./UIManager";
// import MainPanel from "../Panels/MainPanel";


const {ccclass, property} = cc._decorator;

@ccclass
export default class ItemCell extends cc.Component {
    dType:DiceType = DiceType.normal;
    init(_dType:DiceType){
        this.dType = _dType;
        let _name = "arts/dices/" + DiceType[_dType] + "/6";
        GameMain.instance.bundle.load(_name, cc.SpriteFrame, (err, sf: cc.SpriteFrame) => {
            let sprite: cc.Sprite = this.node.getChildByName("view").getComponent(cc.Sprite);
            sprite.spriteFrame = sf;
        })
        this.node.getChildByName("name").getComponent(cc.Label).string = String(DiceType[_dType]);

        this.node.on(cc.Node.EventType.TOUCH_END,this.onTip,this)
    }

    private onTip(){
        UIManager.getInstance().openUI(TipPanel,1,(ui:TipPanel)=>{
            ui.onShow();
            ui.showTip(getDescByDiceType(this.dType),null)
        })
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END,this.onTip,this)
    }
}


export function getDescByDiceType(diceType:DiceType){
    let res:string = "";
    MainPanel.instance.allCharmDatas.forEach((c) => {
        if (diceType == DiceType.normal) {
            res = "普通骰子，无任何效果"
        } else {
            if (DiceType[diceType] == c.effect) {
                res = c.desc
            }
        }
    })
    return res;
}
