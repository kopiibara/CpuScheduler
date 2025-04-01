import * as React from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Grow from "@mui/material/Grow";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Popper from "@mui/material/Popper";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

interface DropDownMenuProps {
  menuItems: { value: number | string; label: string }[];
  value: number | string;
  onChange: (value: number | string) => void;
  hoverOpen?: boolean; // Add this prop to optionally enable hover behavior
}

const DropDownMenu: React.FC<DropDownMenuProps> = ({
  menuItems,
  value,
  onChange,
  hoverOpen = false, // Default to false to maintain backward compatibility
}) => {
  // Set the default value to the first item in the menuItems array, unless a value is passed
  const selectedValue = value || menuItems[0]?.value;
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  const handleChange = (newValue: string | number) => {
    onChange(newValue);
    setOpen(false);
  };

  const handleToggle = () => {
    if (!hoverOpen) {
      setOpen((prevOpen) => !prevOpen);
    }
  };

  const handleClose = (event: Event) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }
    setOpen(false);
  };

  // Find the current selected label
  const selectedLabel =
    menuItems.find((item) => item.value === selectedValue)?.label || "";

  // Handle hover events
  const handleMouseEnter = () => {
    if (hoverOpen) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (hoverOpen) {
      setOpen(false); // Immediately close without delay
    }
  };

  return (
    <Box
      sx={{
        minWidth: 120,
        maxWidth: "100%",
        position: "relative",
      }}
      ref={anchorRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Box
        onClick={handleToggle}
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Select filter option"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleToggle();
            e.preventDefault();
          }
        }}
        sx={{
          backgroundColor: "242A2D",
          color: "#7F8588",
          borderRadius: "0.8rem",
          fontSize: "13px",
          padding: "6px 12px",
          fontFamily: "Inter",
          border: "2px solid #242A2D",
          display: "flex",
          alignItems: "center",
          height: "fit-content",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            backgroundColor: "rgba(59, 53, 76, 0.3)",
            borderColor: "#FBFCFA",
            color: "#FBFCFA",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            "& > span": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        >
          <span>{selectedLabel}</span>
          <ArrowDropDownIcon
            sx={{
              transition: "transform 0.3s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
              fontSize: "20px", // Smaller arrow icon
            }}
          />
        </Box>
      </Box>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        transition
        disablePortal
        placement="bottom-start"
        modifiers={[
          {
            name: "flip",
            enabled: true,
            options: {
              fallbackPlacements: ["top-start", "top-end", "bottom-end"],
            },
          },
          {
            name: "preventOverflow",
            enabled: true,
            options: {
              boundary: "window",
            },
          },
          {
            name: "sameWidth",
            enabled: false, // Disable same width behavior
          },
        ]}
        style={{
          zIndex: 1300,
          minWidth: anchorRef.current ? anchorRef.current.clientWidth : "auto",
          // Remove fixed width property to let it size to content
        }}
      >
        {({ TransitionProps }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: "top",
            }}
          >
            <Paper
              sx={{
                backgroundColor: "#080e11",
                borderRadius: "0.8rem",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.5)",
                mt: 1,
                minWidth: anchorRef.current?.clientWidth || 120,
                width: "auto",
                maxWidth: "auto",
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList
                  autoFocusItem={open}
                  sx={{
                    padding: "0.5rem 0",
                    "& .MuiMenuItem-root": {
                      fontSize: "13px",
                      padding: "6px 12px",
                      color: "#7F8588",
                      "&:hover": {
                        backgroundColor: "rgba(59, 53, 76, 0.3)",
                        color: "#FBFCFA",
                      },
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        color: "#FBFCFA",
                      },
                      "&:focus": {
                        outline: "none",
                      },
                      "&.Mui-focusVisible": {
                        outline: "none",
                        backgroundColor: "rgba(59, 53, 76, 0.3)",
                      },
                    },
                  }}
                >
                  {menuItems.map((item) => (
                    <MenuItem
                      key={item.value}
                      selected={item.value === selectedValue}
                      onClick={() => handleChange(item.value)}
                      sx={{
                        fontSize: "13px",
                        fontFamily: "Inter",
                      }}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
};

export default DropDownMenu;
