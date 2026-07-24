// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class Tip extends cc.Component {
    NumText: cc.Label = null!;
    init(pos: cc.Vec2, num: number,_color:cc.Color) {
        this.NumText = this.node.getComponent(cc.Label);
        this.node.x = pos.x;
        this.node.y = pos.y;
        this.node.color = _color;
        this.NumText.string = "+" + num.toString();
        this.node.scale = 0;
        cc.tween(this.node)
            .delay(0.5)
            .parallel(
                cc.tween().to(1,{scale:1},{easing:"backOut"}),
                cc.tween().to(1,{y:this.node.y + 70},{easing:"backOut"})
            )
            .call(() => {
                this.node.destroy()
            })
            .start()
    }
}
