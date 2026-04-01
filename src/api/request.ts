/*
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-04-01 16:50:09
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-04-01 17:15:03
 * @FilePath: /dhome/src/api/request.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import axios from 'axios';

const request = axios.create({
  baseURL: 'http://localhost:3006', // 这里的端口要和后端保持一致
  timeout: 5000,
});

export default request;