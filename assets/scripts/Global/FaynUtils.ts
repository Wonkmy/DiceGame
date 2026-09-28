import GameMain from "../GameMain";

/*
 * @Author: Fayn86
 * @Date: 2020-12-01 16:24:49
 * @LastEditTime: 2020-12-02 17:33:23
 * @LastEditors: Fayn86
 * @FilePath: \HuoShanPenFa\assets\scripts\FaynUtils.ts
 */
export class FaynUtils {
    //#region cocos PlayMusic
    static PlayMusic(name, loop = false, volume = 1) {
        if(loop){
            if(!this.IsMusicEnabled())return;
        }else{
            if(!this.IsSoundEnabled())return;
        }
        AudioEngine.Play(name, loop, volume);
    }
    static PlayMusicForDuration(name:string, duration:number, volume = 1) {
        if(!this.IsSoundEnabled())return;
        AudioEngine.PlayForDuration(name, duration, volume);
    }
    static PauseMusic(name) {
        AudioEngine.Pause(name);
    }
    static ResumeMusic(name) {
        AudioEngine.Resume(name);
    }
    static StopMusic(name:string) {
        AudioEngine.Stop(name);
    }
    static SetMusicVolume(name:string, volume:number) {
        AudioEngine.SetVolume(name, volume);
    }
    static IsSoundEnabled():boolean{
        return cc.sys.localStorage.getItem("soundEnabled") !== "0";
    }
    static IsMusicEnabled():boolean{
        return cc.sys.localStorage.getItem("musicEnabled") !== "0";
    }
    static SetSoundEnabled(enabled:boolean){
        cc.sys.localStorage.setItem("soundEnabled",enabled ? "1" : "0");
    }
    static SetMusicEnabled(enabled:boolean){
        cc.sys.localStorage.setItem("musicEnabled",enabled ? "1" : "0");
        // 关闭时作废正在异步加载的 BGM；重新打开时由 GameMain 按当前界面重新播放一条。
        if(!enabled){
            AudioEngine.CancelPendingLoop("bgmloop");
            AudioEngine.CancelPendingLoop("battlebgmloop");
            AudioEngine.Pause("bgmloop");
            AudioEngine.Pause("battlebgmloop");
        }
    }
    static HasAudio(name:string):boolean{
        return AudioEngine.GetState(name) != null;
    }
    //#endregion

    static CocosExtend() {

        //#region 属性
        // @ts-ignore
        cc.Node.prototype.sprite = function () {
            return this.getComponent(cc.Sprite);
        }// @ts-ignore
        cc.Node.prototype.spriteFrame = function () {
            return (this.getComponent(cc.Sprite) as cc.Sprite).spriteFrame;
        }
        // @ts-ignore
        cc.Node.prototype.label = function () {
            return this.getComponent(cc.Label);
        }
        // @ts-ignore
        cc.Node.prototype.labelString = function () {
            return (this.getComponent(cc.Label) as cc.Label).string;
        }
        // @ts-ignore
        cc.Node.prototype.dragonBone = function () {
            return this.getComponent(dragonBones.ArmatureDisplay);
        }
        //#endregion

        //#region 动画
        // @ts-ignore
        cc.Node.prototype.show = function(t = 0, callFunc = null) {
            cc.tween(this).to(t, {opacity: 255}).call(callFunc != null ? callFunc: "").start();
        }
        // @ts-ignore
        cc.Node.prototype.hide = function(t = 0, active = false, callFunc = null) {
            cc.tween(this).to(t, {opacity: 0}).call(() => {
                this.active = active;
                return callFunc != null ? callFunc(): null;
            }).start();
        }
        // @ts-ignore
        cc.Node.prototype.heartBeat1 = function() {
            cc.tween(this).repeatForever(cc.tween().delay(1).to(0.2, {scale: 1.03}).to(0.1, {scale: 1}).to(0.15, {scale: 1.02}).to(0.1, {scale: 1})).start()
        }
        // @ts-ignore
        cc.Node.prototype.heartBeat2 = function() {
            cc.tween(this).repeatForever(cc.tween().to(0.2, {scale: 1.1}).to(0.1, {scale: 1}).to(0.15, {scale: 1.05}).to(0.1, {scale: 1}).to(0.1, {angle: 4}).to(0.2, {angle: -4}).to(0.1, {angle: 2}).to(0.1, {angle: -2}).to(0.05, {angle: 0}).delay(1)).start()
        }
        //#endregion

        //#region 方法
        // @ts-ignore
        cc.Node.prototype.getPosFromNode = function(otherNode: cc.Node) {
            let node = this as cc.Node;
            let wp = node.parent.convertToWorldSpaceAR(node.position);
            let op = otherNode.parent.convertToNodeSpaceAR(wp);
            return op;
        }
// @ts-ignore
        cc.Node.prototype.moveToNodePos = function(otherNode: cc.Node, dt, eas = null, callFunc = null) {
            let node = this as cc.Node;
            let wp = otherNode.parent.convertToWorldSpaceAR(node.position);
            let op = node.parent.convertToNodeSpaceAR(wp);
            cc.tween(this).to(dt, {position: op}, {easing: eas}).call(callFunc).start();
            return op;
        }
// @ts-ignore
        cc.Node.prototype.find = function(name) {
            return (this as cc.Node).getChildByName(name);
        }
        // @ts-ignore
        cc.Node.prototype.comp = function(name) {
            return (this as cc.Node).getComponent(name);
        }
        //#endregion
    }


