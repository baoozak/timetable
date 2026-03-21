import zhengfangNew from './zhengfang_new.js';
import urp from './urp.js';
import kingosoft from './kingosoft.js';
import qiangzhi from './qiangzhi.js';

const adapters = {
  [zhengfangNew.id]: zhengfangNew,
  [urp.id]: urp,
  [kingosoft.id]: kingosoft,
  [qiangzhi.id]: qiangzhi
};

/**
 * 根据教务系统类型获取适配器
 * @param {string} type - 教务系统类型ID
 */
export function getAdapter(type) {
  return adapters[type] || null;
}

/**
 * 获取所有已注册的适配器列表
 */
export function getAllAdapters() {
  return Object.values(adapters).map(a => ({
    id: a.id,
    name: a.name
  }));
}
