# Rule: Expansion Pipeline Table Columns Lock

When modifying `frontend/src/pages/ExpansionPipeline.jsx`, DO NOT alter the sequence, numbering, or placement of the existing table columns in the Expansion Pipeline table. 

The fixed, unchangeable sequence of columns is:
1. S.No.
2. Brand
3. Café Name
4. Café Code
5. Pin Code
6. City
7. State
8. Address
9. Café Model
10. LEGAL DOCUMENTS
11. FINANCIAL DOCUMENTS
12. PROJECT DOCUMENTS
13. MISCELLANEOUS DOCUMENTS

If any new column must be added, it MUST be inserted *after* the "MISCELLANEOUS DOCUMENTS" column (and before "Status" / "Actions"). No new columns should ever be added before this column, and the order of the existing columns above must remain exactly as listed.
