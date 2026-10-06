# Maintenance report refinements

## What will change
- Keep the maintenance report as a single A4 page and remove the blank checklist area by letting the remaining sections flow upward immediately after the last system table.
- Rename the document to **Maintenance Report** and change **Engineer** to **Technician**.
- Use the newly attached SAMA logo in the report and as the app favicon.
- Correct **FS** to **Fire Suppression** everywhere it is labelled.
- Add a compact per-system visit summary showing completed visits, remaining visits, and the next scheduled visit for every selected system.

## Technical details
- Extend the report data passed to the printable document with a per-system visit-summary array populated from the selected maintenance contracts.
- Persist that snapshot with each report so downloads from Maintenance History retain the correct counts and dates.
- Rebalance the fixed one-page layout without changing portal inputs or report submission behavior.
- Verify the build, then download and inspect a real report as a one-page A4 PDF.
