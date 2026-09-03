export class ConstValue {
    public static readonly CONFIG_FILE_DIR = "config/";
    public static readonly PREFAB_UI_DIR = "prefab/ui/";
    public static readonly AUDIO_DIR = "audio/";
    public static readonly defaultMoney = 1000;
    public static readonly REROLL_COST = 400;
    public static readonly TotalPoints = 9;// 鉴赏时可以最多操作几次

    public static readonly SHARE_RESULT_TITLE = "我今天冲到第{stage}关，超过本地区{percent}%玩家";
    public static readonly SHARE_RESULT_QUERY = "from=share&stage={stage}&damage={damage}";
    // 分享卡片图片，可填审核域名下的网络图，也可以填微信包内图片路径；为空则只分享文字。
    public static readonly SHARE_CARD_IMAGE_URL = "";
    public static readonly SHARE_DAMAGE_TITLE = "我一剑打出{damage}伤害，你能超过吗？";
    public static readonly SHARE_DAMAGE_QUERY = "from=share&damage={damage}";
    public static readonly SHARE_TIMELINE_TITLE = "我在《就骰这亿把》打出了最高一剑，来挑战我！";
    public static readonly SHARE_TIMELINE_QUERY = "from=timeline";
    public static readonly SHARE_HELP_TITLE = "我卡在第{stage}关了，帮我助力再来一次！";
    public static readonly SHARE_HELP_QUERY = "from=help&stage={stage}";
    public static readonly SHARE_CHALLENGE_TITLE = "今日挑战次数用完了，帮我解锁一次挑战！";
    public static readonly SHARE_CHALLENGE_QUERY = "from=challenge";
    // public static readonly SCREEN_HEIGHT = 1334;
    // public static readonly SCREEN_WIDTH = 750;
    // public static readonly ANGRY_TIME = 30;
    // public static readonly ANGRY_UPDATE_INTERVAL = 3;
    // public static readonly OFFLINE_UPDATE_INTERVAL = 10;
    // public static readonly BUY_PER_RATE_1 = 1.07;
    // public static readonly BUY_PER_RATE = 1.175;
    // public static readonly SALE_BUY_RATE = 0.85;
    // public static readonly SALE_MERGE_RATE = 0.8;
    // public static readonly PLATFORM_UNIT_COUNT = 12;
    // public static curLevel:number = 0;
    // public static gridScaleX:number = 1.0;
    // public static gridScaleY:number = 1.1;
    // public static canTapSheep:boolean = true;
    // public static CUR_TAP_COW_COUNT:number = 0;
    // public static gamewin:boolean=false;
    // public static gameOver:boolean=false;
    // public static gamePause:boolean=false;
    // public static gameMusicVolume:number = 1;
    // public static gameSoundVolume:number = 1;
}
// /**
//  * 请求数据
//  */
// export class RequestData{
//     id:number;
//     type:string;

//     constructor(id:number,type:string){
//         this.id = id;
//         this.type = type;
//     }
// }

// /**
//  * 响应/预设数据
//  */
// export class ResponseData{
//     id:number;
//     type:string;
//     path:string;

//     constructor(id:number,type:string,path:string){
//         this.id=id;
//         this.type = type;
//         this.path = path;
//     }
// }
