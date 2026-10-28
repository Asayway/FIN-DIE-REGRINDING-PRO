# Implementation Plan: Maximize Screen Usage

The objective is to eliminate empty spaces and ensure the application components utilize the full screen space.

## Changes Planned:

1.  **StockQuantityMatrixView.tsx**:
    -   Reduce `pb-2` and `px-2` to `p-0` on the main container.
    -   Remove `space-y-3.5` to eliminate gaps between top bar, filters, and table.
    -   Adjust table container `max-h` to dynamically fill the remaining viewport height (`calc(100vh - header_height)`).

2.  **TvDashboardView.tsx**:
    -   Adjust grid containers to remove gaps (`gap-4` -> `gap-0` or smaller).
    -   Ensure chart containers are set to `h-full` or `flex-1` to stretch charts vertically.
    -   Review parent padding and remove explicit padding where it creates gaps.

## Expected Outcome:
-   A high-density dashboard and stock matrix view with minimal margins and full utilization of available display area.
