'use client';
import * as React from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useMutation } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import { getTableData, annotateTableRow } from '@/services/Metadata';
import { useCatalog } from '@/contexts/CatalogContext'

// Cicla o valor tri-state ao clicar: não avaliado -> bom -> ruim -> não avaliado
const nextQualityFlag = (current) => {
  if (current === true) return false;
  if (current === false) return null;
  return true;
};

const QUALITY_FLAG_META = {
  true: { icon: CheckCircleIcon, color: 'success', label: 'Good' },
  false: { icon: CancelIcon, color: 'error', label: 'Bad' },
  null: { icon: HelpOutlineIcon, color: 'disabled', label: 'Not reviewed' },
};

export default function TargetDataGrid(props) {

  const { selectedRecord, setSelectedRecord, catalog, refreshGridToken } = useCatalog()
  const apiRef = useGridApiRef();


  // ids das rows atualmente carregadas/visíveis (atualizado no dataSource.getRows)
  const [visibleRowIds, setVisibleRowIds] = React.useState(new Set());

  // estado controlado da seleção
  const [rowSelectionModel, setRowSelectionModel] = React.useState({ type: 'include', ids: new Set(), })

  // quando o contexto mudar (por ex: voltou do detalhe)
  // reaplica seleção quando o selectedRecord é conhecido e quando as linhas visíveis mudam
  //
  // getRowId (abaixo) usa BigInt(row.meta_id), mas selectedRecord.meta_id
  // vem do JSON da API (ou do sessionStorage) como string. Sem o BigInt()
  // aqui, o Set ficava com uma string que nunca bate com os ids BigInt do
  // grid, e a linha nunca era marcada como selecionada — mesmo com o
  // painel de detalhe e o rodapé "N row selected" corretos, porque esses
  // usam o próprio selectedRecord, não o rowSelectionModel do grid.
  React.useEffect(() => {

    if (!selectedRecord) {
      setRowSelectionModel((prev) => (prev.ids.size === 0 ? prev : { type: 'include', ids: new Set() }));
      return;
    }

    const id = BigInt(selectedRecord.meta_id);
    setRowSelectionModel((prev) =>
      (prev.ids.size === 1 && prev.ids.has(id)) ? prev : { type: 'include', ids: new Set([id]) }
    );

  }, [selectedRecord, visibleRowIds])

  // Recarrega as linhas visíveis quando algo edita um registro fora do grid
  // (ex: comentário salvo no AnnotationPanel). Ignora o disparo inicial
  // (refreshGridToken começa em 0 e não deve gerar um fetch extra no mount).
  const isFirstRefresh = React.useRef(true)
  React.useEffect(() => {
    if (isFirstRefresh.current) {
      isFirstRefresh.current = false
      return
    }
    apiRef.current.dataSource.cache.clear()
    apiRef.current.dataSource.fetchRows()
  }, [apiRef, refreshGridToken])

  // Nesta aplicação só existe seleção de linha, nunca de célula. O grid,
  // por padrão, trata o foco de célula (clique ou navegação por setas) como
  // algo separado da seleção de linha, o que exigia um segundo clique ou o
  // Shift+seta pra realmente selecionar. Sincronizando aqui, qualquer célula
  // que ganhe foco (por clique ou teclado) já seleciona a linha inteira.
  //
  // Importante: atualiza o rowSelectionModel controlado diretamente (mesmo
  // caminho que um clique normal já usa via onRowSelectionModelChange), em
  // vez de chamar apiRef.current.selectRow(). Como o componente é
  // totalmente controlado, selectRow() mexe no estado interno do grid mas
  // fica sem efeito visual (o destaque da linha some) porque o próximo
  // render reconcilia com o rowSelectionModel controlado.
  React.useEffect(() => {
    return apiRef.current.subscribeEvent('cellFocusIn', (params) => {
      setRowSelectionModel({ type: 'include', ids: new Set([params.id]) })
      const row = apiRef.current.getRow(params.id)
      props.onChangeSelection(row ? [row] : [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef])

  // Mutation usada pelo clique direto na coluna "Quality" do grid
  const qualityMutation = useMutation({
    mutationFn: ({ rowId, quality_flag }) =>
      annotateTableRow({ tableId: props.tableId, rowId, quality_flag }),
  })

  const handleQualityClick = (row) => {
    const newFlag = nextQualityFlag(row.meta_quality_flag)
    qualityMutation.mutate(
      { rowId: row.meta_id, quality_flag: newFlag },
      {
        onSuccess: () => {
          // updateRows() não repinta a célula quando o grid usa `dataSource`
          // (o valor exibido vem do cache interno do dataSource, não do
          // client row model). Invalida o cache e refaz o fetch da página
          // atual, que é o jeito suportado de refletir a mudança.
          apiRef.current.dataSource.cache.clear()
          apiRef.current.dataSource.fetchRows()

          // Mantém o AnnotationPanel em sincronia se essa for a linha selecionada
          if (selectedRecord && String(selectedRecord.meta_id) === String(row.meta_id)) {
            setSelectedRecord({ ...selectedRecord, meta_quality_flag: newFlag })
          }
        },
      },
    )
  }

  // Colunas de avaliação (meta_quality_flag, meta_comment): não fazem parte
  // do catálogo de Column do metadata, mas já vêm nas linhas (SELECT *),
  // então são adicionadas manualmente aqui, no final do grid. "Quality" é
  // clicável (cicla o valor); "Comment" é somente leitura (editado no
  // AnnotationPanel).
  const annotationColumns = [
    {
      field: 'meta_quality_flag',
      headerName: 'Quality',
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const meta = QUALITY_FLAG_META[String(params.value)] ?? QUALITY_FLAG_META.null
        const Icon = meta.icon
        const isSelectedRow =
          !!selectedRecord && String(selectedRecord.meta_id) === String(params.row.meta_id)
        const title = isSelectedRow ? `${meta.label} — click to change` : `${meta.label} — select this row to rate it`
        return (
          <Tooltip title={title}>
            <span>
              <IconButton
                size="small"
                disabled={!isSelectedRow}
                onClick={() => handleQualityClick(params.row)}
              >
                <Icon fontSize="small" color={meta.color} />
              </IconButton>
            </span>
          </Tooltip>
        )
      },
    },
    {
      field: 'meta_comment',
      headerName: 'Comment',
      width: 220,
      sortable: false,
      filterable: false,
    },
  ]

  const makeColumns = () => {
    const mainUcds = ['meta.id;meta.main;meta.ref', 'pos.eq.ra;meta.main', 'pos.eq.dec;meta.main']
    return props.tableColumns.map((column) => {

      const width = mainUcds.includes(column.ucd) ? 150 : undefined;
      const colDef = {
        field: column.name,
        headerName: column.title || column.name,
        width: width,
        type: column.muicolumntype || 'string',
      }
      if (column.muicolumntype === 'number') {
        colDef.renderCell = (params) => {
          if (params.value === null || params.value === undefined) {
            return '';
          }
          return String(params.value);
        }
      }
      return colDef;
    })
  }

  const columns = [...makeColumns(), ...annotationColumns];

  const dataSource = React.useMemo(
    () => ({
      getRows: async (params) => {
        params.tableId = props.tableId
        try {
          const res = await getTableData(params);
          const rows = res.data.results || [];

          // atualiza o conjunto de ids visíveis
          setVisibleRowIds(new Set(rows.map((r) => BigInt(r.meta_id))));

          return {
            rows,
            rowCount: res.data.count,
          };
        } catch (error) {
          console.error('Erro ao carregar os dados', error);
          throw error; // isso é importante para acionar o `onDataSourceError`
        }
      },
    }),
    [props.tableId],
  );

  // quando usuário seleciona uma linha
  const handleSelectionChange = (newSelectionModel, details) => {

    setRowSelectionModel(newSelectionModel)

    const selectedRows = []
    if (newSelectionModel.ids) {
      for (const value of newSelectionModel.ids) {
        selectedRows.push(details.api.getRow(value))
      }
    }
    props.onChangeSelection(selectedRows)
  }

  return (
    <DataGrid
      showToolbar

      // O tom padrão do Mui-selected é sutil demais e se confunde com o
      // hover. Deixa o fundo da linha selecionada evidente, mas com um
      // azul claro (alpha sobre primary.main) em vez do primary.light
      // saturado.
      sx={(theme) => ({
        '& .MuiDataGrid-row.Mui-selected': {
          backgroundColor: alpha(theme.palette.primary.main, 0.16),
        },
        '& .MuiDataGrid-row.Mui-selected:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.16),
        },
      })}

      apiRef={apiRef}
      columns={columns}
      dataSource={dataSource}
      getRowId={(row) => BigInt(row.meta_id)}
      // Disable datasouce Cache for tests
      // dataSourceCache={null}
      onDataSourceError={(error) => {
        console.log('Data source error:', error);
      }}
      // Pagination
      pagination
      pageSizeOptions={[10, 50, 100]}
      // Filtering
      ignoreDiacritics
      // Selection
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={handleSelectionChange}
      disableMultipleRowSelection
      keepNonExistentRowsSelected
      // A seleção de linha é toda controlada pelo listener de cellFocusIn
      // (cobre clique e teclado). Desabilita o clique-para-selecionar
      // nativo do grid pra evitar as duas lógicas brigando entre si no
      // mesmo clique (uma seleciona, a outra desfaz por comportamento de
      // toggle).
      disableRowSelectionOnClick
      // checkboxSelection

      initialState={{
        pagination: { paginationModel: { pageSize: 50, page: 0 }, rowCount: 0 },
        // Ordena por padrão pela coluna real de id (property_id, mapeada
        // via UCD meta.id;meta.main) — sem isso o Postgres retorna as
        // linhas em ordem física/não garantida e nenhuma seta de
        // ordenação aparecia no cabeçalho.
        sorting: catalog?.property_id
          ? { sortModel: [{ field: catalog.property_id, sort: 'asc' }] }
          : undefined,
      }}

      slotProps={{
        toolbar: {
          showQuickFilter: false,
          printOptions: { disableToolbarButton: true },
          csvOptions: { disableToolbarButton: true },
          excelOptions: { disableToolbarButton: true },
        }
      }}
    />
  );
}
