import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import UserTables from "@/components/UserTables";

export default function ListTablesContainer() {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
      p={4}
      pt={2}
    >
      <Paper
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <UserTables />
      </Paper>
    </Box>
  );
}
