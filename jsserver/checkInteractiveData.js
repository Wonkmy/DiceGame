/**
 * 好友互动写入校验函数。
 * 微信 modifyFriendInteractiveStorage 会调用这个函数，只有返回 ret:true 才允许写入。
 */
module.exports = function (event) {
    event = event || {};

    // 当前只开放“好友助战”这一种互动：key=1，add 1 次。
    if (String(event.key) !== '1') {
        return { ret: false };
    }

    if (event.operation !== 'add') {
        return { ret: false };
    }

    if (Number(event.opNum) !== 1) {
        return { ret: false };
    }

    return { ret: true };
};
