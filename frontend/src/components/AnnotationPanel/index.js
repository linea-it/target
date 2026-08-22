'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SaveIcon from '@mui/icons-material/Save';
import { useMutation } from '@tanstack/react-query';
import { useCatalog } from '@/contexts/CatalogContext';
import { annotateTableRow } from '@/services/Metadata';

export default function AnnotationPanel() {
  const { selectedRecord, catalog, setSelectedRecord, refreshGrid } = useCatalog();

  const [comment, setComment] = React.useState('');

  const isCurrentCatalogRecord =
    !!selectedRecord && selectedRecord.meta_catalog_id === catalog?.id;

  const savedComment = isCurrentCatalogRecord ? (selectedRecord?.meta_comment ?? '') : '';
  const isCommentDirty = comment !== savedComment;

  // Resets the comment draft whenever the selected record changes
  React.useEffect(() => {
    setComment(savedComment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecord?.meta_id, isCurrentCatalogRecord]);

  const mutation = useMutation({
    mutationFn: (data) =>
      annotateTableRow({
        tableId: catalog.id,
        rowId: selectedRecord.meta_id,
        ...data,
      }),
    onSuccess: (res) => {
      // Updates the selected record in context (and sessionStorage) without
      // refetching the whole grid. Uses "in" instead of ?? because
      // quality_flag can legitimately come back as null (unreviewed).
      const updated = { ...selectedRecord };
      if ('quality_flag' in res.data) updated.meta_quality_flag = res.data.quality_flag;
      if ('comment' in res.data) updated.meta_comment = res.data.comment;
      setSelectedRecord(updated);

      // A coluna "Comment" do grid vem do dataSource, não é atualizada por
      // esse setSelectedRecord. Avisa o TargetDataGrid para recarregar.
      refreshGrid();
    },
  });

  const handleSaveComment = () => {
    if (!isCommentDirty) return;
    mutation.mutate({ comment });
  };

  return (
    <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {mutation.isPending && <CircularProgress size={18} />}

        <TextField
          size="small"
          placeholder="Comment about this record"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveComment();
            }
          }}
          disabled={!isCurrentCatalogRecord}
          fullWidth
          sx={{ flex: 1, minWidth: 240 }}
        />

        <Tooltip title="Save comment">
          <span>
            <IconButton
              aria-label="save-comment"
              color="primary"
              disabled={!isCurrentCatalogRecord || !isCommentDirty || mutation.isPending}
              onClick={handleSaveComment}
            >
              <SaveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {mutation.isError && (
        <Typography variant="caption" color="error">
          Failed to save comment: {mutation.error?.response?.data?.error || mutation.error?.message}
        </Typography>
      )}
    </Box>
  );
}
