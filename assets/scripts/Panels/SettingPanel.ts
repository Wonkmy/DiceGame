// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import GameMain from "../GameMain";
import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import { Advertise } from "../GameCodes/Advertise";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SettingPanel extends BaseUI {
    protected static className = "SettingPanel";

    @property({type:cc.Node})
    close_Self:cc.Node = null!;
    @property({type:cc.Node})
    btn_soundSwitch:cc.Node = null!;
    @property({type:cc.Node})
    btn_musicSwitch:cc.Node = null!;

    override onShow(): void {
        Advertise.showBannerForNormalPanel();
        if(this.close_Self){
            this.close_Self.off(cc.Node.EventType.TOUCH_END,this.onCloseSelf,this);
            this.close_Self.on(cc.Node.EventType.TOUCH_END,this.onCloseSelf,this);
        }
        if(this.btn_soundSwitch){
            this.btn_soundSwitch.off(cc.Node.EventType.TOUCH_END,this.onSoundSwitch,this);
            this.btn_soundSwitch.on(cc.Node.EventType.TOUCH_END,this.onSoundSwitch,this);
        }
        if(this.btn_musicSwitch){
            this.btn_musicSwitch.off(cc.Node.EventType.TOUCH_END,this.onMusicSwitch,this);
            this.btn_musicSwitch.on(cc.Node.EventType.TOUCH_END,this.onMusicSwitch,this);
        }
        this.refreshAudioSwitchText();
    }

    private onCloseSelf(){
        FaynUtils.PlayMusic("ui_button_click",false,1);
        UIManager.getInstance().closeUI(SettingPanel);
    }

    private onSoundSwitch(){
        let enabled:boolean = !FaynUtils.IsSoundEnabled();
        FaynUtils.SetSoundEnabled(enabled);
        if(enabled){
            FaynUtils.PlayMusic("ui_button_click",false,1);
        }
        this.refreshAudioSwitchText();
    }

    private onMusicSwitch(){
        FaynUtils.PlayMusic("ui_button_click",false,1);
        let enabled:boolean = !FaynUtils.IsMusicEnabled();
        FaynUtils.SetMusicEnabled(enabled);
        if(enabled && GameMain.instance){
            GameMain.instance.refreshCurrentBgmAfterSettingChanged();
        }
        this.refreshAudioSwitchText();
    }

    private refreshAudioSwitchText(){
        this.setSwitchButtonText(this.btn_soundSwitch,FaynUtils.IsSoundEnabled() ? "音效开" : "音效关");
        this.setSwitchButtonText(this.btn_musicSwitch,FaynUtils.IsMusicEnabled() ? "音乐开" : "音乐关");
    }

    private setSwitchButtonText(btnNode:cc.Node,txt:string){
        if(!btnNode)return;

        let txtNode:cc.Node = btnNode.getChildByName("txt") || btnNode.getChildByName("label") || btnNode.getChildByName("Label");
        if(txtNode && txtNode.getComponent(cc.Label)){
            txtNode.getComponent(cc.Label).string = txt;
            return;
        }
        if(btnNode.getComponent(cc.Label)){
            btnNode.getComponent(cc.Label).string = txt;
        }
    }

    protected onDestroy(): void {
        if(this.close_Self)this.close_Self.off(cc.Node.EventType.TOUCH_END,this.onCloseSelf,this);
        if(this.btn_soundSwitch)this.btn_soundSwitch.off(cc.Node.EventType.TOUCH_END,this.onSoundSwitch,this);
        if(this.btn_musicSwitch)this.btn_musicSwitch.off(cc.Node.EventType.TOUCH_END,this.onMusicSwitch,this);
    }
}
