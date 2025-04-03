//import React from "react";
import { Box } from "@mui/material";

const InfoItem = ({ label, value }: { label: string; value: any }) => (
  <Box paddingX={3} paddingY={2} alignItems={"center"}>
    <p className="text-[#FBFCFA] text-[16px] font-[600]">{label}</p>
    <p className="text-[#7F8588] text-[13px] font-['Inter']">{value}</p>
  </Box>
);

export default InfoItem;
