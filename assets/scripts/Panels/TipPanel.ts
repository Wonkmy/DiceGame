// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class TipPanel extends BaseUI {
    public static instance:TipPanel = null!;
    protected static className = "TipPanel";

    flyTxt:cc.Label = null!;
    private flyTxtRoot:cc.Node = null!;
    private bgNode:cc.Node = null!;
    private readonly tipMinHeight:number = 90;
    private readonly tipVerticalPadding:number = 36;
    private readonly tipHorizontalPadding:number = 48;

    override onShow(): void {
        this.flyTxtRoot = this.node.getChildByName("flyTxt");
        if(!this.flyTxtRoot)return;

        this.bgNode = this.flyTxtRoot ? this.flyTxtRoot.getChildByName("bg") : null!;
        this.flyTxt = this.flyTxtRoot.getComponentInChildren(cc.Label);
        this.node.getChildByName("splash").on(cc.Node.EventType.TOUCH_END, () => {
            UIManager.getInstance().closeUI(TipPanel);
        },this)
    }

    showTip(txt:string,callBack:any,externAnim:boolean = false,delayTime:number = 0.75)
    {
        this.flyTxt.string = txt;
        this.refreshTipBoxSize();
        this.node.active = true;
        if(externAnim){
            this.node.getChildByName("splash").opacity = 190;
            cc.tween(this.flyTxt.node.parent)
            .to(0.25,{scale:1.35},{easing:'inBack'})
            .to(0.25,{scale:1.0},{easing:'outBack'})
            .to(0.3,{y:this.flyTxt.node.parent.y + 50})
            .delay(1)
            .call(()=>{
                if(callBack){
                    callBack();
                }
                UIManager.getInstance().closeUI(TipPanel);
            })
            .start()
        }else{
            cc.tween(this.flyTxt.node.parent)
                .by(0.5,{y:150})
                .delay(delayTime)
                .call(()=>{
                    UIManager.getInstance().closeUI(TipPanel);
                })
                .start()
        }
    }

    /**
     * 根据当前提示文本动态刷新提示框高度。
     * flyTxt、txt、bg 使用同一个高度，避免长文本被裁剪或短文本留出过多空白。
     */
    private refreshTipBoxSize(){
        if(!this.flyTxt || !this.flyTxtRoot)return;

        this.refreshLabelHeight();

        let textHeight:number = this.getTextRealHeight();
        let targetHeight:number = Math.max(this.tipMinHeight, textHeight + this.tipVerticalPadding);

        this.flyTxtRoot.height = targetHeight;
        this.flyTxt.node.height = targetHeight;
        if(this.bgNode){
            this.bgNode.height = targetHeight;
        }
    }

    /**
     * 让 Label 按当前文本重新计算高度。
     * Cocos 2.x 的 Label 渲染刷新有延迟，所以这里主动刷新一次渲染数据。
     */
    private refreshLabelHeight(){
        let labelWidth:number = Math.max(100, this.flyTxtRoot.width - this.tipHorizontalPadding);
        this.flyTxt.node.width = labelWidth;
        this.flyTxt.overflow = cc.Label.Overflow.RESIZE_HEIGHT;

        let anyLabel:any = this.flyTxt as any;
        if(anyLabel._forceUpdateRenderData){
            anyLabel._forceUpdateRenderData(true);
        }
    }

    /**
     * 获取文本实际展示高度。
     * 优先读取 Label 刷新后的节点高度，极端情况下用行数和 lineHeight 兜底。
     */
    private getTextRealHeight(){
        let height:number = this.flyTxt.node.height;
        if(height > 0){
            return height;
        }

        let lines:string[] = this.flyTxt.string.split("\n");
        return Math.max(1, lines.length) * this.flyTxt.lineHeight;
    }
}
