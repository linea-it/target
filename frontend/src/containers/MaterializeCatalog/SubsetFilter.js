'use client';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  formatExpression,
  commitNumericText,
  newCondition,
  newGroup,
  removeNode,
  replaceNode,
} from '@/components/TargetDataGrid/filterExpression';

const VALUELESS = new Set(['isEmpty', 'isNotEmpty']);

const COMPARISON = ['=', '!=', '>', '>=', '<', '<=', 'isEmpty', 'isNotEmpty', 'isAnyOf'];

const OPERATORS = {
  number: COMPARISON,
  date: COMPARISON,
  dateTime: COMPARISON,
  boolean: ['is', 'isEmpty', 'isNotEmpty'],
  string: ['contains', 'equals', 'doesNotEqual', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty', 'isAnyOf'],
};

function columnType(column) {
  if (column?.muicolumntype === 'date' || column?.muicolumntype === 'dateTime') {
    return column.muicolumntype;
  }
  const datatype = String(column?.datatype || '').toLowerCase();
  if (datatype.includes('timestamp') || datatype.includes('datetime')) return 'dateTime';
  if (datatype === 'date' || datatype.startsWith('date ')) return 'date';
  return column?.muicolumntype || 'string';
}

function operatorsFor(column) {
  const list = OPERATORS[column?.type] || OPERATORS.string;
  return list.map((value) => ({ value }));
}

function columnsFromCatalog(catalog) {
  return (catalog?.columns || [])
    .filter((column) => column?.name)
    .map((column) => {
      const type = columnType(column);
      const spec = { field: column.name, headerName: column.title || column.name, type };
      spec.filterOperators = operatorsFor(spec);
      return spec;
    });
}

function ConditionFields({ node, columns, update }) {
  const column = columns.find((item) => item.field === node.field) || columns[0];
  const operators = column ? operatorsFor(column) : [];
  const operator = node.operator || operators[0]?.value || '';
  const needsValue = !VALUELESS.has(operator);
  const numeric = column?.type === 'number' && operator !== 'isAnyOf';
  const [numericText, setNumericText] = useState(() => (
    node.value === undefined || node.value === null ? '' : String(node.value)
  ));

  useEffect(() => {
    if (!numeric) return;
    setNumericText((current) => {
      if (node.value === undefined || node.value === null) {
        const pending = commitNumericText(current);
        return pending && pending.value === undefined ? current : '';
      }
      const pending = commitNumericText(current);
      if (pending?.value === node.value) return current;
      return String(node.value);
    });
  }, [numeric, node.field, node.value, operator]);

  const changeColumn = (event) => {
    const next = columns.find((item) => item.field === event.target.value);
    if (!next) return;
    update({ ...node, field: next.field, operator: operatorsFor(next)[0].value, value: undefined });
  };

  const changeValue = (raw) => {
    if (operator === 'isAnyOf') {
      update({ ...node, value: raw.split(',').map((part) => part.trim()).filter(Boolean) });
      return;
    }
    if (numeric) {
      const next = commitNumericText(raw);
      if (!next) return;
      setNumericText(next.text);
      update({ ...node, value: next.value });
      return;
    }
    if (column?.type === 'boolean') {
      update({ ...node, value: raw === 'true' });
      return;
    }
    update({ ...node, value: raw });
  };

  const shownValue = numeric
    ? numericText
    : Array.isArray(node.value) ? node.value.join(', ') : (node.value ?? '');

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto 1.2fr 1fr 1.2fr' }, gap: 1, alignItems: 'center' }}>
      <FormControlLabel
        control={<Checkbox size="small" checked={!!node.negated} onChange={(event) => update({ ...node, negated: event.target.checked })} />}
        label="NOT"
        sx={{ mr: 0 }}
      />
      <TextField select size="small" label="Column" value={node.field || ''} onChange={changeColumn}>
        {columns.map((item) => (
          <MenuItem key={item.field} value={item.field}>{item.headerName}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Operator"
        value={operator}
        onChange={(event) => update({ ...node, operator: event.target.value, value: undefined })}
      >
        {operators.map((item) => (
          <MenuItem key={item.value} value={item.value}>{item.value}</MenuItem>
        ))}
      </TextField>
      {needsValue && column?.type === 'boolean' && operator === 'is' ? (
        <TextField select size="small" label="Value" value={node.value === undefined ? '' : String(node.value)} onChange={(event) => changeValue(event.target.value)}>
          <MenuItem value="true">true</MenuItem>
          <MenuItem value="false">false</MenuItem>
        </TextField>
      ) : needsValue ? (
        <TextField
          size="small"
          type={column?.type === 'date' ? 'date' : column?.type === 'dateTime' ? 'datetime-local' : 'text'}
          label={operator === 'isAnyOf' ? 'Values, comma separated' : 'Value'}
          value={shownValue}
          onChange={(event) => changeValue(event.target.value)}
          slotProps={{ inputLabel: { shrink: column?.type === 'date' || column?.type === 'dateTime' || undefined } }}
        />
      ) : <Box />}
    </Box>
  );
}

function GroupEditor({ node, columns, update, remove, root = false }) {
  return (
    <Box sx={{ border: 1, borderColor: root ? 'divider' : 'primary.light', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label="Combine"
          value={node.operator}
          onChange={(event) => update({ ...node, operator: event.target.value })}
          sx={{ width: 120 }}
        >
          <MenuItem value="and">And</MenuItem>
          <MenuItem value="or">Or</MenuItem>
        </TextField>
        <FormControlLabel
          control={<Checkbox size="small" checked={!!node.negated} onChange={(event) => update({ ...node, negated: event.target.checked })} />}
          label="NOT group"
        />
        <Button size="small" disabled={!columns.length} onClick={() => update({ ...node, children: [...(node.children || []), newCondition(columns[0])] })}>
          Add condition
        </Button>
        <Button size="small" onClick={() => update({ ...node, children: [...(node.children || []), newGroup()] })}>
          Add group
        </Button>
        {!root && (
          <Button size="small" color="error" onClick={remove}>Remove group</Button>
        )}
      </Box>
      {(node.children || []).map((child) => (
        <Box key={child.id}>
          {child.type === 'group' ? (
            <GroupEditor
              node={child}
              columns={columns}
              update={(next) => update(replaceNode(node, child.id, next))}
              remove={() => update(removeNode(node, child.id))}
            />
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Button size="small" color="error" onClick={() => update(removeNode(node, child.id))} sx={{ mt: 1 }}>
                Remove
              </Button>
              <Box sx={{ flex: 1 }}>
                <ConditionFields
                  node={child}
                  columns={columns}
                  update={(next) => update(replaceNode(node, child.id, next))}
                />
              </Box>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default function SubsetFilter({ catalog, expression, onChange }) {
  const columns = columnsFromCatalog(catalog);
  if (!expression) return null;
  const sentence = formatExpression(expression);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
      <Typography variant="subtitle2">Subset filter</Typography>
      <GroupEditor root node={expression} columns={columns} update={onChange} />
      {sentence && (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{sentence}</Typography>
      )}
    </Box>
  );
}
