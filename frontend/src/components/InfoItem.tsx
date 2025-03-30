//import React from "react";
import { Box, Typography } from "@mui/material";

const InfoItem = ({ label, value }: { label: string; value: any }) => (
  <Box sx={{ width: { xs: "100%", sm: "48%" } }}>
    <Typography variant="subtitle2" sx={{ color: "#666", mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={500}>
      {value}
    </Typography>
  </Box>
);

export default InfoItem;
