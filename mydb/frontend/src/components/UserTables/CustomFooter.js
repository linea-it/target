import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { GridPagination } from "@mui/x-data-grid";
import prettyBytes from "pretty-bytes";

const CustomFooter = ({ used_bytes = 0, quota_bytes = 0, ...props }) => {
  // garante que os valores sejam Number (evita strings/undefined)
  const used = Number(used_bytes) || 0;
  const quota = Number(quota_bytes) || 0;

  // percent (0..100)
  const usedPercent = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

  // exibição: se for >0 e <0.1 mostra "<0.1%", senão mostra com 1 casa decimal
  const displayPercent =
    usedPercent > 0 && usedPercent < 0.1
      ? "<0.1%"
      : `${usedPercent.toFixed(1)}%`;

  // Define cor: success / warning / error (mantive os limites anteriores)
  let progressColor = "success";
  if (usedPercent >= 90) progressColor = "error";
  else if (usedPercent >= 70) progressColor = "warning";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
        padding: "8px 16px",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Quota info + progress bar */}
      <Box sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          You are using {prettyBytes(used_bytes)} of your quota of{" "}
          {prettyBytes(quota_bytes)}
        </Typography>

        {/* Progress bar + % lado direito */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={usedPercent}
            color={progressColor}
            sx={{
              flex: 1,
              height: 8,
              borderRadius: 5,
              backgroundColor: (theme) =>
                theme.palette.mode === "light"
                  ? theme.palette.grey[300]
                  : theme.palette.grey[800],
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: "right"
            }}
          >
            {displayPercent}
          </Typography>
        </Box>
      </Box>

      {/* Paginação à direita */}
      <Box>
        <GridPagination {...props} />
      </Box>
    </Box>
  );
};

export default CustomFooter;


// import Box from "@mui/material/Box";
// import Typography from "@mui/material/Typography";
// import LinearProgress from "@mui/material/LinearProgress";
// import prettyBytes from "pretty-bytes";

// import { GridPagination } from "@mui/x-data-grid";

// const CustomFooter = ({ used_bytes = 0, quota_bytes = 0, ...props }) => {
//   const usedPercent =
//     quota_bytes > 0 ? Math.min((used_bytes / quota_bytes) * 100, 100) : 0;

//   return (
//     <Box
//       sx={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         flexWrap: "wrap",
//         gap: 2,
//         padding: "8px 16px",
//         borderTop: "1px solid",
//         borderColor: "divider",
//       }}
//     >
//       {/* Quota info + progress bar */}
//       <Box sx={{ flex: 1, minWidth: 250 }}>
//         <Typography variant="body2" color="text.secondary">
//           You are using {prettyBytes(used_bytes)} of your quota of{" "}
//           {prettyBytes(quota_bytes)} ({usedPercent.toFixed(1)}%)
//         </Typography>
//         <LinearProgress
//           variant="determinate"
//           value={usedPercent}
//           sx={{
//             height: 8,
//             borderRadius: 5,
//             mt: 0.5,
//             backgroundColor: (theme) =>
//               theme.palette.mode === "light"
//                 ? theme.palette.grey[300]
//                 : theme.palette.grey[800],
//           }}
//         />
//       </Box>

//       {/* Paginação à direita */}
//       <Box>
//         <GridPagination {...props} />
//       </Box>
//     </Box>
//   );
// };

// export default CustomFooter;