    ////#region 事件
    private static events: IEvents = {};

    private static onceEvents: IEvents = {};

    /**
     * 监听事件
     * @param event 事件名
     * @param callback 回调
     * @param object 订阅对象
     */
    public static on(event: string, callback: Function, object?: any) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push({ callback, object });
    }

    /**
     * 监听事件（一次性）
     * @param event 事件名
     * @param callback 回调
     * @param object 订阅对象
     */
    public static once(event: string, callback: Function, object?: any) {
        if (!this.onceEvents[event]) this.onceEvents[event] = [];
        this.onceEvents[event].push({ callback, object });
    }

    /**
     * 取消监听事件
     * @param event 事件名
     * @param callback 回调
     * @param object 订阅对象
     */
    public static off(event: string, callback: Function, object?: any) {
        if (this.events[event]) {
            for (let i = 0; i < this.events[event].length; i++) {
                if (this.events[event][i].callback === callback && (!object || this.events[event][i].object === object)) {
                    this.events[event].splice(i, 1);
                    i--;
                }
            }
        }
        // 一次性事件
        if (this.onceEvents[event]) {
            for (let i = 0; i < this.onceEvents[event].length; i++) {
                if (this.onceEvents[event][i].callback === callback && (!object || this.onceEvents[event][i].object === object)) {
                    this.onceEvents[event].splice(i, 1);
                    i--;
                }
            }
        }
    }

    /**
     * 发射事件
     * @param event 事件名
     * @param args 参数
     */
    public static emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            for (let i = 0; i < this.events[event].length; i++) {
                this.events[event][i].callback.apply(this.events[event][i].object, args);
            }
        }
        // 一次性事件
        if (this.onceEvents[event]) {
            for (let i = 0; i < this.onceEvents[event].length; i++) {
                this.onceEvents[event][i].callback.apply(this.onceEvents[event][i].object, args);
            }
            this.onceEvents[event] = [];
        }
    }

    /**
     * 移除事件
     * @param event 事件名
     */
    public static remove(event: string) {
        if (this.events[event]) delete this.events[event];
        if (this.onceEvents[event]) delete this.onceEvents[event];
    }

    /**
     * 移除所有事件
     */
    public static removeAll() {
        this.events = {};
        this.onceEvents = {};
    }
    //#endregion
}

interface ISubscription {
    callback: Function;
    object: any;
}

interface IEvents {
    [event: string]: ISubscription[];
}



const { ccclass, property } = cc._decorator;

@ccclass

class AudioEngine extends cc.Component {
    // LIFE-CYCLE CALLBACKS:

    private static audios: Audio[] = [];
    private static path: string = "";
    private static readonly SFX_VOLUME_RATE:number = 0.35;
    private static loopPlayVersion:any = {};

    private static Preload(path:string) {
        AudioEngine.audios = new Array<Audio>();
        GameMain.instance.bundle.preloadDir(path, cc.AudioClip);

        this.path = path;
    }

    public static Play(name:string, loop = false, volume = 1) {
        if (AudioEngine.audios == undefined) {
            AudioEngine.audios = new Array<Audio>();
            GameMain.instance.bundle.preloadDir('audios', cc.AudioClip);
        }

        let audioID;
        let a: Audio;
        let loopVersion:number = 0;
        if(loop){
            // 同名 BGM 只允许存在一条，避免设置界面反复开关后叠播。
            loopVersion = AudioEngine.nextLoopPlayVersion(name);
            AudioEngine.StopAllByName(name);
        }
        GameMain.instance.bundle.load((this.path != "" ? this.path + "/" + name : "audios/" + name), cc.AudioClip, (err, audio: cc.AudioClip) => {
            if(err || !audio)return;
            if(loop){
                if(!FaynUtils.IsMusicEnabled())return;
                if(!AudioEngine.isLatestLoopPlay(name, loopVersion))return;
                // load 是异步的，真正播放前再清一次，防止快速开关产生多个回调叠加。
                AudioEngine.StopAllByName(name);
            }

            audioID = cc.audioEngine.play(audio, loop, this.getFinalVolume(loop, volume));
            a = new Audio(audioID, audio, name);
            AudioEngine.audios.push(a);
            cc.audioEngine.setFinishCallback(audioID, function () {
                AudioEngine.removeFinishedAudio(audioID);
            })
        })

        return audioID;
    }

