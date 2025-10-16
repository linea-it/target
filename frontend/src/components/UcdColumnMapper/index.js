import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Button from '@mui/material/Button';
import DoneIcon from "@mui/icons-material/Done";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation } from "@tanstack/react-query";
import { getTableColumn, updateTableColumn } from "@/services/Metadata";

/**
 * UcdColumnMapper  agora recebe:
 * - catalog_id: id do catálogo para buscar colunas
 * - catalog_type: 'target' | 'cluster' | 'members'
 * - ucds: array de objetos { label, value, mandatory, types }
 *
 * Cada UCD filtrado por catalog_type é listado; ao lado, o select de colunas.
 */
export default function UcdColumnMapper({ catalog_id, catalog_type, ucds, onValidationChange }) {
  const [columns, setColumns] = useState([]);
  const [mappings, setMappings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const loadColumns = useCallback(async () => {
    if (!catalog_id) return;
    setIsLoading(true);
    try {
      const resp = await getTableColumn(catalog_id);
      setColumns(resp.data || []);
    } catch (err) {
      console.error("Error loading columns:", err);
    } finally {
      setIsLoading(false);
    }
  }, [catalog_id]);

  const mutation = useMutation({
    mutationFn: updateTableColumn,
    onSuccess: () => loadColumns(),
    onError: (err) => console.error("updateTableColumn error:", err),
  });

  useEffect(() => {
    if (catalog_id) loadColumns();
  }, [catalog_id, loadColumns]);

  const applicableUcds = useMemo(() => {
    if (!Array.isArray(ucds)) return [];
    return ucds.filter((u) => !u.types?.length || u.types.includes(catalog_type));
  }, [ucds, catalog_type]);

  useEffect(() => {
    const map = {};
    applicableUcds.forEach((u) => {
      const col = columns.find((c) => c.ucd === u.value);
      if (col) map[u.value] = col.name;
    });
    setMappings(map);
  }, [columns, applicableUcds]);

  const getAvailableColumns = (currentUcdValue) => {
    const used = Object.entries(mappings)
      .filter(([ucdValue]) => ucdValue !== currentUcdValue)
      .map(([_, colName]) => colName)
      .filter(Boolean);
    return columns.filter((c) => !used.includes(c.name));
  };

  const handleChange = (ucdValue, columnName) => {
    const column = columns.find((c) => c.name === columnName);
    if (!column) return;
    mutation.mutate({ ...column, ucd: ucdValue });
    setMappings((prev) => ({ ...prev, [ucdValue]: columnName }));
  };

  const handleClear = (ucdValue) => {
    const columnName = mappings[ucdValue];
    if (!columnName) return;
    const column = columns.find((c) => c.name === columnName);
    if (!column) return;

    mutation.mutate({ ...column, ucd: null });
    setMappings((prev) => {
      const next = { ...prev };
      delete next[ucdValue];
      return next;
    });
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const promises = Object.entries(mappings).map(([ucdValue, colName]) => {
        const column = columns.find((c) => c.name === colName);
        if (column) {
          return updateTableColumn({ ...column, ucd: null });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      setMappings({});
      await loadColumns();
    } catch (err) {
      console.error("Error clearing all:", err);
    } finally {
      setClearingAll(false);
    }
  };

  const sortedUcds = useMemo(() => {
    const mandatory = applicableUcds.filter((u) => u.mandatory);
    const optional = applicableUcds.filter((u) => !u.mandatory);
    return [...mandatory, ...optional];
  }, [applicableUcds]);

  const isValid = useMemo(() => {
    const mandatoryForCatalog = applicableUcds.filter((u) => u.mandatory).map((u) => u.value);
    if (mandatoryForCatalog.length === 0) return true;
    return mandatoryForCatalog.every((val) => mappings[val] && mappings[val] !== "");
  }, [applicableUcds, mappings]);

  useEffect(() => {
    if (onValidationChange) onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  return (
    <Box
      component="form"
      sx={{
        '& > :not(style)': { mb: 2 },
        // '& .MuiTextField-root': { width: '20ch' }
      }}
      noValidate
      autoComplete="off">
      {isLoading ? <LinearProgress /> : <Box sx={{ height: 4, marginBottom: 2 }} />}
      <Stack spacing={2} sx={{
        justifyContent: "center",
        alignItems: "center",
      }}>
        {sortedUcds.map((ucd) => {
          const selected = mappings[ucd.value] || "";
          const options = getAvailableColumns(ucd.value);
          let color = "default";
          if (ucd.mandatory) color = selected ? "success" : "error";

          return (
            <Stack key={ucd.value} direction="row" spacing={2} alignItems="center">
              <Chip
                label={ucd.label || ucd.value}
                color={color}
                variant={ucd.mandatory && selected ? "filled" : "outlined"}
                deleteIcon={ucd.mandatory && selected ? <DoneIcon /> : undefined}
                onDelete={ucd.mandatory && selected ? () => { } : undefined}
                sx={{ minWidth: 160 }}
              />

              <FormControl sx={{ width: '20ch' }}>
                {!selected ? (
                  <TextField
                    select
                    size="small"
                    value=""
                    onChange={(e) => handleChange(ucd.value, e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select a column</em>
                    </MenuItem>
                    {options.map((col) => (
                      <MenuItem
                        key={col.name}
                        value={col.name}
                        disabled={Object.entries(mappings).some(
                          ([ucdValue, colName]) => ucdValue !== ucd.value && colName === col.name
                        )}
                      >
                        {col.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    size="small"
                    value={selected}
                    slotProps={{
                      input: {
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => handleClear(ucd.value)} edge="end">
                              <CloseIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                )}
              </FormControl>
            </Stack>
          );
        })}

        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={handleClearAll}
          disabled={clearingAll || Object.keys(mappings).length === 0}
        >
          Clear All
        </Button>
      </Stack>
    </Box>
  );
}

UcdColumnMapper.propTypes = {
  catalog_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  catalog_type: PropTypes.oneOf(["target", "cluster", "members"]).isRequired,
  ucds: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string.isRequired,
      mandatory: PropTypes.bool,
      types: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  onValidationChange: PropTypes.func,
};