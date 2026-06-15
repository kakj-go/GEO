const createLoggerProxy = (instance, platformName) => {
    return new Proxy(instance, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'function') {
                return async function (...args) {
                    let logger;
                    try {
                        // 尝试从 browserManager 获取 logger 实例
                        const browserManager = require('../browserManager');
                        logger = browserManager.logger;
                    } catch (e) {
                        // 如果获取失败（如循环引用或路径问题），则回退
                    }

                    if (!logger) {
                        logger = require('electron-log');
                    }

                    try {
                        // 使用 apply(this, args) 确保方法内部的 this 仍指向代理对象或目标对象
                        return await value.apply(this, args);
                    } catch (error) {
                        logger.error(`[Platform: ${platformName}] Error in function ${prop}:`, error);
                        if (error.stack) {
                            logger.error(error.stack);
                        }
                        throw error;
                    }
                };
            }
            return value;
        }
    });
}

module.exports = createLoggerProxy;
