export function insertIf(condition, ...elements) {
  return condition ? elements : [];
}
export function executeIf(condition, func: Function): any {
  return condition ? func() : [];
}
