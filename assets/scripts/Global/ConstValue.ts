export class ConstValue {
    public static readonly CONFIG_FILE_DIR = "config/";
    public static readonly PREFAB_UI_DIR = "prefab/ui/";
    public static readonly AUDIO_DIR = "audio/";
    // 是否每个玩家新回合都清空旧骰子并重新发满5个；false 时保持旧逻辑，只补充已消耗的骰子。
    public static readonly ALWAYS_ROLL_FULL_DICES_EACH_TURN:boolean = false;

    public static readonly SHARE_RESULT_TITLE = "我今天冲到第{stage}关，来试试你能到第几关";
    public static readonly SHARE_RESULT_QUERY = "from=share&stage={stage}&damage={damage}";
    // 兼容旧版单张分享图配置；SHARE_CARD_IMAGE_URLS 为空时才会使用这里。
    public static readonly SHARE_CARD_IMAGE_URL = "https://mmocgame.qpic.cn/wechatgame/x9uQcl0cbzibeQVx8QwTdo8f9yPMIp1nlWqGRgwwbxL4kuvqRtVULEnGkzhrPuxrT/0";
    // 分享卡片图片池，每次分享随机取一张；可填审核域名下的网络图，也可以填微信包内图片路径。
    public static readonly SHARE_CARD_IMAGE_URLS:string[] = [
        "https://mmocgame.qpic.cn/wechatgame/x9uQcl0cbzibeQVx8QwTdo8f9yPMIp1nlWqGRgwwbxL4kuvqRtVULEnGkzhrPuxrT/0",
        "https://mmocgame.qpic.cn/wechatgame/x9uQcl0cbz96A3ibqgVlYgHCcJGjmXPJ28Q85ibppvWu358b92EcT9ziabAd3DFTalG/0",
        "https://mmocgame.qpic.cn/wechatgame/x9uQcl0cbz81P4XywYpPYJPWicMlnXrNQlLib60IaarOnDgSwyniaRJw1aGlbjeMhnq/0",
        "https://mmocgame.qpic.cn/wechatgame/x9uQcl0cbz9rbSvRmlTiaHVOtyWOmuc82fib28fcgZfBbXoyIVncaL3oobAFVGBwLn/0",
        "https://mmocgame.qpic.cn/wechatgame/x9uQcl0cbzibH1xdUMpOtECnGY4vBP6V0FOTowicvI5ZkiahVlNCQCoBCAqkPiaU6PLx/0",
    ];
    public static readonly SHARE_DAMAGE_TITLE = "我一剑打出{damage}伤害，来试试你的手气";
    public static readonly SHARE_DAMAGE_QUERY = "from=share&damage={damage}";
    public static readonly SHARE_TIMELINE_TITLE = "《就骰这亿把》今日挑战，看看你能闯到第几关";
    public static readonly SHARE_TIMELINE_QUERY = "from=timeline";
    public static readonly SHARE_HELP_TITLE = "我卡在第{stage}关了，差一点就过了";
    public static readonly SHARE_HELP_QUERY = "from=help&stage={stage}";
    public static readonly SHARE_CHALLENGE_TITLE = "今日挑战已结束，来看看你的手气";
    public static readonly SHARE_CHALLENGE_QUERY = "from=challenge";
    // 好友排行榜入口保持开启；如果后台隐私声明未完成，由开放数据域接口失败后显示“功能开发中”。
    public static readonly ENABLE_FRIEND_RANK:boolean = true;
    // 微信后台「游戏圈」生成的游戏内跳转 ID；提审前在后台开启游戏圈后填入。
    // public static readonly GAME_CIRCLE_OPEN_LINK = "FM09ILkjlQxM0OIigsWiuGIdFe7FV0HoNKXS8V9PYRESxuF9CP7jULdUNirbFp11fUKUJk9ifK3ZF1QCTknjjvXILaNynD6E43S80VMff1BqoMg9aoKxFoLua-n1Rhnrh0Geo-5k7kC_o7iPM6JAXN-G2PWBtCfAgawknwlRcdLYVbGaFCobSIkK8adCQGIgTz8jk2tMbV1tvCTA1WXgLFhNxW79oKohMBK_6i_YO4_PGsf99wuc0KnTkniBi7FwQdlcDPJoXl5B3xIgU5L9HacoendCoc_YYyLnM_VIL8UvXZjM9oYp-G7ixGY5WLsML1xDAii1bse9vlfcKIMoPnlsTeTMFlObVk_jJ706eKJLAsUlEr3FomC21W3mB63YXlDAJelHoDrQjxJo9mWBvg";
    public static readonly GAME_CIRCLE_OPEN_LINK = "-SSEykJvFV3pORt5kTNpS-8Iib_arB011PtLvWghW3imlh6SrkC0BGzOTxHOQxyxKRF10SoFQLfujM8ICxYBfRQz21yxq8NJP7hkl4d-CRQZ1oN4ru3M86oOHDzeNOsDDqDiql51i1aKrSmd84c7l8gYkqjoEzFPcqmpd01TAShpC2bA3PknhMYD_2hqCNrqMSqMP-zxq3QYp-P1J0zK44xtsnpwobrA2Bmi10ZhsNgGzU9Zv7sbsHqczZajkBpyf-1YS1HcwZ7fNkpOjDT5Soa7PMDl_Gp7mm_GZgvKDJsXzfNoG9aarraVwEtXA2pHk12KFrAuRE_7JyimsmoFVw"
    // 微信「评价与推荐」组件固定 OPENLINK 常量，按官方文档直接复制即可。
    public static readonly RECOMMEND_OPEN_LINK = "TWFRCqV5WeM2AkMXhKwJ03MhfPOieJfAsvXKUbWvQFQtLyyA5etMPabBehga950uzfZcH3Vi3QeEh41xRGEVFw";
    // 微信后台「擂台赛组件」生成的 openlink；后台配置完成后复制到这里。
    public static readonly ARENA_OPEN_LINK = "";
}
