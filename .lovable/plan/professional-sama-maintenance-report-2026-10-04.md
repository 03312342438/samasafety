# Professional SAMA maintenance report

## Changes
- Set new-report service and completion dates to the actual submission day, including after selecting a contract, while preserving saved dates when editing history.
- Rebuild the printable report in the selected Professional SAMA direction: branded header, structured report details, restrained navy/blue styling, clearer checklists, summaries, spare parts, and balanced signatures.
- Update PDF pagination to place complete report sections on a page whenever they fit, moving a section to the next page instead of slicing through its table.
- Preserve repeating SAMA contact footers and all existing report information across single- and multi-system reports.

## Technical details
- Add explicit PDF section markers to the report document and calculate page slices from safe section boundaries.
- Fall back to row-safe or fixed-height slicing only when one section is taller than a full printable page.
- Keep historical downloads unchanged in data, but use the improved visual layout and pagination.

## Validation
- Check the app for compile errors.
- Submit or preview a current maintenance report and verify today's date, visual layout, signatures, and system/device tables.
- Generate a multi-page PDF, render every page to images, and inspect that no table or report section is cut between pages.
