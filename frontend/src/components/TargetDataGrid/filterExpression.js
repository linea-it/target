export const emptyFilterExpression = () => ({
  type: 'group',
  operator: 'and',
  negated: false,
  children: [],
});

export function isActiveCondition(node) {
  if (node?.type !== 'condition' || !node.field || !node.operator) return false;
  if (node.operator === 'isEmpty' || node.operator === 'isNotEmpty') return true;
  if (node.value === undefined || node.value === null || node.value === '') return false;
  if (Array.isArray(node.value) && node.value.length === 0) return false;
  return true;
}

export function activeConditions(node) {
  if (!node) return [];
  if (Array.isArray(node.items)) {
    return node.items.filter((item) => isActiveCondition({ type: 'condition', ...item }));
  }
  if (node.type === 'condition') return isActiveCondition(node) ? [node] : [];
  return (node.children || []).flatMap(activeConditions);
}

export function hasActiveFilterModel(model) {
  return activeConditions(model).length > 0;
}

const VALUELESS = new Set(['isEmpty', 'isNotEmpty']);

function columnKind(column) {
  if (column?.muicolumntype === 'date' || column?.muicolumntype === 'dateTime') {
    return column.muicolumntype;
  }
  const datatype = String(column?.datatype || '').toLowerCase();
  if (datatype.includes('timestamp') || datatype.includes('datetime')) return 'dateTime';
  if (datatype === 'date' || datatype.startsWith('date ')) return 'date';
  return column?.muicolumntype || column?.type || 'string';
}

function valueIssue(node, column) {
  if (VALUELESS.has(node.operator)) return '';
  if (node.operator === 'isAnyOf') {
    return Array.isArray(node.value) && node.value.length > 0 ? '' : 'Add at least one value.';
  }
  const kind = columnKind(column);
  if (kind === 'number') {
    return typeof node.value === 'number' && Number.isFinite(node.value) ? '' : 'Enter a number.';
  }
  if (kind === 'boolean') return typeof node.value === 'boolean' ? '' : 'Choose true or false.';
  if (kind === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(node.value || '') ? '' : 'Choose a date.';
  if (kind === 'dateTime') {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(node.value || '') ? '' : 'Choose a date and time.';
  }
  if (node.value === undefined || node.value === null || node.value === '') return 'Enter a value.';
  return '';
}

export function expressionIssues(node, columns = []) {
  if (!node || node.type !== 'group') return [];
  return (node.children || []).flatMap((child) => {
    if (child.type === 'group') return expressionIssues(child, columns);
    if (child.type !== 'condition') return ['Remove the incomplete rule.'];
    const column = columns.find((item) => item.field === child.field || item.name === child.field);
    const issue = valueIssue(child, column);
    return issue ? [`${child.field || 'Column'}: ${issue}`] : [];
  });
}

export function commitNumericText(raw) {
  const text = String(raw ?? '');
  const normalized = text.replace(',', '.');
  if (normalized !== '' && !/^-?\d*\.?\d*$/.test(normalized)) return null;
  if (!/^-?(?:\d+\.\d+|\d+|\.\d+)$/.test(normalized)) {
    return { text, value: undefined };
  }
  return { text, value: Number(normalized) };
}

export function filtersDiffer(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

export function asFilterExpression(model) {
  if (!model) return null;
  if (model.type === 'group' && Array.isArray(model.children)) return model;
  if (!Array.isArray(model.items)) return null;
  return {
    type: 'group',
    operator: model.logicOperator === 'or' ? 'or' : 'and',
    negated: false,
    children: model.items.filter((item) => item?.field && item?.operator).map((item) => ({
      type: 'condition',
      id: item.id ?? `${item.field}-${item.operator}`,
      negated: false,
      field: item.field,
      operator: item.operator,
      value: item.value,
    })),
  };
}

function formatValue(value) {
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'string') return `'${value}'`;
  if (value === undefined || value === null) return '';
  return String(value);
}

export function formatExpression(node) {
  if (!node || node.type === undefined) return '';
  if (node.type === 'condition') {
    if (!isActiveCondition(node)) return '';
    const value = node.operator === 'isEmpty' || node.operator === 'isNotEmpty'
      ? ''
      : ` ${formatValue(node.value)}`;
    const text = `${node.field} ${node.operator}${value}`;
    return node.negated ? `NOT (${text})` : text;
  }
  const parts = (node.children || []).map(formatExpression).filter(Boolean);
  if (parts.length === 0) return '';
  const joined = parts.join(node.operator === 'or' ? ' OR ' : ' AND ');
  const wrapped = parts.length > 1 ? `(${joined})` : joined;
  return node.negated ? `NOT ${wrapped}` : wrapped;
}

export const newId = () => `${Date.now()}-${Math.random()}`;

export function newCondition(column) {
  return {
    type: 'condition',
    id: newId(),
    negated: false,
    field: column.field,
    operator: column.filterOperators[0].value,
  };
}

export function newGroup() {
  return {
    type: 'group',
    id: newId(),
    operator: 'and',
    negated: false,
    children: [],
  };
}

export function replaceNode(node, target, replacement) {
  if (node.id === target) return replacement;
  if (node.type !== 'group') return node;
  return {
    ...node,
    children: node.children.map((child) => replaceNode(child, target, replacement)),
  };
}

export function removeNode(node, target) {
  if (node.type !== 'group') return node;
  return {
    ...node,
    children: node.children
      .filter((child) => child.id !== target)
      .map((child) => removeNode(child, target)),
  };
}
