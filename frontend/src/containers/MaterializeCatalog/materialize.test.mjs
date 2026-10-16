import assert from 'node:assert/strict';
import test from 'node:test';

import { commitNumericText, expressionIssues, filtersDiffer } from '../../components/TargetDataGrid/filterExpression.js';

test('a numeric filter keeps the decimal while it is being typed', () => {
  assert.deepEqual(commitNumericText('1.'), { text: '1.', value: undefined });
  assert.deepEqual(commitNumericText('1.5'), { text: '1.5', value: 1.5 });
  assert.deepEqual(commitNumericText('1,25'), { text: '1,25', value: 1.25 });
  assert.equal(commitNumericText('1.5a'), null);
});

test('preview stays stale until the edited filter is applied', () => {
  const applied = { type: 'group', operator: 'and', children: [] };
  const draft = {
    type: 'group',
    operator: 'or',
    children: [{ type: 'condition', field: 'ra', operator: '>', value: 1 }],
  };
  assert.equal(filtersDiffer(draft, applied), true);
  assert.equal(filtersDiffer(applied, applied), false);
});

test('date, number and list values are validated before preview', () => {
  const columns = [
    { name: 'observed', datatype: 'timestamp' },
    { name: 'ra', muicolumntype: 'number' },
    { name: 'label', muicolumntype: 'string' },
  ];
  const issues = expressionIssues({
    type: 'group',
    children: [
      { type: 'condition', field: 'observed', operator: '=', value: 'yesterday' },
      { type: 'condition', field: 'ra', operator: '>', value: 'high' },
      { type: 'condition', field: 'label', operator: 'isAnyOf', value: [] },
    ],
  }, columns);
  assert.equal(issues.length, 3);
  assert.deepEqual(expressionIssues({
    type: 'group',
    children: [
      { type: 'condition', field: 'observed', operator: '=', value: '2026-10-09T18:00' },
      { type: 'condition', field: 'ra', operator: '>', value: 1.5 },
      { type: 'condition', field: 'label', operator: 'isAnyOf', value: ['a'] },
    ],
  }, columns), []);
});
