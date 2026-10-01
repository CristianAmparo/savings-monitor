// Tiny DOM builder: h('div', {class: 'x', onclick: fn}, child, child...)
export function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  let value;
  for (const [key, val] of Object.entries(attrs || {})) {
    if (val == null || val === false) continue;
    if (key === 'class') node.className = val;
    else if (key === 'value') value = val;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), val);
    else if (val === true) node.setAttribute(key, '');
    else node.setAttribute(key, val);
  }
  appendAll(node, children);
  if (value !== undefined) node.value = value;
  return node;
}

export function appendAll(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