    public static PlayForDuration(name:string, duration:number, volume = 1) {
        if(duration <= 0)return;

        GameMain.instance.bundle.load((this.path != "" ? this.path + "/" + name : "audios/" + name), cc.AudioClip, (err, audio: cc.AudioClip) => {
            if(err || !audio)return;

            // 一整轮骰子只播一个循环音效，到本轮发骰结束时主动停止。
            let audioID:number = cc.audioEngine.play(audio, true, this.getFinalVolume(false, volume));
            let a:Audio = new Audio(audioID, audio, name);
            AudioEngine.audios.push(a);
            setTimeout(() => {
                cc.audioEngine.stop(audioID);
                AudioEngine.removeFinishedAudio(audioID);
            }, duration * 1000);
        })
    }

    /**
     * 统一混音：BGM 使用调用处传入音量，短音效统一压低，避免盖住背景音乐。
     */
    private static getFinalVolume(loop:boolean, volume:number):number{
        if(loop)return volume;

        return volume * this.SFX_VOLUME_RATE;
    }

    public static Resume(name) {
        let ids:number[] = this.GetIdsByName(name);
        if (ids.length > 0) {
            for(let i = 0;i < ids.length;i++){
                cc.audioEngine.resume(ids[i]);
            }
            return ids[0];
        }
        return -1;
    }

    public static Pause(name) {
        let ids:number[] = AudioEngine.GetIdsByName(name);
        if(ids.length <= 0)return null;

        for(let i = 0;i < ids.length;i++){
            cc.audioEngine.pause(ids[i]);
        }

        return ids[0];
    }

    public static Stop(name:string) {
        AudioEngine.CancelPendingLoop(name);
        AudioEngine.StopAllByName(name);
    }

    public static CancelPendingLoop(name:string) {
        AudioEngine.nextLoopPlayVersion(name);
    }

    public static StopAllByName(name:string) {
        for (let i = AudioEngine.audios.length - 1; i >= 0; i--) {
            if(AudioEngine.audios[i].name !== name)continue;

            cc.audioEngine.stop(AudioEngine.audios[i].id);
            AudioEngine.audios.splice(i, 1);
        }
    }

    public static GetState(name) {

        let audioId = AudioEngine.GetIdByName(name)

        if (audioId != null && audioId != -1) return cc.audioEngine.getState(audioId)

        return null;
    }

    public static SetVolume(name:string, volume:number) {
        let audioId = AudioEngine.GetIdByName(name);
        if(audioId == null || audioId == -1)return;

        cc.audioEngine.setVolume(audioId, volume);
    }

    private static removeFinishedAudio(audioID) {
        //删除非循环播放
        for (let taudio of AudioEngine.audios) {
            if (taudio.id === audioID && cc.audioEngine.isLoop(audioID) == false) {
                let index = AudioEngine.audios.indexOf(taudio);
                if (index > -1) {
                    AudioEngine.audios.splice(index, 1);
                    return;
                }
            }
        }
    }

    private static removeAudioById(audioID:number) {
        for (let i = 0; i < AudioEngine.audios.length; i++) {
            if (AudioEngine.audios[i].id === audioID) {
                AudioEngine.audios.splice(i, 1);
                return;
            }
        }
    }



    private static GetIdByName(name) {
        for (let taudio of AudioEngine.audios) {
            if (taudio.name === name) {
                return taudio.id
            }
        }
        return -1;
    }

    private static GetIdsByName(name):number[] {
        let ids:number[] = [];
        for (let taudio of AudioEngine.audios) {
            if (taudio.name === name) {
                ids.push(taudio.id);
            }
        }
        return ids;
    }

    private static nextLoopPlayVersion(name:string):number{
        let version:number = (AudioEngine.loopPlayVersion[name] || 0) + 1;
        AudioEngine.loopPlayVersion[name] = version;
        return version;
    }

    private static isLatestLoopPlay(name:string, version:number):boolean{
        return AudioEngine.loopPlayVersion[name] === version;
    }
    // update (dt) {}
}

class Audio {
    public id: number;
    public clip: cc.AudioClip;
    public name: string;

    constructor(_id, _clip, _name:string = "") {
        this.id = _id;
        this.clip = _clip;
        this.name = _name && _name.length > 0 ? _name : _clip.name;
    }

}

FaynUtils.CocosExtend();
