function isAllChinese(str: string) {
  return /^[\u4E00-\u9FFF]+$/.test(str);
}

export default isAllChinese;